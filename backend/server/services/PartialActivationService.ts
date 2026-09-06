import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AutoUpgradeService } from './AutoUpgradeService.js';

export interface PartialActivationResult {
  accumulated: number;
  threshold: number;
  activated: boolean;
  partialActivation: any;
}

/**
 * Accumulator engine for the spec's "partial activation" rule (e.g. Starter: a lone 10 USDT
 * contribution splits 2 reactivation + 8 toward Builder, accumulating across multiple such
 * contributions until Builder's 40 USDT threshold is reached).
 *
 * Wired into the live crediting flow via PaymentService.createPartialUpgradeIntent /
 * PaymentRepository's payment-verification paths (both the real blockchain-verified flow and the
 * dev-mode mock-confirm flow) — a user pays a sub-full-price amount toward a target tier, and
 * reaching the threshold activates that tier directly via AutoUpgradeService.activateLevel,
 * bypassing the qualification gates (direct-referral / qualified-builder counts) that otherwise
 * gate Builder/Leader/Champion — resolving the ambiguity in the client spec in favor of "funding
 * the full amount is itself sufficient", per the confirmed remediation plan.
 */
export class PartialActivationService {
  /**
   * Records a contribution toward a user's accumulated funding for their next tier.
   * Idempotent per (targetLevelConfigId, sourceType, sourceId) — the ledger credit is created
   * BEFORE the accumulator is incremented, and checked first, so a retry never double-counts.
   * Row-locks the PartialActivation row (INSERT..ON CONFLICT DO NOTHING + SELECT..FOR UPDATE),
   * matching DailyCappingService's established concurrency pattern.
   */
  static async recordContribution(
    userId: string,
    targetLevelConfigId: string,
    amount: number,
    sourceType: string,
    sourceId: string,
    db: any = prisma
  ): Promise<PartialActivationResult> {
    const execute = async (tx: any) => {
      // Must include userId: sourceType/sourceId alone (e.g. a matrix position id) is not
      // guaranteed globally unique across different users' contributions.
      const idempotencyKey = `partial-${userId}-${targetLevelConfigId}-${sourceType}-${sourceId}`;

      const existingLedger = await tx.walletLedger.findUnique({
        where: { idempotency_key: idempotencyKey },
      });

      if (existingLedger) {
        const existing = await tx.partialActivation.findUnique({
          where: { user_id_target_level_configuration_id: { user_id: userId, target_level_configuration_id: targetLevelConfigId } },
        });
        logger.info({ userId, targetLevelConfigId, idempotencyKey }, '[PartialActivationService] Contribution already recorded (idempotent)');
        return {
          accumulated: existing ? parseFloat(existing.accumulated_amount.toString()) : 0,
          threshold: existing ? parseFloat(existing.threshold_amount.toString()) : 0,
          activated: existing?.status === 'COMPLETED',
          partialActivation: existing,
        };
      }

      const targetLevel = await tx.levelConfiguration.findUnique({ where: { id: targetLevelConfigId } });
      if (!targetLevel) {
        throw new Error(`Target level configuration ${targetLevelConfigId} not found`);
      }
      const thresholdAmount = parseFloat(targetLevel.joining_amount.toString());

      // Ensure the accumulator row exists, then lock it.
      await tx.$executeRaw`
        INSERT INTO partial_activations (id, user_id, target_level_configuration_id, accumulated_amount, threshold_amount, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}, ${targetLevelConfigId}, 0, ${thresholdAmount}, 'ACCUMULATING', NOW(), NOW())
        ON CONFLICT (user_id, target_level_configuration_id) DO NOTHING;
      `;

      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, accumulated_amount, threshold_amount, status
        FROM partial_activations
        WHERE user_id = ${userId} AND target_level_configuration_id = ${targetLevelConfigId}
        FOR UPDATE;
      `;
      const locked = lockedRows[0];

      // Ledger credit first (idempotency source of truth), then increment the accumulator.
      const transaction = await tx.transaction.create({
        data: {
          user_id: userId,
          transaction_type: 'BOOSTER_REWARD',
          amount: new Prisma.Decimal(amount),
          currency: 'USDT',
          status: 'COMPLETED',
          description: `Partial activation contribution toward ${targetLevel.name}`,
          metadata: { target_level_id: targetLevelConfigId, source_type: sourceType, source_id: sourceId },
          completed_at: new Date(),
        },
      });

      await tx.walletLedger.create({
        data: {
          user_id: userId,
          transaction_id: transaction.id,
          entry_type: 'PARTIAL_ACTIVATION_CREDIT',
          direction: 'CREDIT',
          amount: new Prisma.Decimal(amount),
          available_amount: new Prisma.Decimal(0),
          status: 'COMPLETED',
          idempotency_key: idempotencyKey,
          source_type: sourceType,
          source_id: sourceId,
          metadata: { target_level_id: targetLevelConfigId },
        },
      });

      // If already COMPLETED (target already activated by a prior contribution), stop accumulating.
      if (locked.status === 'COMPLETED') {
        const alreadyDone = await tx.partialActivation.findUnique({ where: { id: locked.id } });
        return {
          accumulated: parseFloat(alreadyDone.accumulated_amount.toString()),
          threshold: parseFloat(alreadyDone.threshold_amount.toString()),
          activated: true,
          partialActivation: alreadyDone,
        };
      }

      const currentAccumulated = parseFloat(locked.accumulated_amount.toString());
      const threshold = parseFloat(locked.threshold_amount.toString());
      const newAccumulated = currentAccumulated + amount;
      const isNowComplete = newAccumulated >= threshold;

      const updated = await tx.partialActivation.update({
        where: { id: locked.id },
        data: {
          accumulated_amount: new Prisma.Decimal(newAccumulated),
          status: isNowComplete ? 'COMPLETED' : 'ACCUMULATING',
          completed_at: isNowComplete ? new Date() : null,
        },
      });

      logger.info(
        { userId, targetLevelConfigId, amount, newAccumulated, threshold, isNowComplete },
        '[PartialActivationService] Recorded contribution'
      );

      if (isNowComplete) {
        const targetLevelInfo = {
          id: targetLevel.id,
          name: targetLevel.name,
          slug: targetLevel.slug,
          levelOrder: targetLevel.level_order,
          joiningAmount: parseFloat(targetLevel.joining_amount.toString()),
          upgradeAmount: parseFloat(targetLevel.upgrade_amount.toString()),
          matrixSize: targetLevel.matrix_size,
          cappingEnabled: targetLevel.capping_enabled,
        };

        await AutoUpgradeService.activateLevel(
          tx,
          userId,
          targetLevelInfo,
          'PAID',
          `partial-activation-${userId}-${targetLevelConfigId}`,
          { source: 'partial_activation', accumulatedFrom: targetLevelConfigId, totalAccumulated: newAccumulated },
        );
      }

      return {
        accumulated: newAccumulated,
        threshold,
        activated: isNowComplete,
        partialActivation: updated,
      };
    };

    if (db !== prisma) {
      return execute(db);
    }
    return prisma.$transaction(execute, { maxWait: 5000, timeout: 10000 });
  }
}

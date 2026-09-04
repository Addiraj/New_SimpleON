import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { UpgradeEligibilityService, EligibilityResult } from './UpgradeEligibilityService.js';

export interface AutoUpgradeResult {
  upgraded: boolean;
  reason?: string;
  eligibility: EligibilityResult;
  upgradeHistory: any | null;
  userLevel: any | null;
  newMatrixCycle: any | null;
}

export class AutoUpgradeService {
  /**
   * Shared activation sequence: upserts UpgradeHistory, sets the user's current_level_id,
   * upserts UserLevel, creates the target tier's Cycle #1 (matrix-width-aware), and notifies.
   * Used by both qualification-gated auto-upgrade (below) and PartialActivationService's
   * money-threshold-triggered activation — both ultimately activate a tier the same way, they
   * just differ in what CONDITION triggers the activation.
   *
   * Caller must have already decided the user IS eligible/funded — this method does not
   * evaluate eligibility itself. Idempotent on `idempotencyKey`.
   */
  static async activateLevel(
    tx: any,
    userId: string,
    targetLevel: { id: string; name: string; slug: string; levelOrder: number; joiningAmount: number; upgradeAmount: number; matrixSize: number; cappingEnabled: boolean },
    upgradeType: 'AUTOMATIC' | 'PAID',
    idempotencyKey: string,
    eligibilitySnapshot: Record<string, any>,
    sourceCycleId?: string
  ): Promise<{ upgradeHistory: any; userLevel: any; newMatrixCycle: any }> {
    const user = await tx.user.findUnique({ where: { id: userId }, include: { current_level: true } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const now = new Date();

    const upgradeHistory = await tx.upgradeHistory.upsert({
      where: { idempotency_key: idempotencyKey },
      create: {
        user_id: userId,
        from_level_id: user.current_level_id,
        to_level_id: targetLevel.id,
        upgrade_type: upgradeType,
        status: 'COMPLETED',
        amount: new Prisma.Decimal(targetLevel.joiningAmount),
        eligibility_snapshot: eligibilitySnapshot,
        idempotency_key: idempotencyKey,
        upgraded_at: now,
      },
      update: {
        status: 'COMPLETED',
        upgraded_at: now,
        eligibility_snapshot: eligibilitySnapshot,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { current_level_id: targetLevel.id },
    });

    const userLevelId = `ul-${userId}-${targetLevel.id}`;
    const userLevel = await tx.userLevel.upsert({
      where: { id: userLevelId },
      create: {
        id: userLevelId,
        user_id: userId,
        level_configuration_id: targetLevel.id,
        status: 'ACTIVE',
        activated_at: now,
        configuration_snapshot: {
          id: targetLevel.id,
          name: targetLevel.name,
          slug: targetLevel.slug,
          levelOrder: targetLevel.levelOrder,
          joiningAmount: targetLevel.joiningAmount,
          upgradeAmount: targetLevel.upgradeAmount,
        },
      },
      update: {
        status: 'ACTIVE',
        activated_at: now,
      },
    });

    const firstCycleId = `mc-${userId}-${targetLevel.id}-c1`;
    const targetMatrixSize = targetLevel.matrixSize || 5;
    const newMatrixCycle = await tx.matrixCycle.upsert({
      where: { id: firstCycleId },
      create: {
        id: firstCycleId,
        user_id: userId,
        level_configuration_id: targetLevel.id,
        cycle_number: 1,
        total_positions: targetMatrixSize,
        filled_positions: 0,
        status: 'ACTIVE',
        configuration_snapshot: {
          id: targetLevel.id,
          name: targetLevel.name,
          slug: targetLevel.slug,
          joining_amount: targetLevel.joiningAmount,
          matrix_size: targetMatrixSize,
          capping_enabled: targetLevel.cappingEnabled,
        },
        started_at: now,
      },
      update: {
        status: 'ACTIVE',
      },
    });

    await tx.notification.create({
      data: {
        user_id: userId,
        type: 'LEVEL_UPGRADED',
        title: upgradeType === 'PAID' ? `Booster Activated: ${targetLevel.name}!` : `Booster Auto-Upgraded to ${targetLevel.name}!`,
        message: `Congratulations! You have been ${upgradeType === 'PAID' ? 'activated' : 'automatically upgraded'} to ${targetLevel.name} Booster (Level ${targetLevel.levelOrder}). Your new Cycle #1 matrix is active!`,
        data: {
          targetLevelId: targetLevel.id,
          targetLevelName: targetLevel.name,
          targetLevelSlug: targetLevel.slug,
          levelOrder: targetLevel.levelOrder,
          matrixCycleId: newMatrixCycle.id,
          sourceCycleId: sourceCycleId || null,
        },
      },
    });

    logger.info(
      {
        userId,
        fromLevelId: user.current_level_id,
        toLevelId: targetLevel.id,
        toLevelName: targetLevel.name,
        matrixCycleId: newMatrixCycle.id,
        upgradeType,
      },
      `[AutoUpgradeService] Activated user ${userId} from ${user.current_level?.name || 'Unknown'} to ${targetLevel.name} (Level ${targetLevel.levelOrder}, ${upgradeType})`
    );

    return { upgradeHistory, userLevel, newMatrixCycle };
  }

  /**
   * Evaluates and executes an automated Booster level upgrade upon matrix cycle completion.
   * Runs in a strict database transaction, locks user level records, enforces idempotency,
   * preserves old level matrix history, creates next-level matrix cycle, and notifies the user.
   *
   * @param userId User ID
   * @param sourceCycleId Matrix cycle ID that triggered auto-upgrade check
   * @param db Optional Prisma transaction client
   */
  static async processAutoUpgrade(
    userId: string,
    sourceCycleId?: string,
    db: any = prisma
  ): Promise<AutoUpgradeResult> {
    const executeAutoUpgrade = async (tx: any) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { current_level: true },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Evaluate eligibility on the backend
      const eligibility = await UpgradeEligibilityService.evaluateEligibility(userId, undefined, tx);

      if (!eligibility.eligible || !eligibility.targetLevel) {
        logger.info(
          { userId, reasons: eligibility.reasons },
          '[AutoUpgradeService] User not eligible for auto-upgrade'
        );
        return {
          upgraded: false,
          reason: eligibility.reasons.join('; ') || 'Not eligible for auto-upgrade',
          eligibility,
          upgradeHistory: null,
          userLevel: null,
          newMatrixCycle: null,
        };
      }

      const targetLevel = eligibility.targetLevel;
      const idempotencyKey = `autoupgrade-user-${userId}-level-${targetLevel.id}`;

      // Idempotency Check
      const existingUpgrade = await tx.upgradeHistory.findUnique({
        where: { idempotency_key: idempotencyKey },
      });

      if (existingUpgrade && existingUpgrade.status === 'COMPLETED') {
        logger.info(
          { userId, idempotencyKey },
          '[AutoUpgradeService] Auto upgrade already completed (idempotent)'
        );
        return {
          upgraded: true,
          reason: 'Auto upgrade previously completed (idempotent)',
          eligibility,
          upgradeHistory: existingUpgrade,
          userLevel: null,
          newMatrixCycle: null,
        };
      }

      const { upgradeHistory, userLevel, newMatrixCycle } = await this.activateLevel(
        tx,
        userId,
        targetLevel,
        'AUTOMATIC',
        idempotencyKey,
        eligibility.eligibilitySnapshot,
        sourceCycleId
      );

      return {
        upgraded: true,
        eligibility,
        upgradeHistory,
        userLevel,
        newMatrixCycle,
      };
    };

    if (db !== prisma) {
      return executeAutoUpgrade(db);
    } else {
      return prisma.$transaction(executeAutoUpgrade, {
        maxWait: 5000,
        timeout: 10000,
      });
    }
  }
}

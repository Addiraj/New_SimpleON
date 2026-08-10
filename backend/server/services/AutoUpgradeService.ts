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
      // 1. Lock user record for update / check
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { current_level: true },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // 2. Evaluate eligibility on the backend
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

      // 3. Idempotency Check
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

      const now = new Date();

      // 4. Create/Update Upgrade History
      const upgradeHistory = await tx.upgradeHistory.upsert({
        where: { idempotency_key: idempotencyKey },
        create: {
          user_id: userId,
          from_level_id: user.current_level_id,
          to_level_id: targetLevel.id,
          upgrade_type: 'AUTOMATIC',
          status: 'COMPLETED',
          amount: new Prisma.Decimal(targetLevel.joiningAmount),
          eligibility_snapshot: eligibility.eligibilitySnapshot,
          idempotency_key: idempotencyKey,
          upgraded_at: now,
        },
        update: {
          status: 'COMPLETED',
          upgraded_at: now,
          eligibility_snapshot: eligibility.eligibilitySnapshot,
        },
      });

      // 5. Update User's Current Level in `users`
      await tx.user.update({
        where: { id: userId },
        data: {
          current_level_id: targetLevel.id,
        },
      });

      // 6. Upsert `user_levels` record for target level
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

      // 7. Create Next Level Matrix Cycle #1 (Preserving old level matrix history)
      const firstCycleId = `mc-${userId}-${targetLevel.id}-c1`;
      const newMatrixCycle = await tx.matrixCycle.upsert({
        where: { id: firstCycleId },
        create: {
          id: firstCycleId,
          user_id: userId,
          level_configuration_id: targetLevel.id,
          cycle_number: 1,
          total_positions: 5,
          filled_positions: 0,
          status: 'ACTIVE',
          configuration_snapshot: {
            id: targetLevel.id,
            name: targetLevel.name,
            slug: targetLevel.slug,
            joiningAmount: targetLevel.joiningAmount,
            matrix_size: 5,
          },
          started_at: now,
        },
        update: {
          status: 'ACTIVE',
        },
      });

      // 8. Create Notification
      await tx.notification.create({
        data: {
          user_id: userId,
          type: 'BOOSTER_AUTO_UPGRADED',
          title: `Booster Auto-Upgraded to ${targetLevel.name}!`,
          message: `Congratulations! You have been automatically upgraded to ${targetLevel.name} Booster (Level ${targetLevel.levelOrder}). Your new Cycle #1 matrix is active!`,
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
        },
        `[AutoUpgradeService] UPGRADE MODS: Auto-upgraded user ${userId} from ${user.current_level?.name || 'Unknown'} to ${targetLevel.name} (Level ${targetLevel.levelOrder})`
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

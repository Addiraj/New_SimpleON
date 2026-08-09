import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { MatrixRewardService } from './MatrixRewardService.js';
import { RetopupService } from './RetopupService.js';
import { AutoUpgradeService } from './AutoUpgradeService.js';

export interface CompletionProcessResult {
  completedCycle: any;
  nextCycle: any | null;
  rewardResult: any;
  retopupResult: any;
  alreadyCompleted: boolean;
}

export class MatrixCompletionService {
  /**
   * Complete a matrix cycle idempotently when all 5 positions are filled.
   * Locks the matrix cycle, calculates rewards, applies daily capping,
   * creates ledger credit, deducts re-topup, opens next cycle, updates upgrade eligibility,
   * and creates notifications. All wrapped in a database transaction.
   *
   * @param cycleId Matrix Cycle ID
   * @param db Optional Prisma transaction client
   */
  static async processCycleCompletion(
    cycleId: string,
    db: any = prisma
  ): Promise<CompletionProcessResult> {
    const executeCompletion = async (tx: any) => {
      // 1. Lock and fetch the matrix cycle with level configuration and positions
      const cycle = await tx.matrixCycle.findUnique({
        where: { id: cycleId },
        include: {
          level_configuration: true,
          user: true,
          positions: true,
        },
      });

      if (!cycle) {
        throw new Error(`Matrix cycle ${cycleId} not found`);
      }

      // 2. Idempotency Check: Confirm cycle has not already been completed
      if (cycle.status === 'COMPLETED') {
        logger.info(
          { cycleId, userId: cycle.user_id },
          '[MatrixCompletionService] Cycle already completed. Returning idempotent result.'
        );
        const existingNextCycle = cycle.next_cycle_id
          ? await tx.matrixCycle.findUnique({ where: { id: cycle.next_cycle_id } })
          : null;

        return {
          completedCycle: cycle,
          nextCycle: existingNextCycle,
          rewardResult: null,
          retopupResult: null,
          alreadyCompleted: true,
        };
      }

      // 3. Prepare Configuration Snapshot
      const levelConfig = cycle.level_configuration;
      const configSnapshot = (cycle.configuration_snapshot as any) || {
        id: levelConfig?.id,
        name: levelConfig?.name || 'Booster Level',
        slug: levelConfig?.slug || 'booster-1',
        joining_amount: levelConfig?.joining_amount?.toString() || '100',
        upgrade_amount: levelConfig?.upgrade_amount?.toString() || '200',
        income_per_position: levelConfig?.income_per_position?.toString() || '15',
        cycle_reward: levelConfig?.cycle_reward?.toString() || '60',
        retopup_amount: levelConfig?.retopup_amount?.toString() || '20',
        retopup_enabled: levelConfig?.retopup_enabled ?? true,
        auto_upgrade_enabled: levelConfig?.auto_upgrade_enabled ?? true,
        daily_cap: levelConfig?.daily_cap?.toString() || '50',
        matrix_size: levelConfig?.matrix_size || 5,
        captured_at: new Date().toISOString(),
      };

      const now = new Date();

      // 4. Calculate reward & create ledger credit (with daily capping & idempotency)
      const rewardResult = await MatrixRewardService.calculateAndCreditCycleReward(
        cycle,
        configSnapshot,
        tx
      );

      // 5. Mark current cycle COMPLETED and store completion time
      const updatedCycle = await tx.matrixCycle.update({
        where: { id: cycle.id },
        data: {
          status: 'COMPLETED',
          completed_at: now,
          configuration_snapshot: configSnapshot,
        },
      });

      // 6. Evaluate re-topup rules & create next cycle (Cycle N+1)
      const retopupResult = await RetopupService.processRetopupAndNextCycle(
        updatedCycle,
        configSnapshot,
        tx
      );

      // 7. Trigger Auto-Upgrade Evaluation
      try {
        const userLevel = await tx.userLevel.findFirst({
          where: {
            user_id: cycle.user_id,
            level_configuration_id: cycle.level_configuration_id,
          },
        });

        if (userLevel) {
          await tx.userLevel.update({
            where: { id: userLevel.id },
            data: {
              status: 'COMPLETED',
              completed_at: now,
              configuration_snapshot: configSnapshot,
            },
          });
        }

        // Process automatic upgrade if criteria are met
        await AutoUpgradeService.processAutoUpgrade(cycle.user_id, cycle.id, tx);
      } catch (upgErr: any) {
        logger.warn({ error: upgErr.message }, '[MatrixCompletionService] Non-critical auto-upgrade evaluation warning');
      }

      // 8. Create Notification
      const rewardFormatted = rewardResult.allowedReward.toFixed(2);
      await tx.notification.create({
        data: {
          user_id: cycle.user_id,
          type: 'MATRIX_CYCLE_COMPLETED',
          title: `Matrix Cycle #${cycle.cycle_number} Completed!`,
          message: `Congratulations! Your Cycle #${cycle.cycle_number} matrix is 100% filled. Reward of $${rewardFormatted} USDT has been credited to your wallet.`,
          data: {
            cycleId: cycle.id,
            cycleNumber: cycle.cycle_number,
            rewardAmount: rewardResult.allowedReward,
            retopupDeducted: retopupResult.retopupDeducted,
            retopupAmount: retopupResult.retopupAmount,
            nextCycleId: retopupResult.nextCycle?.id || null,
          },
        },
      });

      logger.info(
        {
          cycleId: cycle.id,
          userId: cycle.user_id,
          cycleNumber: cycle.cycle_number,
          rewardAmount: rewardResult.allowedReward,
          nextCycleId: retopupResult.nextCycle?.id,
        },
        '[MatrixCompletionService] Successfully processed matrix cycle completion & re-topup'
      );

      return {
        completedCycle: updatedCycle,
        nextCycle: retopupResult.nextCycle,
        rewardResult,
        retopupResult,
        alreadyCompleted: false,
      };
    };

    if (db !== prisma) {
      return executeCompletion(db);
    } else {
      return prisma.$transaction(executeCompletion, {
        maxWait: 5000,
        timeout: 10000,
      });
    }
  }
}

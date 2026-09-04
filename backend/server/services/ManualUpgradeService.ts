import { Prisma, NotificationType } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { UpgradeEligibilityService, EligibilityResult } from './UpgradeEligibilityService.js';
import { NotificationService } from './NotificationService.js';

export interface ManualUpgradeResult {
  success: boolean;
  message: string;
  eligibility: EligibilityResult;
  userLevel: any | null;
  upgradeHistory: any | null;
  newMatrixCycle: any | null;
  transaction: any | null;
  walletLedger: any | null;
}

export interface PaymentIntentResult {
  paymentIntent: any;
  eligibility: EligibilityResult;
  upgradeHistory: any;
}

export class ManualUpgradeService {
  /**
   * Generates a Payment Intent for manual Booster level upgrade after validating backend eligibility.
   * Do not trust frontend eligibility values — always re-calculates eligibility server-side.
   *
   * @param userId User ID
   * @param targetSlug Target level slug (e.g., 'builder', 'leader', 'champion')
   * @param db Prisma transaction or database client
   */
  static async createPaymentIntent(
    userId: string,
    targetSlug?: string,
    db: any = prisma
  ): Promise<PaymentIntentResult> {
    // 1. Backend Eligibility Re-evaluation
    const eligibility = await UpgradeEligibilityService.evaluateEligibility(userId, targetSlug, db);

    if (!eligibility.eligible || !eligibility.targetLevel) {
      const errorMsg = eligibility.reasons.join('; ') || 'User is not eligible for this upgrade';
      logger.warn({ userId, targetSlug, reasons: eligibility.reasons }, '[ManualUpgradeService] Payment intent creation rejected');
      throw new Error(errorMsg);
    }

    const targetLevel = eligibility.targetLevel;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour expiration
    const idempotencyKey = `intent-upgrade-${userId}-${targetLevel.id}-${Date.now()}`;

    // 2. Create PaymentIntent record in database
    const paymentIntent = await db.paymentIntent.create({
      data: {
        user_id: userId,
        level_configuration_id: targetLevel.id,
        payment_type: 'UPGRADE',
        amount: new Prisma.Decimal(targetLevel.joiningAmount),
        currency: 'USDT',
        status: 'PENDING',
        expires_at: expiresAt,
        metadata: {
          targetLevelSlug: targetLevel.slug,
          targetLevelName: targetLevel.name,
          currentLevelOrder: eligibility.currentLevelOrder,
          targetLevelOrder: eligibility.targetLevelOrder,
        },
      },
      include: {
        level: true,
      },
    });

    // 3. Create or update UpgradeHistory record in PENDING status
    const upgradeHistory = await db.upgradeHistory.upsert({
      where: { idempotency_key: `history-${paymentIntent.id}` },
      create: {
        user_id: userId,
        from_level_id: eligibility.currentLevel?.id || null,
        to_level_id: targetLevel.id,
        upgrade_type: 'MANUAL',
        status: 'PENDING',
        amount: new Prisma.Decimal(targetLevel.joiningAmount),
        eligibility_snapshot: eligibility.eligibilitySnapshot,
        idempotency_key: `history-${paymentIntent.id}`,
      },
      update: {
        status: 'PENDING',
        eligibility_snapshot: eligibility.eligibilitySnapshot,
      },
    });

    logger.info(
      { userId, paymentIntentId: paymentIntent.id, targetLevel: targetLevel.slug },
      '[ManualUpgradeService] Created upgrade payment intent'
    );

    return {
      paymentIntent,
      eligibility,
      upgradeHistory,
    };
  }

  /**
   * Executes a manual Booster level upgrade.
   * Re-evaluates backend eligibility, locks user records, processes payment/wallet debit,
   * updates user current level, creates target level matrix cycle (Cycle #1), preserves old level matrix history,
   * updates upgrade history status to COMPLETED, and sends notification.
   *
   * @param userId User ID
   * @param targetSlug Target level slug
   * @param customIdempotencyKey Optional client or server idempotency key
   * @param db Prisma transaction or database client
   */
  static async executeManualUpgrade(
    userId: string,
    targetSlug?: string,
    customIdempotencyKey?: string,
    db: any = prisma
  ): Promise<ManualUpgradeResult> {
    const executeUpgrade = async (tx: any) => {
      // 1. Lock user record
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { current_level: true },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // 2. Evaluate Backend Eligibility (Never trust frontend)
      const eligibility = await UpgradeEligibilityService.evaluateEligibility(userId, targetSlug, tx);

      if (!eligibility.eligible || !eligibility.targetLevel) {
        const errorMsg = eligibility.reasons.join('; ') || 'User is not eligible for manual upgrade';
        logger.warn(
          { userId, targetSlug, reasons: eligibility.reasons },
          '[ManualUpgradeService] Upgrade execution denied due to eligibility'
        );
        throw new Error(errorMsg);
      }

      const targetLevel = eligibility.targetLevel;
      const upgradeAmount = targetLevel.joiningAmount;
      const idempotencyKey =
        customIdempotencyKey || `manualupgrade-${userId}-${targetLevel.id}`;

      // 3. Idempotency Check
      const existingUpgrade = await tx.upgradeHistory.findUnique({
        where: { idempotency_key: idempotencyKey },
      });

      if (existingUpgrade && existingUpgrade.status === 'COMPLETED') {
        logger.info(
          { userId, idempotencyKey },
          '[ManualUpgradeService] Upgrade already completed (idempotent response)'
        );
        const userLevel = await tx.userLevel.findFirst({
          where: { user_id: userId, level_configuration_id: targetLevel.id },
        });
        const activeCycle = await tx.matrixCycle.findFirst({
          where: { user_id: userId, level_configuration_id: targetLevel.id, status: 'ACTIVE' },
        });

        return {
          success: true,
          message: 'Upgrade previously completed (idempotent)',
          eligibility,
          userLevel,
          upgradeHistory: existingUpgrade,
          newMatrixCycle: activeCycle,
          transaction: null,
          walletLedger: null,
        };
      }

      const now = new Date();

      // 4. Create Transaction & Wallet Ledger Debit Entry if deducting from user balance
      let transaction: any = null;
      let walletLedger: any = null;

      if (upgradeAmount > 0) {
        transaction = await tx.transaction.create({
          data: {
            user_id: userId,
            transaction_type: 'UPGRADE',
            amount: new Prisma.Decimal(upgradeAmount),
            currency: 'USDT',
            status: 'COMPLETED',
            description: `Manual upgrade to ${targetLevel.name} Booster Level`,
            metadata: {
              target_level_id: targetLevel.id,
              target_level_slug: targetLevel.slug,
              target_level_name: targetLevel.name,
            },
            completed_at: now,
          },
        });

        walletLedger = await tx.walletLedger.create({
          data: {
            user_id: userId,
            transaction_id: transaction.id,
            entry_type: 'UPGRADE_DEBIT',
            direction: 'DEBIT',
            amount: new Prisma.Decimal(upgradeAmount),
            status: 'COMPLETED',
            idempotency_key: `ledger-${idempotencyKey}`,
            source_type: 'LEVEL_UPGRADE',
            source_id: targetLevel.id,
            metadata: {
              targetLevelSlug: targetLevel.slug,
            },
          },
        });
      }

      // 5. Create or Update UpgradeHistory to COMPLETED
      const upgradeHistory = await tx.upgradeHistory.upsert({
        where: { idempotency_key: idempotencyKey },
        create: {
          user_id: userId,
          from_level_id: user.current_level_id,
          to_level_id: targetLevel.id,
          upgrade_type: 'MANUAL',
          status: 'COMPLETED',
          amount: new Prisma.Decimal(upgradeAmount),
          eligibility_snapshot: eligibility.eligibilitySnapshot,
          transaction_id: transaction?.id || null,
          idempotency_key: idempotencyKey,
          upgraded_at: now,
        },
        update: {
          status: 'COMPLETED',
          upgraded_at: now,
          transaction_id: transaction?.id || null,
          eligibility_snapshot: eligibility.eligibilitySnapshot,
        },
      });

      // 6. Update User `current_level_id`
      await tx.user.update({
        where: { id: userId },
        data: {
          current_level_id: targetLevel.id,
        },
      });

      // 7. Upsert `user_levels` for target level
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
            joiningAmount: upgradeAmount,
            upgradeAmount: targetLevel.upgradeAmount,
          },
        },
        update: {
          status: 'ACTIVE',
          activated_at: now,
        },
      });

      // 8. Create Next Level Matrix Cycle #1 (Preserves old level matrix cycles untouched)
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
            joining_amount: upgradeAmount,
            matrix_size: targetMatrixSize,
            capping_enabled: targetLevel.cappingEnabled,
          },
          started_at: now,
        },
        update: {
          status: 'ACTIVE',
        },
      });

      // 9. Notification
      try {
        await NotificationService.createNotification({
          userId,
          type: NotificationType.LEVEL_UPGRADED,
          title: `Upgraded to ${targetLevel.name}!`,
          message: `Congratulations! Your account has been upgraded to ${targetLevel.name} Booster (Level ${targetLevel.levelOrder}). Cycle #1 matrix is now active.`,
          data: {
            targetLevelId: targetLevel.id,
            targetLevelName: targetLevel.name,
            targetLevelSlug: targetLevel.slug,
            matrixCycleId: newMatrixCycle.id,
          },
        });
      } catch (nErr: any) {
        logger.warn({ error: nErr.message }, '[ManualUpgradeService] Notification dispatch warning');
      }

      logger.info(
        { userId, targetLevelId: targetLevel.id, newMatrixCycleId: newMatrixCycle.id },
        '[ManualUpgradeService] Successfully executed manual level upgrade'
      );

      return {
        success: true,
        message: `Successfully upgraded to ${targetLevel.name} Booster Level`,
        eligibility,
        userLevel,
        upgradeHistory,
        newMatrixCycle,
        transaction,
        walletLedger,
      };
    };

    if (db !== prisma) {
      return executeUpgrade(db);
    } else {
      return prisma.$transaction(executeUpgrade, {
        maxWait: 5000,
        timeout: 10000,
      });
    }
  }
}

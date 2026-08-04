import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { DailyCappingService } from './DailyCappingService.js';
import { BoosterConfigService } from './BoosterConfigService.js';

export interface RewardCalculationResult {
  grossReward: number;
  allowedReward: number;
  cappedExcess: number;
  dailyCapLimit: number;
  currentGrossToday: number;
  ledgerEntry: any;
  transaction: any;
}

export class MatrixRewardService {
  /**
   * Calculates and credits cycle reward for a completed matrix cycle.
   * Ensures idempotency via unique ledger idempotency key `reward-mc-${cycleId}`.
   * Enforces daily capping rules.
   *
   * @param cycle MatrixCycle record
   * @param configSnapshot Saved level configuration snapshot
   * @param db Prisma transaction client
   */
  static async calculateAndCreditCycleReward(
    cycle: any,
    configSnapshot: any,
    db: any = prisma
  ): Promise<RewardCalculationResult> {
    const userId = cycle.user_id;
    const cycleId = cycle.id;
    const cycleNumber = cycle.cycle_number;

    // 1. Determine verified Booster distribution. Non-Champion pools upgrade forward;
    // only Champion has approved first net income in the current business rules.
    const tierConfig = BoosterConfigService.getTierConfig(configSnapshot.slug) || BoosterConfigService.assertTierConfig('starter');
    const grossReward = tierConfig.netIncome || 0;

    // 2. Check and apply Daily Capping via DailyCappingService
    const cappingEval = await DailyCappingService.evaluateAndApplyCapping(
      userId,
      grossReward,
      undefined,
      undefined,
      db
    );

    const allowedReward = cappingEval.allowedThisTransaction;
    const cappedExcess = cappingEval.excessThisTransaction;
    const dailyCapLimit = cappingEval.dailyCap;
    const currentGrossToday = cappingEval.grossEarnings;

    // 3. Create Wallet Ledger Credit (Idempotent)
    const idempotencyKey = `reward-mc-${cycleId}`;

    const existingLedger = await db.walletLedger.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    if (existingLedger) {
      logger.info(
        { userId, cycleId, idempotencyKey },
        '[MatrixRewardService] Cycle reward ledger credit already exists (idempotent)'
      );
      return {
        grossReward,
        allowedReward: parseFloat(existingLedger.amount.toString()),
        cappedExcess,
        dailyCapLimit,
        currentGrossToday,
        ledgerEntry: existingLedger,
        transaction: null,
      };
    }

    // Create Transaction record
    const transaction = await db.transaction.create({
      data: {
        user_id: userId,
        transaction_type: 'MATRIX_REWARD',
        amount: new Prisma.Decimal(allowedReward),
        currency: 'USDT',
        status: 'COMPLETED',
        description: `Matrix Cycle #${cycleNumber} Verified Booster Net Income`,
        metadata: {
          cycle_id: cycleId,
          cycle_number: cycleNumber,
          gross_reward: grossReward,
          allowed_reward: allowedReward,
          capped_excess: cappedExcess,
          daily_cap: dailyCapLimit,
          tier_code: tierConfig.code,
        },
        completed_at: new Date(),
      },
    });

    // Create WalletLedger Credit
    const ledgerEntry = await db.walletLedger.create({
      data: {
        user_id: userId,
        transaction_id: transaction.id,
        entry_type: 'MATRIX_REWARD',
        direction: 'CREDIT',
        amount: new Prisma.Decimal(allowedReward),
        available_amount: new Prisma.Decimal(allowedReward),
        status: 'AVAILABLE',
        idempotency_key: idempotencyKey,
        source_type: 'MATRIX_CYCLE',
        source_id: cycleId,
        metadata: {
          cycle_number: cycleNumber,
          tier_code: tierConfig.code,
        },
      },
    });

    logger.info(
      { userId, cycleId, allowedReward, cappedExcess },
      '[MatrixRewardService] Successfully credited cycle reward to user wallet ledger'
    );

    return {
      grossReward,
      allowedReward,
      cappedExcess,
      dailyCapLimit,
      currentGrossToday,
      ledgerEntry,
      transaction,
    };
  }
}

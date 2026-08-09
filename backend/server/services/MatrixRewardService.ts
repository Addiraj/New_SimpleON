import { Prisma, CappingHandlingType } from '@prisma/client';
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
   * Enforces daily cycle capping rules and Immediate Sponsor routing for capped cycles.
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
    const levelConfigId = cycle.level_configuration_id;

    // 1. Determine verified Booster distribution
    const tierConfig = BoosterConfigService.getTierConfig(configSnapshot?.slug) || BoosterConfigService.assertTierConfig('starter');
    const grossReward = configSnapshot?.cycle_reward 
      ? parseFloat(configSnapshot.cycle_reward.toString()) 
      : (tierConfig.netIncome ?? tierConfig.subscriptionAmount ?? 10);

    // 2. Check and apply Daily Capping via DailyCappingService
    // Only process if there's actually a gross reward to distribute
    let cappingEval = null;
    let allowedReward = grossReward;
    let cappedExcess = 0;
    let dailyCapLimit = 5;
    let currentGrossToday = 0;
    let isCapped = false;

    if (grossReward > 0) {
      cappingEval = await DailyCappingService.evaluateAndApplyCapping(
        userId,
        levelConfigId,
        grossReward,
        CappingHandlingType.HELD,
        undefined,
        db
      );

      allowedReward = cappingEval.allowedThisTransaction;
      cappedExcess = cappingEval.excessThisTransaction;
      dailyCapLimit = cappingEval.dailyCycleLimit;
      currentGrossToday = cappingEval.grossEarnings;
      isCapped = cappingEval.isCapped;
    }

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

    // 4. Determine actual wallet recipient (Participant vs Immediate Sponsor)
    let recipientUserId = userId;
    let isRedirectedToSponsor = false;

    if (isCapped && grossReward > 0) {
      // Fetch the participant's immediate sponsor
      const participantUser = await db.user.findUnique({
        where: { id: userId },
        select: { sponsor_id: true }
      });
      
      if (participantUser?.sponsor_id) {
        recipientUserId = participantUser.sponsor_id;
        isRedirectedToSponsor = true;
        
        logger.info(
          { originalUserId: userId, sponsorId: recipientUserId, cycleId },
          '[MatrixRewardService] Cycle reward capped. Redirecting reward to immediate sponsor.'
        );
      } else {
        // If they have no sponsor, the reward is effectively lost per normal fallback rules
        // (But we create a transaction indicating it was capped without a ledger credit)
        logger.warn(
          { userId, cycleId },
          '[MatrixRewardService] Cycle reward capped but user has NO immediate sponsor. Reward is lost.'
        );
      }
    }

    // 5. Create Transaction record (attributed to the recipient)
    let transaction = null;
    let ledgerEntry = null;

    if (grossReward > 0 && (recipientUserId === userId || isRedirectedToSponsor)) {
      // Using grossReward amount because the recipient gets the FULL reward 
      // (whether they are the normal participant or the immediate sponsor)
      transaction = await db.transaction.create({
        data: {
          user_id: recipientUserId,
          transaction_type: 'MATRIX_REWARD',
          amount: new Prisma.Decimal(grossReward),
          currency: 'USDT',
          status: 'COMPLETED',
          description: isRedirectedToSponsor 
            ? `Matrix Cycle #${cycleNumber} Reward (Spill-up from capped user)` 
            : `Matrix Cycle #${cycleNumber} Verified Booster Net Income`,
          metadata: {
            cycle_id: cycleId,
            cycle_number: cycleNumber,
            gross_reward: grossReward,
            allowed_reward: allowedReward,
            capped_excess: cappedExcess,
            daily_cap: dailyCapLimit,
            tier_code: tierConfig.code,
            is_capped_redirect: isRedirectedToSponsor,
            original_participant_id: userId
          },
          completed_at: new Date(),
        },
      });

      // Create WalletLedger Credit
      ledgerEntry = await db.walletLedger.create({
        data: {
          user_id: recipientUserId,
          transaction_id: transaction.id,
          entry_type: 'MATRIX_REWARD',
          direction: 'CREDIT',
          amount: new Prisma.Decimal(grossReward),
          available_amount: new Prisma.Decimal(grossReward),
          status: 'AVAILABLE',
          idempotency_key: idempotencyKey, // Idempotency protects duplicate routing
          source_type: 'MATRIX_CYCLE',
          source_id: cycleId,
          metadata: {
            cycle_number: cycleNumber,
            tier_code: tierConfig.code,
            is_capped_redirect: isRedirectedToSponsor,
            original_participant_id: userId
          },
        },
      });

      logger.info(
        { recipientUserId, originalUserId: userId, cycleId, amount: grossReward, isRedirectedToSponsor },
        '[MatrixRewardService] Successfully credited cycle reward'
      );
    }

    return {
      grossReward,
      allowedReward: isCapped ? 0 : grossReward,
      cappedExcess: isCapped ? grossReward : 0,
      dailyCapLimit,
      currentGrossToday,
      ledgerEntry,
      transaction,
    };
  }
}

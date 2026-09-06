import { Prisma, CappingHandlingType } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { DailyCappingService } from './DailyCappingService.js';
import { BoosterConfigService, BoosterTierConfig } from './BoosterConfigService.js';

const D = (v: number | string) => new Prisma.Decimal(v);

export interface RewardCalculationResult {
  grossReward: number;
  allowedReward: number;
  cappedExcess: number;
  dailyCapLimit: number;
  currentGrossToday: number;
  ledgerEntry: any;
  transaction: any;
  extraDestinations: Array<{ entryType: string; amount: number; transaction: any; ledgerEntry: any }>;
}

interface ExtraDestination {
  entryType: 'NEXT_TIER_ACTIVATION_FUNDING' | 'BITITAN_CREDIT';
  amount: Prisma.Decimal;
  description: string;
  metadata: Record<string, any>;
}

export class MatrixRewardService {
  /**
   * Calculates and credits cycle reward for a completed matrix cycle.
   * Ensures idempotency via unique ledger idempotency keys `reward-mc-${cycleId}-${entryType}`.
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
    const cycleId = cycle.id;

    const execute = async (tx: any): Promise<RewardCalculationResult> => {
      // 0. Row-lock the cycle first so concurrent calls for the SAME cycleId (this method is
      // called directly by tests, and could in principle be invoked directly elsewhere) serialize
      // instead of racing past the idempotency checks below. Harmless/no-op re-lock when called
      // from MatrixCompletionService, which already holds this same lock in its own transaction.
      await tx.$queryRaw`SELECT id FROM matrix_cycles WHERE id = ${cycleId} FOR UPDATE`;

      const userId = cycle.user_id;
      const cycleNumber = cycle.cycle_number;
      const levelConfigId = cycle.level_configuration_id;

      // 1. Determine verified Booster distribution — PURE MATH, no hardcoded values.
      //
      // Business rules (client-approved final ladder — Launch/Starter/Builder/Leader/Champion/Visionary):
      //   Cycle 1, all tiers except Champion:
      //     -> Income (MATRIX_REWARD) = $0. The entire collection is consumed by:
      //       retopupAmount (funds the next Cycle 1 re-entry — handled by RetopupService's
      //         RETOPUP_DEBIT, unconditionally created for every completing cycle, so it
      //         already IS this leg's auditable ledger entry; not duplicated here).
      //       upgradeAmount (funds the next-tier activation) -> explicit NEXT_TIER_ACTIVATION_FUNDING.
      //       Builder only: reserveAmount stays in the Bititan Wallet -> explicit BITITAN_CREDIT,
      //         kept structurally separate from the user's Income Wallet (WalletService excludes
      //         both new entry types from availableBalance/totalEarned).
      //       Visionary's first-cycle "400 -> next pool" leg is intentionally left uncredited —
      //         the client spec does not define a discrete external destination for it (unlike
      //         every other tier's upgradeAmount leg), so no ledger entry is invented for it.
      //
      //   Cycle 1, Champion only:
      //     -> Income = collectionAmount - retopupAmount - mainPlanAmount (1600-320-500=780)
      //       mainPlanAmount (500) funds Visionary activation -> explicit NEXT_TIER_ACTIVATION_FUNDING.
      //
      //   Cycle 2+, ALL tiers (including Launch and Visionary's X3 leg):
      //     -> Income = collectionAmount - retopupAmount (only resubscription is deducted;
      //       everything else goes to the wallet). No NEXT_TIER_ACTIVATION_FUNDING/BITITAN_CREDIT
      //       legs on subsequent cycles — matches the already-approved live Builder/Leader/Champion
      //       subsequent-cycle behavior, extended unchanged to Launch/Starter/Visionary.
      //
      //   Launch and Visionary's X3 leg never go through DailyCappingService (configSnapshot's
      //   capping_enabled=false short-circuits the block below) — unlimited cycles, per spec.
      //
      // All numbers come dynamically from the database snapshot — if plan amounts ever change,
      // this auto-adjusts. Visionary uses its 200 USDT X3-leg unit amount (BOOSTER_TIER_CONFIGS'
      // visionaryPart1Amount), not its 500 USDT full joining amount, as the per-position unit —
      // the 300 USDT 3x3/20-level leg (Part 2) is tracked entirely separately via
      // VisionaryLevelProgress/VisionaryTreePosition, not through this cycle-engine at all.
      const tierConfig = BoosterConfigService.getTierConfig(configSnapshot?.slug) || BoosterConfigService.assertTierConfig('starter');
      const isFirstCycle = cycle.cycle_number === 1;
      const isChampion = tierConfig.code === 'champion';
      const isVisionary = tierConfig.code === 'visionary';

      // Extract raw financial values directly from the DB snapshot (fallback to tierConfig for
      // legacy snapshots captured before a given field existed).
      const snapshotUnitAmount = configSnapshot?.joining_amount ? D(configSnapshot.joining_amount.toString()) : null;
      // Visionary's X3 leg unit amount doubles/re-subscribes cycle over cycle (200 -> 400 -> 800 -> ...);
      // the current cycle's unit amount is carried forward on its own configuration_snapshot by
      // VisionaryPoolService when it creates this cycle. Only cycle 1 (no snapshot yet written by
      // VisionaryPoolService) falls back to the tier's base 200 USDT unit.
      const visionaryUnitAmount = configSnapshot?.visionary_pool_unit_amount
        ? D(configSnapshot.visionary_pool_unit_amount.toString())
        : D(tierConfig.visionaryPart1Amount ?? tierConfig.subscriptionAmount);
      const unitAmount = isVisionary ? visionaryUnitAmount : (snapshotUnitAmount ?? D(tierConfig.subscriptionAmount));
      const matrixSize = configSnapshot?.matrix_size ? parseInt(configSnapshot.matrix_size.toString(), 10) : tierConfig.slotsPerCycle;
      const retopupAmount = configSnapshot?.retopup_amount ? D(configSnapshot.retopup_amount.toString()) : D(tierConfig.resubscribeAmount);

      // Core Mathematical Formula: Collection = Unit Amount * Matrix Size
      const collectionAmount = unitAmount.times(matrixSize);

      let grossRewardDecimal: Prisma.Decimal;
      const extras: ExtraDestination[] = [];

      if (isFirstCycle && isChampion) {
        // Cycle 1: Champion -> collection minus resubscription minus Visionary-activation funding
        const mainPlanAmount = D(tierConfig.mainPlanAmount ?? 0);
        grossRewardDecimal = collectionAmount.minus(retopupAmount).minus(mainPlanAmount);
        if (mainPlanAmount.greaterThan(0) && tierConfig.upgradeTarget) {
          extras.push({
            entryType: 'NEXT_TIER_ACTIVATION_FUNDING',
            amount: mainPlanAmount,
            description: `Cycle #1 funding toward ${tierConfig.upgradeTarget} activation`,
            metadata: { target_tier: tierConfig.upgradeTarget },
          });
        }
      } else if (isVisionary) {
        // Visionary's X3 leg: pure recycling, never any income — pool progression (who gets
        // re-subscribed at the same unit vs advanced to double the unit) is handled entirely by
        // VisionaryPoolService.processPoolProgression, not here. This service's only job for
        // Visionary is computing the correct collectionAmount for capping/ledger-shape purposes.
        grossRewardDecimal = D(0);
      } else if (isFirstCycle) {
        // Cycle 1: every other tier (Launch/Starter/Builder/Leader) -> zero income,
        // all funds go to re-topup (handled by RetopupService) + next-tier funding + (Builder) reserve.
        grossRewardDecimal = D(0);
        const upgradeAmount = tierConfig.upgradeAmount != null ? D(tierConfig.upgradeAmount) : null;
        if (upgradeAmount && upgradeAmount.greaterThan(0) && tierConfig.upgradeTarget) {
          extras.push({
            entryType: 'NEXT_TIER_ACTIVATION_FUNDING',
            amount: upgradeAmount,
            description: `Cycle #1 funding toward ${tierConfig.upgradeTarget} activation`,
            metadata: { target_tier: tierConfig.upgradeTarget },
          });
        }
        if (tierConfig.code === 'builder' && tierConfig.reserveAmount) {
          extras.push({
            entryType: 'BITITAN_CREDIT',
            amount: D(tierConfig.reserveAmount),
            description: `Cycle #1 Bititan Wallet reserve (kept separate from Income Wallet)`,
            metadata: {},
          });
        }
      } else {
        // Cycle 2+: ALL non-Visionary tiers -> collection minus resubscription only, rest goes to wallet.
        grossRewardDecimal = collectionAmount.minus(retopupAmount);
      }

      const grossReward = grossRewardDecimal.toNumber();

      // 2. Check and apply Daily Capping via DailyCappingService.
      // Launch and Visionary never reach here with grossReward>0 in a way that matters, since
      // capping_enabled=false on their LevelConfiguration row skips this block entirely.
      const cappingEnabled = configSnapshot?.capping_enabled !== false;
      let cappingEval = null;
      let allowedReward = grossReward;
      let cappedExcess = 0;
      let dailyCapLimit = 5;
      let currentGrossToday = 0;
      let isCapped = false;

      if (grossReward > 0 && cappingEnabled) {
        cappingEval = await DailyCappingService.evaluateAndApplyCapping(
          userId,
          levelConfigId,
          grossReward,
          CappingHandlingType.HELD,
          undefined,
          tx
        );

        allowedReward = cappingEval.allowedThisTransaction;
        cappedExcess = cappingEval.excessThisTransaction;
        dailyCapLimit = cappingEval.dailyCycleLimit;
        currentGrossToday = cappingEval.grossEarnings;
        isCapped = cappingEval.isCapped;
      }

      // 3. Create Wallet Ledger Credit (Idempotent) for the primary MATRIX_REWARD leg
      const idempotencyKey = `reward-mc-${cycleId}`;

      const existingLedger = await tx.walletLedger.findUnique({
        where: { idempotency_key: idempotencyKey },
      });

      let transaction: any = null;
      let ledgerEntry: any = null;

      if (existingLedger) {
        logger.info(
          { userId, cycleId, idempotencyKey },
          '[MatrixRewardService] Cycle reward ledger credit already exists (idempotent)'
        );
        ledgerEntry = existingLedger;
        allowedReward = parseFloat(existingLedger.amount.toString());
      } else {
        // 4. Determine actual wallet recipient (Participant vs Immediate Sponsor)
        let recipientUserId = userId;
        let isRedirectedToSponsor = false;

        if (isCapped && grossReward > 0) {
          const participantUser = await tx.user.findUnique({
            where: { id: userId },
            select: { sponsor_id: true },
          });

          if (participantUser?.sponsor_id) {
            recipientUserId = participantUser.sponsor_id;
            isRedirectedToSponsor = true;

            logger.info(
              { originalUserId: userId, sponsorId: recipientUserId, cycleId },
              '[MatrixRewardService] Cycle reward capped. Redirecting reward to immediate sponsor.'
            );
          } else {
            logger.warn(
              { userId, cycleId },
              '[MatrixRewardService] Cycle reward capped but user has NO immediate sponsor. Reward is lost.'
            );
          }
        }

        // 5. Create Transaction + WalletLedger credit (attributed to the recipient)
        if (grossReward > 0 && (recipientUserId === userId || isRedirectedToSponsor)) {
          transaction = await tx.transaction.create({
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
                original_participant_id: userId,
              },
              completed_at: new Date(),
            },
          });

          try {
            ledgerEntry = await tx.walletLedger.create({
              data: {
                user_id: recipientUserId,
                transaction_id: transaction.id,
                entry_type: 'MATRIX_REWARD',
                direction: 'CREDIT',
                amount: new Prisma.Decimal(grossReward),
                available_amount: new Prisma.Decimal(grossReward),
                status: 'AVAILABLE',
                idempotency_key: idempotencyKey,
                source_type: 'MATRIX_CYCLE',
                source_id: cycleId,
                metadata: {
                  cycle_number: cycleNumber,
                  tier_code: tierConfig.code,
                  is_capped_redirect: isRedirectedToSponsor,
                  original_participant_id: userId,
                },
              },
            });
          } catch (err: any) {
            if (err.code === 'P2002' || err.message?.includes('idempotency_key')) {
              ledgerEntry = await tx.walletLedger.findUnique({
                where: { idempotency_key: idempotencyKey },
              });
            } else {
              throw err;
            }
          }

          logger.info(
            { recipientUserId, originalUserId: userId, cycleId, amount: grossReward, isRedirectedToSponsor },
            '[MatrixRewardService] Successfully credited cycle reward'
          );
        }
      }

      // 6. Create explicit, independently-idempotent ledger entries for every "invisible" leg
      // (next-tier activation funding, Builder's Bititan reserve). Always credited to the cycle
      // owner — these are structural allocations from their own cycle, not a different person's
      // income, and are excluded from availableBalance/totalEarned by WalletService.getSummary.
      const extraDestinations: RewardCalculationResult['extraDestinations'] = [];
      for (const extra of extras) {
        if (extra.amount.lessThanOrEqualTo(0)) continue;

        const extraIdempotencyKey = `reward-mc-${cycleId}-${extra.entryType}`;
        const existingExtraLedger = await tx.walletLedger.findUnique({
          where: { idempotency_key: extraIdempotencyKey },
        });

        if (existingExtraLedger) {
          extraDestinations.push({
            entryType: extra.entryType,
            amount: parseFloat(existingExtraLedger.amount.toString()),
            transaction: null,
            ledgerEntry: existingExtraLedger,
          } as any);
          continue;
        }

        const extraTransaction = await tx.transaction.create({
          data: {
            user_id: userId,
            transaction_type: extra.entryType === 'BITITAN_CREDIT' ? 'BOOSTER_REWARD' : 'UPGRADE',
            amount: extra.amount,
            currency: 'USDT',
            status: 'COMPLETED',
            description: extra.description,
            metadata: {
              cycle_id: cycleId,
              cycle_number: cycleNumber,
              tier_code: tierConfig.code,
              ...extra.metadata,
            },
            completed_at: new Date(),
          },
        });

        let extraLedgerEntry: any;
        try {
          extraLedgerEntry = await tx.walletLedger.create({
            data: {
              user_id: userId,
              transaction_id: extraTransaction.id,
              entry_type: extra.entryType,
              direction: 'CREDIT',
              amount: extra.amount,
              available_amount: D(0), // structural allocation, not spendable — excluded from balance summaries
              status: 'COMPLETED',
              idempotency_key: extraIdempotencyKey,
              source_type: 'MATRIX_CYCLE',
              source_id: cycleId,
              metadata: {
                cycle_number: cycleNumber,
                tier_code: tierConfig.code,
                ...extra.metadata,
              },
            },
          });
        } catch (err: any) {
          if (err.code === 'P2002' || err.message?.includes('idempotency_key')) {
            extraLedgerEntry = await tx.walletLedger.findUnique({
              where: { idempotency_key: extraIdempotencyKey },
            });
          } else {
            throw err;
          }
        }

        logger.info(
          { userId, cycleId, entryType: extra.entryType, amount: extra.amount.toString() },
          '[MatrixRewardService] Successfully credited explicit cycle destination'
        );

        extraDestinations.push({
          entryType: extra.entryType,
          amount: extra.amount.toNumber(),
          transaction: extraTransaction,
          ledgerEntry: extraLedgerEntry,
        });
      }

      return {
        grossReward,
        allowedReward: isCapped ? 0 : grossReward,
        cappedExcess: isCapped ? grossReward : 0,
        dailyCapLimit,
        currentGrossToday,
        ledgerEntry,
        transaction,
        extraDestinations,
      };
    };

    if (db !== prisma) {
      return execute(db);
    }
    return prisma.$transaction(execute, { maxWait: 5000, timeout: 10000 });
  }
}

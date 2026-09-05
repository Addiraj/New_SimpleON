import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { BoosterConfigService } from './BoosterConfigService.js';

const D = (v: number | string) => new Prisma.Decimal(v);

export interface PoolProgressionResult {
  reSubscriptionCycle: any;
  advanceCycle: any;
  reSubscriptionAmount: number;
  advanceAmount: number;
}

/**
 * Visionary Part 1 (X3, 200 USDT base unit) pool-doubling recycler.
 *
 * Per spec: on completing a cycle at pool value P (3 members x P = 3P collected), two new
 * cycles are created simultaneously for the same user:
 *   - a re-subscription cycle at the SAME unit value P (the "D" leg, 1/3 of the collection)
 *   - an advance cycle at DOUBLE the unit value, 2P (the "B+C" leg, 2/3 of the collection)
 * Progression: 200 -> 400 -> 800 -> 1600 -> ... uncapped, forever. No income is ever generated
 * by this leg — MatrixRewardService always credits 0 for Visionary cycles; this service is the
 * only place Visionary's X3 collection is actually "consumed".
 *
 * The pool's current unit amount travels on each MatrixCycle's own `configuration_snapshot.
 * visionary_pool_unit_amount` field (no schema migration needed) so MatrixRewardService can
 * read the correct per-cycle collection amount (unitAmount * 3) without a separate tracking
 * table. Cycle numbering: since two cycles are created per completion (a branching tree, not a
 * single linear chain), `cycle_number` is assigned from the user's total Visionary cycle count
 * so far rather than `completedCycle.cycle_number + 1`, avoiding a collision on the
 * (user_id, level_configuration_id, cycle_number) unique constraint.
 */
export class VisionaryPoolService {
  static async processPoolProgression(
    cycle: any,
    configSnapshot: any,
    db: any = prisma
  ): Promise<PoolProgressionResult> {
    const userId = cycle.user_id;
    const cycleId = cycle.id;
    const currentCycleNumber = cycle.cycle_number;
    const levelConfigId = cycle.level_configuration_id;
    const tierConfig = BoosterConfigService.assertTierConfig('visionary');

    const currentUnitAmount = configSnapshot?.visionary_pool_unit_amount
      ? D(configSnapshot.visionary_pool_unit_amount.toString())
      : D(tierConfig.visionaryPart1Amount ?? 200);
    const advanceAmount = currentUnitAmount.times(2);

    const execute = async (tx: any): Promise<PoolProgressionResult> => {
      // Re-subscription leg (D): same unit amount, ledger-equivalent of a RETOPUP_DEBIT.
      const resubIdempotencyKey = `visionary-pool-resub-${cycleId}`;
      let debitLedger = await tx.walletLedger.findUnique({ where: { idempotency_key: resubIdempotencyKey } });
      if (!debitLedger) {
        const debitTransaction = await tx.transaction.create({
          data: {
            user_id: userId,
            transaction_type: 'RETOPUP',
            amount: currentUnitAmount,
            currency: 'USDT',
            status: 'COMPLETED',
            description: `Visionary X3 re-subscription (Cycle #${currentCycleNumber}, pool ${currentUnitAmount.toString()} USDT)`,
            metadata: { cycle_id: cycleId, cycle_number: currentCycleNumber, pool_unit_amount: currentUnitAmount.toNumber() },
            completed_at: new Date(),
          },
        });
        debitLedger = await tx.walletLedger.create({
          data: {
            user_id: userId,
            transaction_id: debitTransaction.id,
            entry_type: 'RETOPUP_DEBIT',
            direction: 'DEBIT',
            amount: currentUnitAmount,
            status: 'COMPLETED',
            idempotency_key: resubIdempotencyKey,
            source_type: 'MATRIX_CYCLE',
            source_id: cycleId,
            metadata: { cycle_number: currentCycleNumber, pool_unit_amount: currentUnitAmount.toNumber() },
          },
        });
      }

      // Advance leg (B+C): double the unit amount, ledger-equivalent of NEXT_TIER_ACTIVATION_FUNDING
      // (structural, excluded from Income Wallet — same convention as every other tier's leg).
      const advanceIdempotencyKey = `visionary-pool-advance-${cycleId}`;
      let advanceLedger = await tx.walletLedger.findUnique({ where: { idempotency_key: advanceIdempotencyKey } });
      if (!advanceLedger) {
        const advanceTransaction = await tx.transaction.create({
          data: {
            user_id: userId,
            transaction_type: 'UPGRADE',
            amount: advanceAmount,
            currency: 'USDT',
            status: 'COMPLETED',
            description: `Visionary X3 pool advance (Cycle #${currentCycleNumber}: ${currentUnitAmount.toString()} -> ${advanceAmount.toString()} USDT pool)`,
            metadata: { cycle_id: cycleId, cycle_number: currentCycleNumber, from_pool: currentUnitAmount.toNumber(), to_pool: advanceAmount.toNumber() },
            completed_at: new Date(),
          },
        });
        advanceLedger = await tx.walletLedger.create({
          data: {
            user_id: userId,
            transaction_id: advanceTransaction.id,
            entry_type: 'NEXT_TIER_ACTIVATION_FUNDING',
            direction: 'CREDIT',
            amount: advanceAmount,
            available_amount: D(0),
            status: 'COMPLETED',
            idempotency_key: advanceIdempotencyKey,
            source_type: 'MATRIX_CYCLE',
            source_id: cycleId,
            metadata: { cycle_number: currentCycleNumber, from_pool: currentUnitAmount.toNumber(), to_pool: advanceAmount.toNumber() },
          },
        });
      }

      // Already progressed (idempotent replay) — return the existing children rather than
      // attempting to create duplicates.
      const existingChildren = await tx.matrixCycle.findMany({
        where: { previous_cycle_id: cycleId },
      });
      const existingResub = existingChildren.find(
        (c: any) => (c.configuration_snapshot as any)?.visionary_pool_unit_amount === currentUnitAmount.toNumber()
      );
      const existingAdvance = existingChildren.find(
        (c: any) => (c.configuration_snapshot as any)?.visionary_pool_unit_amount === advanceAmount.toNumber()
      );
      if (existingResub && existingAdvance) {
        return {
          reSubscriptionCycle: existingResub,
          advanceCycle: existingAdvance,
          reSubscriptionAmount: currentUnitAmount.toNumber(),
          advanceAmount: advanceAmount.toNumber(),
        };
      }

      // Create the two next cycles (re-subscription at P, advance at 2P), both children of this
      // completed cycle via previous_cycle_id. cycle_number is derived from the user's total
      // Visionary cycle count so far (not completedCycle.cycle_number + 1) since two cycles are
      // created per completion — a branching tree, not a single linear chain — and cycle_number
      // is unique per (user_id, level_configuration_id, cycle_number).
      const existingCount = await tx.matrixCycle.count({
        where: { user_id: userId, level_configuration_id: levelConfigId },
      });
      const resubCycleNumber = existingCount + 1;
      const advanceCycleNumber = existingCount + 2;
      const now = new Date();

      const resubCycleId = `mc-${userId}-${levelConfigId}-c${resubCycleNumber}`;
      const reSubscriptionCycle = await tx.matrixCycle.create({
        data: {
          id: resubCycleId,
          user_id: userId,
          level_configuration_id: levelConfigId,
          cycle_number: resubCycleNumber,
          total_positions: 3,
          filled_positions: 0,
          status: 'ACTIVE',
          previous_cycle_id: cycleId,
          configuration_snapshot: { ...configSnapshot, visionary_pool_unit_amount: currentUnitAmount.toNumber() },
          started_at: now,
        },
      });

      const advanceCycleId = `mc-${userId}-${levelConfigId}-c${advanceCycleNumber}`;
      const advanceCycle = await tx.matrixCycle.create({
        data: {
          id: advanceCycleId,
          user_id: userId,
          level_configuration_id: levelConfigId,
          cycle_number: advanceCycleNumber,
          total_positions: 3,
          filled_positions: 0,
          status: 'ACTIVE',
          previous_cycle_id: cycleId,
          configuration_snapshot: { ...configSnapshot, visionary_pool_unit_amount: advanceAmount.toNumber() },
          started_at: now,
        },
      });

      // next_cycle_id (single-valued) points at the "primary" advance cycle for UI purposes;
      // the re-subscription cycle is still discoverable via previous_cycle_id.
      await tx.matrixCycle.update({
        where: { id: cycleId },
        data: { next_cycle_id: advanceCycle.id },
      });

      logger.info(
        {
          userId,
          cycleId,
          currentUnitAmount: currentUnitAmount.toNumber(),
          advanceAmount: advanceAmount.toNumber(),
          reSubscriptionCycleId: reSubscriptionCycle.id,
          advanceCycleId: advanceCycle.id,
        },
        '[VisionaryPoolService] Processed X3 pool progression (re-subscription + advance)'
      );

      return {
        reSubscriptionCycle,
        advanceCycle,
        reSubscriptionAmount: currentUnitAmount.toNumber(),
        advanceAmount: advanceAmount.toNumber(),
      };
    };

    if (db !== prisma) {
      return execute(db);
    }
    return prisma.$transaction(execute, { maxWait: 5000, timeout: 10000 });
  }
}

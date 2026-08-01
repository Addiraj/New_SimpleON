import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { BoosterConfigService } from './BoosterConfigService.js';

export interface RetopupResult {
  retopupDeducted: boolean;
  retopupAmount: number;
  debitLedger: any | null;
  nextCycle: any | null;
}

export class RetopupService {
  /**
   * Evaluates re-topup rules upon cycle completion.
   * Deducts re-topup debit if enabled and creates the next matrix cycle (Cycle N+1).
   * Ensures idempotency via unique ledger idempotency key `retopup-mc-${cycleId}`.
   *
   * @param cycle Completed MatrixCycle record
   * @param configSnapshot Saved level configuration snapshot
   * @param db Prisma transaction client
   */
  static async processRetopupAndNextCycle(
    cycle: any,
    configSnapshot: any,
    db: any = prisma
  ): Promise<RetopupResult> {
    const userId = cycle.user_id;
    const cycleId = cycle.id;
    const currentCycleNumber = cycle.cycle_number;

    const retopupEnabled = configSnapshot.retopup_enabled !== false;
    const tierConfig = BoosterConfigService.getTierConfig(configSnapshot.slug) || BoosterConfigService.assertTierConfig('starter');
    const retopupAmount = retopupEnabled ? tierConfig.resubscribeAmount : 0;

    let debitLedger: any = null;

    // 1. Record Re-Topup Ledger Debit if enabled
    if (retopupEnabled && retopupAmount > 0) {
      const idempotencyKey = `retopup-mc-${cycleId}`;

      const existingDebit = await db.walletLedger.findUnique({
        where: { idempotency_key: idempotencyKey },
      });

      if (existingDebit) {
        logger.info(
          { userId, cycleId, idempotencyKey },
          '[RetopupService] Re-topup debit already exists (idempotent)'
        );
        debitLedger = existingDebit;
      } else {
        // Create Transaction
        const transaction = await db.transaction.create({
          data: {
            user_id: userId,
            transaction_type: 'RETOPUP',
            amount: new Prisma.Decimal(retopupAmount),
            currency: 'USDT',
            status: 'COMPLETED',
            description: `Auto Re-topup deduction for Matrix Cycle #${currentCycleNumber}`,
            metadata: {
              cycle_id: cycleId,
              cycle_number: currentCycleNumber,
              retopup_amount: retopupAmount,
            },
            completed_at: new Date(),
          },
        });

        // Create Wallet Ledger Debit
        debitLedger = await db.walletLedger.create({
          data: {
            user_id: userId,
            transaction_id: transaction.id,
            entry_type: 'RETOPUP_DEBIT',
            direction: 'DEBIT',
            amount: new Prisma.Decimal(retopupAmount),
            status: 'COMPLETED',
            idempotency_key: idempotencyKey,
            source_type: 'MATRIX_CYCLE',
            source_id: cycleId,
            metadata: {
              cycle_number: currentCycleNumber,
            },
          },
        });

        logger.info(
          { userId, cycleId, retopupAmount },
          '[RetopupService] Successfully created re-topup debit entry'
        );
      }
    }

    // 2. Create Next Matrix Cycle (Cycle N+1) & Link Sequences
    const nextCycleNumber = currentCycleNumber + 1;
    const nextCycleId = `mc-${userId}-${cycle.level_configuration_id}-c${nextCycleNumber}`;
    const totalPositions = cycle.total_positions || configSnapshot.matrix_size || 5;

    let nextCycle: any = null;

    if (retopupEnabled) {
      const now = new Date();
      nextCycle = await db.matrixCycle.upsert({
        where: { id: nextCycleId },
        create: {
          id: nextCycleId,
          user_id: userId,
          level_configuration_id: cycle.level_configuration_id,
          cycle_number: nextCycleNumber,
          total_positions: totalPositions,
          filled_positions: 0,
          status: 'ACTIVE',
          previous_cycle_id: cycleId,
          configuration_snapshot: configSnapshot,
          started_at: now,
        },
        update: {
          status: 'ACTIVE',
          previous_cycle_id: cycleId,
        },
      });

      // Link current cycle's next_cycle_id
      await db.matrixCycle.update({
        where: { id: cycleId },
        data: {
          next_cycle_id: nextCycle.id,
        },
      });

      logger.info(
        { userId, cycleId, nextCycleId },
        `[RetopupService] Created and linked next Matrix Cycle #${nextCycleNumber}`
      );
    }

    return {
      retopupDeducted: retopupEnabled && retopupAmount > 0,
      retopupAmount,
      debitLedger,
      nextCycle,
    };
  }
}

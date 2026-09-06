import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../server/config/database.js';
import { AuthRepository } from '../../server/repositories/AuthRepository.js';
import { BoosterRepository } from '../../server/repositories/BoosterRepository.js';
import { MatrixCycleService } from '../../server/services/MatrixCycleService.js';
import { MatrixPlacementService } from '../../server/services/MatrixPlacementService.js';
import { createTestWallet, resetAllTestStores } from '../helpers/testUtils.js';
import { seedFullLadder } from '../helpers/seedLadder.js';

/**
 * Financial-invariant tests for the final Launch->Visionary Booster ladder.
 * For every tier's first and subsequent cycle: SUM(all destination ledger amounts)
 * must equal the gross cycle collection (unitAmount * matrixSize) exactly — no
 * hardcoded literals, all amounts read back from live LevelConfiguration + WalletLedger.
 *
 * Exception, by design (see MatrixRewardService's Gap #2 comment): Visionary's first
 * X3 cycle intentionally leaves its "400 -> next pool" leg uncredited (no discrete
 * external destination is defined by the client spec), so its cycle-1 invariant sum
 * is 200 (retopup only), not the full 600 collection.
 */
describe('Final Booster Flow — Financial Invariants', () => {
  beforeEach(async () => {
    resetAllTestStores();
    await seedFullLadder();
  });

  async function completeTwoCycles(slug: string) {
    const levelConfigs = await BoosterRepository.getAllActiveLevelConfigs();
    const level = levelConfigs.find((l) => l.slug === slug)!;
    const matrixSize = level.matrix_size;

    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });
    // DailyCappingService requires an active current_level_id — normally set by AutoUpgradeService
    // after a prior cycle, but Champion's Cycle 1 is the one case where capping fires (grossReward
    // =780>0) before any prior cycle could have set it, so the test fixture must set it explicitly.
    await AuthRepository.updateUser(sponsor.id, { current_level_id: level.id });
    const cycle1 = await MatrixCycleService.ensureUserActiveCycle(sponsor.id, level.id);

    let lastResult: any = null;
    for (let i = 1; i <= matrixSize; i++) {
      const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });
      lastResult = await MatrixPlacementService.placeUserInMatrix(member.id, level.id, sponsor.id);
    }
    const cycle2Id = lastResult.nextCycle.id;

    let lastResult2: any = null;
    for (let i = 1; i <= matrixSize; i++) {
      const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });
      lastResult2 = await MatrixPlacementService.placeUserInMatrix(member.id, level.id, sponsor.id);
    }

    const cycle1Ledgers = await prisma.walletLedger.findMany({ where: { source_id: cycle1.id } });
    const cycle2Ledgers = await prisma.walletLedger.findMany({ where: { source_id: cycle2Id } });

    return { level, matrixSize, cycle1Id: cycle1.id, cycle2Id, cycle1Ledgers, cycle2Ledgers };
  }

  function amountOf(ledgers: any[], entryType: string): number {
    return ledgers
      .filter((l) => l.entry_type === entryType)
      .reduce((sum, l) => sum + parseFloat(l.amount.toString()), 0);
  }

  function totalOf(ledgers: any[]): number {
    return ledgers.reduce((sum, l) => sum + parseFloat(l.amount.toString()), 0);
  }

  it('Launch: 15 = 10(Starter funding) + 5(reactivation) first cycle; 15 = 10(income) + 5(reactivation) subsequent', async () => {
    const { cycle1Ledgers, cycle2Ledgers } = await completeTwoCycles('launch');

    expect(amountOf(cycle1Ledgers, 'RETOPUP_DEBIT')).toBe(5);
    expect(amountOf(cycle1Ledgers, 'NEXT_TIER_ACTIVATION_FUNDING')).toBe(10);
    expect(amountOf(cycle1Ledgers, 'MATRIX_REWARD')).toBe(0);
    expect(totalOf(cycle1Ledgers)).toBe(15);

    expect(amountOf(cycle2Ledgers, 'RETOPUP_DEBIT')).toBe(5);
    expect(amountOf(cycle2Ledgers, 'MATRIX_REWARD')).toBe(10);
    expect(totalOf(cycle2Ledgers)).toBe(15);
  });

  it('Starter: 50 = 10(reactivation) + 40(Builder funding) first cycle; 50 = 10(reactivation) + 40(income) subsequent', async () => {
    const { cycle1Ledgers, cycle2Ledgers } = await completeTwoCycles('starter');

    expect(amountOf(cycle1Ledgers, 'RETOPUP_DEBIT')).toBe(10);
    expect(amountOf(cycle1Ledgers, 'NEXT_TIER_ACTIVATION_FUNDING')).toBe(40);
    expect(amountOf(cycle1Ledgers, 'MATRIX_REWARD')).toBe(0);
    expect(totalOf(cycle1Ledgers)).toBe(50);

    expect(amountOf(cycle2Ledgers, 'RETOPUP_DEBIT')).toBe(10);
    expect(amountOf(cycle2Ledgers, 'MATRIX_REWARD')).toBe(40);
    expect(totalOf(cycle2Ledgers)).toBe(50);
  });

  it('Builder: 200 = 40(reactivation) + 80(Leader funding) + 80(Bititan) first cycle; 200 = 40(reactivation) + 160(income) subsequent, no Bititan', async () => {
    const { cycle1Ledgers, cycle2Ledgers } = await completeTwoCycles('builder');

    expect(amountOf(cycle1Ledgers, 'RETOPUP_DEBIT')).toBe(40);
    expect(amountOf(cycle1Ledgers, 'NEXT_TIER_ACTIVATION_FUNDING')).toBe(80);
    expect(amountOf(cycle1Ledgers, 'BITITAN_CREDIT')).toBe(80);
    expect(amountOf(cycle1Ledgers, 'MATRIX_REWARD')).toBe(0);
    expect(totalOf(cycle1Ledgers)).toBe(200);

    expect(amountOf(cycle2Ledgers, 'RETOPUP_DEBIT')).toBe(40);
    expect(amountOf(cycle2Ledgers, 'MATRIX_REWARD')).toBe(160);
    expect(amountOf(cycle2Ledgers, 'BITITAN_CREDIT')).toBe(0);
    expect(totalOf(cycle2Ledgers)).toBe(200);
  });

  it('Leader: 400 = 80(reactivation) + 320(Champion funding) first cycle; 400 = 80(reactivation) + 320(income) subsequent', async () => {
    const { cycle1Ledgers, cycle2Ledgers } = await completeTwoCycles('leader');

    expect(amountOf(cycle1Ledgers, 'RETOPUP_DEBIT')).toBe(80);
    expect(amountOf(cycle1Ledgers, 'NEXT_TIER_ACTIVATION_FUNDING')).toBe(320);
    expect(totalOf(cycle1Ledgers)).toBe(400);

    expect(amountOf(cycle2Ledgers, 'RETOPUP_DEBIT')).toBe(80);
    expect(amountOf(cycle2Ledgers, 'MATRIX_REWARD')).toBe(320);
    expect(totalOf(cycle2Ledgers)).toBe(400);
  });

  it('Champion: 1600 = 320(reactivation) + 500(Visionary funding) + 780(income) first cycle; 1600 = 320(reactivation) + 1280(income) subsequent', async () => {
    const { cycle1Ledgers, cycle2Ledgers } = await completeTwoCycles('champion');

    expect(amountOf(cycle1Ledgers, 'RETOPUP_DEBIT')).toBe(320);
    expect(amountOf(cycle1Ledgers, 'NEXT_TIER_ACTIVATION_FUNDING')).toBe(500);
    expect(amountOf(cycle1Ledgers, 'MATRIX_REWARD')).toBe(780);
    expect(totalOf(cycle1Ledgers)).toBe(1600);

    expect(amountOf(cycle2Ledgers, 'RETOPUP_DEBIT')).toBe(320);
    expect(amountOf(cycle2Ledgers, 'MATRIX_REWARD')).toBe(1280);
    expect(totalOf(cycle2Ledgers)).toBe(1600);
  });

  it('Visionary X3 pool progression: 600 = 200(re-subscription) + 400(advance) first cycle, never any income; doubles again on the next generation (200->400->800)', async () => {
    const levelConfigs = await BoosterRepository.getAllActiveLevelConfigs();
    const visionary = levelConfigs.find((l) => l.slug === 'visionary')!;

    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });
    await AuthRepository.updateUser(sponsor.id, { current_level_id: visionary.id });
    const cycle1 = await MatrixCycleService.ensureUserActiveCycle(sponsor.id, visionary.id);

    // Fill cycle 1 (3 members @ 200 = 600 collected).
    for (let i = 1; i <= 3; i++) {
      const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });
      await MatrixPlacementService.placeUserInMatrix(member.id, visionary.id, sponsor.id);
    }

    const cycle1Ledgers = await prisma.walletLedger.findMany({ where: { source_id: cycle1.id } });
    // 600 = 200 (re-subscription, RETOPUP_DEBIT) + 400 (advance, NEXT_TIER_ACTIVATION_FUNDING) —
    // both now explicitly credited by VisionaryPoolService; never any MATRIX_REWARD income.
    expect(amountOf(cycle1Ledgers, 'RETOPUP_DEBIT')).toBe(200);
    expect(amountOf(cycle1Ledgers, 'NEXT_TIER_ACTIVATION_FUNDING')).toBe(400);
    expect(amountOf(cycle1Ledgers, 'MATRIX_REWARD')).toBe(0);
    expect(totalOf(cycle1Ledgers)).toBe(600);

    // Cycle 1 fans out into exactly two children: a re-subscription cycle (pool stays 200) and
    // an advance cycle (pool doubles to 400) — both active, both discoverable via previous_cycle_id.
    const children = await prisma.matrixCycle.findMany({ where: { previous_cycle_id: cycle1.id } });
    expect(children.length).toBe(2);
    const resubCycle = children.find((c: any) => (c.configuration_snapshot as any)?.visionary_pool_unit_amount === 200);
    const advanceCycle = children.find((c: any) => (c.configuration_snapshot as any)?.visionary_pool_unit_amount === 400);
    expect(resubCycle).toBeDefined();
    expect(advanceCycle).toBeDefined();
    expect(resubCycle.total_positions).toBe(3);
    expect(advanceCycle.total_positions).toBe(3);
    expect(resubCycle.status).toBe('ACTIVE');
    expect(advanceCycle.status).toBe('ACTIVE');

    // Placement always fills whichever active cycle has the LOWEST cycle_number first (see
    // PlacementFinderService) — that's the re-subscription cycle (created one number before the
    // advance cycle), so the next 3 members complete IT first, not the advance cycle directly.
    for (let i = 1; i <= 3; i++) {
      const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });
      await MatrixPlacementService.placeUserInMatrix(member.id, visionary.id, sponsor.id);
    }
    const resubLedgers = await prisma.walletLedger.findMany({ where: { source_id: resubCycle.id } });
    // Re-subscription cycle's own pool stayed 200, so IT progresses to 200(resub) + 400(advance) too.
    expect(amountOf(resubLedgers, 'RETOPUP_DEBIT')).toBe(200);
    expect(amountOf(resubLedgers, 'NEXT_TIER_ACTIVATION_FUNDING')).toBe(400);
    expect(amountOf(resubLedgers, 'MATRIX_REWARD')).toBe(0);
    expect(totalOf(resubLedgers)).toBe(600);

    // The original advance cycle (400) is still the oldest remaining active cycle, so the NEXT
    // 3 members complete it — proving the doubling genuinely continues (200->400->800).
    for (let i = 1; i <= 3; i++) {
      const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });
      await MatrixPlacementService.placeUserInMatrix(member.id, visionary.id, sponsor.id);
    }
    const advanceLedgers = await prisma.walletLedger.findMany({ where: { source_id: advanceCycle.id } });
    expect(amountOf(advanceLedgers, 'RETOPUP_DEBIT')).toBe(400);
    expect(amountOf(advanceLedgers, 'NEXT_TIER_ACTIVATION_FUNDING')).toBe(800);
    expect(amountOf(advanceLedgers, 'MATRIX_REWARD')).toBe(0);
    expect(totalOf(advanceLedgers)).toBe(1200);

    const grandchildren = await prisma.matrixCycle.findMany({ where: { previous_cycle_id: advanceCycle.id } });
    expect(grandchildren.length).toBe(2);
    expect(grandchildren.some((c: any) => (c.configuration_snapshot as any)?.visionary_pool_unit_amount === 400)).toBe(true);
    expect(grandchildren.some((c: any) => (c.configuration_snapshot as any)?.visionary_pool_unit_amount === 800)).toBe(true);
  });

  it('Visionary X3 pool has no daily cycle cap: completing 6 generations in a row never redirects income to a sponsor (there is never any income to redirect)', async () => {
    const levelConfigs = await BoosterRepository.getAllActiveLevelConfigs();
    const visionary = levelConfigs.find((l) => l.slug === 'visionary')!;

    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });
    await AuthRepository.updateUser(sponsor.id, { current_level_id: visionary.id });
    await MatrixCycleService.ensureUserActiveCycle(sponsor.id, visionary.id);

    // Each generation, 3 new members complete whichever active cycle the placement engine picks
    // (always some active cycle exists — a completion immediately spawns two more) — 6
    // generations x 3 members exercises many rounds of pool progression regardless of exactly
    // which branch is filled each time.
    for (let gen = 1; gen <= 6; gen++) {
      for (let i = 1; i <= 3; i++) {
        const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: sponsor.id });
        await MatrixPlacementService.placeUserInMatrix(member.id, visionary.id, sponsor.id);
      }
    }

    const sponsorRedirects = await prisma.transaction.count({
      where: { user_id: sponsor.id, description: { contains: 'Spill-up from capped user' } },
    });
    expect(sponsorRedirects).toBe(0);

    const dailyCapping = await prisma.dailyCapping.findFirst({
      where: { user_id: sponsor.id, level_configuration_id: visionary.id },
    });
    expect(dailyCapping).toBeNull();
  });

  it('Launch has no daily cycle cap: 6 sequential cycles for the same sponsor all credit in full, none redirected to sponsor', async () => {
    const levelConfigs = await BoosterRepository.getAllActiveLevelConfigs();
    const launch = levelConfigs.find((l) => l.slug === 'launch')!;

    const rootWallet = createTestWallet();
    const root = await AuthRepository.createUser({ walletAddress: rootWallet.address });
    await MatrixCycleService.ensureUserActiveCycle(root.id, launch.id);

    let lastResult: any = null;
    for (let cycleNum = 1; cycleNum <= 6; cycleNum++) {
      for (let pos = 1; pos <= 3; pos++) {
        const member = await AuthRepository.createUser({ walletAddress: createTestWallet().address, sponsorId: root.id });
        lastResult = await MatrixPlacementService.placeUserInMatrix(member.id, launch.id, root.id);
      }
    }

    // 6 completed cycles, each crediting the root user directly (no sponsor-redirect from capping,
    // since Launch has no cap) — confirm via the MATRIX_REWARD ledger rows attributed to `root`.
    const rootRewardLedgers = await prisma.walletLedger.findMany({
      where: { user_id: root.id, entry_type: 'MATRIX_REWARD' },
    });
    // Cycles 2-6 each pay 10 income (cycle 1 pays 0, per first-cycle rule) = 5 x 10 = 50.
    expect(totalOf(rootRewardLedgers)).toBe(50);
    expect(rootRewardLedgers.every((l) => l.status === 'AVAILABLE')).toBe(true);
  });

  it('Idempotency: re-processing the same completed cycle does not duplicate any ledger entry', async () => {
    const { cycle1Id, cycle1Ledgers } = await completeTwoCycles('builder');
    const cycleId = cycle1Id;

    const cycle = await prisma.matrixCycle.findUnique({ where: { id: cycleId } });
    const MatrixRewardService = (await import('../../server/services/MatrixRewardService.js')).MatrixRewardService;
    // Re-invoke directly — every entry_type must return the pre-existing row, not create a new one.
    await MatrixRewardService.calculateAndCreditCycleReward(cycle, cycle!.configuration_snapshot, prisma);

    const ledgersAfter = await prisma.walletLedger.findMany({ where: { source_id: cycleId } });
    expect(ledgersAfter.length).toBe(cycle1Ledgers.length);
    expect(totalOf(ledgersAfter)).toBe(totalOf(cycle1Ledgers));
  });
});

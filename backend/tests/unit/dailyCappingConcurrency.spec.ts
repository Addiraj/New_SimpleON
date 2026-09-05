import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../server/config/database.js';
import { DailyCappingService } from '../../server/services/DailyCappingService.js';
import { MatrixRewardService } from '../../server/services/MatrixRewardService.js';
import { BoosterConfigService } from '../../server/services/BoosterConfigService.js';

describe('Daily Capping Concurrency & Race Condition Test Suite', () => {
  let sponsorId: string;
  let userId: string;
  let levelConfigId: string;

  beforeEach(async () => {
    // 1. Clear test records for clean environment
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE daily_cappings, daily_earnings, wallet_ledgers, transactions, matrix_cycles, referral_relations, users, level_configurations CASCADE;`);

    // 2. Seed Level Configuration
    const levelConfig = await prisma.levelConfiguration.create({
      data: {
        id: 'cfg-starter-v1',
        name: 'Starter Pool',
        slug: 'starter',
        level_order: 1,
        joining_amount: 10,
        upgrade_amount: 40,
        matrix_size: 5,
        income_per_position: 2,
        cycle_reward: 10,
        retopup_amount: 10,
        daily_cap: 0,
        daily_cycle_limit: 5,
        required_direct_referrals: 0,
        required_qualified_builders: 0,
        auto_upgrade_enabled: true,
        retopup_enabled: true,
        status: 'ACTIVE',
        version: 1,
      },
    });
    levelConfigId = levelConfig.id;

    // 3. Create Sponsor & Participant Users
    const sponsor = await prisma.user.create({
      data: {
        wallet_address: `0xsponsor_${Date.now()}_${Math.random()}`,
        referral_code: `SPONSOR_${Math.floor(Math.random() * 1000000)}`,
        current_level_id: levelConfigId,
        status: 'ACTIVE',
      },
    });
    sponsorId = sponsor.id;

    const user = await prisma.user.create({
      data: {
        wallet_address: `0xuser_${Date.now()}_${Math.random()}`,
        referral_code: `USER_${Math.floor(Math.random() * 1000000)}`,
        sponsor_id: sponsorId,
        current_level_id: levelConfigId,
        status: 'ACTIVE',
      },
    });
    userId = user.id;

    // 4. Create Referral Relation (depth = 1)
    await prisma.referralRelation.create({
      data: {
        sponsor_user_id: sponsorId,
        referred_user_id: userId,
        depth: 1,
        status: 'ACTIVE',
      },
    });
  });

  it('A. Sequential test: 5 cycles to participant, 6th cycle to sponsor', async () => {
    // Cycle #1 always has zero income for Starter (first-cycle funds re-topup + next-tier
    // activation, per spec) and is never capping-evaluated — so 7 total cycles are needed for
    // 5 income-bearing completions (cycles 2-6) plus a 6th income-bearing, capped cycle (cycle 7).
    for (let i = 1; i <= 7; i++) {
      const cycle = await prisma.matrixCycle.create({
        data: {
          user_id: userId,
          level_configuration_id: levelConfigId,
          cycle_number: i,
          status: 'COMPLETED',
        },
      });

      await MatrixRewardService.calculateAndCreditCycleReward(
        cycle,
        { slug: 'starter' },
        prisma
      );
    }

    const cappingRecord = await prisma.dailyCapping.findFirst({
      where: { user_id: userId, level_configuration_id: levelConfigId },
    });

    expect(cappingRecord?.completed_cycle_count).toBe(5);
    expect(cappingRecord?.capped_cycle_count).toBe(1);

    // Verify 5 MATRIX_REWARD transactions for participant, 1 for sponsor (cycle #1's unrelated
    // NEXT_TIER_ACTIVATION_FUNDING extra — always created for Starter's first cycle — is excluded).
    const userTxCount = await prisma.transaction.count({ where: { user_id: userId, transaction_type: 'MATRIX_REWARD' } });
    const sponsorTxCount = await prisma.transaction.count({ where: { user_id: sponsorId, transaction_type: 'MATRIX_REWARD' } });

    expect(userTxCount).toBe(5);
    expect(sponsorTxCount).toBe(1);
  });

  it('B. Two concurrent cycles at limit=5, count=4: exactly 1 participant credit, 1 sponsor credit', async () => {
    // Setup initial state: completed_cycle_count = 4
    await prisma.dailyCapping.create({
      data: {
        user_id: userId,
        level_configuration_id: levelConfigId,
        business_date: new Date(new Date().toISOString().split('T')[0]),
        completed_cycle_count: 4,
        capped_cycle_count: 0,
        daily_cycle_limit: 5,
        gross_earning: 40,
        allowed_earning: 40,
        excess_earning: 0,
      },
    });

    const cycleA = await prisma.matrixCycle.create({
      data: { user_id: userId, level_configuration_id: levelConfigId, cycle_number: 5, status: 'COMPLETED' },
    });
    const cycleB = await prisma.matrixCycle.create({
      data: { user_id: userId, level_configuration_id: levelConfigId, cycle_number: 6, status: 'COMPLETED' },
    });

    // Execute concurrently
    await Promise.all([
      MatrixRewardService.calculateAndCreditCycleReward(cycleA, { slug: 'starter' }, prisma),
      MatrixRewardService.calculateAndCreditCycleReward(cycleB, { slug: 'starter' }, prisma),
    ]);

    const cappingRecord = await prisma.dailyCapping.findFirst({
      where: { user_id: userId, level_configuration_id: levelConfigId },
    });

    expect(cappingRecord?.completed_cycle_count).toBe(5);
    expect(cappingRecord?.capped_cycle_count).toBe(1);

    const userTxCount = await prisma.transaction.count({ where: { user_id: userId } });
    const sponsorTxCount = await prisma.transaction.count({ where: { user_id: sponsorId } });

    expect(userTxCount).toBe(1);
    expect(sponsorTxCount).toBe(1);
  });

  it('C. Ten concurrent cycles at count=0, limit=5: exactly 5 participant credits, 5 sponsor credits', async () => {
    // Cycle #1 has zero income (never capping-evaluated) — 11 cycles are created so that 10
    // income-bearing cycles (2-11) genuinely compete for the 5 daily slots.
    const cycles = [];
    for (let i = 1; i <= 11; i++) {
      cycles.push(
        await prisma.matrixCycle.create({
          data: { user_id: userId, level_configuration_id: levelConfigId, cycle_number: i, status: 'COMPLETED' },
        })
      );
    }

    // Execute 10 simultaneous evaluations
    await Promise.all(
      cycles.map((cycle) =>
        MatrixRewardService.calculateAndCreditCycleReward(cycle, { slug: 'starter' }, prisma)
      )
    );

    const cappingRecord = await prisma.dailyCapping.findFirst({
      where: { user_id: userId, level_configuration_id: levelConfigId },
    });

    expect(cappingRecord?.completed_cycle_count).toBe(5);
    expect(cappingRecord?.capped_cycle_count).toBe(5);

    // MATRIX_REWARD only — cycle #1's unrelated NEXT_TIER_ACTIVATION_FUNDING extra is excluded.
    const userTxCount = await prisma.transaction.count({ where: { user_id: userId, transaction_type: 'MATRIX_REWARD' } });
    const sponsorTxCount = await prisma.transaction.count({ where: { user_id: sponsorId, transaction_type: 'MATRIX_REWARD' } });

    expect(userTxCount).toBe(5);
    expect(sponsorTxCount).toBe(5);
  });

  it('D. Same-cycle idempotency: multiple concurrent submissions of SAME cycleId -> 1 ledger credit', async () => {
    // Use a subsequent (income-bearing) cycle — cycle #1 has zero income for Starter, so it
    // never reaches the primary MATRIX_REWARD ledger write this test is exercising.
    const cycle = await prisma.matrixCycle.create({
      data: { user_id: userId, level_configuration_id: levelConfigId, cycle_number: 2, status: 'COMPLETED' },
    });

    // Run same cycle 5 times concurrently
    await Promise.all([
      MatrixRewardService.calculateAndCreditCycleReward(cycle, { slug: 'starter' }, prisma),
      MatrixRewardService.calculateAndCreditCycleReward(cycle, { slug: 'starter' }, prisma),
      MatrixRewardService.calculateAndCreditCycleReward(cycle, { slug: 'starter' }, prisma),
      MatrixRewardService.calculateAndCreditCycleReward(cycle, { slug: 'starter' }, prisma),
      MatrixRewardService.calculateAndCreditCycleReward(cycle, { slug: 'starter' }, prisma),
    ]);

    const ledgerCount = await prisma.walletLedger.count({
      where: { idempotency_key: `reward-mc-${cycle.id}` },
    });

    expect(ledgerCount).toBe(1);
  });

  it('E. Repeat concurrency test: 20 iterations of 10-cycle stress test', async () => {
    for (let iter = 1; iter <= 20; iter++) {
      // Create new fresh user per iteration
      const iterUser = await prisma.user.create({
        data: {
          wallet_address: `0xiter_${iter}_${Date.now()}_${Math.random()}`,
          referral_code: `ITER_${iter}_${Math.floor(Math.random() * 1000000)}`,
          sponsor_id: sponsorId,
          current_level_id: levelConfigId,
          status: 'ACTIVE',
        },
      });

      // Cycle #1 has zero income (never capping-evaluated) — 11 cycles per iteration so 10
      // income-bearing cycles (2-11) genuinely compete for the 5 daily slots.
      const cycles = [];
      for (let c = 1; c <= 11; c++) {
        cycles.push(
          await prisma.matrixCycle.create({
            data: { user_id: iterUser.id, level_configuration_id: levelConfigId, cycle_number: c, status: 'COMPLETED' },
          })
        );
      }

      await Promise.all(
        cycles.map((cycle) =>
          MatrixRewardService.calculateAndCreditCycleReward(cycle, { slug: 'starter' }, prisma)
        )
      );

      const record = await prisma.dailyCapping.findFirst({
        where: { user_id: iterUser.id, level_configuration_id: levelConfigId },
      });

      expect(record?.completed_cycle_count).toBe(5);
      expect(record?.capped_cycle_count).toBe(5);

      // MATRIX_REWARD only — cycle #1's unrelated NEXT_TIER_ACTIVATION_FUNDING extra is excluded.
      const uCount = await prisma.transaction.count({ where: { user_id: iterUser.id, transaction_type: 'MATRIX_REWARD' } });
      expect(uCount).toBe(5);
    }
  }, 30000); // 30 second timeout for 20 iterations

  it('F. Sponsor already capped: reward STILL routes to Immediate Sponsor', async () => {
    // 1. Cap the sponsor first (sponsor reaches limit 5)
    await prisma.dailyCapping.create({
      data: {
        user_id: sponsorId,
        level_configuration_id: levelConfigId,
        business_date: new Date(new Date().toISOString().split('T')[0]),
        completed_cycle_count: 5,
        capped_cycle_count: 0,
        daily_cycle_limit: 5,
        gross_earning: 50,
        allowed_earning: 50,
        excess_earning: 0,
      },
    });

    // 2. Cap the user (user reaches limit 5)
    await prisma.dailyCapping.create({
      data: {
        user_id: userId,
        level_configuration_id: levelConfigId,
        business_date: new Date(new Date().toISOString().split('T')[0]),
        completed_cycle_count: 5,
        capped_cycle_count: 0,
        daily_cycle_limit: 5,
        gross_earning: 50,
        allowed_earning: 50,
        excess_earning: 0,
      },
    });

    // 3. User receives 6th cycle reward
    const cycle = await prisma.matrixCycle.create({
      data: { user_id: userId, level_configuration_id: levelConfigId, cycle_number: 6, status: 'COMPLETED' },
    });

    await MatrixRewardService.calculateAndCreditCycleReward(cycle, { slug: 'starter' }, prisma);

    // Verify reward STILL goes to Immediate Sponsor (sponsorId)
    const sponsorTx = await prisma.transaction.findFirst({
      where: { user_id: sponsorId, description: { contains: 'Spill-up from capped user' } },
    });

    expect(sponsorTx).not.toBeNull();
    expect(sponsorTx?.user_id).toBe(sponsorId);
  });
});

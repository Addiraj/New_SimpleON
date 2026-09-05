import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../server/config/database.js';
import { MatrixRewardService } from '../../server/services/MatrixRewardService.js';
import { StatsController } from '../../server/controllers/stats.controller.js';
import { TransactionType } from '@prisma/client';
import { seedFullLadder } from '../helpers/testUtils.js';

describe('Global Stats API & Double Counting Test Suite', () => {
  let sponsorId: string;
  let userId: string;
  let levelConfigId: string;

  beforeEach(async () => {
    // 1. Clear test records
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE daily_cappings, daily_earnings, wallet_ledgers, transactions, matrix_cycles, referral_relations, users, level_configurations CASCADE;`);

    // 2. Seed Level Configuration
    await seedFullLadder(prisma);
    const levelConfig = await prisma.levelConfiguration.findFirst({ where: { slug: 'starter' } });
    levelConfigId = levelConfig!.id;

    // 3. Create Sponsor & Participant
    const sponsor = await prisma.user.create({
      data: {
        wallet_address: `0xsponsor_${Date.now()}`,
        referral_code: `SPONSOR_${Math.floor(Math.random() * 1000000)}`,
        current_level_id: levelConfigId,
        status: 'ACTIVE', // Active for stats counting
      },
    });
    sponsorId = sponsor.id;

    const user = await prisma.user.create({
      data: {
        wallet_address: `0xuser_${Date.now()}`,
        referral_code: `USER_${Math.floor(Math.random() * 1000000)}`,
        sponsor_id: sponsorId,
        current_level_id: levelConfigId,
        status: 'ACTIVE', // Active for stats counting
      },
    });
    userId = user.id;

    // 4. Create Referral Relation
    await prisma.referralRelation.create({
      data: {
        sponsor_user_id: sponsorId,
        referred_user_id: userId,
        depth: 1,
        status: 'ACTIVE',
      },
    });
  });

  it('1. One matrix cycle reward = exactly one qualifying Transaction', async () => {
    const cycle = await prisma.matrixCycle.create({
      data: {
        user_id: userId,
        level_configuration_id: levelConfigId,
        cycle_number: 2,
        status: 'COMPLETED',
      },
    });

    await MatrixRewardService.calculateAndCreditCycleReward(
      cycle,
      { slug: 'starter' },
      prisma
    );

    // Verify exactly one MATRIX_REWARD transaction exists
    const txCount = await prisma.transaction.count({
      where: {
        transaction_type: TransactionType.MATRIX_REWARD,
        status: 'COMPLETED'
      }
    });

    expect(txCount).toBe(1);

    const tx = await prisma.transaction.findFirst();
    expect(tx?.user_id).toBe(userId);
    expect(Number(tx?.amount)).toBe(40);
  });

  it('2. One capped cycle = exactly one qualifying MATRIX_REWARD Transaction to Sponsor', async () => {
    // Cap the user
    await prisma.dailyCapping.create({
      data: {
        user_id: userId,
        level_configuration_id: levelConfigId,
        business_date: new Date(new Date().toISOString().split('T')[0]),
        completed_cycle_count: 5, // Capped!
        capped_cycle_count: 0,
        daily_cycle_limit: 5,
        gross_earning: 200,
        allowed_earning: 200,
        excess_earning: 0,
      },
    });

    const cycle = await prisma.matrixCycle.create({
      data: {
        user_id: userId,
        level_configuration_id: levelConfigId,
        cycle_number: 7,
        status: 'COMPLETED',
      },
    });

    await MatrixRewardService.calculateAndCreditCycleReward(
      cycle,
      { slug: 'starter' },
      prisma
    );

    // Verify exactly one MATRIX_REWARD transaction exists, directed to Sponsor
    const txCount = await prisma.transaction.count({
      where: {
        transaction_type: TransactionType.MATRIX_REWARD,
        status: 'COMPLETED'
      }
    });

    expect(txCount).toBe(1);

    const tx = await prisma.transaction.findFirst();
    expect(tx?.user_id).toBe(sponsorId);
    expect(Number(tx?.amount)).toBe(40);
  });

  it('3. Stats endpoint correctly aggregates data without fake offsets', async () => {
    // Add some noise (payments, uncompleted txs) that should be excluded
    await prisma.transaction.createMany({
      data: [
        {
          user_id: userId,
          transaction_type: TransactionType.PLAN_JOIN,
          amount: 100,
          status: 'COMPLETED',
          currency: 'USDT',
        },
        {
          user_id: userId,
          transaction_type: TransactionType.MATRIX_REWARD,
          amount: 50,
          status: 'PENDING', // Should be excluded
          currency: 'USDT',
        },
        {
          user_id: userId,
          transaction_type: TransactionType.ADMIN_INCOME,
          amount: 500,
          status: 'COMPLETED',
          currency: 'USDT',
        },
      ]
    });

    // Add valid rewards
    await prisma.transaction.createMany({
      data: [
        {
          user_id: userId,
          transaction_type: TransactionType.MATRIX_REWARD,
          amount: 10,
          status: 'COMPLETED',
          currency: 'USDT',
          completed_at: new Date(),
        },
        {
          user_id: sponsorId,
          transaction_type: TransactionType.BOOSTER_REWARD,
          amount: 20,
          status: 'COMPLETED',
          currency: 'USDT',
          completed_at: new Date(),
        }
      ]
    });

    // Mock Express Req/Res
    const req = {} as any;
    let responseData: any;
    const res = {
      json: (data: any) => { responseData = data; }
    } as any;
    const next = (err: any) => { console.error(err); };

    await StatsController.getGlobalStats(req, res, next);

    expect(responseData.success).toBe(true);
    expect(responseData.data.activeParticipants).toBe(2); // Two ACTIVE users seeded
    expect(responseData.data.totalUsdtDistributed).toBe(30); // 10 + 20
    expect(responseData.data.distributedToday).toBe(30);
    expect(responseData.data.recentPayouts.length).toBe(2);
    expect(responseData.data.recentPayouts[0].type).toBeDefined();
    expect(responseData.data.recentPayouts[0].recipient).toContain('0x');
  });
});

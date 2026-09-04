import { describe, expect, it } from 'vitest';
import { BOOSTER_TIER_CONFIGS, BoosterConfigService } from '../../server/services/BoosterConfigService.js';
import { X5MatrixService } from '../../server/services/X5MatrixService.js';

describe('Booster verified configuration and capping', () => {
  it('calculates daily capping from personally qualified next-level members only', () => {
    expect(BoosterConfigService.calculateBoosterDailyCapping('starter', {
      qualifiedBuilders: 0,
      qualifiedLeaders: 0,
      qualifiedChampions: 0,
      leaderDailyCapping: 5,
    })).toBe(5);

    expect(BoosterConfigService.calculateBoosterDailyCapping('starter', {
      qualifiedBuilders: 4,
      qualifiedLeaders: 0,
      qualifiedChampions: 0,
      leaderDailyCapping: 5,
    })).toBe(5);

    expect(BoosterConfigService.calculateBoosterDailyCapping('starter', {
      qualifiedBuilders: 6,
      qualifiedLeaders: 0,
      qualifiedChampions: 0,
      leaderDailyCapping: 5,
    })).toBe(6);

    expect(BoosterConfigService.calculateBoosterDailyCapping('builder', {
      qualifiedBuilders: 0,
      qualifiedLeaders: 3,
      qualifiedChampions: 0,
      leaderDailyCapping: 5,
    })).toBe(5);

    expect(BoosterConfigService.calculateBoosterDailyCapping('builder', {
      qualifiedBuilders: 0,
      qualifiedLeaders: 7,
      qualifiedChampions: 0,
      leaderDailyCapping: 5,
    })).toBe(7);

    expect(BoosterConfigService.calculateBoosterDailyCapping('leader', {
      qualifiedBuilders: 0,
      qualifiedLeaders: 0,
      qualifiedChampions: 4,
      leaderDailyCapping: 5,
    })).toBe(5);

    expect(BoosterConfigService.calculateBoosterDailyCapping('leader', {
      qualifiedBuilders: 0,
      qualifiedLeaders: 0,
      qualifiedChampions: 12,
      leaderDailyCapping: 12,
    })).toBe(12);

    expect(BoosterConfigService.calculateBoosterDailyCapping('champion', {
      qualifiedBuilders: 0,
      qualifiedLeaders: 0,
      qualifiedChampions: 0,
      leaderDailyCapping: 8,
    })).toBe(8);
  });

  it('never returns negative remaining cycles', () => {
    expect(BoosterConfigService.calculateRemainingCyclesToday(5, 2)).toBe(3);
    expect(BoosterConfigService.calculateRemainingCyclesToday(5, 9)).toBe(0);
  });

  it('keeps verified tier distributions mathematically correct', () => {
    const starter = BOOSTER_TIER_CONFIGS.find((t) => t.code === 'starter')!;
    const builder = BOOSTER_TIER_CONFIGS.find((t) => t.code === 'builder')!;
    const leader = BOOSTER_TIER_CONFIGS.find((t) => t.code === 'leader')!;
    const champion = BOOSTER_TIER_CONFIGS.find((t) => t.code === 'champion')!;

    expect(starter.collectionAmount - starter.resubscribeAmount).toBe(starter.upgradeAmount! + (starter.reserveAmount || 0));

    expect(builder.slotsPerCycle * builder.subscriptionAmount).toBe(200);
    expect(builder.collectionAmount - builder.resubscribeAmount).toBe(builder.upgradeAmount! + (builder.reserveAmount || 0));

    expect(leader.slotsPerCycle * leader.subscriptionAmount).toBe(400);
    expect(leader.collectionAmount - leader.resubscribeAmount).toBe(leader.upgradeAmount! + (leader.reserveAmount || 0));

    expect(champion.slotsPerCycle * champion.subscriptionAmount).toBe(1600);
    expect(champion.collectionAmount - champion.resubscribeAmount - (champion.reserveAmount || 0) - (champion.mainPlanAmount || 0)).toBe(champion.netIncome);
  });

  it('calculates X5 generated and pending slots from active Booster tier slot values', () => {
    expect(X5MatrixService.calculateCurrentCycleGeneratedAmount('starter', 0)).toBe(0);
    expect(X5MatrixService.calculateCurrentCycleGeneratedAmount('starter', 3)).toBe(30);
    expect(X5MatrixService.calculateCurrentCycleGeneratedAmount('builder', 3)).toBe(120);
    expect(X5MatrixService.calculateCurrentCycleGeneratedAmount('leader', 3)).toBe(240);
    expect(X5MatrixService.calculateCurrentCycleGeneratedAmount('champion', 3)).toBe(960);

    expect(X5MatrixService.calculatePendingSlots(0)).toBe(5);
    expect(X5MatrixService.calculatePendingSlots(3)).toBe(2);
    expect(X5MatrixService.calculatePendingSlots(5)).toBe(0);
    expect(X5MatrixService.calculatePendingSlots(6)).toBe(0);
  });
});

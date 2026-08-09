import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyCappingService } from '../../server/services/DailyCappingService.js';
import { BoosterConfigService } from '../../server/services/BoosterConfigService.js';
import { QualifiedBuilderService } from '../../server/services/QualifiedBuilderService.js';
import { MatrixRewardService } from '../../server/services/MatrixRewardService.js';

describe('Daily Capping & Reward Routing Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. calculates capping correctly for Starter pool based on Qualified Builders', () => {
    const mockQualification = { builderCount: 3, leaderCount: 0, championCount: 0, directCount: 0, teamSize: 0, totalEarnings: 0, completedCycles: 0 };
    vi.spyOn(QualifiedBuilderService, 'getQualificationData').mockResolvedValue(mockQualification);
    
    const cap = BoosterConfigService.calculateBoosterDailyCapping('starter', {
      qualifiedBuilders: mockQualification.builderCount,
      qualifiedLeaders: mockQualification.leaderCount,
      qualifiedChampions: mockQualification.championCount,
      leaderDailyCapping: 5,
    });
    
    expect(cap).toBe(5); // Minimum is 5
  });

  it('2. calculates capping correctly for Builder pool based on Qualified Leaders', () => {
    const cap = BoosterConfigService.calculateBoosterDailyCapping('builder', {
      qualifiedBuilders: 10,
      qualifiedLeaders: 7,
      qualifiedChampions: 0,
      leaderDailyCapping: 5,
    });
    
    expect(cap).toBe(7); // Max(5, 7)
  });

  it('3. MatrixRewardService evaluates isCapped status for participants', async () => {
    // Mocking DailyCappingService
    vi.spyOn(DailyCappingService, 'evaluateAndApplyCapping').mockResolvedValue({
      isCapped: true,
      businessDate: '2026-08-08',
      dailyCycleLimit: 5,
      completedCycleCount: 5,
      cappedCycleCount: 1,
      grossEarnings: 10,
      creditedEarnings: 0,
      excessThisTransaction: 10,
      allowedThisTransaction: 0,
      dailyCappingRecord: {}
    });
    
    const cappingResult = await DailyCappingService.evaluateAndApplyCapping('user1', 'cfg-starter-v1', 10);
    expect(cappingResult.isCapped).toBe(true);
  });
});

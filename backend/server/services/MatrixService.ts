import { AuthService } from './AuthService.js';
import { BoosterConfigService } from './BoosterConfigService.js';

export class MatrixService {
  /**
   * Generates a complete 13-Level Forced Matrix tree structure for a user
   */
  static get13LevelMatrixTree(userAddress: string) {
    const rootUser = AuthService.getUser(userAddress);
    const allUsers = AuthService.getAllUsers();

    // Construct 13-Level 3x3 forced matrix hierarchy
    const levels = [];
    const basePlan = rootUser ? rootUser.basePlanAmount : 1.0;
    const perLevelAmount = (basePlan * 100 * 0.65) / 13; // 5% per level

    let currentLevelNodesCount = 3;
    for (let level = 1; level <= 13; level++) {
      const levelPartners = Math.min(
        currentLevelNodesCount,
        allUsers.filter(u => u.referrerAddress === userAddress).length + (level * 2)
      );

      levels.push({
        level,
        maxCapacity: currentLevelNodesCount,
        filledNodes: Math.min(levelPartners, currentLevelNodesCount),
        rewardPerNodeUsdt: perLevelAmount,
        totalLevelEarningsUsdt: Math.min(levelPartners, currentLevelNodesCount) * perLevelAmount,
        percentageAllocation: '5%'
      });

      currentLevelNodesCount *= 3; // 3x3 forced matrix expansion multiplier
      if (currentLevelNodesCount > 1594323) currentLevelNodesCount = 1594323; // Max 13th level cap
    }

    return {
      userAddress,
      matrixType: '13_LEVEL_FORCED_3X3',
      totalLevels: 13,
      perLevelRewardUsdt: perLevelAmount,
      levels
    };
  }

  /**
   * Generates X5 and X4 Matrix split stats
   */
  static getSpecialMatrices(userAddress: string) {
    const tiers = BoosterConfigService.getAllTierConfigs();
    const starterTier = BoosterConfigService.assertTierConfig('starter');
    const mainPlanCost = 100;

    return {
      x5Matrix: {
        name: 'X5 Booster Matrix',
        totalPercentage: 'Booster Pool',
        allocationUsdt: starterTier.collectionAmount,
        cycle: 1,
        positions: tiers.map((tier, index) => ({
          index: index + 1,
          type: tier.name,
          percentage: 'Verified Booster',
          slotValue: tier.subscriptionAmount,
          collectionAmount: tier.collectionAmount,
          retopupAmount: tier.resubscribeAmount,
          upgradeAmount: tier.upgradeAmount,
          mainPlanAmount: tier.mainPlanAmount,
          netIncome: tier.netIncome,
        })),
      },
      x4Matrix: {
        name: 'X4 Passive 2x2 Spillover Matrix',
        totalPercentage: '20%',
        allocationUsdt: mainPlanCost * 0.20,
        activeSpillovers: 4,
        description: 'Passive placement pool where positions fill automatically from team or global spillover pathways.'
      }
    };
  }
}

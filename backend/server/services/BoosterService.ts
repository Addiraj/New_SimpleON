import { BoosterRepository, FormattedPlan } from '../repositories/BoosterRepository.js';
import { UpgradeEligibilityService } from './UpgradeEligibilityService.js';

export interface BoosterCalculationResult {
  basePlanAmount: number;
  tiers: Array<{
    name: string;
    slug: string;
    levelOrder: number;
    multiplier: string;
    joiningAmount: number;
    upgradeAmount: number;
    retopupAmount: number;
    collectionAmount: number;
    netIncome: number;
    dailyCap: number;
    matrixSize: number;
    requiredDirectReferrals: number;
    requiredQualifiedBuilders: number;
    description: string;
    accent: string;
    badgeBg: string;
    iconName: string;
  }>;
  /** Visionary sizing facts only — its own reward/recycle rules beyond initial activation are
   *  undefined by the client spec and are intentionally not modeled here (see MatrixRewardService
   *  and VisionaryTreeService's doc comments for the same gap). */
  visionary: {
    totalAmount: number;
    part1Amount: number;
    part1Width: number;
    part2Amount: number;
    part2LevelCount: number;
    part2UnitAmount: number;
  };
}

export class BoosterService {
  /**
   * Fetch all active Booster Plans from MySQL
   */
  static async getActivePlans(): Promise<FormattedPlan[]> {
    return await BoosterRepository.getActivePlans();
  }

  /**
   * Fetch a single Booster Plan by slug
   */
  static async getPlanBySlug(slug: string): Promise<FormattedPlan | null> {
    return await BoosterRepository.getPlanBySlug(slug);
  }

  /**
   * Update plan joining amount by slug
   */
  static async updatePlanBySlug(slug: string, newAmount: string): Promise<boolean> {
    return await BoosterRepository.updatePlanBySlug(slug, newAmount);
  }

  /**
   * Get user's active booster level, history, and status from MySQL
   */
  static async getUserCurrentPlan(userId: string) {
    return await BoosterRepository.getUserLevelData(userId);
  }

  /**
   * Check user eligibility on the backend for joining/upgrading booster levels
   */
  static async checkEligibility(userId: string, targetSlug?: string) {
    const evalResult = await UpgradeEligibilityService.evaluateEligibility(userId, targetSlug);
    return {
      eligible: evalResult.eligible,
      currentLevel: evalResult.currentLevel?.name || 'None',
      currentLevelOrder: evalResult.currentLevelOrder,
      targetLevel: evalResult.targetLevel?.name || 'Starter Booster',
      targetSlug: evalResult.targetLevel?.slug || 'starter',
      targetLevelOrder: evalResult.targetLevelOrder,
      requirements: evalResult.requirements,
      reasons: evalResult.reasons,
      eligibilitySnapshot: evalResult.eligibilitySnapshot,
    };
  }

  /**
   * Backend calculation engine: computes financial metrics loaded directly from MySQL
   */
  static async calculateBoosterMetrics(basePlan: number = 1.0): Promise<BoosterCalculationResult> {
    const safeBasePlan = Math.max(0.1, Number(basePlan) || 1.0);
    const plans = await BoosterRepository.getActivePlans();

    const uiThemes: Record<string, { accent: string; badgeBg: string; iconName: string }> = {
      launch: { accent: 'border-emerald-500 dark:border-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-500', iconName: 'sparkles' },
      starter: { accent: 'border-red-500 dark:border-red-600', badgeBg: 'bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-500', iconName: 'rocket' },
      builder: { accent: 'border-blue-500 dark:border-blue-600', badgeBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-500', iconName: 'trending-up' },
      leader: { accent: 'border-orange-500 dark:border-orange-600', badgeBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/25 dark:text-orange-500', iconName: 'users' },
      champion: { accent: 'border-purple-500 dark:border-purple-600', badgeBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/25 dark:text-purple-500', iconName: 'trophy' },
    };

    // "tiers" covers the upgradeable Booster ladder (Launch through Champion). Visionary is the
    // top tier with a structurally different (X3 + 3x3/20-level) shape — surfaced separately below.
    const tiers = plans
      .filter((plan) => plan.slug !== 'visionary')
      .map((plan) => {
        const joiningAmtNum = parseFloat(plan.joiningAmount) * safeBasePlan;
        const upgradeAmtNum = parseFloat(plan.upgradeAmount) * safeBasePlan;
        const retopupAmtNum = parseFloat(plan.retopupAmount) * safeBasePlan;
        const collectionAmtNum = joiningAmtNum * plan.matrixSize;

        const netIncome = plan.slug === 'champion' ? safeBasePlan * 780.0 : 0.0;
        const theme = uiThemes[plan.slug] || uiThemes.starter;

        let desc = `Out of ${collectionAmtNum.toFixed(2)} USDT collected from ${plan.matrixSize} partners, ${retopupAmtNum.toFixed(2)} USDT recycles ${plan.name} and ${upgradeAmtNum.toFixed(2)} USDT upgrades position.`;
        if (plan.slug === 'champion') {
          desc = `Total collection of ${collectionAmtNum.toFixed(2)} USDT is distributed: ${retopupAmtNum.toFixed(2)} USDT for Champion re-topup, ${upgradeAmtNum.toFixed(2)} USDT to activate Visionary, leaving ${netIncome.toFixed(2)} USDT as First Net Income.`;
        }

        return {
          name: plan.name,
          slug: plan.slug,
          levelOrder: plan.levelOrder,
          multiplier: `${parseFloat(plan.joiningAmount)}x`,
          joiningAmount: joiningAmtNum,
          upgradeAmount: upgradeAmtNum,
          retopupAmount: retopupAmtNum,
          collectionAmount: collectionAmtNum,
          netIncome,
          dailyCap: parseFloat(plan.dailyCap),
          matrixSize: plan.matrixSize,
          requiredDirectReferrals: plan.requiredDirectReferrals,
          requiredQualifiedBuilders: plan.requiredQualifiedBuilders,
          description: desc,
          accent: theme.accent,
          badgeBg: theme.badgeBg,
          iconName: theme.iconName,
        };
      });

    const visionaryPlan = plans.find((plan) => plan.slug === 'visionary');
    const visionaryTotal = visionaryPlan ? parseFloat(visionaryPlan.joiningAmount) * safeBasePlan : 500.0 * safeBasePlan;
    const part1Amount = (visionaryPlan?.visionaryPart1Amount ?? 200) * safeBasePlan;
    const part2Amount = (visionaryPlan?.visionaryPart2Amount ?? 300) * safeBasePlan;

    return {
      basePlanAmount: safeBasePlan,
      tiers,
      // Sizing facts only — Visionary's own reward/recycle rules beyond initial activation are
      // undefined by the client spec; no per-level payout formula is invented here.
      visionary: {
        totalAmount: visionaryTotal,
        part1Amount,
        part1Width: 3,
        part2Amount,
        part2LevelCount: 20,
        part2UnitAmount: 15 * safeBasePlan,
      },
    };
  }
}

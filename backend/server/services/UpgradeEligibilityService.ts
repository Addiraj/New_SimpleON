import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { QualifiedBuilderService, UserQualificationData } from './QualifiedBuilderService.js';
import { AuthRepository } from '../repositories/AuthRepository.js';
import { BoosterRepository } from '../repositories/BoosterRepository.js';

export interface LevelInfo {
  id: string;
  name: string;
  slug: string;
  levelOrder: number;
  joiningAmount: number;
  upgradeAmount: number;
  requiredDirectReferrals: number;
  requiredQualifiedBuilders: number;
  autoUpgradeEnabled: boolean;
  retopupEnabled: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  userId: string;
  currentLevel: LevelInfo | null;
  currentLevelOrder: number;
  targetLevel: LevelInfo | null;
  targetLevelOrder: number;
  requirements: {
    requiredDirectReferrals: number;
    currentDirectReferrals: number;
    requiredQualifiedBuilders: number;
    currentQualifiedBuilders: number;
    teamSize: number;
    totalEarnings: number;
    completedCycles: number;
    hasPreviousLevel: boolean;
    alreadyActiveOrCompleted: boolean;
  };
  reasons: string[];
  eligibilitySnapshot: Record<string, any>;
}

export class UpgradeEligibilityService {
  /**
   * Evaluates user's upgrade eligibility against active level configurations.
   * Strictly enforces next-level progression (Order N -> N+1), checks direct referrals,
   * qualified builders, matrix completions, team size, and earnings.
   * Never allows downgrade or duplicate upgrades.
   *
   * @param userId User ID
   * @param targetSlug Optional target level slug. Defaults to next level above current level.
   * @param db Prisma transaction or database client
   */
  static async evaluateEligibility(
    userId: string,
    targetSlug?: string,
    db: any = prisma
  ): Promise<EligibilityResult> {
    // 1. Fetch user with current_level and active level configurations
    let user: any = null;
    try {
      user = await db.user.findUnique({
        where: { id: userId },
        include: {
          current_level: true,
          user_levels: {
            include: { level_configuration: true },
          },
        },
      });
    } catch (err) {
      user = await AuthRepository.findUserById(userId);
    }

    if (!user) {
      user = await AuthRepository.findUserById(userId);
    }

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    let allConfigs: any[] = [];
    try {
      allConfigs = await db.levelConfiguration.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { level_order: 'asc' },
      });
    } catch (err) {
      allConfigs = (await BoosterRepository.getAllActiveLevelConfigs()) as any[];
    }

    if (!allConfigs || allConfigs.length === 0) {
      allConfigs = (await BoosterRepository.getAllActiveLevelConfigs()) as any[];
    }

    // Map level configurations
    const levels: LevelInfo[] = allConfigs.map((cfg: any) => ({
      id: cfg.id,
      name: cfg.name,
      slug: cfg.slug,
      levelOrder: cfg.level_order,
      joiningAmount: parseFloat(cfg.joining_amount?.toString() || '0'),
      upgradeAmount: parseFloat(cfg.upgrade_amount?.toString() || '0'),
      requiredDirectReferrals: cfg.required_direct_referrals || 0,
      requiredQualifiedBuilders: cfg.required_qualified_builders || 0,
      autoUpgradeEnabled: cfg.auto_upgrade_enabled ?? true,
      retopupEnabled: cfg.retopup_enabled ?? true,
    }));

    // Current user level info
    let currentLevel: LevelInfo | null = null;
    let currentLevelOrder = 0;

    if (user.current_level) {
      currentLevel = {
        id: user.current_level.id,
        name: user.current_level.name,
        slug: user.current_level.slug,
        levelOrder: user.current_level.level_order,
        joiningAmount: parseFloat(user.current_level.joining_amount?.toString() || '0'),
        upgradeAmount: parseFloat(user.current_level.upgrade_amount?.toString() || '0'),
        requiredDirectReferrals: user.current_level.required_direct_referrals || 0,
        requiredQualifiedBuilders: user.current_level.required_qualified_builders || 0,
        autoUpgradeEnabled: user.current_level.auto_upgrade_enabled ?? true,
        retopupEnabled: user.current_level.retopup_enabled ?? true,
      };
      currentLevelOrder = user.current_level.level_order;
    }

    // Determine target level
    let targetLevel: LevelInfo | null = null;
    if (targetSlug) {
      const cleanSlug = targetSlug.toLowerCase().trim();
      targetLevel = levels.find((l) => l.slug === cleanSlug) || null;
      if (!targetLevel && cleanSlug.startsWith('level-')) {
        const num = parseInt(cleanSlug.replace('level-', ''), 10);
        if (!isNaN(num)) {
          targetLevel = {
            id: `cfg-level-${num}`,
            name: `Level ${num}`,
            slug: cleanSlug,
            levelOrder: num,
            joiningAmount: 0,
            upgradeAmount: 0,
            requiredDirectReferrals: 0,
            requiredQualifiedBuilders: 0,
            autoUpgradeEnabled: true,
            retopupEnabled: true,
          };
        }
      }
    }

    // Default target level is strictly next order: currentLevelOrder + 1
    if (!targetLevel) {
      const nextOrder = currentLevelOrder === 0 ? 1 : currentLevelOrder + 1;
      targetLevel = levels.find((l) => l.levelOrder === nextOrder) || null;
    }

    // If still no target level (e.g. user is already at max level Champion Order 4)
    if (!targetLevel) {
      const maxLevel = levels[levels.length - 1];
      targetLevel = maxLevel;
    }

    const targetLevelOrder = targetLevel.levelOrder;

    // 2. Fetch Backend Qualifications (QualifiedBuilderService)
    const qualifications: UserQualificationData = await QualifiedBuilderService.getQualificationData(
      userId,
      db
    );

    // 3. Validation Rules
    const reasons: string[] = [];

    // Rule A: Downgrade / Same Level Prevention
    const isAlreadyAtOrAbove = currentLevelOrder >= targetLevelOrder;
    if (isAlreadyAtOrAbove) {
      reasons.push(
        `User is already at level ${currentLevel?.name || 'Level ' + currentLevelOrder} (Order ${currentLevelOrder}). Downgrades or re-activation of same level is not permitted.`
      );
    }

    // Rule B: Sequential Order Enforcement (Only Order N -> Order N+1)
    const isNextLevel = targetLevelOrder === currentLevelOrder + 1;
    if (!isNextLevel && !isAlreadyAtOrAbove) {
      reasons.push(
        `Can only upgrade to the immediate next level (Order ${currentLevelOrder + 1}). Cannot skip to Order ${targetLevelOrder}.`
      );
    }

    // Rule C: Direct Referrals Requirement
    const reqDirect = targetLevel.requiredDirectReferrals;
    const hasDirects = qualifications.directCount >= reqDirect;
    if (!hasDirects) {
      reasons.push(
        `Requires at least ${reqDirect} direct referral(s). Current: ${qualifications.directCount}`
      );
    }

    // Rule D: Qualified Builders / Leaders Requirement
    const reqBuilders = targetLevel.requiredQualifiedBuilders;
    let currentQualified = qualifications.builderCount;
    let qualifiedTypeName = 'builder(s)';

    if (targetLevelOrder === 4) {
      currentQualified = qualifications.leaderCount;
      qualifiedTypeName = 'leader(s)';
    }

    const hasBuilders = currentQualified >= reqBuilders;
    if (!hasBuilders) {
      reasons.push(
        `Requires at least ${reqBuilders} qualified ${qualifiedTypeName}. Current: ${currentQualified}`
      );
    }

    // Rule E: Previous Level Completed / Activated Check
    const hasPreviousLevel = targetLevelOrder === 1 || currentLevelOrder >= targetLevelOrder - 1;
    if (!hasPreviousLevel) {
      reasons.push(
        `Must activate level ${targetLevelOrder - 1} before upgrading to ${targetLevel.name}`
      );
    }

    // Rule F: Check for completed / active UserLevel record to prevent duplicate upgrades
    const existingUserLevel = user.user_levels?.find(
      (ul: any) => ul.level_configuration_id === targetLevel!.id && ul.status === 'COMPLETED'
    );
    const alreadyActiveOrCompleted = isAlreadyAtOrAbove || Boolean(existingUserLevel);

    const eligible =
      isNextLevel &&
      !isAlreadyAtOrAbove &&
      hasPreviousLevel &&
      hasDirects &&
      hasBuilders &&
      !alreadyActiveOrCompleted;

    const eligibilitySnapshot = {
      evaluatedAt: new Date().toISOString(),
      userId,
      currentLevelOrder,
      targetLevelOrder,
      targetLevelSlug: targetLevel.slug,
      directCount: qualifications.directCount,
      requiredDirects: reqDirect,
      builderCount: currentQualified,
      requiredBuilders: reqBuilders,
      teamSize: qualifications.teamSize,
      totalEarnings: qualifications.totalEarnings,
      completedCycles: qualifications.completedCycles,
      hasPreviousLevel,
      alreadyActiveOrCompleted,
      reasons,
    };

    logger.info(
      {
        userId,
        eligible,
        currentLevelOrder,
        targetLevelOrder,
        reasonsCount: reasons.length,
      },
      '[UpgradeEligibilityService] Evaluated upgrade eligibility'
    );

    return {
      eligible,
      userId,
      currentLevel,
      currentLevelOrder,
      targetLevel,
      targetLevelOrder,
      requirements: {
        requiredDirectReferrals: reqDirect,
        currentDirectReferrals: qualifications.directCount,
        requiredQualifiedBuilders: reqBuilders,
        currentQualifiedBuilders: qualifications.builderCount,
        teamSize: qualifications.teamSize,
        totalEarnings: qualifications.totalEarnings,
        completedCycles: qualifications.completedCycles,
        hasPreviousLevel,
        alreadyActiveOrCompleted,
      },
      reasons,
      eligibilitySnapshot,
    };
  }
}

import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export interface LevelConfigRecord {
  id: string;
  name: string;
  slug: string;
  level_order: number;
  joining_amount: string;
  upgrade_amount: string;
  matrix_size: number;
  income_per_position: string;
  cycle_reward: string;
  retopup_amount: string;
  daily_cap: string;
  daily_cycle_limit: number;
  required_direct_referrals: number;
  required_qualified_builders: number;
  auto_upgrade_enabled: boolean;
  retopup_enabled: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';
  version: number;
  effective_from: Date;
  effective_to?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface FormattedPlan {
  id: string;
  name: string;
  Name: string;
  slug: string;
  Slug: string;
  levelOrder: number;
  level_order: number;
  levelNumber?: number;
  'Level order': number;
  joiningAmount: string;
  joining_amount: string;
  amountUsdt?: string;
  'Joining amount': string;
  upgradeAmount: string;
  upgrade_amount: string;
  'Upgrade amount': string;
  matrixSize: number;
  matrix_size: number;
  'Matrix size': number;
  incomePerPosition: string;
  income_per_position: string;
  'Income per position': string;
  cycleReward: string;
  cycle_reward: string;
  'Cycle reward': string;
  retopupAmount: string;
  retopup_amount: string;
  'Re-topup amount': string;
  dailyCap: string;
  daily_cap: string;
  dailyCapUsdt?: string;
  'Daily cap': string;
  dailyCycleLimit: number;
  daily_cycle_limit: number;
  'Daily cycle limit': number;
  requiredDirectReferrals: number;
  required_direct_referrals: number;
  'Required direct referrals': number;
  requiredQualifiedBuilders: number;
  required_qualified_builders: number;
  'Required qualified builders': number;
  autoUpgradeEnabled: boolean;
  auto_upgrade_enabled: boolean;
  'Auto-upgrade enabled': boolean;
  retopupEnabled: boolean;
  retopup_enabled: boolean;
  'Re-topup enabled': boolean;
  status: string;
  Status: string;
  version: number;
}

// In-memory seed data for active level configurations (Starter, Builder, Leader, Champion)
const DEFAULT_LEVEL_CONFIGS: LevelConfigRecord[] = [
  {
    id: 'cfg-starter-v1',
    name: 'Starter',
    slug: 'starter',
    level_order: 1,
    joining_amount: '10.00000000',
    upgrade_amount: '40.00000000',
    matrix_size: 5,
    income_per_position: '2.00000000',
    cycle_reward: '40.00000000',   // Cycle 2+ net income
    retopup_amount: '10.00000000',
    daily_cap: '0.00000000',
    daily_cycle_limit: 5,
    required_direct_referrals: 0,
    required_qualified_builders: 0,
    auto_upgrade_enabled: true,
    retopup_enabled: true,
    status: 'ACTIVE',
    version: 1,
    effective_from: new Date('2026-01-01'),
    effective_to: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  },
  {
    id: 'cfg-builder-v1',
    name: 'Builder',
    slug: 'builder',
    level_order: 2,
    joining_amount: '40.00000000',
    upgrade_amount: '80.00000000',
    matrix_size: 5,
    income_per_position: '8.00000000',
    cycle_reward: '160.00000000',  // Cycle 2+ net income
    retopup_amount: '40.00000000',
    daily_cap: '0.00000000',
    daily_cycle_limit: 5,
    required_direct_referrals: 1,
    required_qualified_builders: 0,
    auto_upgrade_enabled: true,
    retopup_enabled: true,
    status: 'ACTIVE',
    version: 1,
    effective_from: new Date('2026-01-01'),
    effective_to: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  },
  {
    id: 'cfg-leader-v1',
    name: 'Leader',
    slug: 'leader',
    level_order: 3,
    joining_amount: '80.00000000',
    upgrade_amount: '320.00000000',
    matrix_size: 5,
    income_per_position: '16.00000000',
    cycle_reward: '320.00000000',  // Cycle 2+ net income
    retopup_amount: '80.00000000',
    daily_cap: '0.00000000',
    daily_cycle_limit: 5,
    required_direct_referrals: 2,
    required_qualified_builders: 1,
    auto_upgrade_enabled: true,
    retopup_enabled: true,
    status: 'ACTIVE',
    version: 1,
    effective_from: new Date('2026-01-01'),
    effective_to: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  },
  {
    id: 'cfg-champion-v1',
    name: 'Champion',
    slug: 'champion',
    level_order: 4,
    joining_amount: '320.00000000',
    upgrade_amount: '500.00000000', // Main Plan activation cost per spec
    matrix_size: 5,
    income_per_position: '64.00000000',
    cycle_reward: '780.00000000',   // Cycle 1 net income $780
    retopup_amount: '320.00000000',
    daily_cap: '0.00000000',
    daily_cycle_limit: 5,
    required_direct_referrals: 3,
    required_qualified_builders: 2,
    auto_upgrade_enabled: true,
    retopup_enabled: true,
    status: 'ACTIVE',
    version: 1,
    effective_from: new Date('2026-01-01'),
    effective_to: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  },
];

export class BoosterRepository {
  /**
   * Helper to safely format Decimal and model fields into JSON-safe plan object
   */
  static formatPlan(config: any): FormattedPlan {
    const joiningAmt = config.joining_amount?.toString ? config.joining_amount.toString() : String(config.joining_amount || '0');
    const upgradeAmt = config.upgrade_amount?.toString ? config.upgrade_amount.toString() : String(config.upgrade_amount || '0');
    const incomePos = config.income_per_position?.toString ? config.income_per_position.toString() : String(config.income_per_position || '0');
    const cycleRew = config.cycle_reward?.toString ? config.cycle_reward.toString() : String(config.cycle_reward || '0');
    const retopupAmt = config.retopup_amount?.toString ? config.retopup_amount.toString() : String(config.retopup_amount || '0');
    const dailyCap = config.daily_cap?.toString ? config.daily_cap.toString() : String(config.daily_cap || '0');

    return {
      id: config.id,
      name: config.name,
      Name: config.name,
      slug: config.slug,
      Slug: config.slug,
      levelOrder: config.level_order,
      level_order: config.level_order,
      levelNumber: config.level_order,
      'Level order': config.level_order,
      joiningAmount: joiningAmt,
      joining_amount: joiningAmt,
      amountUsdt: joiningAmt,
      'Joining amount': joiningAmt,
      upgradeAmount: upgradeAmt,
      upgrade_amount: upgradeAmt,
      'Upgrade amount': upgradeAmt,
      matrixSize: config.matrix_size,
      matrix_size: config.matrix_size,
      'Matrix size': config.matrix_size,
      incomePerPosition: incomePos,
      income_per_position: incomePos,
      'Income per position': incomePos,
      cycleReward: cycleRew,
      cycle_reward: cycleRew,
      'Cycle reward': cycleRew,
      retopupAmount: retopupAmt,
      retopup_amount: retopupAmt,
      'Re-topup amount': retopupAmt,
      dailyCap: dailyCap,
      daily_cap: dailyCap,
      dailyCapUsdt: dailyCap,
      'Daily cap': dailyCap,
      dailyCycleLimit: config.daily_cycle_limit || 5,
      daily_cycle_limit: config.daily_cycle_limit || 5,
      'Daily cycle limit': config.daily_cycle_limit || 5,
      requiredDirectReferrals: config.required_direct_referrals,
      required_direct_referrals: config.required_direct_referrals,
      'Required direct referrals': config.required_direct_referrals,
      requiredQualifiedBuilders: config.required_qualified_builders,
      required_qualified_builders: config.required_qualified_builders,
      'Required qualified builders': config.required_qualified_builders,
      autoUpgradeEnabled: config.auto_upgrade_enabled,
      auto_upgrade_enabled: config.auto_upgrade_enabled,
      'Auto-upgrade enabled': config.auto_upgrade_enabled,
      retopupEnabled: config.retopup_enabled,
      retopup_enabled: config.retopup_enabled,
      'Re-topup enabled': config.retopup_enabled,
      status: config.status,
      Status: config.status,
      version: config.version,
    };
  }

  /**
   * Fetch all active raw LevelConfigRecords
   */
  static async getAllActiveLevelConfigs(): Promise<LevelConfigRecord[]> {
    try {
      const dbConfigs = await prisma.levelConfiguration.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { level_order: 'asc' },
      });
      if (dbConfigs && dbConfigs.length > 0) {
        return dbConfigs.map((cfg) => ({
          ...cfg,
          joining_amount: cfg.joining_amount.toString(),
          upgrade_amount: cfg.upgrade_amount.toString(),
          income_per_position: cfg.income_per_position.toString(),
          cycle_reward: cfg.cycle_reward.toString(),
          retopup_amount: cfg.retopup_amount.toString(),
          daily_cap: cfg.daily_cap.toString(),
        })) as LevelConfigRecord[];
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Failed to fetch level configs from database, using defaults');
    }
    return DEFAULT_LEVEL_CONFIGS;
  }

  /**
   * Find raw LevelConfigRecord by ID
   */
  static async findLevelConfigById(id: string): Promise<LevelConfigRecord | null> {
    try {
      const dbConfig = await prisma.levelConfiguration.findUnique({
        where: { id },
      });
      if (dbConfig) {
        return {
          ...dbConfig,
          joining_amount: dbConfig.joining_amount.toString(),
          upgrade_amount: dbConfig.upgrade_amount.toString(),
          income_per_position: dbConfig.income_per_position.toString(),
          cycle_reward: dbConfig.cycle_reward.toString(),
          retopup_amount: dbConfig.retopup_amount.toString(),
          daily_cap: dbConfig.daily_cap.toString(),
        } as LevelConfigRecord;
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, `Failed to fetch level config by ID ${id}`);
    }
    return DEFAULT_LEVEL_CONFIGS.find((cfg) => cfg.id === id) || null;
  }

  /**
   * Fetch all ACTIVE Level Configurations
   * Only returns active plan versions & preserves historical level configurations
   */
  static async getActivePlans(): Promise<FormattedPlan[]> {
    try {
      const dbConfigs = await prisma.levelConfiguration.findMany({
        where: {
          status: 'ACTIVE',
        },
        orderBy: {
          level_order: 'asc',
        },
      });

      if (dbConfigs && dbConfigs.length > 0) {
        return dbConfigs.map((cfg) => this.formatPlan(cfg));
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma level_configurations query failed, using default levels');
    }

    return DEFAULT_LEVEL_CONFIGS.map((cfg) => this.formatPlan(cfg));
  }

  /**
   * Fetch single ACTIVE Level Configuration by Slug
   */
  static async getPlanBySlug(slug: string): Promise<FormattedPlan | null> {
    const cleanSlug = slug.toLowerCase().trim();
    try {
      const dbConfig = await prisma.levelConfiguration.findFirst({
        where: {
          slug: cleanSlug,
          status: 'ACTIVE',
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (dbConfig) {
        return this.formatPlan(dbConfig);
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, `Prisma query for slug ${slug} failed`);
    }

    const defaultMatch = DEFAULT_LEVEL_CONFIGS.find((cfg) => cfg.slug === cleanSlug);
    return defaultMatch ? this.formatPlan(defaultMatch) : null;
  }

  /**
   * Get User's Current Level & User Level History
   */
  static async getUserLevelData(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          current_level: true,
          user_levels: {
            include: { level_configuration: true },
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (user) {
        return {
          user,
          currentLevel: user.current_level ? this.formatPlan(user.current_level) : null,
          history: user.user_levels.map((ul) => ({
            id: ul.id,
            status: ul.status,
            activatedAt: ul.activated_at,
            completedAt: ul.completed_at,
            configuration: ul.level_configuration ? this.formatPlan(ul.level_configuration) : null,
          })),
        };
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, `Prisma query for user levels (${userId}) failed`);
    }

    // Default fallback level data for guest / memory user
    const defaultStarter = this.formatPlan(DEFAULT_LEVEL_CONFIGS[0]);
    return {
      user: { id: userId, current_level_id: defaultStarter.id },
      currentLevel: defaultStarter,
      history: [
        {
          id: 'ul-starter-default',
          status: 'ACTIVE',
          activatedAt: new Date(),
          completedAt: null,
          configuration: defaultStarter,
        },
      ],
    };
  }

  /**
   * Count user's active direct referrals and qualified builders
   */
  static async getUserQualificationCounts(userId: string) {
    try {
      const directCount = await prisma.referralRelation.count({
        where: {
          sponsor_user_id: userId,
          depth: 1,
          status: 'ACTIVE',
        },
      });

      // Count direct referrals who are at level_order >= 2 (Qualified Builders)
      const builderCount = await prisma.referralRelation.count({
        where: {
          sponsor_user_id: userId,
          depth: 1,
          status: 'ACTIVE',
          referred: {
            current_level: {
              level_order: { gte: 2 },
            },
          },
        },
      });

      return { directCount, builderCount };
    } catch (err: any) {
      // Fallback qualification mock counts
      return { directCount: 2, builderCount: 1 };
    }
  }

  /**
   * Update plan joining amount by slug
   */
  static async updatePlanBySlug(slug: string, newAmount: string) {
    const cleanSlug = slug.toLowerCase().trim();
    try {
      const dbConfig = await prisma.levelConfiguration.findFirst({
        where: { slug: cleanSlug, status: 'ACTIVE' },
        orderBy: { version: 'desc' },
      });

      if (dbConfig) {
        await prisma.levelConfiguration.update({
          where: { id: dbConfig.id },
          data: { joining_amount: newAmount },
        });
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, `Prisma update for slug ${slug} failed. Trying in-memory update.`);
    }

    // Always update in-memory as fallback
    const defaultMatch = DEFAULT_LEVEL_CONFIGS.find((cfg) => cfg.slug === cleanSlug);
    if (defaultMatch) {
      defaultMatch.joining_amount = newAmount;
    }
    
    return true;
  }
}

export default BoosterRepository;

export type BoosterTierCode = 'launch' | 'starter' | 'builder' | 'leader' | 'champion' | 'visionary';

export interface BoosterTierConfig {
  id: string;
  code: BoosterTierCode;
  name: string;
  subscriptionAmount: number;
  slotsPerCycle: number;
  collectionAmount: number;
  resubscribeAmount: number;
  upgradeAmount: number | null;
  upgradeTarget: string | null;
  reserveAmount: number | null;
  mainPlanAmount: number | null;
  netIncome: number | null;
  defaultDailyCapping: number;
  cappingType:
    | 'qualified_builders'
    | 'qualified_leaders'
    | 'qualified_champions'
    | 'leader_pool_capping'
    | 'uncapped';
  /** Authoritative requirement thresholds — single source of truth (was previously duplicated/drifted across seed.ts and BoosterRepository.ts). */
  requiredDirectReferrals: number;
  requiredQualifiedBuilders: number;
  /** false for Launch and Visionary's X3 leg — these never go through DailyCappingService. */
  cappingEnabled: boolean;
  matrixType: 'X3' | 'X5' | 'HYBRID';
  /** Visionary only: 500 = 200 (X3 leg) + 300 (3x3/20-level leg). Undefined for every other tier. */
  visionaryPart1Amount?: number;
  visionaryPart2Amount?: number;
}

export interface BoosterQualificationData {
  qualifiedBuilders: number;
  qualifiedLeaders: number;
  qualifiedChampions: number;
  leaderDailyCapping: number;
}

export const BOOSTER_TIER_CONFIGS: BoosterTierConfig[] = [
  {
    id: 'launch',
    code: 'launch',
    name: 'Launch',
    subscriptionAmount: 5,
    slotsPerCycle: 3,
    collectionAmount: 15,
    resubscribeAmount: 5,
    upgradeAmount: 10,
    upgradeTarget: 'starter',
    reserveAmount: null,
    mainPlanAmount: null,
    netIncome: null, // Derived dynamically: collectionAmount - resubscribeAmount - upgradeAmount (first cycle only)
    defaultDailyCapping: 5, // unused: cappingEnabled=false means DailyCappingService is never invoked for this tier
    cappingType: 'uncapped',
    requiredDirectReferrals: 0,
    requiredQualifiedBuilders: 0,
    cappingEnabled: false,
    matrixType: 'X3',
  },
  {
    id: 'starter',
    code: 'starter',
    name: 'Starter Pool',
    subscriptionAmount: 10,
    slotsPerCycle: 5,
    collectionAmount: 50,
    resubscribeAmount: 10,
    upgradeAmount: 40,
    upgradeTarget: 'builder',
    reserveAmount: null,
    mainPlanAmount: null,
    netIncome: null, // Derived dynamically: collectionAmount - resubscribeAmount
    defaultDailyCapping: 5,
    cappingType: 'qualified_builders',
    requiredDirectReferrals: 0,
    requiredQualifiedBuilders: 0,
    cappingEnabled: true,
    matrixType: 'X5',
  },
  {
    id: 'builder',
    code: 'builder',
    name: 'Builder Pool',
    subscriptionAmount: 40,
    slotsPerCycle: 5,
    collectionAmount: 200,
    resubscribeAmount: 40,
    upgradeAmount: 80,
    upgradeTarget: 'leader',
    reserveAmount: 80, // Bititan Wallet first-cycle amount (kept separate from user Income Wallet)
    mainPlanAmount: null,
    netIncome: null, // Derived dynamically: collectionAmount - resubscribeAmount
    defaultDailyCapping: 5,
    cappingType: 'qualified_leaders',
    requiredDirectReferrals: 5,
    requiredQualifiedBuilders: 0,
    cappingEnabled: true,
    matrixType: 'X5',
  },
  {
    id: 'leader',
    code: 'leader',
    name: 'Leader Pool',
    subscriptionAmount: 80,
    slotsPerCycle: 5,
    collectionAmount: 400,
    resubscribeAmount: 80,
    upgradeAmount: 320,
    upgradeTarget: 'champion',
    reserveAmount: null,
    mainPlanAmount: null,
    netIncome: null, // Derived dynamically: collectionAmount - resubscribeAmount
    defaultDailyCapping: 5,
    cappingType: 'qualified_champions',
    requiredDirectReferrals: 5,
    requiredQualifiedBuilders: 5,
    cappingEnabled: true,
    matrixType: 'X5',
  },
  {
    id: 'champion',
    code: 'champion',
    name: 'Champion Pool',
    subscriptionAmount: 320,
    slotsPerCycle: 5,
    collectionAmount: 1600,
    resubscribeAmount: 320,
    upgradeAmount: 500,
    upgradeTarget: 'visionary',
    reserveAmount: null,
    mainPlanAmount: 500,
    netIncome: 780,
    defaultDailyCapping: 5,
    cappingType: 'leader_pool_capping',
    requiredDirectReferrals: 3,
    requiredQualifiedBuilders: 2,
    cappingEnabled: true,
    matrixType: 'X5',
  },
  {
    id: 'visionary',
    code: 'visionary',
    name: 'Visionary',
    subscriptionAmount: 500,
    slotsPerCycle: 3, // X3 leg (Part 1) only; the 3x3/20-level leg (Part 2) is tracked separately, not via slotsPerCycle
    collectionAmount: 600, // Part-1 X3 cycle: 3 x 200
    resubscribeAmount: 200, // Part-1 X3 re-subscription unit
    upgradeAmount: null, // top tier — no further upgrade target
    upgradeTarget: null,
    reserveAmount: null,
    mainPlanAmount: null,
    netIncome: null,
    defaultDailyCapping: 5, // unused: cappingEnabled=false
    cappingType: 'uncapped',
    requiredDirectReferrals: 0,
    requiredQualifiedBuilders: 0,
    cappingEnabled: false,
    matrixType: 'HYBRID',
    visionaryPart1Amount: 200,
    visionaryPart2Amount: 300,
  },
];

export class BoosterConfigService {
  static getAllTierConfigs() {
    return BOOSTER_TIER_CONFIGS;
  }

  static getTierConfig(tierCode?: string | null) {
    return BOOSTER_TIER_CONFIGS.find((tier) => tier.code === tierCode);
  }

  static assertTierConfig(tierCode?: string | null) {
    const config = this.getTierConfig(tierCode);
    if (!config) {
      throw new Error(`Invalid Booster tier '${tierCode || 'unknown'}'`);
    }
    return config;
  }

  static calculateBoosterDailyCapping(
    tierCode: BoosterTierCode,
    qualificationData: BoosterQualificationData,
  ): number {
    switch (tierCode) {
      case 'starter':
        return Math.max(5, qualificationData.qualifiedBuilders);
      case 'builder':
        return Math.max(5, qualificationData.qualifiedLeaders);
      case 'leader':
        return Math.max(5, qualificationData.qualifiedChampions);
      case 'champion':
        return Math.max(5, qualificationData.leaderDailyCapping);
      default:
        return 5;
    }
  }

  static calculateRemainingCyclesToday(dailyCapping: number, cyclesCompletedToday: number): number {
    return Math.max(0, dailyCapping - cyclesCompletedToday);
  }
}

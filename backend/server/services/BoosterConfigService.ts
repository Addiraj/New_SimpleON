export type BoosterTierCode = 'starter' | 'builder' | 'leader' | 'champion';

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
  mainPlanAmount: number | null;
  netIncome: number | null;
  defaultDailyCapping: number;
  cappingType:
    | 'qualified_builders'
    | 'qualified_leaders'
    | 'qualified_champions'
    | 'leader_pool_capping';
}

export interface BoosterQualificationData {
  qualifiedBuilders: number;
  qualifiedLeaders: number;
  qualifiedChampions: number;
  leaderDailyCapping: number;
}

export const BOOSTER_TIER_CONFIGS: BoosterTierConfig[] = [
  {
    id: 'starter',
    code: 'starter',
    name: 'Starter Pool',
    subscriptionAmount: 1,
    slotsPerCycle: 5,
    collectionAmount: 5,
    resubscribeAmount: 1,
    upgradeAmount: 4,
    upgradeTarget: 'builder',
    mainPlanAmount: null,
    netIncome: null,
    defaultDailyCapping: 5,
    cappingType: 'qualified_builders',
  },
  {
    id: 'builder',
    code: 'builder',
    name: 'Builder Pool',
    subscriptionAmount: 4,
    slotsPerCycle: 5,
    collectionAmount: 20,
    resubscribeAmount: 4,
    upgradeAmount: 16,
    upgradeTarget: 'leader',
    mainPlanAmount: null,
    netIncome: null,
    defaultDailyCapping: 5,
    cappingType: 'qualified_leaders',
  },
  {
    id: 'leader',
    code: 'leader',
    name: 'Leader Pool',
    subscriptionAmount: 16,
    slotsPerCycle: 5,
    collectionAmount: 80,
    resubscribeAmount: 16,
    upgradeAmount: 64,
    upgradeTarget: 'champion',
    mainPlanAmount: null,
    netIncome: null,
    defaultDailyCapping: 5,
    cappingType: 'qualified_champions',
  },
  {
    id: 'champion',
    code: 'champion',
    name: 'Champion Pool',
    subscriptionAmount: 64,
    slotsPerCycle: 5,
    collectionAmount: 320,
    resubscribeAmount: 64,
    upgradeAmount: null,
    upgradeTarget: null,
    mainPlanAmount: 100,
    netIncome: 156,
    defaultDailyCapping: 5,
    cappingType: 'leader_pool_capping',
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

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
  reserveAmount: number | null;
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
    reserveAmount: 80,
    mainPlanAmount: null,
    netIncome: null, // Derived dynamically: collectionAmount - resubscribeAmount
    defaultDailyCapping: 5,
    cappingType: 'qualified_leaders',
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
  },
  {
    id: 'champion',
    code: 'champion',
    name: 'Champion Pool',
    subscriptionAmount: 320,
    slotsPerCycle: 5,
    collectionAmount: 1600,
    resubscribeAmount: 320,
    upgradeAmount: null,
    upgradeTarget: null,
    reserveAmount: null,
    mainPlanAmount: 500,
    netIncome: null, // Derived dynamically: collectionAmount - resubscribeAmount - mainPlanAmount
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

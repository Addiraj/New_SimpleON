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

export interface UserBoosterTierStatus {
  tierCode: BoosterTierCode;
  status: 'active' | 'locked' | 'completed';
  cycleNumber: number;
  filledSlots: number;
  slotsPerCycle: number;
  cyclesCompletedToday: number;
  dailyCapping: number;
  remainingCyclesToday: number;
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
    mainPlanAmount: null,
    netIncome: null,
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
    mainPlanAmount: null,
    netIncome: null,
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
    mainPlanAmount: null,
    netIncome: null,
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
    mainPlanAmount: 500,
    netIncome: 780,
    defaultDailyCapping: 5,
    cappingType: 'leader_pool_capping',
  },
];

export const getBoosterTierConfig = (tierCode?: string | null): BoosterTierConfig | undefined =>
  BOOSTER_TIER_CONFIGS.find((tier) => tier.code === tierCode);

export function calculateBoosterDailyCapping(
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

export const calculateRemainingCyclesToday = (dailyCapping: number, cyclesCompletedToday: number): number =>
  Math.max(0, dailyCapping - cyclesCompletedToday);

export const formatUsdt = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Unavailable';
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)} USDT`;
};

export const formatUsdtPlain = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
};

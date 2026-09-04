// Compile-time fallback ONLY — used when the backend API is unreachable or returns malformed
// data. This must never be used to reject/override a valid live API response (that landmine
// existed in Plans.tsx before the Launch/Visionary extension and has been removed — see
// Plans.tsx's schema-shape validation instead of exact-match validation).
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
  /** true = no daily cycle cap (Launch, Visionary's X3 leg). */
  cappingEnabled: boolean;
  matrixType: 'X3' | 'X5' | 'HYBRID';
  cappingType:
    | 'qualified_builders'
    | 'qualified_leaders'
    | 'qualified_champions'
    | 'leader_pool_capping'
    | 'uncapped';
  /** Visionary only: 500 = 200 (X3 leg) + 300 (3x3/20-level leg). */
  visionaryPart1Amount?: number;
  visionaryPart2Amount?: number;
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
    netIncome: null,
    defaultDailyCapping: 5,
    cappingEnabled: false,
    matrixType: 'X3',
    cappingType: 'uncapped',
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
    netIncome: null,
    defaultDailyCapping: 5,
    cappingEnabled: true,
    matrixType: 'X5',
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
    netIncome: null,
    defaultDailyCapping: 5,
    cappingEnabled: true,
    matrixType: 'X5',
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
    netIncome: null,
    defaultDailyCapping: 5,
    cappingEnabled: true,
    matrixType: 'X5',
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
    upgradeAmount: 500,
    upgradeTarget: 'visionary',
    reserveAmount: null,
    mainPlanAmount: 500,
    netIncome: 780,
    defaultDailyCapping: 5,
    cappingEnabled: true,
    matrixType: 'X5',
    cappingType: 'leader_pool_capping',
  },
  {
    id: 'visionary',
    code: 'visionary',
    name: 'Visionary',
    subscriptionAmount: 500,
    slotsPerCycle: 3,
    collectionAmount: 600,
    resubscribeAmount: 200,
    upgradeAmount: null,
    upgradeTarget: null,
    reserveAmount: null,
    mainPlanAmount: null,
    netIncome: null,
    defaultDailyCapping: 5,
    cappingEnabled: false,
    matrixType: 'HYBRID',
    cappingType: 'uncapped',
    visionaryPart1Amount: 200,
    visionaryPart2Amount: 300,
  },
];

export const getBoosterTierConfig = (tierCode?: string | null): BoosterTierConfig | undefined =>
  BOOSTER_TIER_CONFIGS.find((tier) => tier.code === tierCode);

export function calculateBoosterDailyCapping(
  tierCode: BoosterTierCode,
  qualificationData: BoosterQualificationData,
): number | null {
  switch (tierCode) {
    case 'launch':
    case 'visionary':
      return null; // unlimited — render as "Unlimited", never as a number
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

export const calculateRemainingCyclesToday = (dailyCapping: number | null, cyclesCompletedToday: number): number | null =>
  dailyCapping === null ? null : Math.max(0, dailyCapping - cyclesCompletedToday);

export const formatUsdt = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Unavailable';
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)} USDT`;
};

export const formatUsdtPlain = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
};

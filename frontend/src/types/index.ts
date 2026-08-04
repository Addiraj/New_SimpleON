export type BoosterTierName = 'STARTER' | 'BUILDER' | 'LEADER' | 'CHAMPION' | 'MAIN_PLAN';

export interface UserProfile {
  address: string;
  referrerAddress?: string;
  tier: BoosterTierName;
  basePlanAmount: number;
  totalEarningsUsdt: number;
  directReferralsCount: number;
  currentCycle: number;
  dailyCappingLimit: number;
  cyclesCompletedToday: number;
  createdAt: string;
  status?: 'ACTIVE' | 'PENDING' | 'INACTIVE';
}

export interface BoosterTierDetail {
  tier: BoosterTierName;
  multiplier: string;
  cost: number;
  collectedFrom5Partners: number;
  reSubscribeCost: number;
  autoUpgradeCost: number;
  netIncome: number;
  description: string;
  x5Split?: number;
  forcedLevelPool?: number;
  perLevelIncome?: number;
  x4MatrixAllocation?: number;
}

export interface BoosterCalculationsResponse {
  basePlanAmount: number;
  tiers: BoosterTierDetail[];
}

export interface MatrixLevelNode {
  level: number;
  maxCapacity: number;
  filledNodes: number;
  rewardPerNodeUsdt: number;
  totalLevelEarningsUsdt: number;
  percentageAllocation: string;
}

export interface MatrixTreeResponse {
  userAddress: string;
  matrixType: string;
  totalLevels: number;
  perLevelRewardUsdt: number;
  levels: MatrixLevelNode[];
}

export interface Web3ProviderOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

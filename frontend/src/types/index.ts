export type BoosterTierName = 'LAUNCH' | 'STARTER' | 'BUILDER' | 'LEADER' | 'CHAMPION' | 'VISIONARY';

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

export interface Web3ProviderOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

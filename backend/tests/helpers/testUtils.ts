import { ethers } from 'ethers';
import { AuthRepository } from '../../server/repositories/AuthRepository.js';
import { UserRepository } from '../../server/repositories/UserRepository.js';
import { ReferralRepository } from '../../server/repositories/ReferralRepository.js';
import { PaymentRepository } from '../../server/repositories/PaymentRepository.js';
import { MatrixRepository } from '../../server/repositories/MatrixRepository.js';

export interface TestWalletUser {
  wallet: ethers.HDNodeWallet;
  address: string;
}

export function createTestWallet(): TestWalletUser {
  const wallet = ethers.Wallet.createRandom();
  return {
    wallet,
    address: wallet.address.toLowerCase(),
  };
}

export function resetAllTestStores(): void {
  AuthRepository.resetMemoryStore();
  UserRepository.resetMemoryStore();
  ReferralRepository.resetMemoryStore();
  PaymentRepository.resetMemoryStore();
  MatrixRepository.resetMemoryStore();
}

const LEVEL_ORDER: Record<string, number> = {
  launch: 1, starter: 2, builder: 3, leader: 4, champion: 5, visionary: 6,
};

export async function seedFullLadder(db: any): Promise<void> {
  const { BOOSTER_TIER_CONFIGS } = await import('../../server/services/BoosterConfigService.js');
  for (const tier of BOOSTER_TIER_CONFIGS) {
    await db.levelConfiguration.upsert({
      where: { slug_version: { slug: tier.code, version: 1 } },
      update: {
        level_order: LEVEL_ORDER[tier.code],
        joining_amount: tier.subscriptionAmount,
        upgrade_amount: tier.upgradeAmount ?? 0,
        matrix_size: tier.slotsPerCycle,
        retopup_amount: tier.resubscribeAmount,
        capping_enabled: tier.cappingEnabled,
        bititan_amount: tier.reserveAmount ?? null,
        required_direct_referrals: tier.requiredDirectReferrals,
        required_qualified_builders: tier.requiredQualifiedBuilders,
      },
      create: {
        name: tier.name,
        slug: tier.code,
        level_order: LEVEL_ORDER[tier.code],
        joining_amount: tier.subscriptionAmount,
        upgrade_amount: tier.upgradeAmount ?? 0,
        matrix_size: tier.slotsPerCycle,
        income_per_position: 0,
        cycle_reward: 0,
        retopup_amount: tier.resubscribeAmount,
        daily_cap: 0,
        daily_cycle_limit: tier.defaultDailyCapping,
        required_direct_referrals: tier.requiredDirectReferrals,
        required_qualified_builders: tier.requiredQualifiedBuilders,
        capping_enabled: tier.cappingEnabled,
        bititan_amount: tier.reserveAmount ?? null,
        matrix_type: 'STANDARD',
        status: 'ACTIVE',
        version: 1,
      },
    });
  }
}


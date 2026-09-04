import { PrismaClient, UserRole, UserStatus, LevelStatus } from '@prisma/client';
import { BOOSTER_TIER_CONFIGS } from '../server/services/BoosterConfigService.js';

const prisma = new PrismaClient();

// Non-financial per-tier metadata that has no equivalent in BoosterConfigService
// (display name shown in upgrade notifications/UpgradeHistory, differs deliberately
// from BoosterConfigService's "X Pool" matrix-view labels; income_per_position/cycle_reward
// are matrix-display-only derivatives, not consumed by the live reward-routing logic).
const LEVEL_METADATA: Record<string, { name: string; income_per_position: string; cycle_reward: string; auto_upgrade_enabled: boolean }> = {
  launch: { name: 'Launch', income_per_position: '1.66666667', cycle_reward: '10.00000000', auto_upgrade_enabled: true },
  starter: { name: 'Starter', income_per_position: '2.00000000', cycle_reward: '40.00000000', auto_upgrade_enabled: true },
  builder: { name: 'Builder', income_per_position: '8.00000000', cycle_reward: '160.00000000', auto_upgrade_enabled: true },
  leader: { name: 'Leader', income_per_position: '16.00000000', cycle_reward: '320.00000000', auto_upgrade_enabled: true },
  champion: { name: 'Champion', income_per_position: '64.00000000', cycle_reward: '780.00000000', auto_upgrade_enabled: false },
  visionary: { name: 'Visionary', income_per_position: '66.66666667', cycle_reward: '400.00000000', auto_upgrade_enabled: false },
};

// level_order: Launch=1 (deliberately not 0, which already means "user has no level yet"
// throughout UpgradeEligibilityService/PaymentService) through Visionary=6, top tier.
const LEVEL_ORDER: Record<string, number> = {
  launch: 1, starter: 2, builder: 3, leader: 4, champion: 5, visionary: 6,
};

async function main() {
  console.log('🌱 Starting SimpleOn Database Seeding...');

  // ----------------------------------------------------
  // 1. Seed Level Configurations (Launch, Starter, Builder, Leader, Champion, Visionary)
  // Financial amounts (joining/upgrade/retopup, matrix size/type, capping, referral
  // requirements) are derived from BoosterConfigService.BOOSTER_TIER_CONFIGS — the single
  // authoritative source — so this seed can never drift from the values the reward-routing
  // logic uses. Builder's Bititan Wallet amount comes from tier.reserveAmount (see comment
  // in BoosterConfigService.ts on why that field doubles as bititan_amount's source).
  // ----------------------------------------------------

  const levelsData = (['launch', 'starter', 'builder', 'leader', 'champion', 'visionary'] as const).map((slug) => {
    const tier = BOOSTER_TIER_CONFIGS.find((t) => t.code === slug)!;
    const meta = LEVEL_METADATA[slug];
    return {
      name: meta.name,
      slug: tier.code,
      level_order: LEVEL_ORDER[slug],
      joining_amount: tier.subscriptionAmount.toFixed(8),
      upgrade_amount: (tier.upgradeAmount ?? 0).toFixed(8),
      matrix_size: tier.slotsPerCycle,
      income_per_position: meta.income_per_position,
      cycle_reward: meta.cycle_reward,
      retopup_amount: tier.resubscribeAmount.toFixed(8),
      daily_cap: '0.00000000',
      daily_cycle_limit: tier.defaultDailyCapping,
      required_direct_referrals: tier.requiredDirectReferrals,
      required_qualified_builders: tier.requiredQualifiedBuilders,
      auto_upgrade_enabled: meta.auto_upgrade_enabled,
      capping_enabled: tier.cappingEnabled,
      bititan_amount: tier.reserveAmount != null ? tier.reserveAmount.toFixed(8) : null,
      matrix_type: 'STANDARD',
      retopup_enabled: true,
      status: LevelStatus.ACTIVE,
      version: 1,
    };
  });

  for (const level of levelsData) {
    await prisma.levelConfiguration.upsert({
      where: {
        slug_version: {
          slug: level.slug,
          version: level.version,
        },
      },
      update: level,
      create: level,
    });
  }

  console.log('✅ Level Configurations seeded: Launch, Starter, Builder, Leader, Champion, Visionary.');

  // Fetch starter level for default user association
  const starterLevel = await prisma.levelConfiguration.findFirst({
    where: { slug: 'starter', version: 1 },
  });

  // ----------------------------------------------------
  // 2. Seed Protocol Root System Admin User
  // ----------------------------------------------------
  const adminAddress = '0x0000000000000000000000000000000000000000';
  const adminUser = await prisma.user.upsert({
    where: { wallet_address: adminAddress },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      current_level_id: starterLevel?.id,
    },
    create: {
      wallet_address: adminAddress,
      referral_code: 'ROOT_MATRIX_001',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      current_level_id: starterLevel?.id,
      display_name: 'System Root Protocol Admin',
      email: 'admin@simpleon.io',
      joined_at: new Date(),
    },
  });

  console.log('✅ System Root Admin User seeded:', adminUser.wallet_address);

  // ----------------------------------------------------
  // 3. Seed System Configurations
  // ----------------------------------------------------
  const systemConfigs = [
    {
      configuration_key: 'BUSINESS_TIMEZONE',
      configuration_value: 'UTC',
      value_type: 'STRING',
      is_public: true,
      description: 'Business date calculation timezone for daily capping',
    },
    {
      configuration_key: 'MOCK_PAYMENT_ENABLED',
      configuration_value: 'true',
      value_type: 'BOOLEAN',
      is_public: true,
      description: 'Enables instant mock web3 payment confirmation in test environments',
    },
    {
      configuration_key: 'BLOCKCHAIN_NETWORK',
      configuration_value: 'BSC_TESTNET',
      value_type: 'STRING',
      is_public: true,
      description: 'Active EVM chain (BNB Smart Chain Testnet - ChainID 97)',
    },
    {
      configuration_key: 'SUPPORTED_TOKEN_ADDRESS',
      configuration_value: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
      value_type: 'STRING',
      is_public: true,
      description: 'USDT Smart Contract Address on BSC Testnet',
    },
    {
      configuration_key: 'TREASURY_WALLET_ADDRESS',
      configuration_value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      value_type: 'STRING',
      is_public: false,
      description: 'Protocol Treasury Wallet for matrix level joins and upgrades',
    },
    {
      configuration_key: 'MINIMUM_CONFIRMATIONS',
      configuration_value: '3',
      value_type: 'NUMBER',
      is_public: false,
      description: 'Required block confirmations before confirming transactions',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfiguration.upsert({
      where: { configuration_key: config.configuration_key },
      update: config,
      create: config,
    });
  }

  console.log('✅ System Configurations seeded successfully.');
  console.log('🎉 Database Seeding Complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

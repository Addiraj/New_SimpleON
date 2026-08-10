import { PrismaClient, UserRole, UserStatus, LevelStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SimpleOn Database Seeding...');

  // ----------------------------------------------------
  // 1. Seed Level Configurations (Starter, Builder, Leader, Champion)
  // NOTE: Financial values below are clearly marked PLACEHOLDERS.
  // CLIENT NOTICE: The client-approved business financial values must replace
  // these placeholder values before production deployment.
  // ----------------------------------------------------

  const levelsData = [
    {
      name: 'Starter',
      slug: 'starter',
      level_order: 1,
      // PLACEHOLDER VALUES - REPLACE BEFORE PRODUCTION
      joining_amount: '1.00000000', // 1 USDT starter level joining
      upgrade_amount: '4.00000000', // 4 USDT required to upgrade to Builder
      matrix_size: 5,               // X5 Matrix (5 members per cycle)
      income_per_position: '0.20000000', // Income per position filled
      cycle_reward: '0.80000000',   // Total reward per completed cycle
      retopup_amount: '0.20000000',  // Auto retopup fee
      daily_cap: '50.00000000',     // 50 USDT daily capping limit for Starter level
      required_direct_referrals: 0,
      required_qualified_builders: 0,
      auto_upgrade_enabled: true,
      retopup_enabled: true,
      status: LevelStatus.ACTIVE,
      version: 1,
    },
    {
      name: 'Builder',
      slug: 'builder',
      level_order: 2,
      // PLACEHOLDER VALUES - REPLACE BEFORE PRODUCTION
      joining_amount: '4.00000000', // 4 USDT builder level joining
      upgrade_amount: '16.00000000',// 16 USDT required to upgrade to Leader
      matrix_size: 5,               // X5 Matrix
      income_per_position: '0.80000000',
      cycle_reward: '3.20000000',
      retopup_amount: '0.80000000',
      daily_cap: '200.00000000',    // 200 USDT daily capping limit
      required_direct_referrals: 5,
      required_qualified_builders: 0,
      auto_upgrade_enabled: true,
      retopup_enabled: true,
      status: LevelStatus.ACTIVE,
      version: 1,
    },
    {
      name: 'Leader',
      slug: 'leader',
      level_order: 3,
      // PLACEHOLDER VALUES - REPLACE BEFORE PRODUCTION
      joining_amount: '16.00000000',// 16 USDT leader level joining
      upgrade_amount: '64.00000000',// 64 USDT required to upgrade to Champion
      matrix_size: 5,               // X5 Matrix
      income_per_position: '3.20000000',
      cycle_reward: '12.80000000',
      retopup_amount: '3.20000000',
      daily_cap: '500.00000000',    // 500 USDT daily capping limit
      required_direct_referrals: 5,
      required_qualified_builders: 5,
      auto_upgrade_enabled: true,
      retopup_enabled: true,
      status: LevelStatus.ACTIVE,
      version: 1,
    },
    {
      name: 'Champion',
      slug: 'champion',
      level_order: 4,
      // PLACEHOLDER VALUES - REPLACE BEFORE PRODUCTION
      joining_amount: '64.00000000',// 64 USDT champion level joining
      upgrade_amount: '0.00000000', // Max level, no further upgrade cost
      matrix_size: 5,               // X5 Matrix
      income_per_position: '12.80000000',
      cycle_reward: '51.20000000',
      retopup_amount: '12.80000000',
      daily_cap: '2000.00000000',   // 2,000 USDT daily capping limit
      required_direct_referrals: 5,
      required_qualified_builders: 5,
      auto_upgrade_enabled: false,  // Highest tier reached
      retopup_enabled: true,
      status: LevelStatus.ACTIVE,
      version: 1,
    },
  ];

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

  console.log('✅ Level Configurations seeded: Starter, Builder, Leader, Champion.');

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

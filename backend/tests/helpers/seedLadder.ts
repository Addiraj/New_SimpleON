import { prisma } from '../../server/config/database.js';
import { BOOSTER_TIER_CONFIGS } from '../../server/services/BoosterConfigService.js';

const LEVEL_ORDER: Record<string, number> = {
  launch: 1, starter: 2, builder: 3, leader: 4, champion: 5, visionary: 6,
};

/**
 * Re-seeds the full 6-tier ladder in the shared real-Postgres test DB, independent of what other
 * spec files (e.g. dailyCappingConcurrency.spec.ts, globalStats.spec.ts) TRUNCATE/replace it
 * with — any suite that needs a specific tier (e.g. 'builder') present must call this rather
 * than assume some other file's beforeEach already seeded it, since Vitest runs spec files in a
 * shared DB and their `beforeEach` hooks race/overwrite each other's fixture rows across files.
 * Derived from BOOSTER_TIER_CONFIGS, the same single source of truth prisma/seed.ts uses.
 */
export async function seedFullLadder(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE daily_cappings, daily_earnings, wallet_ledgers, transactions, matrix_cycles, referral_relations, users, level_configurations CASCADE;`
  );

  for (const tier of BOOSTER_TIER_CONFIGS) {
    await prisma.levelConfiguration.upsert({
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

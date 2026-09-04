-- Renumber the existing Starter..Champion level_order values from 1-4 to 2-5, freeing up
-- level_order=1 for the new Launch tier (below Starter) and level_order=6 for the new
-- Visionary tier (above Champion). Launch=1 was chosen over Launch=0 specifically to avoid
-- colliding with the pre-existing "0 = user has no level yet" sentinel used throughout
-- UpgradeEligibilityService/PaymentService — see BoosterConfigService.ts for the full ladder.
--
-- level_order is not referenced by any foreign key (only LevelConfiguration.id is), so this
-- is a pure data change with zero relational impact on existing UserLevel/MatrixCycle/etc rows.
--
-- Two-pass offset update: the [level_order, version] unique constraint would otherwise be
-- transiently violated (e.g. setting starter 1->2 while builder is still at 2). Shifting all
-- four rows to a disjoint high range first, then down to their final values one at a time,
-- guarantees no intermediate state ever collides.
DO $$
BEGIN
  -- Idempotency guard: skip entirely if this migration has already been applied
  -- (e.g. Starter is already at level_order=2).
  IF NOT EXISTS (
    SELECT 1 FROM "level_configurations" WHERE "slug" = 'starter' AND "version" = 1 AND "level_order" = 2
  ) THEN
    UPDATE "level_configurations" SET "level_order" = "level_order" + 100
      WHERE "slug" IN ('starter', 'builder', 'leader', 'champion') AND "version" = 1;

    UPDATE "level_configurations" SET "level_order" = 2 WHERE "slug" = 'starter' AND "version" = 1;
    UPDATE "level_configurations" SET "level_order" = 3 WHERE "slug" = 'builder' AND "version" = 1;
    UPDATE "level_configurations" SET "level_order" = 4 WHERE "slug" = 'leader' AND "version" = 1;
    UPDATE "level_configurations" SET "level_order" = 5 WHERE "slug" = 'champion' AND "version" = 1;
  END IF;
END $$;

-- Launch: 5 USDT, X3 matrix, uncapped. The 10 USDT extracted from its first cycle funds
-- Starter's activation (see MatrixRewardService's NEXT_TIER_ACTIVATION_FUNDING routing).
INSERT INTO "level_configurations" (
  "id", "name", "slug", "level_order", "joining_amount", "upgrade_amount", "matrix_size",
  "income_per_position", "cycle_reward", "retopup_amount", "daily_cap", "daily_cycle_limit",
  "required_direct_referrals", "required_qualified_builders", "auto_upgrade_enabled",
  "retopup_enabled", "capping_enabled", "bititan_amount", "matrix_type", "status", "version",
  "effective_from", "created_at", "updated_at"
) VALUES (
  'cfg-launch-v1', 'Launch', 'launch', 1, 5.00000000, 10.00000000, 3,
  1.66666667, 10.00000000, 5.00000000, 0.00000000, 5,
  0, 0, true,
  true, false, NULL, 'STANDARD', 'ACTIVE', 1,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("slug", "version") DO NOTHING;

-- Visionary: 500 USDT top tier, split into Part 1 (200, X3, uncapped) and Part 2 (300, 3x3 /
-- 20-level forced matrix, tracked via VisionaryLevelProgress/VisionaryTreePosition, not via
-- matrix_size on this row). No upgrade target (upgrade_amount=0 is a sentinel, not a real fee).
INSERT INTO "level_configurations" (
  "id", "name", "slug", "level_order", "joining_amount", "upgrade_amount", "matrix_size",
  "income_per_position", "cycle_reward", "retopup_amount", "daily_cap", "daily_cycle_limit",
  "required_direct_referrals", "required_qualified_builders", "auto_upgrade_enabled",
  "retopup_enabled", "capping_enabled", "bititan_amount", "matrix_type", "status", "version",
  "effective_from", "created_at", "updated_at"
) VALUES (
  'cfg-visionary-v1', 'Visionary', 'visionary', 6, 500.00000000, 0.00000000, 3,
  66.66666667, 400.00000000, 200.00000000, 0.00000000, 5,
  0, 0, false,
  true, false, NULL, 'STANDARD', 'ACTIVE', 1,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("slug", "version") DO NOTHING;

-- Builder's Bititan Wallet first-cycle amount (kept separate from the user's Income Wallet).
UPDATE "level_configurations" SET "bititan_amount" = 80.00000000
  WHERE "slug" = 'builder' AND "version" = 1 AND "bititan_amount" IS NULL;

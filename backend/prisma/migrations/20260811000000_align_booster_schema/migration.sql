-- Align the deployed database with the Booster schema used by the application.

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'BOOSTER_REWARD';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ADMIN_INCOME';

ALTER TABLE "level_configurations"
  ADD COLUMN IF NOT EXISTS "daily_cycle_limit" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "daily_cappings"
  ADD COLUMN IF NOT EXISTS "daily_cycle_limit" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "capped_cycle_count" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "daily_cappings_user_id_business_date_key";
CREATE UNIQUE INDEX IF NOT EXISTS "daily_cappings_user_id_level_configuration_id_business_date_key"
  ON "daily_cappings"("user_id", "level_configuration_id", "business_date");

CREATE UNIQUE INDEX IF NOT EXISTS "user_levels_user_id_level_configuration_id_key"
  ON "user_levels"("user_id", "level_configuration_id");

CREATE TABLE IF NOT EXISTS "booster_wallets" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "starter_resubscribe_fund" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "builder_activation_fund" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "builder_resubscribe_fund" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "leader_activation_fund" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "leader_resubscribe_fund" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "champion_activation_fund" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "champion_resubscribe_fund" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "b_titan_reserve_fund" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "main_plan_reserve_fund" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "income_wallet" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "current_highest_pool" VARCHAR(32) NOT NULL DEFAULT 'STARTER',
  "starter_cycle" INTEGER NOT NULL DEFAULT 1,
  "builder_cycle" INTEGER NOT NULL DEFAULT 1,
  "leader_cycle" INTEGER NOT NULL DEFAULT 1,
  "champion_cycle" INTEGER NOT NULL DEFAULT 1,
  "starter_members_count" INTEGER NOT NULL DEFAULT 0,
  "builder_members_count" INTEGER NOT NULL DEFAULT 0,
  "leader_members_count" INTEGER NOT NULL DEFAULT 0,
  "champion_members_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booster_wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "booster_wallets_user_id_key" ON "booster_wallets"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booster_wallets_user_id_fkey'
  ) THEN
    ALTER TABLE "booster_wallets"
      ADD CONSTRAINT "booster_wallets_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "admin_wallets" (
  "id" TEXT NOT NULL DEFAULT 'ADMIN',
  "total_income" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_wallets_pkey" PRIMARY KEY ("id")
);

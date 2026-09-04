/*
  Warnings:

  - You are about to drop the `admin_wallets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `booster_wallets` table. If the table is not empty, all the data it contains will be lost.

  BEFORE APPLYING TO STAGING OR PRODUCTION: these two tables backed an orphaned code path
  (BoosterService.buyStarterPlan/processPoolDistribution/etc — zero live callers, since deleted)
  and were verified empty in local dev. They were NOT verified empty in staging/production —
  run `SELECT count(*) FROM booster_wallets; SELECT count(*) FROM admin_wallets;` against that
  environment first. If either is non-zero, STOP and investigate before proceeding — do not
  assume this migration is safe to apply as-is.
*/
-- DropForeignKey
ALTER TABLE "booster_wallets" DROP CONSTRAINT "booster_wallets_user_id_fkey";

-- DropTable
DROP TABLE "admin_wallets";

-- DropTable
DROP TABLE "booster_wallets";

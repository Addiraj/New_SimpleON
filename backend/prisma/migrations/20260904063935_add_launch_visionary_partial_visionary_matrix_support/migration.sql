-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerEntryType" ADD VALUE 'REACTIVATION_CREDIT';
ALTER TYPE "LedgerEntryType" ADD VALUE 'NEXT_TIER_ACTIVATION_FUNDING';
ALTER TYPE "LedgerEntryType" ADD VALUE 'BITITAN_CREDIT';
ALTER TYPE "LedgerEntryType" ADD VALUE 'PARTIAL_ACTIVATION_CREDIT';

-- AlterTable
ALTER TABLE "level_configurations" ADD COLUMN     "bititan_amount" DECIMAL(20,8),
ADD COLUMN     "capping_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "matrix_type" VARCHAR(32) NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "partial_activations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_level_configuration_id" TEXT NOT NULL,
    "accumulated_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "threshold_amount" DECIMAL(20,8) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACCUMULATING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partial_activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visionary_level_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level_depth" INTEGER NOT NULL,
    "capacity" BIGINT NOT NULL,
    "filled_count" BIGINT NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visionary_level_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visionary_tree_positions" (
    "id" TEXT NOT NULL,
    "root_user_id" TEXT NOT NULL,
    "level_depth" INTEGER NOT NULL,
    "parent_position_id" TEXT,
    "member_user_id" TEXT NOT NULL,
    "sponsor_user_id" TEXT NOT NULL,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visionary_tree_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partial_activations_user_id_target_level_configuration_id_key" ON "partial_activations"("user_id", "target_level_configuration_id");

-- CreateIndex
CREATE UNIQUE INDEX "visionary_level_progress_user_id_level_depth_key" ON "visionary_level_progress"("user_id", "level_depth");

-- CreateIndex
CREATE INDEX "visionary_tree_positions_root_user_id_level_depth_idx" ON "visionary_tree_positions"("root_user_id", "level_depth");

-- AddForeignKey
ALTER TABLE "partial_activations" ADD CONSTRAINT "partial_activations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partial_activations" ADD CONSTRAINT "partial_activations_target_level_configuration_id_fkey" FOREIGN KEY ("target_level_configuration_id") REFERENCES "level_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visionary_level_progress" ADD CONSTRAINT "visionary_level_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visionary_tree_positions" ADD CONSTRAINT "visionary_tree_positions_root_user_id_fkey" FOREIGN KEY ("root_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visionary_tree_positions" ADD CONSTRAINT "visionary_tree_positions_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visionary_tree_positions" ADD CONSTRAINT "visionary_tree_positions_parent_position_id_fkey" FOREIGN KEY ("parent_position_id") REFERENCES "visionary_tree_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

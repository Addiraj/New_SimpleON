-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LevelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "UserLevelStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MatrixCycleStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlacementSource" AS ENUM ('DIRECT', 'SPILLOVER', 'RECYCLE');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('JOIN', 'UPGRADE', 'RETOPUP');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PLAN_JOIN', 'MATRIX_REWARD', 'REFERRAL_REWARD', 'UPGRADE', 'RETOPUP', 'CAPPING', 'DEPOSIT', 'WITHDRAWAL', 'REVERSAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('PLAN_JOIN', 'MATRIX_REWARD', 'REFERRAL_REWARD', 'RETOPUP_DEBIT', 'UPGRADE_DEBIT', 'CAPPED_INCOME', 'HELD_INCOME', 'RELEASED_INCOME', 'DEPOSIT', 'WITHDRAWAL', 'REVERSAL', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('PENDING', 'AVAILABLE', 'LOCKED', 'COMPLETED', 'REVERSED', 'FAILED');

-- CreateEnum
CREATE TYPE "DailyEarningStatus" AS ENUM ('ACTIVE', 'FINALIZED', 'LOCKED');

-- CreateEnum
CREATE TYPE "CappingHandlingType" AS ENUM ('HELD', 'FORFEITED', 'CARRIED_FORWARD');

-- CreateEnum
CREATE TYPE "UpgradeType" AS ENUM ('AUTOMATIC', 'MANUAL', 'PAID');

-- CreateEnum
CREATE TYPE "UpgradeStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOGIN_SUCCESS', 'PLAN_ACTIVATED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'MATRIX_POSITION_FILLED', 'MATRIX_CYCLE_COMPLETED', 'LEVEL_UPGRADED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "wallet_address" VARCHAR(255) NOT NULL,
    "referral_code" VARCHAR(64) NOT NULL,
    "sponsor_id" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "current_level_id" TEXT,
    "display_name" VARCHAR(128),
    "email" VARCHAR(255),
    "joined_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_nonces" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "wallet_address" VARCHAR(255) NOT NULL,
    "nonce_hash" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "ip_address" VARCHAR(64),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_configurations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "level_order" INTEGER NOT NULL,
    "joining_amount" DECIMAL(20,8) NOT NULL,
    "upgrade_amount" DECIMAL(20,8) NOT NULL,
    "matrix_size" INTEGER NOT NULL DEFAULT 5,
    "income_per_position" DECIMAL(20,8) NOT NULL,
    "cycle_reward" DECIMAL(20,8) NOT NULL,
    "retopup_amount" DECIMAL(20,8) NOT NULL,
    "daily_cap" DECIMAL(20,8) NOT NULL,
    "required_direct_referrals" INTEGER NOT NULL DEFAULT 0,
    "required_qualified_builders" INTEGER NOT NULL DEFAULT 0,
    "auto_upgrade_enabled" BOOLEAN NOT NULL DEFAULT true,
    "retopup_enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "LevelStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_levels" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level_configuration_id" TEXT NOT NULL,
    "status" "UserLevelStatus" NOT NULL DEFAULT 'PENDING',
    "activated_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "configuration_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_relations" (
    "id" TEXT NOT NULL,
    "sponsor_user_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 1,
    "status" "ReferralStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matrix_cycles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level_configuration_id" TEXT NOT NULL,
    "cycle_number" INTEGER NOT NULL DEFAULT 1,
    "total_positions" INTEGER NOT NULL DEFAULT 5,
    "filled_positions" INTEGER NOT NULL DEFAULT 0,
    "status" "MatrixCycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "previous_cycle_id" TEXT,
    "next_cycle_id" TEXT,
    "configuration_snapshot" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matrix_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matrix_positions" (
    "id" TEXT NOT NULL,
    "matrix_cycle_id" TEXT NOT NULL,
    "position_number" INTEGER NOT NULL,
    "member_user_id" TEXT NOT NULL,
    "sponsor_user_id" TEXT NOT NULL,
    "placement_source" "PlacementSource" NOT NULL DEFAULT 'DIRECT',
    "status" "PositionStatus" NOT NULL DEFAULT 'CONFIRMED',
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matrix_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level_configuration_id" TEXT,
    "payment_reference" VARCHAR(128) NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "expected_amount" DECIMAL(20,8) NOT NULL,
    "token_address" VARCHAR(255),
    "receiver_address" VARCHAR(255),
    "network_id" VARCHAR(64),
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_verifications" (
    "id" TEXT NOT NULL,
    "payment_intent_id" TEXT NOT NULL,
    "transaction_hash" VARCHAR(255) NOT NULL,
    "from_address" VARCHAR(255) NOT NULL,
    "to_address" VARCHAR(255) NOT NULL,
    "token_address" VARCHAR(255),
    "network_id" VARCHAR(64),
    "block_number" BIGINT,
    "confirmed_amount" DECIMAL(20,8) NOT NULL,
    "confirmation_count" INTEGER NOT NULL DEFAULT 1,
    "status" "VerificationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "failure_reason" TEXT,
    "raw_receipt" JSONB,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_intent_id" TEXT,
    "transaction_type" "TransactionType" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" VARCHAR(32) NOT NULL DEFAULT 'USDT',
    "blockchain_transaction_hash" VARCHAR(255),
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledgers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "entry_type" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "available_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "locked_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "pending_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "status" "LedgerStatus" NOT NULL DEFAULT 'AVAILABLE',
    "idempotency_key" VARCHAR(255) NOT NULL,
    "source_type" VARCHAR(128),
    "source_id" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_earnings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_date" DATE NOT NULL,
    "gross_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "credited_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "capped_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "held_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "carried_forward_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "daily_cap" DECIMAL(20,8) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "status" "DailyEarningStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_cappings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level_configuration_id" TEXT NOT NULL,
    "business_date" DATE NOT NULL,
    "gross_earning" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "allowed_earning" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "excess_earning" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "handling_type" "CappingHandlingType" NOT NULL DEFAULT 'HELD',
    "qualified_builder_count" INTEGER NOT NULL DEFAULT 0,
    "completed_cycle_count" INTEGER NOT NULL DEFAULT 0,
    "calculation_snapshot" JSONB,
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_cappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upgrade_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_level_id" TEXT,
    "to_level_id" TEXT NOT NULL,
    "upgrade_type" "UpgradeType" NOT NULL,
    "status" "UpgradeStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(20,8) NOT NULL,
    "eligibility_snapshot" JSONB,
    "transaction_id" TEXT,
    "idempotency_key" VARCHAR(255),
    "upgraded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upgrade_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "in_app_notifications" BOOLEAN NOT NULL DEFAULT true,
    "language" VARCHAR(16) NOT NULL DEFAULT 'en',
    "theme" VARCHAR(32) NOT NULL DEFAULT 'dark',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "admin_user_id" TEXT,
    "action" VARCHAR(128) NOT NULL,
    "entity_type" VARCHAR(128) NOT NULL,
    "entity_id" VARCHAR(255),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(64),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "user_id" TEXT,
    "operation" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(255) NOT NULL,
    "response_data" JSONB,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configurations" (
    "id" TEXT NOT NULL,
    "configuration_key" VARCHAR(128) NOT NULL,
    "configuration_value" TEXT NOT NULL,
    "value_type" VARCHAR(32) NOT NULL DEFAULT 'STRING',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_wallet_address_idx" ON "users"("wallet_address");

-- CreateIndex
CREATE INDEX "users_referral_code_idx" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_sponsor_id_idx" ON "users"("sponsor_id");

-- CreateIndex
CREATE INDEX "users_current_level_id_idx" ON "users"("current_level_id");

-- CreateIndex
CREATE INDEX "auth_nonces_wallet_address_idx" ON "auth_nonces"("wallet_address");

-- CreateIndex
CREATE INDEX "auth_nonces_user_id_idx" ON "auth_nonces"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "level_configurations_name_version_key" ON "level_configurations"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "level_configurations_slug_version_key" ON "level_configurations"("slug", "version");

-- CreateIndex
CREATE UNIQUE INDEX "level_configurations_level_order_version_key" ON "level_configurations"("level_order", "version");

-- CreateIndex
CREATE INDEX "user_levels_user_id_idx" ON "user_levels"("user_id");

-- CreateIndex
CREATE INDEX "user_levels_level_configuration_id_idx" ON "user_levels"("level_configuration_id");

-- CreateIndex
CREATE INDEX "referral_relations_sponsor_user_id_idx" ON "referral_relations"("sponsor_user_id");

-- CreateIndex
CREATE INDEX "referral_relations_referred_user_id_idx" ON "referral_relations"("referred_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_relations_sponsor_user_id_referred_user_id_key" ON "referral_relations"("sponsor_user_id", "referred_user_id");

-- CreateIndex
CREATE INDEX "matrix_cycles_user_id_idx" ON "matrix_cycles"("user_id");

-- CreateIndex
CREATE INDEX "matrix_cycles_level_configuration_id_idx" ON "matrix_cycles"("level_configuration_id");

-- CreateIndex
CREATE UNIQUE INDEX "matrix_cycles_user_id_level_configuration_id_cycle_number_key" ON "matrix_cycles"("user_id", "level_configuration_id", "cycle_number");

-- CreateIndex
CREATE INDEX "matrix_positions_matrix_cycle_id_idx" ON "matrix_positions"("matrix_cycle_id");

-- CreateIndex
CREATE INDEX "matrix_positions_member_user_id_idx" ON "matrix_positions"("member_user_id");

-- CreateIndex
CREATE INDEX "matrix_positions_sponsor_user_id_idx" ON "matrix_positions"("sponsor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "matrix_positions_matrix_cycle_id_position_number_key" ON "matrix_positions"("matrix_cycle_id", "position_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_payment_reference_key" ON "payment_intents"("payment_reference");

-- CreateIndex
CREATE INDEX "payment_intents_user_id_idx" ON "payment_intents"("user_id");

-- CreateIndex
CREATE INDEX "payment_intents_payment_reference_idx" ON "payment_intents"("payment_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_verifications_transaction_hash_key" ON "payment_verifications"("transaction_hash");

-- CreateIndex
CREATE INDEX "payment_verifications_payment_intent_id_idx" ON "payment_verifications"("payment_intent_id");

-- CreateIndex
CREATE INDEX "payment_verifications_transaction_hash_idx" ON "payment_verifications"("transaction_hash");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_blockchain_transaction_hash_key" ON "transactions"("blockchain_transaction_hash");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledgers_idempotency_key_key" ON "wallet_ledgers"("idempotency_key");

-- CreateIndex
CREATE INDEX "wallet_ledgers_user_id_idx" ON "wallet_ledgers"("user_id");

-- CreateIndex
CREATE INDEX "wallet_ledgers_transaction_id_idx" ON "wallet_ledgers"("transaction_id");

-- CreateIndex
CREATE INDEX "wallet_ledgers_idempotency_key_idx" ON "wallet_ledgers"("idempotency_key");

-- CreateIndex
CREATE INDEX "daily_earnings_user_id_idx" ON "daily_earnings"("user_id");

-- CreateIndex
CREATE INDEX "daily_earnings_business_date_idx" ON "daily_earnings"("business_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_earnings_user_id_business_date_key" ON "daily_earnings"("user_id", "business_date");

-- CreateIndex
CREATE INDEX "daily_cappings_user_id_idx" ON "daily_cappings"("user_id");

-- CreateIndex
CREATE INDEX "daily_cappings_business_date_idx" ON "daily_cappings"("business_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_cappings_user_id_business_date_key" ON "daily_cappings"("user_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX "upgrade_histories_idempotency_key_key" ON "upgrade_histories"("idempotency_key");

-- CreateIndex
CREATE INDEX "upgrade_histories_user_id_idx" ON "upgrade_histories"("user_id");

-- CreateIndex
CREATE INDEX "upgrade_histories_to_level_id_idx" ON "upgrade_histories"("to_level_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_key_idx" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_user_id_idx" ON "idempotency_keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_configuration_key_key" ON "system_configurations"("configuration_key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_current_level_id_fkey" FOREIGN KEY ("current_level_id") REFERENCES "level_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_nonces" ADD CONSTRAINT "auth_nonces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_level_configuration_id_fkey" FOREIGN KEY ("level_configuration_id") REFERENCES "level_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_relations" ADD CONSTRAINT "referral_relations_sponsor_user_id_fkey" FOREIGN KEY ("sponsor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_relations" ADD CONSTRAINT "referral_relations_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_cycles" ADD CONSTRAINT "matrix_cycles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_cycles" ADD CONSTRAINT "matrix_cycles_level_configuration_id_fkey" FOREIGN KEY ("level_configuration_id") REFERENCES "level_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_cycles" ADD CONSTRAINT "matrix_cycles_previous_cycle_id_fkey" FOREIGN KEY ("previous_cycle_id") REFERENCES "matrix_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_positions" ADD CONSTRAINT "matrix_positions_matrix_cycle_id_fkey" FOREIGN KEY ("matrix_cycle_id") REFERENCES "matrix_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_positions" ADD CONSTRAINT "matrix_positions_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_positions" ADD CONSTRAINT "matrix_positions_sponsor_user_id_fkey" FOREIGN KEY ("sponsor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_level_configuration_id_fkey" FOREIGN KEY ("level_configuration_id") REFERENCES "level_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_verifications" ADD CONSTRAINT "payment_verifications_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledgers" ADD CONSTRAINT "wallet_ledgers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledgers" ADD CONSTRAINT "wallet_ledgers_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_earnings" ADD CONSTRAINT "daily_earnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_cappings" ADD CONSTRAINT "daily_cappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_cappings" ADD CONSTRAINT "daily_cappings_level_configuration_id_fkey" FOREIGN KEY ("level_configuration_id") REFERENCES "level_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrade_histories" ADD CONSTRAINT "upgrade_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrade_histories" ADD CONSTRAINT "upgrade_histories_from_level_id_fkey" FOREIGN KEY ("from_level_id") REFERENCES "level_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrade_histories" ADD CONSTRAINT "upgrade_histories_to_level_id_fkey" FOREIGN KEY ("to_level_id") REFERENCES "level_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrade_histories" ADD CONSTRAINT "upgrade_histories_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

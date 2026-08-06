-- ═══════════════════════════════════════════════════════════════════════
-- ENTERPRISE SUBSCRIPTION SYSTEM — Billing, Payments & Feature Access
-- Robust / idempotent: works on databases where plans, coupons, payments
-- and subscriptions already exist (created via boot-time SQL) as well as
-- on databases migrated purely through Prisma migrations.
-- ═══════════════════════════════════════════════════════════════════════

-- Ensure subscriptions exists (created earlier via 20260803000000)
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "plan_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Extend subscriptions with billing lifecycle fields
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "billing_cycle" TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'razorpay';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider_subscription_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "auto_renew" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancellation_requested_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "ended_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_plan_code_idx" ON "subscriptions"("plan_code");
CREATE INDEX IF NOT EXISTS "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- Ensure plans exists (created via boot-time admin-tables.sql)
CREATE TABLE IF NOT EXISTS "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "price_monthly" DOUBLE PRECISION NOT NULL,
    "price_yearly" DOUBLE PRECISION NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- Extend plans with catalog/pricing metadata
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'premium';
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "recommended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "trial_days" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "plans_name_key" ON "plans"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "plans_code_key" ON "plans"("code");

-- Ensure coupons exists (created via boot-time admin-tables.sql)
CREATE TABLE IF NOT EXISTS "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discount_pct" DOUBLE PRECISION NOT NULL,
    "valid_until" TIMESTAMP(3),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- Extend coupons with plan targeting + amount caps
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "plan_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "min_amount" DOUBLE PRECISION;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "max_discount_amount" DOUBLE PRECISION;

CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");

-- Ensure payments exists (created outside migrations on the live DB)
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "signature" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Extend payments with multi-provider + refund + invoice fields
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "billing_cycle" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'razorpay';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "coupon_code" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "discount_amount" INTEGER;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_number" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_status" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_order_id_key" ON "payments"("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_payment_id_key" ON "payments"("payment_id");
CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments"("user_id");
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "payments"("created_at");
CREATE INDEX IF NOT EXISTS "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- Immutable payment/refund ledger
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "order_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'payment',
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "provider_ref" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "transactions_user_id_idx" ON "transactions"("user_id");
CREATE INDEX IF NOT EXISTS "transactions_payment_id_idx" ON "transactions"("payment_id");
CREATE INDEX IF NOT EXISTS "transactions_created_at_idx" ON "transactions"("created_at");
CREATE INDEX IF NOT EXISTS "transactions_type_status_idx" ON "transactions"("type", "status");

-- Saved payment methods
CREATE TABLE IF NOT EXISTS "payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "type" TEXT NOT NULL DEFAULT 'card',
    "brand" TEXT DEFAULT '',
    "last_4" TEXT,
    "expiry_month" TEXT,
    "expiry_year" TEXT,
    "holder_name" TEXT,
    "email" TEXT,
    "provider_token" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_methods_user_id_idx" ON "payment_methods"("user_id");

-- Billing address (one per user)
CREATE TABLE IF NOT EXISTS "billing_addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "line1" TEXT,
    "line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "gstin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_addresses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_addresses_user_id_key" ON "billing_addresses"("user_id");

-- Generated invoices
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "payment_id" TEXT,
    "subscription_id" TEXT,
    "plan" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL,
    "tax_amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "download_url" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX IF NOT EXISTS "invoices_user_id_idx" ON "invoices"("user_id");
CREATE INDEX IF NOT EXISTS "invoices_issued_at_idx" ON "invoices"("issued_at");

-- Admin-configurable per-feature per-plan quotas
CREATE TABLE IF NOT EXISTS "usage_limits" (
    "id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "daily_limit" INTEGER,
    "monthly_limit" INTEGER,
    "token_limit" INTEGER,
    "storage_mb" DOUBLE PRECISION,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usage_limits_feature_key_plan_code_key" ON "usage_limits"("feature_key", "plan_code");
CREATE INDEX IF NOT EXISTS "usage_limits_plan_code_idx" ON "usage_limits"("plan_code");

-- Feature → required-plan access catalog
CREATE TABLE IF NOT EXISTS "feature_access" (
    "id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'AI Productivity',
    "required_plan" TEXT NOT NULL DEFAULT 'premium',
    "route_pattern" TEXT,
    "gated" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feature_access_feature_key_key" ON "feature_access"("feature_key");
CREATE INDEX IF NOT EXISTS "feature_access_category_idx" ON "feature_access"("category");
CREATE INDEX IF NOT EXISTS "feature_access_required_plan_idx" ON "feature_access"("required_plan");

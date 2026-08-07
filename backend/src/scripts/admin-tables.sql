-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "avatar_url" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "admin_name" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "target_id" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_login_history" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_preferences" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "dashboard_config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "admin_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpu_usage" DOUBLE PRECISION NOT NULL,
    "memory_used" DOUBLE PRECISION NOT NULL,
    "memory_total" DOUBLE PRECISION NOT NULL,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "req_per_min" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "rollout_pct" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'Enabled',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
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

-- CreateTable
CREATE TABLE "plans" (
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

-- CreateTable
CREATE TABLE "revenue_reports" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "gross_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "new_subscribers" INTEGER NOT NULL DEFAULT 0,
    "churn_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_jobs" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "external_id" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "company_id" TEXT,
    "logo_url" TEXT,
    "location" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT NOT NULL DEFAULT 'INR',
    "experience_min" INTEGER,
    "experience_max" INTEGER,
    "employment_type" TEXT NOT NULL DEFAULT 'Full-Time',
    "work_mode" TEXT NOT NULL DEFAULT 'Onsite',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "education" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "company_size" TEXT NOT NULL DEFAULT '',
    "apply_url" TEXT,
    "source_url" TEXT,
    "source" TEXT NOT NULL,
    "posted_at" TIMESTAMP(3),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "save_count" INTEGER NOT NULL DEFAULT 0,
    "source_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_job_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "schedule" TEXT NOT NULL DEFAULT 'daily',
    "last_run_at" TIMESTAMP(3),
    "last_run_status" TEXT,
    "last_jobs_fetched" INTEGER NOT NULL DEFAULT 0,
    "last_jobs_inserted" INTEGER NOT NULL DEFAULT 0,
    "last_duplicates" INTEGER NOT NULL DEFAULT 0,
    "last_errors" INTEGER NOT NULL DEFAULT 0,
    "last_duration_ms" INTEGER NOT NULL DEFAULT 0,
    "total_jobs_fetched" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_job_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "industry" TEXT NOT NULL DEFAULT '',
    "company_size" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "tech_stack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "job_count" INTEGER NOT NULL DEFAULT 0,
    "avg_salary_min" INTEGER,
    "avg_salary_max" INTEGER,
    "difficulty_level" TEXT NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_ingestion_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "jobs_fetched" INTEGER NOT NULL DEFAULT 0,
    "jobs_inserted" INTEGER NOT NULL DEFAULT 0,
    "jobs_updated" INTEGER NOT NULL DEFAULT 0,
    "duplicates_removed" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "error_details" TEXT,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "discovery_ingestion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_saved_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "collection" TEXT NOT NULL DEFAULT 'default',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'saved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_job_views" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 1,
    "first_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_job_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_search_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters_json" JSONB NOT NULL DEFAULT '{}',
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_job_analytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total_jobs" INTEGER NOT NULL DEFAULT 0,
    "new_jobs" INTEGER NOT NULL DEFAULT 0,
    "active_sources" INTEGER NOT NULL DEFAULT 0,
    "by_location" JSONB NOT NULL DEFAULT '{}',
    "by_skill" JSONB NOT NULL DEFAULT '{}',
    "by_company" JSONB NOT NULL DEFAULT '{}',
    "by_industry" JSONB NOT NULL DEFAULT '{}',
    "salary_ranges" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_job_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_role_id_resource_action_key" ON "admin_permissions"("role_id", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_key" ON "admin_sessions"("token");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "admin_notifications_admin_id_idx" ON "admin_notifications"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_settings_key_key" ON "admin_settings"("key");

-- CreateIndex
CREATE INDEX "admin_login_history_admin_id_idx" ON "admin_login_history"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_preferences_admin_id_key" ON "admin_preferences"("admin_id");

-- CreateIndex
CREATE INDEX "system_metrics_timestamp_idx" ON "system_metrics"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_reports_date_key" ON "revenue_reports"("date");

-- CreateIndex
CREATE INDEX "revenue_reports_date_idx" ON "revenue_reports"("date");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_jobs_fingerprint_key" ON "discovery_jobs"("fingerprint");

-- CreateIndex
CREATE INDEX "discovery_jobs_fingerprint_idx" ON "discovery_jobs"("fingerprint");

-- CreateIndex
CREATE INDEX "discovery_jobs_company_idx" ON "discovery_jobs"("company");

-- CreateIndex
CREATE INDEX "discovery_jobs_source_idx" ON "discovery_jobs"("source");

-- CreateIndex
CREATE INDEX "discovery_jobs_work_mode_idx" ON "discovery_jobs"("work_mode");

-- CreateIndex
CREATE INDEX "discovery_jobs_employment_type_idx" ON "discovery_jobs"("employment_type");

-- CreateIndex
CREATE INDEX "discovery_jobs_location_idx" ON "discovery_jobs"("location");

-- CreateIndex
CREATE INDEX "discovery_jobs_posted_at_idx" ON "discovery_jobs"("posted_at");

-- CreateIndex
CREATE INDEX "discovery_jobs_is_active_idx" ON "discovery_jobs"("is_active");

-- CreateIndex
CREATE INDEX "discovery_jobs_skills_idx" ON "discovery_jobs"("skills");

-- CreateIndex
CREATE INDEX "discovery_jobs_salary_min_idx" ON "discovery_jobs"("salary_min");

-- CreateIndex
CREATE INDEX "discovery_jobs_experience_min_idx" ON "discovery_jobs"("experience_min");

-- CreateIndex
CREATE INDEX "discovery_jobs_created_at_idx" ON "discovery_jobs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_job_sources_name_key" ON "discovery_job_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_companies_name_key" ON "discovery_companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_companies_slug_key" ON "discovery_companies"("slug");

-- CreateIndex
CREATE INDEX "discovery_companies_name_idx" ON "discovery_companies"("name");

-- CreateIndex
CREATE INDEX "discovery_companies_slug_idx" ON "discovery_companies"("slug");

-- CreateIndex
CREATE INDEX "discovery_companies_industry_idx" ON "discovery_companies"("industry");

-- CreateIndex
CREATE INDEX "discovery_companies_job_count_idx" ON "discovery_companies"("job_count");

-- CreateIndex
CREATE INDEX "discovery_ingestion_logs_source_idx" ON "discovery_ingestion_logs"("source");

-- CreateIndex
CREATE INDEX "discovery_ingestion_logs_status_idx" ON "discovery_ingestion_logs"("status");

-- CreateIndex
CREATE INDEX "discovery_ingestion_logs_started_at_idx" ON "discovery_ingestion_logs"("started_at");

-- CreateIndex
CREATE INDEX "discovery_saved_jobs_user_id_idx" ON "discovery_saved_jobs"("user_id");

-- CreateIndex
CREATE INDEX "discovery_saved_jobs_job_id_idx" ON "discovery_saved_jobs"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_saved_jobs_user_id_job_id_key" ON "discovery_saved_jobs"("user_id", "job_id");

-- CreateIndex
CREATE INDEX "discovery_job_views_user_id_idx" ON "discovery_job_views"("user_id");

-- CreateIndex
CREATE INDEX "discovery_job_views_job_id_idx" ON "discovery_job_views"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_job_views_user_id_job_id_key" ON "discovery_job_views"("user_id", "job_id");

-- CreateIndex
CREATE INDEX "discovery_search_history_user_id_idx" ON "discovery_search_history"("user_id");

-- CreateIndex
CREATE INDEX "discovery_search_history_created_at_idx" ON "discovery_search_history"("created_at");

-- CreateIndex
CREATE INDEX "discovery_job_analytics_date_idx" ON "discovery_job_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_job_analytics_date_key" ON "discovery_job_analytics"("date");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_login_history" ADD CONSTRAINT "admin_login_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_preferences" ADD CONSTRAINT "admin_preferences_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'UNIVERSITY',
    "code" TEXT,
    "location" TEXT,
    "domain" TEXT,
    "contact_email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");
CREATE INDEX "organizations_type_idx" ON "organizations"("type");
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateTable: discovery_jobs (full schema matching DiscoveryJob Prisma model)
CREATE TABLE IF NOT EXISTS "discovery_jobs" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "external_id" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "company_id" TEXT,
    "logo_url" TEXT,
    "location" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT NOT NULL DEFAULT 'INR',
    "experience_min" INTEGER,
    "experience_max" INTEGER,
    "employment_type" TEXT NOT NULL DEFAULT 'Full-Time',
    "work_mode" TEXT NOT NULL DEFAULT 'Onsite',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "education" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "company_size" TEXT NOT NULL DEFAULT '',
    "apply_url" TEXT,
    "source_url" TEXT,
    "source" TEXT NOT NULL,
    "posted_at" TIMESTAMP(3),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "save_count" INTEGER NOT NULL DEFAULT 0,
    "source_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for discovery_jobs
CREATE UNIQUE INDEX IF NOT EXISTS "discovery_jobs_fingerprint_key" ON "discovery_jobs"("fingerprint");
CREATE INDEX IF NOT EXISTS "discovery_jobs_company_idx" ON "discovery_jobs"("company");
CREATE INDEX IF NOT EXISTS "discovery_jobs_source_idx" ON "discovery_jobs"("source");
CREATE INDEX IF NOT EXISTS "discovery_jobs_work_mode_idx" ON "discovery_jobs"("work_mode");
CREATE INDEX IF NOT EXISTS "discovery_jobs_employment_type_idx" ON "discovery_jobs"("employment_type");
CREATE INDEX IF NOT EXISTS "discovery_jobs_location_idx" ON "discovery_jobs"("location");
CREATE INDEX IF NOT EXISTS "discovery_jobs_posted_at_idx" ON "discovery_jobs"("posted_at");
CREATE INDEX IF NOT EXISTS "discovery_jobs_is_active_idx" ON "discovery_jobs"("is_active");
CREATE INDEX IF NOT EXISTS "discovery_jobs_salary_min_idx" ON "discovery_jobs"("salary_min");
CREATE INDEX IF NOT EXISTS "discovery_jobs_experience_min_idx" ON "discovery_jobs"("experience_min");
CREATE INDEX IF NOT EXISTS "discovery_jobs_created_at_idx" ON "discovery_jobs"("created_at");

-- CreateTable: saved_jobs (for bookmarking)
CREATE TABLE IF NOT EXISTS "saved_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'saved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for saved_jobs
CREATE UNIQUE INDEX IF NOT EXISTS "saved_jobs_user_id_job_id_key" ON "saved_jobs"("user_id", "job_id");
CREATE INDEX IF NOT EXISTS "saved_jobs_user_id_idx" ON "saved_jobs"("user_id");
CREATE INDEX IF NOT EXISTS "saved_jobs_job_id_idx" ON "saved_jobs"("job_id");

-- AlterTable: discovery_jobs - Add missing columns for existing installations
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "external_id" TEXT;
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT '';
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT '';
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "experience_min" INTEGER;
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "experience_max" INTEGER;
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "education" TEXT NOT NULL DEFAULT '';
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "industry" TEXT NOT NULL DEFAULT '';
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "company_size" TEXT NOT NULL DEFAULT '';
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "discovery_jobs" ADD COLUMN IF NOT EXISTS "source_count" INTEGER NOT NULL DEFAULT 1;

-- Fix NOT NULL constraint for apply_url (make it nullable to match schema)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discovery_jobs' AND column_name = 'apply_url' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "discovery_jobs" ALTER COLUMN "apply_url" DROP NOT NULL;
  END IF;
END $$;

-- Fix NOT NULL constraint for location (ensure default)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discovery_jobs' AND column_name = 'location'
  ) THEN
    UPDATE "discovery_jobs" SET "location" = '' WHERE "location" IS NULL;
  END IF;
END $$;

-- CreateTable: system_notifications
CREATE TABLE IF NOT EXISTS "system_notifications" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "target_audience" TEXT NOT NULL DEFAULT 'ALL',
    "action_url" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "delivery_channel" TEXT NOT NULL DEFAULT 'in_app',
    "send_email" BOOLEAN NOT NULL DEFAULT false,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for system_notifications
CREATE INDEX IF NOT EXISTS "system_notifications_target_audience_idx" ON "system_notifications"("target_audience");
CREATE INDEX IF NOT EXISTS "system_notifications_created_at_idx" ON "system_notifications"("created_at");

-- CreateTable: system_notification_reads
CREATE TABLE IF NOT EXISTS "system_notification_reads" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_notification_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for system_notification_reads
CREATE UNIQUE INDEX IF NOT EXISTS "system_notification_reads_notification_id_user_id_key" ON "system_notification_reads"("notification_id", "user_id");

-- Foreign key for system_notification_reads
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_notification_reads_notification_id_fkey') THEN
    ALTER TABLE "system_notification_reads" ADD CONSTRAINT "system_notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "system_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- FEATURE MANAGEMENT (Enterprise Feature Flag System)
-- ═══════════════════════════════════════════════════════════════════════

-- CreateTable: features (master registry)
CREATE TABLE IF NOT EXISTS "features" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL DEFAULT 'System',
    "category" TEXT NOT NULL DEFAULT 'System',
    "status" TEXT NOT NULL DEFAULT 'Enabled',
    "environment" TEXT NOT NULL DEFAULT 'Production',
    "access_level" TEXT NOT NULL DEFAULT 'All',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "owner" TEXT,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "is_beta" BOOLEAN NOT NULL DEFAULT false,
    "api_endpoint" TEXT,
    "rate_limit" INTEGER,
    "notes" TEXT,
    "last_deployed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "features_key_key" ON "features"("key");
CREATE INDEX IF NOT EXISTS "features_module_idx" ON "features"("module");
CREATE INDEX IF NOT EXISTS "features_category_idx" ON "features"("category");
CREATE INDEX IF NOT EXISTS "features_status_idx" ON "features"("status");
CREATE INDEX IF NOT EXISTS "features_owner_idx" ON "features"("owner");

-- Extend feature_flags with enterprise columns (idempotent)
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "feature_id" TEXT;
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "environment" TEXT NOT NULL DEFAULT 'Production';
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "target_type" TEXT NOT NULL DEFAULT 'all';
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "target_users" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "target_roles" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "target_universities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "target_countries" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "updated_by" TEXT;
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_feature_id_environment_key" ON "feature_flags"("feature_id", "environment");
CREATE INDEX IF NOT EXISTS "feature_flags_feature_id_idx" ON "feature_flags"("feature_id");

-- CreateTable: feature_dependencies
CREATE TABLE IF NOT EXISTS "feature_dependencies" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "depends_on_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feature_dependencies_feature_dep_key" ON "feature_dependencies"("feature_id", "depends_on_id");
CREATE INDEX IF NOT EXISTS "feature_dependencies_feature_id_idx" ON "feature_dependencies"("feature_id");
CREATE INDEX IF NOT EXISTS "feature_dependencies_depends_on_id_idx" ON "feature_dependencies"("depends_on_id");

-- CreateTable: feature_usage (daily analytics snapshots)
CREATE TABLE IF NOT EXISTS "feature_usage" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "avg_response_ms" INTEGER NOT NULL DEFAULT 0,
    "revenue_generated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ai_tokens_used" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feature_usage_feature_date_key" ON "feature_usage"("feature_id", "date");
CREATE INDEX IF NOT EXISTS "feature_usage_feature_id_idx" ON "feature_usage"("feature_id");

-- CreateTable: feature_rollouts (rollout history)
CREATE TABLE IF NOT EXISTS "feature_rollouts" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'Production',
    "rollout_pct" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "target_type" TEXT NOT NULL DEFAULT 'all',
    "target_roles" JSONB NOT NULL DEFAULT '[]',
    "target_users" JSONB NOT NULL DEFAULT '[]',
    "target_universities" JSONB NOT NULL DEFAULT '[]',
    "target_countries" JSONB NOT NULL DEFAULT '[]',
    "changed_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_rollouts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feature_rollouts_feature_id_idx" ON "feature_rollouts"("feature_id");

-- CreateTable: feature_permissions (per-role management matrix)
CREATE TABLE IF NOT EXISTS "feature_permissions" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_toggle" BOOLEAN NOT NULL DEFAULT false,
    "can_rollout" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_permissions" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feature_permissions_feature_role_key" ON "feature_permissions"("feature_id", "role");

-- CreateTable: feature_logs (activity trail)
CREATE TABLE IF NOT EXISTS "feature_logs" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changed_by" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feature_logs_feature_id_idx" ON "feature_logs"("feature_id");
CREATE INDEX IF NOT EXISTS "feature_logs_created_at_idx" ON "feature_logs"("created_at");

-- ═══════════════════════════════════════════════════════════════════════
-- ENTERPRISE SUBSCRIPTION SYSTEM (idempotent, safe to re-run)
-- ═══════════════════════════════════════════════════════════════════════

-- Extend plans with catalog/pricing metadata
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'premium';
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "recommended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "trial_days" INTEGER NOT NULL DEFAULT 0;

-- Extend coupons with plan targeting + amount caps
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "plan_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "min_amount" DOUBLE PRECISION;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "max_discount_amount" DOUBLE PRECISION;

-- Extend payments with multi-provider + refund + invoice fields
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "billing_cycle" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'razorpay';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_number" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_status" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMP(3);

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
    "metadata" JSONB NOT NULL DEFAULT '{}',
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

-- Profiles Registration Workflow Columns
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "course" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "semester" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "student_id" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "profile_completion" INTEGER DEFAULT 0;

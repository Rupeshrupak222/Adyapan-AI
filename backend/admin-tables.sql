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






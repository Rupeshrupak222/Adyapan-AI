-- Complete User Registration Workflow
-- Adds registration-driven default records, university statistics and admin analytics.

-- ─── Users: capture first / last name ──────────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "first_name" TEXT,
  ADD COLUMN IF NOT EXISTS "last_name" TEXT;

-- ─── Profiles: registration fields + university FK ─────────────────────────
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "department" TEXT,
  ADD COLUMN IF NOT EXISTS "course" TEXT,
  ADD COLUMN IF NOT EXISTS "semester" TEXT,
  ADD COLUMN IF NOT EXISTS "student_id" TEXT,
  ADD COLUMN IF NOT EXISTS "referral_code" TEXT,
  ADD COLUMN IF NOT EXISTS "profile_completion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "profiles_organization_id_idx" ON "profiles"("organization_id");
CREATE INDEX IF NOT EXISTS "profiles_student_id_idx" ON "profiles"("student_id");

-- ─── Organizations: university statistics ──────────────────────────────────
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "student_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "active_students" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "course_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "department_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "branch_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "registration_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "latest_registration_at" TIMESTAMPTZ;

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── user_settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "theme_mode" TEXT NOT NULL DEFAULT 'dark',
  "accent_color" TEXT NOT NULL DEFAULT '#f59e0b',
  "compact_mode" BOOLEAN NOT NULL DEFAULT false,
  "glass_effect" BOOLEAN NOT NULL DEFAULT true,
  "animations_enabled" BOOLEAN NOT NULL DEFAULT true,
  "sidebar_collapse" BOOLEAN NOT NULL DEFAULT true,
  "font_size" INTEGER NOT NULL DEFAULT 14,
  "public_profile" BOOLEAN NOT NULL DEFAULT true,
  "data_collection" BOOLEAN NOT NULL DEFAULT true,
  "personalized_ai" BOOLEAN NOT NULL DEFAULT true,
  "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
  "login_alerts" BOOLEAN NOT NULL DEFAULT true,
  "google_connected" BOOLEAN NOT NULL DEFAULT false,
  "github_connected" BOOLEAN NOT NULL DEFAULT false,
  "microsoft_connected" BOOLEAN NOT NULL DEFAULT false,
  "linkedin_connected" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_key" ON "user_settings"("user_id");
ALTER TABLE "user_settings"
  ADD CONSTRAINT "user_settings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ai_preferences ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ai_preferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'openrouter',
  "ai_model" TEXT NOT NULL DEFAULT 'gemini',
  "creativity" INTEGER NOT NULL DEFAULT 70,
  "response_length" TEXT NOT NULL DEFAULT 'balanced',
  "ai_memory" BOOLEAN NOT NULL DEFAULT true,
  "markdown_output" BOOLEAN NOT NULL DEFAULT true,
  "code_highlighting" BOOLEAN NOT NULL DEFAULT true,
  "auto_citation" BOOLEAN NOT NULL DEFAULT false,
  "auto_save_conversations" BOOLEAN NOT NULL DEFAULT true,
  "max_tokens" INTEGER NOT NULL DEFAULT 4096,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "ai_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_preferences_user_id_key" ON "ai_preferences"("user_id");
ALTER TABLE "ai_preferences"
  ADD CONSTRAINT "ai_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── notification_preferences ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "email" BOOLEAN NOT NULL DEFAULT true,
  "push" BOOLEAN NOT NULL DEFAULT true,
  "notif_assignment" BOOLEAN NOT NULL DEFAULT true,
  "notif_interview" BOOLEAN NOT NULL DEFAULT true,
  "notif_coding" BOOLEAN NOT NULL DEFAULT false,
  "notif_research" BOOLEAN NOT NULL DEFAULT false,
  "notif_weekly" BOOLEAN NOT NULL DEFAULT true,
  "notif_daily" BOOLEAN NOT NULL DEFAULT true,
  "marketing" BOOLEAN NOT NULL DEFAULT false,
  "announcements" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_key" ON "notification_preferences"("user_id");
ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── learning_preferences ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "learning_preferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'en',
  "learning_style" TEXT NOT NULL DEFAULT 'visual',
  "daily_goal" INTEGER NOT NULL DEFAULT 3,
  "reminder_time" TEXT NOT NULL DEFAULT '09:00',
  "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
  "note_format" TEXT NOT NULL DEFAULT 'markdown',
  "quiz_difficulty" TEXT NOT NULL DEFAULT 'medium',
  "tutor_personality" TEXT NOT NULL DEFAULT 'friendly',
  "study_reminders" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "learning_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "learning_preferences_user_id_key" ON "learning_preferences"("user_id");
ALTER TABLE "learning_preferences"
  ADD CONSTRAINT "learning_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── activity_logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'account',
  "details" JSONB NOT NULL DEFAULT '{}',
  "ip_address" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "activity_logs_user_id_idx" ON "activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "activity_logs"("created_at");
ALTER TABLE "activity_logs"
  ADD CONSTRAINT "activity_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── sessions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "refresh_token_hash" TEXT,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "last_active_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions"("expires_at");
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── storage_usage ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "storage_usage" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "limit_mb" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "used_mb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" INTEGER NOT NULL DEFAULT 0,
  "resumes" INTEGER NOT NULL DEFAULT 0,
  "assignments" INTEGER NOT NULL DEFAULT 0,
  "sessions" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "storage_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storage_usage_user_id_key" ON "storage_usage"("user_id");
ALTER TABLE "storage_usage"
  ADD CONSTRAINT "storage_usage_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── university_departments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "university_departments" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "student_count" INTEGER NOT NULL DEFAULT 0,
  "registration_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "university_departments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "university_departments_organization_id_name_key"
  ON "university_departments"("organization_id", "name");
CREATE INDEX IF NOT EXISTS "university_departments_organization_id_idx" ON "university_departments"("organization_id");
ALTER TABLE "university_departments"
  ADD CONSTRAINT "university_departments_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── university_courses ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "university_courses" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "department" TEXT,
  "student_count" INTEGER NOT NULL DEFAULT 0,
  "registration_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "university_courses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "university_courses_organization_id_name_key"
  ON "university_courses"("organization_id", "name");
CREATE INDEX IF NOT EXISTS "university_courses_organization_id_idx" ON "university_courses"("organization_id");
ALTER TABLE "university_courses"
  ADD CONSTRAINT "university_courses_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── university_branches ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "university_branches" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "department" TEXT,
  "course" TEXT,
  "student_count" INTEGER NOT NULL DEFAULT 0,
  "registration_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "university_branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "university_branches_organization_id_name_key"
  ON "university_branches"("organization_id", "name");
CREATE INDEX IF NOT EXISTS "university_branches_organization_id_idx" ON "university_branches"("organization_id");
ALTER TABLE "university_branches"
  ADD CONSTRAINT "university_branches_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── registration_daily_metrics ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "registration_daily_metrics" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "registrations" INTEGER NOT NULL DEFAULT 0,
  "new_universities" INTEGER NOT NULL DEFAULT 0,
  "new_departments" INTEGER NOT NULL DEFAULT 0,
  "new_courses" INTEGER NOT NULL DEFAULT 0,
  "new_branches" INTEGER NOT NULL DEFAULT 0,
  "new_countries" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "registration_daily_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "registration_daily_metrics_date_key"
  ON "registration_daily_metrics"("date");
CREATE INDEX IF NOT EXISTS "registration_daily_metrics_date_idx" ON "registration_daily_metrics"("date");

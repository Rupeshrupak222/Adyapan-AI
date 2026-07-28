-- Migration: add_user_settings
-- Adds UserSettings model to store all user preferences for the Settings page

CREATE TABLE IF NOT EXISTS "user_settings" (
  "id"                      TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id"                 TEXT NOT NULL UNIQUE,
  "profile_id"              TEXT NOT NULL UNIQUE,

  -- Appearance
  "theme_mode"              TEXT NOT NULL DEFAULT 'dark',
  "accent_color"            TEXT NOT NULL DEFAULT '#f59e0b',
  "compact_mode"            BOOLEAN NOT NULL DEFAULT false,
  "glass_effect"            BOOLEAN NOT NULL DEFAULT true,
  "animations_enabled"      BOOLEAN NOT NULL DEFAULT true,
  "sidebar_collapse"        BOOLEAN NOT NULL DEFAULT true,
  "font_size"               INTEGER NOT NULL DEFAULT 14,

  -- AI Preferences
  "ai_model"                TEXT NOT NULL DEFAULT 'gemini',
  "response_length"         TEXT NOT NULL DEFAULT 'balanced',
  "creativity"              INTEGER NOT NULL DEFAULT 70,
  "ai_memory"               BOOLEAN NOT NULL DEFAULT true,
  "markdown_output"         BOOLEAN NOT NULL DEFAULT true,
  "code_highlighting"       BOOLEAN NOT NULL DEFAULT true,
  "auto_citation"           BOOLEAN NOT NULL DEFAULT false,
  "auto_save_conversations" BOOLEAN NOT NULL DEFAULT true,

  -- Learning Preferences
  "language"                TEXT NOT NULL DEFAULT 'en',
  "learning_style"          TEXT NOT NULL DEFAULT 'visual',
  "daily_goal"              INTEGER NOT NULL DEFAULT 3,
  "reminder_time"           TEXT NOT NULL DEFAULT '09:00',
  "difficulty"              TEXT NOT NULL DEFAULT 'intermediate',
  "note_format"             TEXT NOT NULL DEFAULT 'markdown',
  "quiz_difficulty"         TEXT NOT NULL DEFAULT 'medium',
  "tutor_personality"       TEXT NOT NULL DEFAULT 'friendly',

  -- Notifications
  "notif_email"             BOOLEAN NOT NULL DEFAULT true,
  "notif_push"              BOOLEAN NOT NULL DEFAULT true,
  "notif_assignment"        BOOLEAN NOT NULL DEFAULT true,
  "notif_interview"         BOOLEAN NOT NULL DEFAULT true,
  "notif_coding"            BOOLEAN NOT NULL DEFAULT false,
  "notif_research"          BOOLEAN NOT NULL DEFAULT false,
  "notif_weekly"            BOOLEAN NOT NULL DEFAULT true,
  "notif_daily"             BOOLEAN NOT NULL DEFAULT true,

  -- Privacy
  "public_profile"          BOOLEAN NOT NULL DEFAULT true,
  "data_collection"         BOOLEAN NOT NULL DEFAULT true,
  "personalized_ai"         BOOLEAN NOT NULL DEFAULT true,

  -- Security
  "two_factor_enabled"      BOOLEAN NOT NULL DEFAULT false,
  "login_alerts"            BOOLEAN NOT NULL DEFAULT true,

  -- API Keys (masked)
  "gemini_api_key"          TEXT,
  "openai_api_key"          TEXT,
  "claude_api_key"          TEXT,
  "groq_api_key"            TEXT,
  "openrouter_api_key"      TEXT,

  -- Connected Accounts
  "google_connected"        BOOLEAN NOT NULL DEFAULT false,
  "github_connected"        BOOLEAN NOT NULL DEFAULT false,
  "microsoft_connected"     BOOLEAN NOT NULL DEFAULT false,
  "linkedin_connected"      BOOLEAN NOT NULL DEFAULT false,

  "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_settings_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS "user_settings_user_id_idx" ON "user_settings"("user_id");

-- Centralized Feature Usage Limits & Feature Credit System
-- Tables are created idempotently (the live database may already have them
-- from src/scripts/feature-usage-tables.sql).

CREATE TABLE IF NOT EXISTS feature_usages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  "limit" INTEGER NOT NULL DEFAULT 10,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feature_usages_user_key_period_unique UNIQUE (user_id, feature_key, period_start)
);

CREATE INDEX IF NOT EXISTS feature_usages_user_feature_idx ON feature_usages (user_id, feature_key);
CREATE INDEX IF NOT EXISTS feature_usages_period_idx ON feature_usages (period_start, period_end);

CREATE TABLE IF NOT EXISTS feature_usage_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  period_start TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'RESERVED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_usage_attempts_user_feature_idx ON feature_usage_attempts (user_id, feature_key);
CREATE INDEX IF NOT EXISTS feature_usage_attempts_request_id_idx ON feature_usage_attempts (request_id);

-- Foreign keys (skipped gracefully when they already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feature_usages_user_id_fkey'
  ) THEN
    ALTER TABLE feature_usages
      ADD CONSTRAINT feature_usages_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- AI Usage / Premium Upgrade Flow tables (idempotent, safe to re-run)
-- Mirrors the models declared in prisma/schema.prisma.

CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  subscription_status TEXT,
  daily_tokens_used INTEGER NOT NULL DEFAULT 0,
  monthly_tokens_used INTEGER NOT NULL DEFAULT 0,
  daily_requests INTEGER NOT NULL DEFAULT 0,
  monthly_requests INTEGER NOT NULL DEFAULT 0,
  daily_reset_at TIMESTAMPTZ NOT NULL,
  monthly_reset_at TIMESTAMPTZ NOT NULL,
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_plan_idx ON ai_usage (plan);
CREATE INDEX IF NOT EXISTS ai_usage_daily_reset_at_idx ON ai_usage (daily_reset_at);

CREATE TABLE IF NOT EXISTS ai_request_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  route TEXT,
  method TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_request_logs_user_id_idx ON ai_request_logs (user_id);
CREATE INDEX IF NOT EXISTS ai_request_logs_created_at_idx ON ai_request_logs (created_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  billing_event TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  plan TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_events_user_id_idx ON billing_events (user_id);
CREATE INDEX IF NOT EXISTS billing_events_event_idx ON billing_events (billing_event);

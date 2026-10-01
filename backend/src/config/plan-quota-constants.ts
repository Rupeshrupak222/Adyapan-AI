// ─── Plan quota constants ────────────────────────────────────────────────────
// Dependency-free on purpose. Both token-tracking.service.ts and
// feature-access.service.ts need these values, and both already depend on
// admin.controller (which eagerly instantiates DatabaseService at module load).
// Importing across that boundary creates a load-order cycle that throws
// "Cannot read properties of undefined (reading 'apiKey')" in any test or
// entrypoint that loads feature-access without a fully-initialised env.

/**
 * Effective ceilings for the unlimited (enterprise) tier. Kept finite so usage
 * snapshots, percentage gauges and admin dashboards keep a denominator. Admins
 * can override per-account via enterpriseTierDaily* system settings.
 */
export const ENTERPRISE_DAILY_TOKENS = 2_000_000_000;
export const ENTERPRISE_DAILY_REQUESTS = 1_000_000;

/**
 * Free-tier fallbacks. These MUST stay in sync with DEFAULT_SYSTEM_SETTINGS in
 * admin.controller.ts — they only apply when the admin_setting row is missing,
 * zero or non-numeric, and a mismatch silently halves the free allowance.
 */
export const FREE_TIER_TOKEN_LIMIT = 500_000;
export const FREE_TIER_DAILY_REQUESTS = 50;

/** Paid self-serve tier ceilings. */
export const PREMIUM_TIER_TOKEN_LIMIT = 5_000_000;
export const PREMIUM_TIER_DAILY_REQUESTS = 200;
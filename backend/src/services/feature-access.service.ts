import { prisma } from "../config/prisma";

// ─── Types ────────────────────────────────────────────────────────

export type PlanKind = "free" | "premium" | "enterprise";

export interface FeatureDefinition {
  featureKey: string;
  name: string;
  description: string | null;
  category: string;
  requiredPlan: PlanKind;
  routePattern: string | null;
  gated: boolean;
}

export interface FeatureLimit {
  featureKey: string;
  planCode: string;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  tokenLimit: number | null;
  storageMb: number | null;
  enabled: boolean;
}

export interface FeatureUsageResult {
  allowed: boolean;
  featureKey: string;
  featureName: string | null;
  category: string | null;
  requiredPlan: PlanKind;
  userPlan: string;
  userPlanKind: PlanKind;
  reason: "ok" | "plan-gate" | "feature-disabled" | "daily-limit" | "monthly-limit" | "not-found";
  message: string;
  usage: {
    dailyUsed: number;
    dailyLimit: number | null;
    monthlyUsed: number;
    monthlyLimit: number | null;
    dailyResetAt: Date | null;
    monthlyResetAt: Date | null;
  } | null;
  upgradeRequired: boolean;
}

const PLAN_RANK: Record<PlanKind, number> = { free: 0, premium: 1, enterprise: 2 };
const MONTHLY_MULTIPLIER = 30;

// ─── In-memory catalog cache (short TTL) ─────────────────────────

let catalogCache: FeatureDefinition[] | null = null;
let catalogCacheAt = 0;
const CATALOG_TTL_MS = 30_000;

export async function getFeatureCatalog(force = false): Promise<FeatureDefinition[]> {
  if (!force && catalogCache && Date.now() - catalogCacheAt < CATALOG_TTL_MS) {
    return catalogCache;
  }
  const rows = await prisma.featureAccess
    .findMany({ orderBy: [{ category: "asc" }, { featureKey: "asc" }] })
    .catch(() => [] as any[]);
  catalogCache = (rows as any[]).map((r) => ({
    featureKey: r.featureKey,
    name: r.name,
    description: r.description ?? null,
    category: r.category,
    requiredPlan: normalizePlanKind(r.requiredPlan),
    routePattern: r.routePattern ?? null,
    gated: r.gated,
  }));
  catalogCacheAt = Date.now();
  return catalogCache;
}

// ─── Helpers ──────────────────────────────────────────────────────

export function normalizePlanKind(plan: string | null | undefined): PlanKind {
  const p = String(plan || "").toLowerCase();
  if (!p || p === "free") return "free";
  if (p.includes("enterprise") || p === "admin") return "enterprise";
  return "premium";
}

export function planRankOf(kind: PlanKind): number {
  return PLAN_RANK[kind] ?? 0;
}

/**
 * Match a request path against the catalog's route patterns, returning the
 * most specific feature key (longest route pattern) or null.
 */
export async function resolveFeatureForRoute(path: string): Promise<FeatureDefinition | null> {
  const catalog = await getFeatureCatalog();
  const clean = String(path || "").replace(/^\/api/, "");
  let best: FeatureDefinition | null = null;
  for (const f of catalog) {
    if (!f.routePattern) continue;
    try {
      if (new RegExp(f.routePattern).test(clean)) {
        if (!best || (f.routePattern?.length ?? 0) > (best.routePattern?.length ?? 0)) {
          best = f;
        }
      }
    } catch {
      /* invalid pattern — skip */
    }
  }
  return best;
}

/**
 * Per-feature usage computed from ai_request_logs filtered by the feature's
 * route pattern. Falls back to the global ai_usage row for generic features.
 */
export async function getFeatureUsageCounts(
  userId: string,
  feature: FeatureDefinition
): Promise<{ dailyUsed: number; monthlyUsed: number; dailyResetAt: Date; monthlyResetAt: Date }> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // When a route pattern exists, count matching ai_request_logs rows.
  if (feature.routePattern) {
    try {
      const re = new RegExp(feature.routePattern);
      const logs = await (prisma as any).aiRequestLog.findMany({
        where: { userId, createdAt: { gte: startOfDay } },
        select: { route: true, createdAt: true, blocked: true },
      });
      let dailyUsed = 0;
      let monthlyUsed = 0;
      for (const log of logs) {
        const route = String(log.route || "");
        if (re.test(route)) {
          if (log.createdAt >= startOfDay) dailyUsed += 1;
          if (log.createdAt >= startOfMonth) monthlyUsed += 1;
        }
      }
      return {
        dailyUsed,
        monthlyUsed,
        dailyResetAt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
        monthlyResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    } catch {
      /* fall through to global counters */
    }
  }

  // Fallback: global counters (ai_usage) — sufficient for generic features.
  const usage = await (prisma as any).aiUsage.findUnique({ where: { userId } }).catch(() => null);
  return {
    dailyUsed: usage?.dailyRequests ?? 0,
    monthlyUsed: usage?.monthlyRequests ?? 0,
    dailyResetAt: usage?.dailyResetAt ?? new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
    monthlyResetAt: usage?.monthlyResetAt ?? new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

/**
 * Resolve the effective per-feature limit for a plan. Falls back to sensible
 * defaults when no usage_limits row exists.
 */
export async function getFeatureLimits(
  featureKey: string,
  planCode: string
): Promise<FeatureLimit> {
  const row = await prisma.usageLimit
    .findUnique({ where: { featureKey_planCode: { featureKey, planCode } } })
    .catch(() => null);

  if (row) {
    return {
      featureKey,
      planCode,
      dailyLimit: row.dailyLimit ?? null,
      monthlyLimit: row.monthlyLimit ?? null,
      tokenLimit: row.tokenLimit ?? null,
      storageMb: row.storageMb ?? null,
      enabled: row.enabled,
    };
  }

  const kind = normalizePlanKind(planCode);
  const s = require("../controllers/admin.controller").getSystemSettingsMemory() as any;

  if (featureKey === "ai-requests") {
    const daily = kind === "free" ? Number(s.freeTierDailyRequests) || 50 : kind === "enterprise" ? Number(s.enterpriseTierDailyRequests) || 1000 : null;
    const tokens = kind === "free" ? Number(s.freeTierTokenLimit) || 500000 : kind === "enterprise" ? Number(s.enterpriseTierDailyTokens) || 20000000 : Number(s.premiumTierTokenLimit) || 5000000;
    return {
      featureKey,
      planCode,
      dailyLimit: kind === "premium" ? null : daily,
      monthlyLimit: kind === "premium" ? null : (daily ?? 0) * MONTHLY_MULTIPLIER,
      tokenLimit: tokens,
      storageMb: null,
      enabled: true,
    };
  }

  return { featureKey, planCode, dailyLimit: null, monthlyLimit: null, tokenLimit: null, storageMb: null, enabled: true };
}

// ─── Access evaluation ────────────────────────────────────────────

/**
 * Evaluates access to a feature for a user. Combines the plan gate (from the
 * feature_access catalog) with per-feature usage limits (usage_limits table).
 *
 * When `path` is provided the feature is resolved automatically from the
 * route; otherwise pass an explicit `featureKey`.
 */
export async function evaluateFeatureAccess(opts: {
  userId: string;
  plan: string;
  subscriptionStatus?: string | null;
  featureKey?: string;
  path?: string;
}): Promise<FeatureUsageResult> {
  const { userId, plan, subscriptionStatus } = opts;
  const userPlanKind = normalizePlanKind(plan);
  const planCode = String(plan || "free");

  let feature: FeatureDefinition | null = null;
  if (opts.featureKey) {
    const catalog = await getFeatureCatalog();
    feature = catalog.find((f) => f.featureKey === opts.featureKey) || null;
  } else if (opts.path) {
    feature = await resolveFeatureForRoute(opts.path);
  }

  // No feature mapping — treat as allowed (global AI limits still apply).
  if (!feature) {
    return {
      allowed: true,
      featureKey: opts.featureKey || "unknown",
      featureName: null,
      category: null,
      requiredPlan: "free",
      userPlan: plan,
      userPlanKind,
      reason: "not-found",
      message: "",
      usage: null,
      upgradeRequired: false,
    };
  }

  if (feature.gated === false) {
    return {
      allowed: true,
      featureKey: feature.featureKey,
      featureName: feature.name,
      category: feature.category,
      requiredPlan: feature.requiredPlan,
      userPlan: plan,
      userPlanKind,
      reason: "ok",
      message: "",
      usage: null,
      upgradeRequired: false,
    };
  }

  // Plan gate
  const meetsPlan = planRankOf(userPlanKind) >= planRankOf(feature.requiredPlan);
  if (!meetsPlan) {
    return {
      allowed: false,
      featureKey: feature.featureKey,
      featureName: feature.name,
      category: feature.category,
      requiredPlan: feature.requiredPlan,
      userPlan: plan,
      userPlanKind,
      reason: "plan-gate",
      message: `"${feature.name}" requires the ${feature.requiredPlan === "enterprise" ? "Enterprise" : "Premium"} plan.`,
      usage: null,
      upgradeRequired: feature.requiredPlan !== "free",
    };
  }

  // Per-feature usage limit
  const limit = await getFeatureLimits(feature.featureKey, planCode);
  if (!limit.enabled) {
    return {
      allowed: false,
      featureKey: feature.featureKey,
      featureName: feature.name,
      category: feature.category,
      requiredPlan: feature.requiredPlan,
      userPlan: plan,
      userPlanKind,
      reason: "feature-disabled",
      message: `"${feature.name}" is temporarily disabled.`,
      usage: null,
      upgradeRequired: false,
    };
  }

  const counts = await getFeatureUsageCounts(userId, feature);
  const dailyLimit = limit.dailyLimit ?? null;
  const monthlyLimit = limit.monthlyLimit ?? null;

  const overDaily = dailyLimit != null && counts.dailyUsed >= dailyLimit;
  const overMonthly = monthlyLimit != null && counts.monthlyUsed >= monthlyLimit;

  if (overDaily || overMonthly) {
    const reason: FeatureUsageResult["reason"] = overMonthly ? "monthly-limit" : "daily-limit";
    const label = feature.name || feature.featureKey;
    return {
      allowed: false,
      featureKey: feature.featureKey,
      featureName: feature.name,
      category: feature.category,
      requiredPlan: feature.requiredPlan,
      userPlan: plan,
      userPlanKind,
      reason,
      message: `${label} daily limit reached${overMonthly ? " for this month" : ""}. It resets ${overMonthly ? "on the 1st of next month" : "tomorrow"}.`,
      usage: {
        dailyUsed: counts.dailyUsed,
        dailyLimit,
        monthlyUsed: counts.monthlyUsed,
        monthlyLimit,
        dailyResetAt: counts.dailyResetAt,
        monthlyResetAt: counts.monthlyResetAt,
      },
      upgradeRequired: userPlanKind === "free",
    };
  }

  return {
    allowed: true,
    featureKey: feature.featureKey,
    featureName: feature.name,
    category: feature.category,
    requiredPlan: feature.requiredPlan,
    userPlan: plan,
    userPlanKind,
    reason: "ok",
    message: "",
    usage: {
      dailyUsed: counts.dailyUsed,
      dailyLimit,
      monthlyUsed: counts.monthlyUsed,
      monthlyLimit,
      dailyResetAt: counts.dailyResetAt,
      monthlyResetAt: counts.monthlyResetAt,
    },
    upgradeRequired: false,
  };
}

/**
 * Full feature-access payload for the user dashboard / settings page:
 * the catalog enriched with each feature's allowed flag, limits and usage.
 */
export async function buildUserFeatureMatrix(userId: string, plan: string): Promise<Array<Record<string, unknown>>> {
  const catalog = await getFeatureCatalog();
  const planCode = String(plan || "free");
  const userPlanKind = normalizePlanKind(planCode);

  const rows: Array<Record<string, unknown>> = [];
  for (const f of catalog) {
    const allowedByPlan = planRankOf(userPlanKind) >= planRankOf(f.requiredPlan);
    const limit = await getFeatureLimits(f.featureKey, planCode);
    const counts = await getFeatureUsageCounts(userId, f);
    rows.push({
      featureKey: f.featureKey,
      name: f.name,
      description: f.description,
      category: f.category,
      requiredPlan: f.requiredPlan,
      gated: f.gated,
      allowed: f.gated ? allowedByPlan : true,
      planGate: allowedByPlan,
      limits: limit,
      usage: {
        dailyUsed: counts.dailyUsed,
        dailyLimit: limit.dailyLimit,
        monthlyUsed: counts.monthlyUsed,
        monthlyLimit: limit.monthlyLimit,
      },
    });
  }
  return rows;
}

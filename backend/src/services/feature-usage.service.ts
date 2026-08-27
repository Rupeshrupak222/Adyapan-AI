import { prisma } from "../config/prisma";
import { randomUUID } from "crypto";
import {
  DEFAULT_FREE_LIMITS,
  DEFAULT_PREMIUM_LIMITS,
  DEFAULT_PLAN_LIMITS,
  FEATURE_DISPLAY_NAMES,
} from "./feature-keys";
import { normalizePlanKind } from "./feature-access.service";

// Re-export for backwards compatibility with earlier imports.
export { DEFAULT_FREE_LIMITS as FEATURE_LIMITS };

export type AttemptStatus = "RESERVED" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface FeatureUsageStatus {
  featureKey: string;
  featureName: string;
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  unlimited: boolean;
  periodStart: string;
  periodEnd: string;
  allowed: boolean;
  resetAt: string;
}

export interface ConsumeResult {
  allowed: boolean;
  /** true when THIS call performed the deduction; false for idempotent replays */
  consumed: boolean;
  requestId: string;
  status: FeatureUsageStatus;
}

interface PlanInfo {
  plan: string;
  planKind: "free" | "premium" | "enterprise";
  isPaid: boolean;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
// Admin-configured per-plan limits are read frequently — cache briefly.
let limitOverrideCache: { rows: Map<string, number>; at: number } | null = null;
const LIMIT_OVERRIDE_TTL_MS = 30_000;

function startOfMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function statusOf(
  key: string,
  info: PlanInfo,
  limit: number,
  unlimited: boolean,
  used: number,
  periodStart: Date,
  periodEnd: Date
): FeatureUsageStatus {
  const remaining = unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, limit - used);
  return {
    featureKey: key,
    featureName: FEATURE_DISPLAY_NAMES[key] ?? key,
    plan: info.plan,
    limit,
    used,
    remaining,
    unlimited,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    allowed: unlimited || remaining > 0,
    resetAt: periodEnd.toISOString(),
  };
}

export class FeatureUsageService {
  // ─── Period helpers ────────────────────────────────────────────────────────

  /** Current calendar-month usage window (UTC-stable across app instances). */
  public static getCurrentPeriod(date = new Date()): { periodStart: Date; periodEnd: Date } {
    return { periodStart: startOfMonth(date), periodEnd: endOfMonth(date) };
  }

  // ─── Entitlement resolution ───────────────────────────────────────────────

  public static async getUserPlan(userId: string): Promise<PlanInfo> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, subscriptionStatus: true, subscriptionEnd: true },
      });
      const rawPlan = String(user?.plan || "free").toLowerCase();
      const planKind = normalizePlanKind(rawPlan);
      const subStatus = String(user?.subscriptionStatus || "").toLowerCase();
      const subEnd = user?.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
      const isExpired = subEnd ? subEnd.getTime() <= Date.now() : false;

      // Paid entitlement requires a non-free plan, active/trialing status, and unexpired period.
      const isPaid =
        planKind !== "free" &&
        !isExpired &&
        (subStatus === "" || ACTIVE_STATUSES.has(subStatus));

      const effectivePlan = isPaid ? rawPlan : "free";
      const effectivePlanKind = isPaid ? planKind : "free";

      return { plan: effectivePlan, planKind: effectivePlanKind, isPaid };
    } catch {
      return { plan: "free", planKind: "free", isPaid: false };
    }
  }

  /**
   * Effective monthly limit for a feature + plan.
   * Priority: admin-configured `usage_limits` row → platform defaults.
   * Free tier: Group A = 10, Group B = 3.
   * Premium tier: Group A = 30, Group B = 9.
   */
  public static async resolveMonthlyLimit(
    featureKey: string,
    planInfo: PlanInfo
  ): Promise<{ limit: number; unlimited: boolean }> {
    const overrides = await this.loadLimitOverrides();
    const snake = featureKey.toUpperCase();
    const kebab = snake.toLowerCase().replace(/_/g, "-");

    // Check admin overrides with priority
    const lookupOrder = planInfo.isPaid
      ? [
          `${kebab}:${planInfo.plan}`,
          `${snake}:${planInfo.plan}`,
          `${planInfo.plan}:${kebab}`,
          `${kebab}:${planInfo.planKind}`,
          `${snake}:${planInfo.planKind}`,
          `${planInfo.planKind}:${kebab}`,
        ]
      : [`${kebab}:free`, `${snake}:free`, `free:${kebab}`, kebab, snake];

    for (const candidate of lookupOrder) {
      if (overrides.has(candidate)) {
        return { limit: overrides.get(candidate)!, unlimited: false };
      }
    }

    const planTier = planInfo.isPaid ? planInfo.planKind : "free";
    const planLimits = DEFAULT_PLAN_LIMITS[planTier] || DEFAULT_PLAN_LIMITS["free"];
    const fallback = planLimits[snake] ?? (DEFAULT_FREE_LIMITS[snake] ?? 10);

    return { limit: fallback, unlimited: false };
  }

  private static async loadLimitOverrides(): Promise<Map<string, number>> {
    if (limitOverrideCache && Date.now() - limitOverrideCache.at < LIMIT_OVERRIDE_TTL_MS) {
      return limitOverrideCache.rows;
    }
    const rows = new Map<string, number>();
    try {
      const limits = await prisma.usageLimit.findMany({
        select: { featureKey: true, planCode: true, monthlyLimit: true, enabled: true },
      });
      for (const row of limits) {
        if (!row.enabled || row.monthlyLimit == null) continue;
        const key = row.featureKey.toLowerCase();
        const planCode = String(row.planCode || "free").toLowerCase();
        rows.set(`${key}:${planCode}`, row.monthlyLimit);
        rows.set(`${planCode}:${key}`, row.monthlyLimit);
        if (planCode === "free") rows.set(key, row.monthlyLimit);
      }
    } catch {
      /* usage_limits unavailable — fall back to defaults */
    }
    limitOverrideCache = { rows, at: Date.now() };
    return rows;
  }

  // ─── Read paths ─────────────────────────────────────────────────────────────

  public static async getFeatureUsage(
    userId: string,
    featureKey: string,
    planInfo?: PlanInfo
  ): Promise<FeatureUsageStatus> {
    const key = String(featureKey || "").toUpperCase();
    const info = planInfo ?? (await this.getUserPlan(userId));
    const { limit, unlimited } = await this.resolveMonthlyLimit(key, info);
    const { periodStart, periodEnd } = this.getCurrentPeriod();

    let used = 0;
    try {
      const row = await prisma.userFeatureQuota.findUnique({
        where: {
          userId_featureKey_periodStart: { userId, featureKey: key, periodStart },
        },
        select: { used: true },
      });
      used = row?.used ?? 0;
    } catch {
      /* table missing / db hiccup — report fresh allowance rather than failing reads */
    }

    return statusOf(key, info, limit, unlimited, used, periodStart, periodEnd);
  }

  public static async getGlobalUsageSummary(
    userId: string
  ): Promise<{ plan: string; features: Record<string, FeatureUsageStatus> }> {
    const info = await this.getUserPlan(userId);
    const { periodStart, periodEnd } = this.getCurrentPeriod();

    const usedMap: Record<string, number> = {};
    try {
      const usages = await prisma.userFeatureQuota.findMany({
        where: { userId, periodStart },
        select: { featureKey: true, used: true },
      });
      for (const u of usages) usedMap[u.featureKey] = u.used;
    } catch {
      /* fall through with zeroed usage */
    }

    const features: Record<string, FeatureUsageStatus> = {};
    for (const key of Object.keys(DEFAULT_FREE_LIMITS)) {
      const { limit, unlimited } = await this.resolveMonthlyLimit(key, info);
      features[key] = statusOf(
        key,
        info,
        limit,
        unlimited,
        usedMap[key] ?? 0,
        periodStart,
        periodEnd
      );
    }

    return { plan: info.plan, features };
  }

  /** Recent attempts powering the in-feature "usage this month" history view. */
  public static async getUsageHistory(userId: string, featureKey?: string, take = 20) {
    const where: Record<string, unknown> = { userId };
    if (featureKey) where.featureKey = String(featureKey).toUpperCase();
    try {
      const attempts = await prisma.featureUsageAttempt.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(take, 1), 100),
        select: { id: true, featureKey: true, requestId: true, status: true, createdAt: true },
      });
      return attempts.map((a) => ({
        id: a.id,
        featureKey: a.featureKey,
        requestId: a.requestId,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  // ─── Atomic consumption ─────────────────────────────────────────────────────

  /**
   * Idempotency fast-path: if this request was already processed, return the
   * current usage WITHOUT deducting again. Handles double-clicks, refreshes,
   * network retries and duplicate submissions sharing one requestId.
   */
  private static async replayIfAlreadyProcessed(
    userId: string,
    key: string,
    requestId: string,
    info: PlanInfo,
    unlimited: boolean
  ): Promise<FeatureUsageStatus | null> {
    try {
      const attempt = await prisma.featureUsageAttempt.findUnique({
        where: { requestId },
        select: { id: true, userId: true, featureKey: true, status: true },
      });
      // Only replay when the attempt belongs to this user + feature. A
      // collision across users/features must never leak another user's state.
      if (attempt && attempt.userId === userId && attempt.featureKey === key) {
        const { limit } = await this.resolveMonthlyLimit(key, info);
        const { periodStart, periodEnd } = this.getCurrentPeriod();
        let used = 0;
        try {
          const row = await prisma.userFeatureQuota.findUnique({
            where: {
              userId_featureKey_periodStart: { userId, featureKey: key, periodStart },
            },
            select: { used: true },
          });
          used = row?.used ?? 0;
        } catch {}
        return statusOf(key, info, limit, unlimited, used, periodStart, periodEnd);
      }
    } catch {}
    return null;
  }

  /**
   * Atomically validates and consumes one feature credit.
   *
   * Guarantees:
   *  - Server-side authoritative check inside a single DB transaction.
   *  - Idempotency via the unique `request_id` on feature_usage_attempts:
   *    replays of the same request never deduct twice.
   *  - Concurrency-safe: the increment is conditional (`used < limit`), so two
   *    tabs / double-clicks / racing requests can never exceed the limit.
   *  - Client-supplied counts (`remaining` / `used` / `limit`) are ignored —
   *    the database is the single source of truth.
   */
  public static async checkAndConsume(
    userId: string,
    featureKey: string,
    requestId?: string
  ): Promise<ConsumeResult> {
    const key = String(featureKey || "").toUpperCase();
    if (!DEFAULT_FREE_LIMITS[key]) {
      throw new Error(`Unknown feature key: ${key}`);
    }

    const info = await this.getUserPlan(userId);
    const { limit, unlimited } = await this.resolveMonthlyLimit(key, info);
    const { periodStart, periodEnd } = this.getCurrentPeriod();

    const clientRequestId = requestId ? String(requestId) : null;
    if (clientRequestId) {
      const replay = await this.replayIfAlreadyProcessed(userId, key, clientRequestId, info, unlimited);
      if (replay) {
        return { allowed: true, consumed: false, requestId: clientRequestId, status: replay };
      }
    }
    let reqId = clientRequestId || `req_${randomUUID()}`;

    // At most one regeneration: a unique-violation against a request id owned
    // by ANOTHER user/feature is a hostile or stale collision — we never grant
    // a free execution for it; a fresh server-owned id is used instead.
    for (let pass = 0; pass < 2; pass++) {
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Ensure the monthly quota row exists for this user+feature+period.
          const quotaRow = await tx.userFeatureQuota.upsert({
            where: {
              userId_featureKey_periodStart: { userId, featureKey: key, periodStart },
            },
            create: {
              id: randomUUID(),
              userId,
              featureKey: key,
              periodStart,
              periodEnd,
              limit,
              used: 0,
            },
            update: {
              limit,
              periodEnd,
            },
          });

          // 2. Limit check (enforces plan allowance for Free and Premium).
          if (!unlimited && quotaRow.used >= limit) {
            return { blocked: true as const };
          }

          // 3. Record the attempt FIRST — the unique request_id enforces
          //    idempotency. On a unique-violation race another worker already
          //    processed this exact request; do not deduct twice.
          try {
            await tx.featureUsageAttempt.create({
              data: {
                id: randomUUID(),
                userId,
                featureKey: key,
                requestId: reqId,
                periodStart,
                status: "RESERVED",
              },
            });
          } catch (err: any) {
            if (err?.code === "P2002") return { duplicate: true as const };
            throw err;
          }

          // 4. Conditional atomic increment — `used < limit` is re-evaluated by
          //    Postgres under the row lock, so concurrent consumers serialize.
          //    Unlimited (paid) plans bypass the guard entirely: their counter
          //    may legitimately exceed any numeric limit without blocking.
          const updated = unlimited
            ? await tx.userFeatureQuota.updateMany({
                where: { id: quotaRow.id },
                data: { used: { increment: 1 } },
              })
            : await tx.userFeatureQuota.updateMany({
                where: { id: quotaRow.id, used: { lt: limit } },
                data: { used: { increment: 1 } },
              });
          if (updated.count === 0) {
            // Lost a race between steps 2 and 4: roll back the attempt marker so
            // genuine retries with the same requestId stay possible.
            await tx.featureUsageAttempt.deleteMany({ where: { requestId: reqId } });
            return { blocked: true as const };
          }

          return { blocked: false as const, usedAfter: quotaRow.used + 1 };
        },
        { maxWait: 5_000, timeout: 10_000 }
      );

      if ((result as any).blocked) {
        const current = await this.getFeatureUsage(userId, key, info);
        return { allowed: false, consumed: false, requestId: reqId, status: current };
      }

      if ((result as any).duplicate) {
        // Only treat as an idempotent replay when THIS user owns the colliding
        // request. A foreign owner means the client supplied someone else's (or
        // a recycled) id — regenerate once and consume under our own key.
        const existing = await prisma.featureUsageAttempt.findUnique({
          where: { requestId: reqId },
          select: { userId: true, featureKey: true },
        }).catch(() => null);
        if (existing && (existing.userId !== userId || existing.featureKey !== key)) {
          if (pass === 0) {
            reqId = `req_${randomUUID()}`;
            continue;
          }
          const denied = await this.getFeatureUsage(userId, key, info);
          return { allowed: false, consumed: false, requestId: reqId, status: denied };
        }
        const current = await this.getFeatureUsage(userId, key, info);
        return { allowed: true, consumed: false, requestId: reqId, status: current };
      }

      const usedAfter = (result as any).usedAfter ?? 0;
      return {
        allowed: true,
        consumed: true,
        requestId: reqId,
        status: statusOf(key, info, limit, unlimited, usedAfter, periodStart, periodEnd),
      };
    }

    // Unreachable in practice (loop always returns).
    const fallbackStatus = await this.getFeatureUsage(userId, key, info);
    return { allowed: false, consumed: false, requestId: reqId, status: fallbackStatus };
  }

  /** Marks a reserved attempt COMPLETED once the feature produced its result. */
  public static async markCompleted(_userId: string, _featureKey: string, requestId: string): Promise<boolean> {
    try {
      const res = await prisma.featureUsageAttempt.updateMany({
        where: { requestId, status: "RESERVED" },
        data: { status: "COMPLETED" },
      });
      return res.count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Refunds a previously consumed attempt after an infrastructure/AI failure.
   * Verifies the attempt belongs to this user + feature before decrementing,
   * is scoped to the attempt's own usage period (never touches historical
   * months), and is safe to call multiple times (idempotent).
   */
  public static async refundAttempt(userId: string, featureKey: string, requestId: string): Promise<boolean> {
    const key = String(featureKey || "").toUpperCase();
    try {
      return await prisma.$transaction(
        async (tx) => {
          const attempt = await tx.featureUsageAttempt.findUnique({
            where: { requestId },
            select: { id: true, userId: true, featureKey: true, status: true, periodStart: true },
          });
          if (!attempt || attempt.status === "REFUNDED") return false;
          if (attempt.userId !== userId || attempt.featureKey !== key) return false;

          await tx.featureUsageAttempt.update({
            where: { id: attempt.id },
            data: { status: "REFUNDED" },
          });

          if (attempt.status === "FAILED") return true; // never deducted

          await tx.userFeatureQuota.updateMany({
            where: {
              userId,
              featureKey: key,
              periodStart: attempt.periodStart,
              used: { gt: 0 },
            },
            data: { used: { decrement: 1 } },
          });
          return true;
        },
        { maxWait: 5_000, timeout: 10_000 }
      );
    } catch {
      return false;
    }
  }

  /** Marks a reserved attempt FAILED without refunding (no credit was ever
   *  deducted for that request). */
  public static async markFailed(userId: string, featureKey: string, requestId: string): Promise<void> {
    try {
      await prisma.featureUsageAttempt.updateMany({
        where: {
          requestId,
          userId,
          featureKey: String(featureKey).toUpperCase(),
          status: "RESERVED",
        },
        data: { status: "FAILED" },
      });
    } catch {}
  }
}

import { prisma } from "../config/prisma";
import { getSystemSettingsMemory } from "../controllers/admin.controller";

// ─── Types ────────────────────────────────────────────────────────

export type PlanKind = "free" | "premium" | "enterprise";

export interface PlanQuota {
  plan: string;
  kind: PlanKind;
  dailyTokens: number;
  monthlyTokens: number;
  dailyRequests: number;
  monthlyRequests: number;
  /** Enterprise is sold as uncapped; the numeric fields remain for reporting. */
  unlimited?: boolean;
}

export interface UsageSnapshot {
  plan: string;
  kind: PlanKind;
  subscriptionStatus: string | null;
  dailyTokensUsed: number;
  monthlyTokensUsed: number;
  dailyRequests: number;
  monthlyRequests: number;
  dailyResetAt: Date;
  monthlyResetAt: Date;
  quota: PlanQuota;
  dailyTokensRemaining: number;
  monthlyTokensRemaining: number;
  dailyRequestsRemaining: number;
  monthlyRequestsRemaining: number;
  dailyTokensPct: number;
  dailyRequestsPct: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  kind: PlanKind;
  plan: string;
  status: number;
  reason?: string;
  message: string;
  usage?: UsageSnapshot;
}

const MONTHLY_MULTIPLIER = 30;
const HOUR = 60 * 60 * 1000;

// Quota constants live in ../config/plan-quota-constants so feature-access.service
// can share them without importing this module (which pulls in admin.controller
// and breaks module-load order elsewhere). Re-exported for existing importers.
export {
  ENTERPRISE_DAILY_TOKENS,
  ENTERPRISE_DAILY_REQUESTS,
  FREE_TIER_TOKEN_LIMIT,
  FREE_TIER_DAILY_REQUESTS,
} from "../config/plan-quota-constants";

import {
  ENTERPRISE_DAILY_TOKENS,
  ENTERPRISE_DAILY_REQUESTS,
  FREE_TIER_TOKEN_LIMIT,
  FREE_TIER_DAILY_REQUESTS,
  PREMIUM_TIER_TOKEN_LIMIT,
  PREMIUM_TIER_DAILY_REQUESTS,
} from "../config/plan-quota-constants";

// ─── Plan resolution ──────────────────────────────────────────────

export function resolvePlanKind(plan: string): PlanKind {
  const p = String(plan || "").toLowerCase();
  if (!p || p === "free") return "free";
  if (p.includes("enterprise") || p === "admin") return "enterprise";
  return "premium";
}

export function resolveQuota(plan: string): PlanQuota {
  const kind = resolvePlanKind(plan);
  const s = getSystemSettingsMemory() as any;

  if (kind === "enterprise") {
    // Enterprise is sold as unlimited. The numeric ceiling stays finite so
    // counters, dashboards and snapshots keep working, but it is set far above
    // any realistic volume and `enterpriseTierDailyTokens` /
    // `enterpriseTierDailyRequests` remain admin-tunable escape hatches.
    const dailyTokens = Number(s.enterpriseTierDailyTokens) || ENTERPRISE_DAILY_TOKENS;
    const dailyRequests = Number(s.enterpriseTierDailyRequests) || ENTERPRISE_DAILY_REQUESTS;
    return {
      plan,
      kind,
      dailyTokens,
      monthlyTokens: dailyTokens * MONTHLY_MULTIPLIER,
      dailyRequests,
      monthlyRequests: dailyRequests * MONTHLY_MULTIPLIER,
      unlimited: true,
    };
  }

  if (kind === "premium") {
    const dailyTokens = Number(s.premiumTierTokenLimit) || PREMIUM_TIER_TOKEN_LIMIT;
    const dailyRequests = Number(s.premiumTierDailyRequests) || PREMIUM_TIER_DAILY_REQUESTS;
    return {
      plan,
      kind,
      dailyTokens,
      monthlyTokens: dailyTokens * MONTHLY_MULTIPLIER,
      dailyRequests,
      monthlyRequests: dailyRequests * MONTHLY_MULTIPLIER,
    };
  }

  const dailyTokens = Number(s.freeTierTokenLimit) || FREE_TIER_TOKEN_LIMIT;
  const dailyRequests = Number(s.freeTierDailyRequests) || FREE_TIER_DAILY_REQUESTS;
  return {
    plan,
    kind,
    dailyTokens,
    monthlyTokens: dailyTokens * MONTHLY_MULTIPLIER,
    dailyRequests,
    monthlyRequests: dailyRequests * MONTHLY_MULTIPLIER,
  };
}

// ─── Snapshot helpers ─────────────────────────────────────────────

function buildSnapshot(row: any, plan: string, subscriptionStatus: string | null): UsageSnapshot {
  const quota = resolveQuota(plan);
  const dailyTokensRemaining = Math.max(0, quota.dailyTokens - row.dailyTokensUsed);
  const monthlyTokensRemaining = Math.max(0, quota.monthlyTokens - row.monthlyTokensUsed);
  const dailyRequestsRemaining = Math.max(0, quota.dailyRequests - row.dailyRequests);
  const monthlyRequestsRemaining = Math.max(0, quota.monthlyRequests - row.monthlyRequests);

  return {
    plan,
    kind: quota.kind,
    subscriptionStatus,
    dailyTokensUsed: row.dailyTokensUsed ?? 0,
    monthlyTokensUsed: row.monthlyTokensUsed ?? 0,
    dailyRequests: row.dailyRequests ?? 0,
    monthlyRequests: row.monthlyRequests ?? 0,
    dailyResetAt: row.dailyResetAt,
    monthlyResetAt: row.monthlyResetAt,
    quota,
    dailyTokensRemaining,
    monthlyTokensRemaining,
    dailyRequestsRemaining,
    monthlyRequestsRemaining,
    dailyTokensPct: quota.dailyTokens > 0 ? Math.round(((row.dailyTokensUsed ?? 0) / quota.dailyTokens) * 100) : 0,
    dailyRequestsPct: quota.dailyRequests > 0 ? Math.round(((row.dailyRequests ?? 0) / quota.dailyRequests) * 100) : 0,
  };
}

function rolloverFields(row: any, now: Date): Record<string, any> | null {
  const fields: Record<string, any> = {};

  if (row.dailyResetAt && new Date(row.dailyResetAt) <= now) {
    let resetAt = new Date(row.dailyResetAt);
    let guard = 0;
    while (resetAt <= now && guard < 400) {
      resetAt = new Date(resetAt.getTime() + 24 * HOUR);
      guard++;
    }
    fields.dailyTokensUsed = 0;
    fields.dailyRequests = 0;
    fields.dailyResetAt = resetAt;
  }

  if (row.monthlyResetAt && new Date(row.monthlyResetAt) <= now) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    fields.monthlyTokensUsed = 0;
    fields.monthlyRequests = 0;
    fields.monthlyResetAt = nextMonth;
  }

  return Object.keys(fields).length > 0 ? fields : null;
}

// ─── Service ──────────────────────────────────────────────────────

export class AiUsageService {
  /**
   * Fetch (creating if needed) the user's ai_usage row, rolling over
   * daily/monthly counters when their reset windows have elapsed.
   */
  static async getOrCreate(userId: string, plan: string, subscriptionStatus: string | null): Promise<any> {
    if (!userId) return null;
    const now = new Date();

    let row = await (prisma as any).aiUsage.findUnique({ where: { userId } }).catch(() => null);
    if (!row) {
      row = await (prisma as any).aiUsage
        .create({
          data: {
            userId,
            plan,
            subscriptionStatus: subscriptionStatus ?? null,
            dailyTokensUsed: 0,
            monthlyTokensUsed: 0,
            dailyRequests: 0,
            monthlyRequests: 0,
            dailyResetAt: new Date(now.getTime() + 24 * HOUR),
            monthlyResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        })
        .catch(() => null);
    }
    if (!row) return null;

    const updates: Record<string, any> = {};
    if (row.plan !== plan) updates.plan = plan;
    if (row.subscriptionStatus !== subscriptionStatus) updates.subscriptionStatus = subscriptionStatus ?? null;

    const roll = rolloverFields(row, now);
    if (roll) Object.assign(updates, roll);

    if (Object.keys(updates).length > 0) {
      row = await (prisma as any).aiUsage
        .update({ where: { id: row.id }, data: { ...updates, updatedAt: new Date() } })
        .catch(() => row);
    }

    return row;
  }

  /** Full usage snapshot for a user (used by navbar/modal + GET /usage). */
  static async getUsage(userId: string, plan?: string, subscriptionStatus?: string | null): Promise<UsageSnapshot | null> {
    if (!userId) return null;

    let resolvedPlan = plan || "free";
    if (!plan) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, subscriptionStatus: true } }).catch(() => null);
      resolvedPlan = user?.plan || "free";
      subscriptionStatus = user?.subscriptionStatus ?? null;
    }

    const row = await this.getOrCreate(userId, resolvedPlan, subscriptionStatus ?? null);
    if (!row) {
      const quota = resolveQuota(resolvedPlan);
      return {
        plan: resolvedPlan,
        kind: quota.kind,
        subscriptionStatus: subscriptionStatus ?? null,
        dailyTokensUsed: 0,
        monthlyTokensUsed: 0,
        dailyRequests: 0,
        monthlyRequests: 0,
        dailyResetAt: new Date(Date.now() + 24 * HOUR),
        monthlyResetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        quota,
        dailyTokensRemaining: quota.dailyTokens,
        monthlyTokensRemaining: quota.monthlyTokens,
        dailyRequestsRemaining: quota.dailyRequests,
        monthlyRequestsRemaining: quota.monthlyRequests,
        dailyTokensPct: 0,
        dailyRequestsPct: 0,
      };
    }

    return buildSnapshot(row, resolvedPlan, subscriptionStatus ?? null);
  }

  /**
   * Enforce limits and, when allowed, atomically reserve the estimated
   * tokens + one request. Logs every attempt to ai_request_logs so the
   * admin dashboard can show blocked vs allowed requests.
   */
  static async checkAndReserve(
    userId: string,
    plan: string,
    subscriptionStatus: string | null,
    estimatedTokens: number,
    meta?: { route?: string; method?: string }
  ): Promise<LimitCheckResult> {
    const row = await this.getOrCreate(userId, plan, subscriptionStatus);
    if (!row) {
      // DB unavailable — fail open (same behavior as previous implementation).
      return {
        allowed: true,
        kind: resolvePlanKind(plan),
        plan,
        status: 200,
        message: "",
      };
    }

    const quota = resolveQuota(plan);
    const tokens = Math.max(1, Math.round(estimatedTokens || 0));
    const now = new Date();

    let blocked = false;
    let reason: string | undefined;
    if (!quota.unlimited) {
      if (row.dailyTokensUsed + tokens > quota.dailyTokens) {
        blocked = true;
        reason = "daily_token";
      } else if (row.monthlyTokensUsed + tokens > quota.monthlyTokens) {
        blocked = true;
        reason = "monthly_token";
      } else if (row.dailyRequests + 1 > quota.dailyRequests) {
        blocked = true;
        reason = "daily_request";
      } else if (row.monthlyRequests + 1 > quota.monthlyRequests) {
        blocked = true;
        reason = "monthly_request";
      }
    }

    const route = meta?.route || "";
    const method = meta?.method || "POST";

    await this.logRequest(userId, plan, route, method, tokens, blocked, blocked ? reason : null).catch(() => {});

    if (blocked) {
      const snapshot = buildSnapshot(row, plan, subscriptionStatus);
      const isFree = quota.kind === "free";
      const message = isFree
        ? `You've reached your free AI limit (${reason?.includes("request") ? "requests" : "tokens"}). Upgrade to Premium to keep creating.`
        : reason?.includes("monthly")
          ? `Monthly AI limit reached. It resets on ${new Date(snapshot.monthlyResetAt).toLocaleDateString()}.`
          : `Daily AI limit reached. It resets on ${new Date(snapshot.dailyResetAt).toLocaleDateString()}.`;

      return {
        allowed: false,
        kind: quota.kind,
        plan,
        status: isFree ? 403 : 429,
        reason,
        message,
        usage: snapshot,
      };
    }

    await (prisma as any).aiUsage
      .update({
        where: { id: row.id },
        data: {
          dailyTokensUsed: { increment: tokens },
          monthlyTokensUsed: { increment: tokens },
          dailyRequests: { increment: 1 },
          monthlyRequests: { increment: 1 },
          lastRequestAt: now,
          updatedAt: now,
        },
      })
      .catch(() => null);

    return {
      allowed: true,
      kind: quota.kind,
      plan,
      status: 200,
      message: "",
      usage: buildSnapshot(row, plan, subscriptionStatus),
    };
  }

  /** Record an ai_request_logs row (blocked or allowed). */
  static async logRequest(
    userId: string,
    plan: string,
    route: string,
    method: string,
    totalTokens: number,
    blocked: boolean,
    blockedReason: string | null
  ): Promise<void> {
    await (prisma as any).aiRequestLog.create({
      data: {
        userId,
        plan,
        route,
        method,
        inputTokens: totalTokens,
        outputTokens: 0,
        totalTokens,
        status: blocked ? "blocked" : "completed",
        blocked,
        blockedReason,
      },
    });
  }

  /** Aggregated per-day usage history from ai_request_logs. */
  static async getHistory(userId: string, days = 14): Promise<Array<{ date: string; tokens: number; requests: number; blocked: number }>> {
    if (!userId) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const logs = await (prisma as any).aiRequestLog
      .findMany({
        where: { userId, createdAt: { gte: start } },
        select: { createdAt: true, totalTokens: true, blocked: true },
        orderBy: { createdAt: "asc" },
      })
      .catch(() => []);

    const byDay = new Map<string, { tokens: number; requests: number; blocked: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      byDay.set(key, { tokens: 0, requests: 0, blocked: 0 });
    }

    for (const log of logs) {
      const d = new Date(log.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const bucket = byDay.get(key);
      if (!bucket) continue;
      bucket.tokens += log.totalTokens || 0;
      bucket.requests += 1;
      if (log.blocked) bucket.blocked += 1;
    }

    return Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));
  }
}

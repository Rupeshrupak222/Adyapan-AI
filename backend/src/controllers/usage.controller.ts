import type { NextFunction, Request, Response } from "express";
import { AiUsageService } from "../services/token-tracking.service";
import { FeatureUsageService } from "../services/feature-usage.service";

export async function getMyUsage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    // AI token/request usage (legacy global quota system)
    const usage = await AiUsageService.getUsage(userId);

    // Centralized per-feature free-credit usage (authoritative source for the
    // 19 limited features). Additive field — existing consumers unaffected.
    let featureCredits = null;
    try {
      featureCredits = await FeatureUsageService.getGlobalUsageSummary(userId);
    } catch {
      /* feature usage is non-critical for this endpoint */
    }

    res.json({
      success: true,
      plan: featureCredits?.plan,
      features: featureCredits?.features,
      featurePeriod: featureCredits
        ? Object.values(featureCredits.features)[0] ?? null
        : null,
      usage: usage
        ? {
            plan: usage.plan,
            planKind: usage.kind,
            subscriptionStatus: usage.subscriptionStatus,
            dailyTokensUsed: usage.dailyTokensUsed,
            dailyTokensLimit: usage.quota.dailyTokens,
            dailyTokensRemaining: usage.dailyTokensRemaining,
            dailyTokensPct: usage.dailyTokensPct,
            monthlyTokensUsed: usage.monthlyTokensUsed,
            monthlyTokensLimit: usage.quota.monthlyTokens,
            monthlyTokensRemaining: usage.monthlyTokensRemaining,
            dailyRequestsUsed: usage.dailyRequests,
            dailyRequestsLimit: usage.quota.dailyRequests,
            dailyRequestsRemaining: usage.dailyRequestsRemaining,
            dailyRequestsPct: usage.dailyRequestsPct,
            monthlyRequestsUsed: usage.monthlyRequests,
            monthlyRequestsLimit: usage.quota.monthlyRequests,
            dailyResetAt: usage.dailyResetAt.toISOString(),
            monthlyResetAt: usage.monthlyResetAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyUsageHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const days = Math.min(30, Math.max(1, parseInt((req.query.days as string) || "14", 10)));
    const history = await AiUsageService.getHistory(userId, days);
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
}

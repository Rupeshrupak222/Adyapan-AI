import type { Request, Response, NextFunction } from "express";
import { FeatureUsageService } from "../services/feature-usage.service";

/**
 * GET /api/usage/features
 * Global summary of every usage-limited feature (limit / used / remaining /
 * reset date) for the authenticated user's plan.
 */
export async function getGlobalFeatureUsage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const summary = await FeatureUsageService.getGlobalUsageSummary(userId);
    const anyFeature = Object.values(summary.features)[0];
    res.json({
      success: true,
      plan: summary.plan,
      periodStart: anyFeature?.periodStart,
      periodEnd: anyFeature?.periodEnd,
      resetAt: anyFeature?.resetAt,
      features: summary.features,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/usage/features/:featureKey
 * Detailed status for a single feature.
 */
export async function getSingleFeatureUsage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const featureKey = req.params.featureKey as string;
    const status = await FeatureUsageService.getFeatureUsage(userId, featureKey);
    res.json({ success: true, status });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/usage/features/:featureKey/attempts
 * Recent attempts (audit trail) powering the in-feature "usage this month"
 * history display. Read-only — clients can never mutate usage.
 */
export async function getFeatureUsageAttempts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const featureKey = req.params.featureKey as string;
    const take = parseInt(String(req.query.take || "20"), 10);
    const [attempts, status] = await Promise.all([
      FeatureUsageService.getUsageHistory(userId, featureKey, take),
      FeatureUsageService.getFeatureUsage(userId, featureKey),
    ]);
    res.json({ success: true, status, attempts });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/usage/features/:featureKey/check
 * Atomic check-and-consume. Idempotent for repeated requestIds. Intended for
 * internal flows that need a reservation outside the standard middleware
 * (e.g. session-creation endpoints); the response carries the post-consume
 * status so callers can update informational caches.
 */
export async function checkAndConsumeFeatureUsage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const featureKey = req.params.featureKey as string;
    const requestId = (req.body.requestId || req.headers["x-request-id"]) as string | undefined;

    let result;
    try {
      result = await FeatureUsageService.checkAndConsume(userId, featureKey, requestId);
    } catch (err: any) {
      if (/Unknown feature key/i.test(err?.message || "")) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      throw err;
    }

    if (!result.allowed) {
      res.status(429).json({
        success: false,
        allowed: false,
        code: "FEATURE_LIMIT_REACHED",
        feature: result.status.featureKey,
        featureName: result.status.featureName,
        message: `You've used all ${result.status.limit} free ${result.status.featureName} attempts this month.`,
        limit: result.status.limit,
        used: result.status.used,
        remaining: 0,
        resetAt: result.status.resetAt,
        upgradeRequired: true,
      });
      return;
    }

    res.json({
      success: true,
      allowed: true,
      consumed: result.consumed,
      requestId: result.requestId,
      status: result.status,
    });
  } catch (err) {
    next(err);
  }
}

import type { Request, Response, NextFunction } from "express";
import { FeatureUsageService } from "../services/feature-usage.service";

declare global {
  namespace Express {
    interface Request {
      featureUsageStatus?: any;
      featureRequestId?: string;
      featureKey?: string;
    }
  }
}

/**
 * Express middleware enforcing server-side feature usage limits.
 *
 * Flow (spec-compliant):
 *   reserve credit atomically → feature executes →
 *     success (2xx)          → attempt marked COMPLETED
 *     failure (>=400 / SSE)  → credit automatically refunded
 *
 * The authoritative check happens HERE, in the database. Frontend values
 * (`remaining`, `used`, `limit`) are never trusted. Idempotency is driven by
 * the client-supplied `requestId` (body or `x-request-id` header) so retries,
 * double-clicks and duplicate tabs consume exactly one credit per logical
 * attempt.
 */
export function requireFeatureQuota(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
      }

      const requestId =
        (req.body?.requestId || req.headers["x-request-id"]) as string | undefined;

      const result = await FeatureUsageService.checkAndConsume(userId, featureKey, requestId);

      if (!result.allowed) {
        const isFree = result.status.plan === "free";
        res.status(429).json({
          success: false,
          allowed: false,
          code: "FEATURE_LIMIT_REACHED",
          feature: result.status.featureKey,
          featureName: result.status.featureName,
          plan: result.status.plan,
          message: isFree
            ? `You've used all ${result.status.limit} free ${result.status.featureName} attempts this month.`
            : `You've used all ${result.status.limit} Premium ${result.status.featureName} attempts this month.`,
          limit: result.status.limit,
          used: result.status.used,
          remaining: 0,
          resetAt: result.status.resetAt,
          periodStart: result.status.periodStart,
          upgradeRequired: isFree,
        });
        return;
      }

      req.featureUsageStatus = result.status;
      req.featureRequestId = result.requestId;
      req.featureKey = result.status.featureKey;

      // Expose post-consumption state so any JSON response can carry it and
      // the frontend can keep its informational cache in sync.
      res.locals.featureUsage = result.status;
      applyUsageHeaders(res, result.status);

      let settled = false;

      // Auto-settle the reserved attempt based on how the response finishes.
      // Covers validation failures (400), server/AI crashes (500) — the user
      // must never lose a credit for a failed platform execution.
      res.on("finish", () => {
        if (settled) return;
        settled = true;
        const statusCode = res.statusCode;
        if (statusCode >= 400) {
          FeatureUsageService.refundAttempt(userId, result.status.featureKey, result.requestId)
            .catch(() => {});
        } else {
          FeatureUsageService.markCompleted(userId, result.status.featureKey, result.requestId)
            .catch(() => {});
        }
      });

      // Client disconnected before completion — treat as failed execution so
      // abandoned generations do not silently eat the user's allowance.
      res.on("close", () => {
        if (settled) return;
        if (!res.writableEnded && statusCodeStarted(res)) {
          settled = true;
          FeatureUsageService.refundAttempt(userId, result.status.featureKey, result.requestId)
            .catch(() => {});
        }
      });

      next();
    } catch (err) {
      next(err);
    }
  };
}

function statusCodeStarted(res: Response): boolean {
  return Boolean((res as any).headersSent);
}

function applyUsageHeaders(res: Response, status: any): void {
  try {
    res.setHeader("X-Feature-Key", status.featureKey);
    res.setHeader("X-Feature-Limit", String(status.limit));
    res.setHeader("X-Feature-Used", String(status.used));
    if (status.unlimited) {
      res.setHeader("X-Feature-Unlimited", "true");
    } else {
      res.setHeader("X-Feature-Remaining", String(status.remaining));
    }
    res.setHeader("X-Feature-Reset", status.resetAt);
  } catch {}
}

/**
 * Explicitly refunds the quota consumed by this request. Use inside streaming
 * (SSE) handlers whose failures occur after headers were sent — the generic
 * finish hook cannot detect those as errors.
 */
export async function refundFeatureQuotaOnFailure(
  req: Request,
  featureKey?: string
): Promise<boolean> {
  const userId = req.user?.userId;
  const requestId = req.featureRequestId;
  const key = featureKey || req.featureKey;

  if (userId && requestId && key) {
    return FeatureUsageService.refundAttempt(userId, key, requestId);
  }
  return false;
}

/**
 * Marks the current request's attempt COMPLETED after a successful streaming
 * execution (SSE handlers).
 */
export async function completeFeatureQuota(req: Request, featureKey?: string): Promise<boolean> {
  const userId = req.user?.userId;
  const requestId = req.featureRequestId;
  const key = featureKey || req.featureKey;

  if (userId && requestId && key) {
    return FeatureUsageService.markCompleted(userId, key, requestId);
  }
  return false;
}

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { evaluateFeatureAccess, normalizePlanKind } from "../services/feature-access.service";

/**
 * Privileged accounts bypass premium gates. Only explicit role ADMIN or an
 * email on the configured OWNER_EMAILS allowlist qualifies — never a
 * substring match, which previously let any user register e.g.
 * "admin@attacker.com" and unlock premium for free.
 */
function isPrivilegedAccount(role: string | undefined, email: string | undefined): boolean {
  if (role === "ADMIN") return true;
  const normalized = (email || "").toLowerCase();
  return Boolean(normalized) && env.privilegedEmails.includes(normalized);
}

/**
 * Maps Express mount prefixes to their feature keys.
 *
 * When mounted via `apiRouter.use("/engine", premiumGate, engineRouter)`,
 * Express strips the prefix from `req.path` but preserves it in `req.baseUrl`.
 * We reconstruct the full path as `req.baseUrl + req.path` and match against
 * the mount prefixes below.
 *
 * Any POST/PUT/PATCH/DELETE hitting a matched prefix is treated as a
 * premium-gated AI endpoint — no need to enumerate every sub-route.
 */
const PREMIUM_MOUNT_PREFIXES: { prefix: string; featureKey: string }[] = [
  // Interview Hub
  { prefix: "/engine", featureKey: "engine" },
  { prefix: "/technical-engine", featureKey: "technical-engine" },
  { prefix: "/interview/hr", featureKey: "hr-interview" },
  { prefix: "/interview", featureKey: "mock-interview" },
  { prefix: "/avatar", featureKey: "avatar" },

  // Coding Hub
  { prefix: "/coding", featureKey: "coding-assistant" },
  { prefix: "/dsa", featureKey: "dsa" },
  { prefix: "/challenges", featureKey: "challenges" },
  { prefix: "/reasoning", featureKey: "reasoning" },

  // Ady Chat
  { prefix: "/ady-chat", featureKey: "ady-chat" },
];

// Non-AI read-only paths that should never be blocked even if they fall under
// a premium mount prefix (e.g., GET /sessions to list past interviews).
const EXCLUDE_PATHS: RegExp[] = [
  /^\/(sessions|list|status|health|config|voices|profile)(\/|$)/i,
];

/**
 * Middleware that enforces PREMIUM-ONLY access for Interview Hub, Coding Hub,
 * and Ady Chat AI features. Returns 403 PREMIUM_REQUIRED for free users
 * attempting to use these endpoints.
 *
 * Applied as: apiRouter.use("/engine", premiumGate, engineRouter)
 * Express strips the mount prefix, so we reconstruct the full path from
 * `req.baseUrl + req.path` for matching.
 */
export async function requirePremiumEntitlement(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Allow GET, OPTIONS, HEAD — read-only access is not restricted
    if (req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD") {
      return next();
    }

    // Reconstruct the full path (Express strips mount prefix from req.path)
    const fullPath = (req.baseUrl || "") + (req.path || "");

    // Find the matching premium mount prefix (longest match first for
    // /interview/hr vs /interview ordering)
    let matched: { prefix: string; featureKey: string } | null = null;
    for (const entry of PREMIUM_MOUNT_PREFIXES) {
      if (fullPath.startsWith(entry.prefix + "/") || fullPath === entry.prefix) {
        // Prefer the longest (most specific) prefix match
        if (!matched || entry.prefix.length > matched.prefix.length) {
          matched = entry;
        }
      }
    }

    if (!matched) {
      return next(); // No premium gate for this route
    }

    // Exclude known non-AI paths (session listing, status checks, etc.)
    const subPath = fullPath.slice(matched.prefix.length) || "/";
    if (EXCLUDE_PATHS.some((p) => p.test(subPath))) {
      return next();
    }

    const userId = req.user?.userId;
    const role = req.user?.role || "USER";
    const email = req.user?.email || "";

    // Admin accounts bypass premium checks
    if (!userId || isPrivilegedAccount(role, email)) {
      return next();
    }

    // Resolve the user's current plan
    const user = await prisma.user
      .findUnique({ where: { id: userId }, select: { plan: true, subscriptionStatus: true } })
      .catch(() => null);

    const plan = user?.plan || "free";
    const subscriptionStatus = user?.subscriptionStatus ?? null;
    const planKind = normalizePlanKind(plan);

    // Allow active premium/enterprise subscriptions (status casing has varied
    // across writers: "active"/"ACTIVE" — compare case-insensitively)
    const statusLower = String(subscriptionStatus ?? "").toLowerCase();
    const isActive = statusLower === "active" || statusLower === "trialing";
    if (isActive && (planKind === "premium" || planKind === "enterprise")) {
      return next();
    }

    // Free users are blocked — return 403 with upgrade prompt
    return res.status(403).json({
      success: false,
      code: "PREMIUM_REQUIRED",
      message: `"${matched.featureKey}" requires the Premium plan. Please upgrade to access this feature.`,
      featureKey: matched.featureKey,
      requiredPlan: "premium",
      currentPlan: plan,
      upgradeUrl: "/premium",
      upgrade: true,
    });
  } catch (error) {
    // Fail open for unexpected errors — let downstream middleware handle limits
    next();
  }
}

/**
 * Factory that returns middleware checking a specific feature key via the
 * feature_access catalog. Useful when you want to gate a single route by name
 * and also respect per-feature usage limits.
 *
 * Usage:
 *   router.post("/send", requireFeature("ady-chat"), controller.sendMessage);
 */
export function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD") {
        return next();
      }

      const userId = req.user?.userId;
      const role = req.user?.role || "USER";
      const email = req.user?.email || "";

      if (!userId || isPrivilegedAccount(role, email)) {
        return next();
      }

      const user = await prisma.user
        .findUnique({ where: { id: userId }, select: { plan: true, subscriptionStatus: true } })
        .catch(() => null);

      const plan = user?.plan || "free";
      const subscriptionStatus = user?.subscriptionStatus ?? null;

      const result = await evaluateFeatureAccess({
        userId,
        plan,
        subscriptionStatus,
        featureKey,
      });

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          code: result.reason === "plan-gate" ? "PREMIUM_REQUIRED" : "FEATURE_UNAVAILABLE",
          message: result.message,
          featureKey: result.featureKey,
          requiredPlan: result.requiredPlan,
          currentPlan: plan,
          upgradeUrl: "/premium",
          upgrade: result.upgradeRequired,
        });
      }

      next();
    } catch (error) {
      next();
    }
  };
}

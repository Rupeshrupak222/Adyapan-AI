import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AiUsageService } from "../services/token-tracking.service";
import { evaluateFeatureAccess } from "../services/feature-access.service";

// AI-generation endpoints that are subject to plan limits.
const AI_ROUTE_PATTERNS: RegExp[] = [
  /^\/resume(\/|$)/,
  /^\/ats(\/|$)/,
  /^\/cover-letter(\/|$)/,
  /^\/linkedin(\/|$)/,
  /^\/study(\/|$)/,
  /^\/notes(\/|$)/,
  /^\/quiz(\/|$)/,
  /^\/assignment(\/|$)/,
  /^\/mindmap(\/|$)/,
  /^\/coding(\/|$)/,
  /^\/interview(\/|$)/,
  /^\/ady-chat(\/|$)/,
  /^\/flashcards(\/|$)/,
  /^\/plagiarism(\/|$)/,
  /^\/research(\/|$)/,
  /^\/mcq(\/|$)/,
  /^\/reasoning(\/|$)/,
  /^\/aptitude(\/|$)/,
  /^\/technical-engine(\/|$)/,
  /^\/engine(\/|$)/,
  /^\/avatar(\/|$)/,
  /^\/resume-improvements(\/|$)/,
  /^\/career(\/|$)/,
  /^\/placement(\/|$)/,
  /^\/productivity(\/|$)/,
  /^\/weak-topics(\/|$)/,
  /^\/recommendations(\/|$)/,
  /^\/study-planner(\/|$)/,
];

// Non-generation paths that fall under an AI prefix but must not be charged.
const EXCLUDE_PATTERNS: RegExp[] = [
  /^\/export(\/|$)/,
  /\/export(\/|$)/,
  /^\/linkedin-jobs(\/|$)/,
  /^\/job-listing(\/|$)/,
  /^\/discovery(\/|$)/,
  /^\/avatar\/voices(\/|$)/,
];

function sendLimitResponse(res: Response, body: any) {
  res.status(body.status || 429).json({
    success: false,
    message: body.message,
    code: "LIMIT_EXCEEDED",
    reason: body.reason,
    plan: body.plan,
    planKind: body.planKind,
    featureKey: body.featureKey,
    featureName: body.featureName,
    upgrade: body.upgrade,
    usage: body.usage,
  });
}

export async function enforceAiTokenLimit(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD") {
      return next();
    }

    const path = req.path || req.url || "";
    if (!AI_ROUTE_PATTERNS.some((p) => p.test(path))) return next();
    if (EXCLUDE_PATTERNS.some((p) => p.test(path))) return next();

    const userId = req.user?.userId;
    const role = req.user?.role || "USER";
    const email = req.user?.email || "";

    // Unauthenticated or admin accounts are never gated.
    if (!userId || role === "ADMIN" || /admin|ashish/i.test(email)) {
      return next();
    }

    // Resolve the user's current plan from the master DB so quota reflects
    // the latest upgrade/downgrade even when the JWT is stale.
    const user = await prisma.user
      .findUnique({ where: { id: userId }, select: { plan: true, subscriptionStatus: true } })
      .catch(() => null);
    const plan = user?.plan || "free";
    const subscriptionStatus = user?.subscriptionStatus ?? null;

    // 1. Feature-level plan gate + per-feature usage limits.
    const featureCheck = await evaluateFeatureAccess({ userId, plan, subscriptionStatus, path }).catch(() => null);
    if (featureCheck && !featureCheck.allowed) {
      const reason = featureCheck.reason;
      const isLimit = reason === "daily-limit" || reason === "monthly-limit";
      const isFree = plan === "free";
      const usagePayload = featureCheck.usage
        ? {
            dailyUsed: featureCheck.usage.dailyUsed,
            dailyLimit: featureCheck.usage.dailyLimit,
            monthlyUsed: featureCheck.usage.monthlyUsed,
            monthlyLimit: featureCheck.usage.monthlyLimit,
            dailyResetAt: featureCheck.usage.dailyResetAt?.toISOString(),
            monthlyResetAt: featureCheck.usage.monthlyResetAt?.toISOString(),
          }
        : undefined;

      await AiUsageService.logRequest(userId, plan, path, req.method, 0, true, reason).catch(() => {});

      sendLimitResponse(res, {
        status: isFree && !isLimit ? 403 : 429,
        message: featureCheck.message,
        reason: reason === "plan-gate" ? "feature_plan_required" : reason === "feature-disabled" ? "feature_disabled" : reason,
        plan,
        planKind: featureCheck.userPlanKind,
        featureKey: featureCheck.featureKey,
        featureName: featureCheck.featureName,
        upgrade: featureCheck.upgradeRequired,
        usage: usagePayload,
      });
      return;
    }

    // 2. Global token/request limits (daily + monthly).
    const bodyStr = JSON.stringify(req.body || {});
    const estimatedTokens = Math.max(100, Math.ceil(bodyStr.length / 4));

    const check = await AiUsageService.checkAndReserve(userId, plan, subscriptionStatus, estimatedTokens, {
      route: path,
      method: req.method,
    });

    if (!check.allowed) {
      const usage = check.usage;
      sendLimitResponse(res, {
        status: check.status,
        message: check.message,
        reason: check.reason,
        plan: check.plan,
        planKind: check.kind,
        upgrade: check.kind === "free",
        usage: usage
          ? {
              plan: usage.plan,
              planKind: usage.kind,
              dailyTokensUsed: usage.dailyTokensUsed,
              dailyTokensLimit: usage.quota.dailyTokens,
              dailyTokensRemaining: usage.dailyTokensRemaining,
              dailyTokensPct: usage.dailyTokensPct,
              monthlyTokensUsed: usage.monthlyTokensUsed,
              monthlyTokensLimit: usage.quota.monthlyTokens,
              dailyRequestsUsed: usage.dailyRequests,
              dailyRequestsLimit: usage.quota.dailyRequests,
              dailyRequestsRemaining: usage.dailyRequestsRemaining,
              dailyRequestsPct: usage.dailyRequestsPct,
              dailyResetAt: usage.dailyResetAt.toISOString(),
              monthlyResetAt: usage.monthlyResetAt.toISOString(),
            }
          : undefined,
      });
      return;
    }

    next();
  } catch (error) {
    // Fail open if enforcement hits an unexpected internal error.
    next();
  }
}

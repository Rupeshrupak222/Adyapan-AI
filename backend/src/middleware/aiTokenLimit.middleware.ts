import type { Request, Response, NextFunction } from "express";
import { TokenTrackingService } from "../services/token-tracking.service";

export async function enforceAiTokenLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role || "USER";
    const plan = (req.user as any)?.plan || "free";
    const email = (req.user as any)?.email || "";

    // If request is unauthenticated or admin/superuser, allow through without token limits
    if (!userId || role === "ADMIN" || email.toLowerCase().includes("admin") || email.toLowerCase().includes("ashish")) {
      return next();
    }

    // Estimate input prompt tokens based on request body payload length
    const bodyStr = JSON.stringify(req.body || {});
    const estimatedTokens = Math.max(100, Math.ceil(bodyStr.length / 4));

    const check = await TokenTrackingService.checkTokenLimit(userId, role, plan, estimatedTokens);

    if (!check.allowed) {
      res.status(429).json({
        success: false,
        message: check.message,
        code: "TOKEN_LIMIT_EXCEEDED",
        usage: {
          used: check.used,
          limit: check.limit,
          isFree: check.isFree,
        },
      });
      return;
    }

    // Attach tracking helper to res.locals so controllers can record actual completion tokens
    res.locals.recordAiTokens = (tokens: number) => {
      TokenTrackingService.recordTokenUsage(userId, tokens).catch(() => {});
    };

    next();
  } catch (error) {
    // Fail open if token tracking encounters an internal error
    next();
  }
}

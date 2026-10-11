import type { NextFunction, Request, Response } from "express";
import type { HttpError } from "../utils/httpError";
import { env } from "../config/env";

import { PlatformLogger } from "../utils/logger";

export function errorHandler(error: HttpError, req: Request, res: Response, _next: NextFunction) {
  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    PlatformLogger.logError({
      userId: (req as any).user?.userId,
      module: "ExpressAPI",
      errorType: "SERVER_ERROR",
      message: `${req.method} ${req.originalUrl} failed with code ${statusCode}: ${error.message}`,
      stackTrace: error.stack,
    });
  } else {
    console.warn(`[errorHandler] ${req.method} ${req.originalUrl} -> ${statusCode}: ${error.message}`);
  }

  if (res.headersSent) {
    console.warn(`[errorHandler] Headers already sent for ${req.method} ${req.originalUrl}, skipping JSON response`);
    return;
  }

  const rawMsg = String(error.message || "").toLowerCase();
  const isMaintenanceOrQuota =
    statusCode === 402 ||
    statusCode === 503 ||
    statusCode === 507 ||
    rawMsg.includes("quota") ||
    rawMsg.includes("upgrade your plan") ||
    rawMsg.includes("exceeded the quota") ||
    rawMsg.includes("plan limit") ||
    rawMsg.includes("too many connections") ||
    rawMsg.includes("database is paused") ||
    rawMsg.includes("project is paused") ||
    rawMsg.includes("railway");

  if (isMaintenanceOrQuota) {
    const maintenanceMsg = "Site under maintenance. We are performing scheduled upgrades, please check back shortly.";
    res.status(503).json({
      success: false,
      code: "SITE_MAINTENANCE",
      message: maintenanceMsg,
      error: maintenanceMsg,
    });
    return;
  }

  const isPrismaError = error.message?.includes("prisma") || error.message?.includes("Prisma") || (error as any).code === "ETIMEDOUT";

  const message =
    statusCode >= 500
      ? isPrismaError
        ? "Database error. Please try again."
        : (error as any).expose === true
          ? // Deliberately safe, user-actionable 5xx (e.g. a test being rebuilt).
            error.message
          : env.nodeEnv === "production"
            ? "Internal server error"
            : error.message
      : error.message;

  res.status(statusCode).json({
    success: false,
    message,
    error: message,
    ...(error.code ? { code: error.code } : {}),
    ...((error as any).attemptsRemaining !== undefined ? { attemptsRemaining: (error as any).attemptsRemaining } : {}),
    ...((error as any).lockedFor !== undefined ? { lockedFor: (error as any).lockedFor } : {}),
    // Structured errors (e.g. QuestionPoolExhaustedError) carry an actionable
    // payload the admin panel needs to report exactly what ran out.
    ...((error as any).details && typeof (error as any).details === "object"
      ? { details: (error as any).details }
      : {}),
  });
}

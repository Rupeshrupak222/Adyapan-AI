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

  const message =
    statusCode === 500 && env.nodeEnv === "production"
      ? "Internal server error"
      : error.message;

  res.status(statusCode).json({
    success: false,
    message,
    error: message,
    ...(error.code ? { code: error.code } : {}),
    ...((error as any).attemptsRemaining !== undefined ? { attemptsRemaining: (error as any).attemptsRemaining } : {}),
    ...((error as any).lockedFor !== undefined ? { lockedFor: (error as any).lockedFor } : {}),
  });
}

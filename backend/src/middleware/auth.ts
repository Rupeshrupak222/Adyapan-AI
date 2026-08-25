import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { httpError } from "../utils/httpError";
import { isTokenBlacklisted } from "../services/auth.service";
import { checkForceLogout, checkUserForceLogout, recordActivity } from "../services/session.service";
import { prisma } from "../config/prisma";

export type AuthRole = "USER" | "ADMIN";

export type AuthUser = {
  userId: string;
  email: string;
  role: AuthRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Paths where session validation is skipped (these endpoints manage sessions themselves)
const SESSION_CHECK_SKIP_PATHS = new Set([
  "/me",
  "/session-check",
  "/logout",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/refresh",
  "/auth/me",
  "/auth/session-check",
  "/auth/logout",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/refresh",
  "/api/auth/me",
  "/api/auth/session-check",
  "/api/auth/logout",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh",
]);

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    next(httpError(401, "Authentication token is required"));
    return;
  }

  try {
    // 1. Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      throw new Error("Token is blacklisted");
    }

    // 2. Verify JWT
    req.user = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as AuthUser;

    // 3. Check force-logout registry (token-level)
    const forceLogoutReason = checkForceLogout(token);
    if (forceLogoutReason) {
      const err = httpError(401, "Session ended. You have been logged in on another device.");
      (err as any).code = "FORCE_LOGOUT";
      throw err;
    }

    // 4. Check user-level force-logout (admin deactivation)
    const userForceLogout = checkUserForceLogout(req.user.userId);
    if (userForceLogout) {
      const err = httpError(401, userForceLogout);
      (err as any).code = "FORCE_LOGOUT";
      throw err;
    }

    // 5. Single-session enforcement: validate X-Session-Id against DB
    await validateSessionId(req);

    // 6. Record activity (debounced, non-blocking)
    recordActivity(req.user.userId).catch(() => {});

    next();
  } catch (err) {
    if (err instanceof Error && (err as any).statusCode) {
      next(err);
    } else {
      next(httpError(401, "Invalid or expired authentication token"));
    }
  }
}

/**
 * Validates that the client's session ID matches the active session in the DB.
 */
async function validateSessionId(req: Request): Promise<void> {
  const originalPath = (req.originalUrl || "").split("?")[0];
  const routePath = req.path || "";

  // Skip for endpoints that handle session logic themselves
  if (SESSION_CHECK_SKIP_PATHS.has(originalPath) || SESSION_CHECK_SKIP_PATHS.has(routePath)) return;

  const clientSessionId = req.headers["x-session-id"] as string | undefined;

  // Session ID is mandatory for single-session enforcement
  if (!clientSessionId) {
    throw httpError(401, "Session ID is required. Please log in again.");
  }

  // Validate format (48-char hex string)
  if (!/^[0-9a-f]{48}$/.test(clientSessionId)) {
    throw httpError(401, "Invalid session ID format. Please log in again.");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { activeSessionId: true },
  });

  // If user has an active session and it doesn't match the client's, reject
  if (user?.activeSessionId && user.activeSessionId !== clientSessionId) {
    const err = httpError(401, "Session ended. You have been logged in on another device.");
    (err as any).code = "FORCE_LOGOUT";
    throw err;
  }
}

export function requireRole(role: AuthRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(httpError(401, "Authentication token is required"));
      return;
    }

    if (req.user.role !== role) {
      next(httpError(403, "You do not have permission to access this resource"));
      return;
    }

    next();
  };
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  next();
}

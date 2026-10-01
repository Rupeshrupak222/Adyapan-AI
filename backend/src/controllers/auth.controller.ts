import type { NextFunction, Request, Response } from "express";
import { randomBytes, createHmac } from "crypto";
import jwt from "jsonwebtoken";
import {
  loginUser,
  registerUser,
  getGitHubRedirectUrl,
  exchangeGitHubCode,
  handleGitHubUser,
  getGoogleRedirectUrl,
  exchangeGoogleCode,
  handleGoogleUser,
  requestPasswordReset,
  resetPassword,
  requestEmailVerificationOtp,
  verifyEmailVerificationOtp,
  getEmailVerificationStatus,
  activateNewSession,
  logout as blacklistToken,
  refreshToken as refreshTokenService,
} from "../services/auth.service";
import { requireString } from "../utils/request";
import { env } from "../config/env";
import { httpError } from "../utils/httpError";
import { prisma } from "../config/prisma";
import { AdminAuditService } from "../services/admin-audit.service";
import { revokeAllSessions, forceLogoutAllForUser } from "../services/session.service";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await registerUser({
      name: requireString(req.body?.name, "name"),
      email: requireString(req.body?.email, "email"),
      password: requireString(req.body?.password, "password"),
      role: "USER",
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
      phone: req.body?.phone,
      college: req.body?.college,
      branch: req.body?.branch,
      year: req.body?.year,
      degree: req.body?.degree,
      country: req.body?.country,
      state: req.body?.state,
      city: req.body?.city,
      department: req.body?.department,
      course: req.body?.course,
      semester: req.body?.semester,
      studentId: req.body?.studentId,
      referralCode: req.body?.referralCode,
      profileImageUrl: req.body?.profileImageUrl,
      userAgent: String(req.headers["user-agent"] ?? ""),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function registerAdmin(_req: Request, _res: Response, next: NextFunction) {
  try {
    // DISABLED: shared-secret admin self-registration is no longer permitted.
    // Anyone who knew ADMIN_REGISTER_SECRET could mint an admin account, which
    // is a privilege-escalation risk. New admins must be created by an existing
    // admin via the authenticated admin panel (POST /api/admin/users, guarded by
    // requireAdminAuth + the "users:write" permission).
    throw httpError(
      403,
      "Admin self-registration is disabled. New admin accounts can only be created by an existing administrator.",
    );
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const portal = req.body?.portal === "admin" ? "admin" : (req.body?.expectedRole === "ADMIN" ? "admin" : "user");
    const result = await loginUser({ email: requireString(req.body?.email, "email"), password: requireString(req.body?.password, "password"), rememberMe: Boolean(req.body?.rememberMe), portal, userAgent: String(req.headers["user-agent"] ?? ""), ipAddress: req.ip || undefined, forceLogin: Boolean(req.body?.forceLogin), } as any);
    if ((result as any).requireSessionConfirmation) { res.json({ success: false, requireSessionConfirmation: true, message: (result as any).message }); return; }

    if (result.user.role === "ADMIN") {
      if ((prisma as any).adminLoginHistory) {
        (prisma as any).adminLoginHistory.create({
          data: {
            adminId: result.user.id,
            email: result.user.email,
            ipAddress: req.ip || undefined,
            userAgent: req.headers["user-agent"] || undefined,
            status: "SUCCESS",
          },
        }).catch(() => {});
      }

      AdminAuditService.log({
        adminId: result.user.id,
        adminName: result.user.name,
        action: "Admin Login",
        module: "Security",
        targetId: result.user.id,
        details: { email: result.user.email },
        ipAddress: req.ip,
      }).catch(() => {});
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const emailRaw = req.body?.email;
    if (typeof emailRaw === "string" && emailRaw.trim()) {
      prisma.user
        .findUnique({ where: { email: emailRaw.trim().toLowerCase() } })
        .then((u) => {
          if (u?.role === "ADMIN" && (prisma as any).adminLoginHistory) {
            return (prisma as any).adminLoginHistory.create({
              data: {
                adminId: u.id,
                email: u.email,
                ipAddress: req.ip || undefined,
                userAgent: req.headers["user-agent"] || undefined,
                status: "FAILED",
              },
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
    next(error);
  }
}

export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await loginUser({
      email: requireString(req.body?.email, "email"),
      password: requireString(req.body?.password, "password"),
      rememberMe: Boolean(req.body?.rememberMe),
      portal: "admin",
      expectedRole: "ADMIN",
      userAgent: String(req.headers["user-agent"] ?? ""),
      ipAddress: req.ip || undefined,
      forceLogin: Boolean(req.body?.forceLogin),
    } as any);

    if ((result as any).requireSessionConfirmation) {
      res.json({ success: false, requireSessionConfirmation: true, message: (result as any).message });
      return;
    }

    if (result.user.role === "ADMIN") {
      if ((prisma as any).adminLoginHistory) {
        (prisma as any).adminLoginHistory.create({
          data: {
            adminId: result.user.id,
            email: result.user.email,
            ipAddress: req.ip || undefined,
            userAgent: req.headers["user-agent"] || undefined,
            status: "SUCCESS",
          },
        }).catch(() => {});
      }

      AdminAuditService.log({
        adminId: result.user.id,
        adminName: result.user.name,
        action: "Admin Login",
        module: "Security",
        targetId: result.user.id,
        details: { email: result.user.email },
        ipAddress: req.ip,
      }).catch(() => {});
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const emailRaw = req.body?.email;
    if (typeof emailRaw === "string" && emailRaw.trim()) {
      prisma.user
        .findUnique({ where: { email: emailRaw.trim().toLowerCase() } })
        .then((u) => {
          if (u?.role === "ADMIN" && (prisma as any).adminLoginHistory) {
            return (prisma as any).adminLoginHistory.create({
              data: {
                adminId: u.id,
                email: u.email,
                ipAddress: req.ip || undefined,
                userAgent: req.headers["user-agent"] || undefined,
                status: "FAILED",
              },
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: { id: true, name: true, email: true, role: true, plan: true, emailVerified: true, createdAt: true },
    });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.userId) {
      await revokeAllSessions(req.user.userId);
      // Note: do NOT call forceLogoutAllForUser here — that would add the user
      // to the force-logout registry and cause the next login to fail with FORCE_LOGOUT.
      // forceLogoutAllForUser is only for admin-triggered deactivation.
    }
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (token) await blacklistToken(token);
    res.clearCookie("adyapan_session", { path: "/", secure: env.nodeEnv === "production", sameSite: env.nodeEnv === "production" ? "none" : "lax" });
    res.clearCookie("adyapan_refresh", { path: "/", secure: env.nodeEnv === "production", sameSite: env.nodeEnv === "production" ? "none" : "lax" });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

export async function sessionCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const clientSessionId = req.headers["x-session-id"] as string | undefined;
    if (!clientSessionId) {
      // No session ID sent — this happens during the first few seconds after a
      // fresh login before the client has written the sessionId to storage.
      // Return valid:true so the heartbeat doesn't trigger a false FORCE_LOGOUT.
      res.json({ success: true, valid: true });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user?.userId }, select: { activeSessionId: true } });
    if (user?.activeSessionId && user.activeSessionId !== clientSessionId) {
      res.status(401).json({ success: false, valid: false, code: "FORCE_LOGOUT", message: "Session ended. You have been logged in on another device." });
      return;
    }
    res.json({ success: true, valid: true });
  } catch (error) { next(error); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
    const token = bodyToken || readCookie(req, "adyapan_refresh");
    if (!token || typeof token !== "string") return next(httpError(400, "Refresh token is required"));
    const result = await refreshTokenService(token);
    res.cookie("adyapan_refresh", result.refreshToken, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    res.json({ success: true, token: result.token, refreshToken: result.refreshToken });
  } catch (error) { next(error); }
}

export async function getSessionFromCookie(req: Request, res: Response, next: NextFunction) {
  try {
    // The adyapan_session cookie is set by the OAuth callback.
    // Frontend cannot read httpOnly cookies, so this endpoint extracts
    // the token and returns it to the client for localStorage storage.
    const cookieHeader = req.headers.cookie || "";
    let sessionToken: string | undefined;
    for (const part of cookieHeader.split(";")) {
      const [k, ...v] = part.trim().split("=");
      if (k === "adyapan_session") {
        sessionToken = decodeURIComponent(v.join("="));
        break;
      }
    }

    if (!sessionToken) {
      throw httpError(401, "No session cookie found");
    }

    // Verify the token is valid
    const decoded = jwt.verify(sessionToken, env.jwtSecret, { algorithms: ["HS256"] }) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, plan: true, createdAt: true, activeSessionId: true },
    });

    if (!user) {
      throw httpError(401, "User not found");
    }

    // Clear the cookie (one-time use)
    res.clearCookie("adyapan_session", { path: "/" });

    // Return sessionId so the frontend can set the X-Session-Id header on
    // subsequent requests (required by requireAuth → validateSessionId).
    // Without this, OAuth users would be rejected on their first protected call.
    res.json({ success: true, token: sessionToken, user, sessionId: user.activeSessionId });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const email = requireString(req.body?.email, "email");
    const result = await requestPasswordReset(email);
    res.json({
      success: true,
      message: "If an account exists for that email, an OTP has been generated.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    const email = requireString(req.body?.email, "email");
    const otp = requireString(req.body?.otp, "otp");
    const newPassword = requireString(req.body?.newPassword, "newPassword");
    const result = await resetPassword(email, otp, newPassword);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function sendEmailVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const email = req.body?.email ? String(req.body.email).trim() : (req.user?.email || "");
    if (!email) {
      throw httpError(400, "Email address is required.");
    }
    const userId = req.user?.userId;
    const result = await requestEmailVerificationOtp(email, userId);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmailVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const email = req.body?.email ? String(req.body.email).trim() : (req.user?.email || "");
    const otp = requireString(req.body?.otp, "otp");
    if (!email) {
      throw httpError(400, "Email address is required.");
    }
    const userId = req.user?.userId;
    const result = await verifyEmailVerificationOtp(email, otp, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getEmailStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const email = req.query?.email ? String(req.query.email).trim() : (req.user?.email || "");
    const userId = req.user?.userId;
    if (!email && !userId) {
      throw httpError(400, "Email or authentication required.");
    }
    const result = await getEmailVerificationStatus(email, userId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

const OAUTH_STATE_COOKIE = "adyapan_oauth_state";

function resolveReturnOrigin(req: Request): string {
  const queryOrigin = req.query.origin as string | undefined;
  if (queryOrigin && /^https?:\/\//.test(queryOrigin)) {
    return queryOrigin.replace(/\/+$/, "");
  }
  const referer = req.headers.referer;
  if (referer && /^https?:\/\//.test(referer)) {
    try {
      const u = new URL(referer);
      return u.origin;
    } catch {}
  }
  return env.frontendUrl;
}

function resolveOAuthRedirectUri(req: Request, provider: "google" | "github"): string {
  const host = req.headers.host || "";
  if (provider === "github") {
    // If running with an explicit localhost callback URL configured, use it; otherwise use registered production callback
    if (env.github.callbackUrl && !env.github.callbackUrl.includes("localhost")) {
      return env.github.callbackUrl;
    }
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return `http://localhost:${env.port}/api/auth/callback/github`;
    }
    return env.github.callbackUrl;
  }
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return `http://localhost:${env.port}/api/auth/${provider}/callback`;
  }
  return env.google.callbackUrl;
}

function issueOAuthState(
  res: Response,
  returnOrigin: string,
  redirectUri: string,
  extra?: Record<string, any>
): string {
  const nonce = randomBytes(16).toString("hex");
  const ts = Date.now();
  const payload = JSON.stringify({ nonce, ts, returnOrigin, redirectUri, ...extra });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", env.jwtSecret).update(b64).digest("hex");
  const state = `${b64}.${sig}`;

  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
  return state;
}

function readCookie(req: Request, name: string): string {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

function validateOAuthState(
  req: Request,
  res: Response
): {
  valid: boolean;
  returnOrigin?: string;
  redirectUri?: string;
  mode?: string;
  returnTo?: string;
  connectUserId?: string;
} {
  const cookieState = readCookie(req, OAUTH_STATE_COOKIE);
  const queryState = String(req.query.state || "");
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", sameSite: env.nodeEnv === "production" ? "none" : "lax", secure: env.nodeEnv === "production" });

  const stateToValidate = queryState || cookieState;
  if (!stateToValidate) return { valid: false };

  try {
    const [b64, sig] = stateToValidate.split(".");
    if (b64 && sig) {
      const expectedSig = createHmac("sha256", env.jwtSecret).update(b64).digest("hex");
      if (sig === expectedSig) {
        const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
        if (Date.now() - payload.ts < 10 * 60 * 1000) {
          return {
            valid: true,
            returnOrigin: payload.returnOrigin,
            redirectUri: payload.redirectUri,
            mode: payload.mode,
            returnTo: payload.returnTo,
            connectUserId: payload.connectUserId,
          };
        }
      }
    }
  } catch (e) {}

  if (cookieState && cookieState === queryState) {
    return { valid: true };
  }
  return { valid: false };
}

function extractConnectContext(req: Request) {
  const mode = String(req.query.mode || "");
  const returnTo = String(req.query.returnTo || "");
  let connectUserId: string | undefined;

  const rawToken =
    (req.query.token as string) ||
    (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "") ||
    readCookie(req, "adyapan_session");

  if (rawToken) {
    try {
      const decoded = jwt.verify(rawToken, env.jwtSecret) as { userId?: string };
      if (decoded?.userId) connectUserId = decoded.userId;
    } catch {}
  }
  return { mode, returnTo, connectUserId };
}

export function githubAuth(req: Request, res: Response) {
  const returnOrigin = resolveReturnOrigin(req);
  const redirectUri = resolveOAuthRedirectUri(req, "github");
  const ctx = extractConnectContext(req);
  const state = issueOAuthState(res, returnOrigin, redirectUri, ctx);
  const url = getGitHubRedirectUrl(state, redirectUri);
  res.redirect(url);
}

export async function githubCallback(req: Request, res: Response, next: NextFunction) {
  let targetFrontend = env.frontendUrl;
  try {
    const oauthState = validateOAuthState(req, res);
    if (!oauthState.valid) {
      throw httpError(400, "Invalid OAuth state");
    }
    if (oauthState.returnOrigin) {
      targetFrontend = oauthState.returnOrigin;
    }

    const code = req.query.code as string | undefined;
    if (!code) {
      throw httpError(400, "Missing authorization code");
    }

    const githubUser = await exchangeGitHubCode(code, oauthState.redirectUri);

    // If this is a connect request from an authenticated user:
    let connectUserId = oauthState.connectUserId;
    if (!connectUserId && oauthState.mode === "connect") {
      const sessionCookie = readCookie(req, "adyapan_session");
      if (sessionCookie) {
        try {
          const dec = jwt.verify(sessionCookie, env.jwtSecret) as { userId?: string };
          if (dec?.userId) connectUserId = dec.userId;
        } catch {}
      }
    }

    if (oauthState.mode === "connect" && connectUserId) {
      const ghId = String(githubUser.id);
      const existing = await prisma.user.findFirst({
        where: { githubId: ghId, id: { not: connectUserId } },
      });
      if (existing) {
        const dest = new URL(`${targetFrontend}${oauthState.returnTo || "/dashboard/user/settings/connected"}`);
        dest.searchParams.set("error", "This GitHub account is already connected to another user.");
        return res.redirect(dest.toString());
      }

      await prisma.user.update({
        where: { id: connectUserId },
        data: { githubId: ghId } as any,
      });

      await prisma.userSettings.updateMany({
        where: { userId: connectUserId },
        data: { githubConnected: true },
      });

      if (githubUser.login) {
        await prisma.profile.updateMany({
          where: { userId: connectUserId },
          data: { github: githubUser.login },
        });
      }

      const dest = new URL(`${targetFrontend}${oauthState.returnTo || "/dashboard/user/settings/connected"}`);
      dest.searchParams.set("connected", "github");
      dest.searchParams.set("status", "success");
      return res.redirect(dest.toString());
    }

    // Normal login flow
    const result = await handleGitHubUser(githubUser);

    res.cookie("adyapan_session", result.token, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.cookie("adyapan_refresh", result.refreshToken, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const redirectUrl = new URL(`${targetFrontend}/login`);
    redirectUrl.searchParams.set("github", "success");
    redirectUrl.searchParams.set("token", result.token);
    redirectUrl.searchParams.set("user", JSON.stringify(result.user));
    if (result.sessionId) redirectUrl.searchParams.set("sessionId", result.sessionId);
    if (result.refreshToken) redirectUrl.searchParams.set("refreshToken", result.refreshToken);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub login failed";
    console.error("[githubCallback] Error:", error);
    res.redirect(`${targetFrontend}/login?github=error&message=${encodeURIComponent(message)}`);
  }
}

export function googleAuth(req: Request, res: Response) {
  const returnOrigin = resolveReturnOrigin(req);
  const redirectUri = resolveOAuthRedirectUri(req, "google");
  const ctx = extractConnectContext(req);
  const state = issueOAuthState(res, returnOrigin, redirectUri, ctx);
  const url = getGoogleRedirectUrl(state, redirectUri);
  res.redirect(url);
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  let targetFrontend = env.frontendUrl;
  try {
    const oauthState = validateOAuthState(req, res);
    if (!oauthState.valid) {
      throw httpError(400, "Invalid OAuth state");
    }
    if (oauthState.returnOrigin) {
      targetFrontend = oauthState.returnOrigin;
    }

    const code = req.query.code as string | undefined;
    if (!code) {
      throw httpError(400, "Missing authorization code");
    }

    const gUser = await exchangeGoogleCode(code, oauthState.redirectUri);

    // If this is a connect request from an authenticated user:
    let connectUserId = oauthState.connectUserId;
    if (!connectUserId && oauthState.mode === "connect") {
      const sessionCookie = readCookie(req, "adyapan_session");
      if (sessionCookie) {
        try {
          const dec = jwt.verify(sessionCookie, env.jwtSecret) as { userId?: string };
          if (dec?.userId) connectUserId = dec.userId;
        } catch {}
      }
    }

    if (oauthState.mode === "connect" && connectUserId) {
      const gId = gUser.id;
      const existing = await prisma.user.findFirst({
        where: { googleId: gId, id: { not: connectUserId } },
      });
      if (existing) {
        const dest = new URL(`${targetFrontend}${oauthState.returnTo || "/dashboard/user/settings/connected"}`);
        dest.searchParams.set("error", "This Google account is already connected to another user.");
        return res.redirect(dest.toString());
      }

      await prisma.user.update({
        where: { id: connectUserId },
        data: { googleId: gId } as any,
      });

      await prisma.userSettings.updateMany({
        where: { userId: connectUserId },
        data: { googleConnected: true },
      });

      const dest = new URL(`${targetFrontend}${oauthState.returnTo || "/dashboard/user/settings/connected"}`);
      dest.searchParams.set("connected", "google");
      dest.searchParams.set("status", "success");
      return res.redirect(dest.toString());
    }

    // Normal login flow
    const result = await handleGoogleUser(gUser);

    res.cookie("adyapan_session", result.token, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.cookie("adyapan_refresh", result.refreshToken, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const redirectUrl = new URL(`${targetFrontend}/login`);
    redirectUrl.searchParams.set("google", "success");
    redirectUrl.searchParams.set("token", result.token);
    redirectUrl.searchParams.set("user", JSON.stringify(result.user));
    if (result.sessionId) redirectUrl.searchParams.set("sessionId", result.sessionId);
    if (result.refreshToken) redirectUrl.searchParams.set("refreshToken", result.refreshToken);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google login failed";
    console.error("[googleCallback] Error:", error);
    res.redirect(`${targetFrontend}/login?google=error&message=${encodeURIComponent(message)}`);
  }
}

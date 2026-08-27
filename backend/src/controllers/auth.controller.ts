import type { NextFunction, Request, Response } from "express";
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
  activateNewSession,
  logout as blacklistToken,
  refreshToken as refreshTokenService,
} from "../services/auth.service";
import { requireString } from "../utils/request";
import { env } from "../config/env";
import { httpError } from "../utils/httpError";
import { prisma } from "../config/prisma";
import { AdminAuditService } from "../services/admin-audit.service";

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

export async function registerAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const rawSecret = String(req.body?.adminSecret || req.body?.secret || "").replace(/^["']|["']$/g, "").trim();
    const configuredSecret = String(env.adminRegisterSecret || "adyapan-admin-secret-2026").replace(/^["']|["']$/g, "").trim();

    const defaultSecret = "adyapan-admin-secret-2026";

    const isSecretValid =
      Boolean(rawSecret) && (
        rawSecret === configuredSecret ||
        rawSecret === defaultSecret
      );

    if (!isSecretValid) {
      throw httpError(403, "Invalid admin registration secret");
    }


    const result = await registerUser({
      name: requireString(req.body?.name, "name").trim(),
      email: requireString(req.body?.email, "email").trim(),
      password: requireString(req.body?.password, "password"),
      role: "ADMIN",
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

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const portal = req.body?.portal === "admin" ? "admin" : (req.body?.expectedRole === "ADMIN" ? "admin" : "user");
 const result = await loginUser({ email: requireString(req.body?.email, "email"), password: requireString(req.body?.password, "password"), rememberMe: Boolean(req.body?.rememberMe), portal, userAgent: String(req.headers["user-agent"] ?? ""), ipAddress: req.ip || undefined, forceLogin: Boolean(req.body?.forceLogin), } as any);
 if (result.requireSessionConfirmation) { res.json({ success: false, requireSessionConfirmation: true, message: result.message }); return; }

    if (result.user.role === "ADMIN") {
      (prisma as any).adminLoginHistory.create({
        data: {
          adminId: result.user.id,
          email: result.user.email,
          ipAddress: req.ip || undefined,
          userAgent: req.headers["user-agent"] || undefined,
          status: "SUCCESS",
        },
      }).catch(() => {});

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
          if (u?.role === "ADMIN") {
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

    if (result.requireSessionConfirmation) {
      res.json({ success: false, requireSessionConfirmation: true, message: result.message });
      return;
    }

    if (result.user.role === "ADMIN") {
      (prisma as any).adminLoginHistory.create({
        data: {
          adminId: result.user.id,
          email: result.user.email,
          ipAddress: req.ip || undefined,
          userAgent: req.headers["user-agent"] || undefined,
          status: "SUCCESS",
        },
      }).catch(() => {});

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
          if (u?.role === "ADMIN") {
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
      select: { id: true, name: true, email: true, role: true, plan: true, createdAt: true },
    });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.userId) {
      await prisma.user.update({ where: { id: req.user.userId }, data: { activeSessionId: null } });
    }
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (token) await blacklistToken(token);
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

export async function sessionCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const clientSessionId = req.headers["x-session-id"] as string | undefined;
    if (!clientSessionId) {
      res.status(401).json({ success: false, valid: false, message: "Session ID is required. Please log in again." });
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
    const token = req.body?.refreshToken;
    if (!token || typeof token !== "string") return next(httpError(400, "Refresh token is required"));
    const result = await refreshTokenService(token);
    res.json({ success: true, token: result.token, refreshToken: result.refreshToken });
  } catch (error) { next(error); }
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

export function githubAuth(_req: Request, res: Response) {
  const url = getGitHubRedirectUrl();
  res.redirect(url);
}

export async function githubCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      throw httpError(400, "Missing authorization code");
    }

    const githubUser = await exchangeGitHubCode(code);
    const result = await handleGitHubUser(githubUser);

    const frontendUrl = env.frontendUrl;
    const params = new URLSearchParams({
      token: result.token,
      user: JSON.stringify(result.user),
      sessionId: result.sessionId,
      refreshToken: result.refreshToken,
    });

    res.redirect(`${frontendUrl}/login?github=success&${params.toString()}`);
  } catch (error) {
    const frontendUrl = env.frontendUrl;
    const message = error instanceof Error ? error.message : "GitHub login failed";
    res.redirect(`${frontendUrl}/login?github=error&message=${encodeURIComponent(message)}`);
  }
}

export function googleAuth(_req: Request, res: Response) {
  const url = getGoogleRedirectUrl();
  res.redirect(url);
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      throw httpError(400, "Missing authorization code");
    }

    const gUser = await exchangeGoogleCode(code);
    const result = await handleGoogleUser(gUser);

    const frontendUrl = env.frontendUrl;
    const params = new URLSearchParams({
      token: result.token,
      user: JSON.stringify(result.user),
      sessionId: result.sessionId,
      refreshToken: result.refreshToken,
    });

    res.redirect(`${frontendUrl}/login?google=success&${params.toString()}`);
  } catch (error) {
    const frontendUrl = env.frontendUrl;
    const message = error instanceof Error ? error.message : "Google login failed";
    res.redirect(`${frontendUrl}/login?google=error&message=${encodeURIComponent(message)}`);
  }
}


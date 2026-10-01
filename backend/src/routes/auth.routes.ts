import { Router } from "express";
import rateLimit from "express-rate-limit";
import { forgotPassword, resetPasswordController, githubAuth, githubCallback, googleAuth, googleCallback, login, adminLogin, logout, me, register, registerAdmin, sessionCheck, refresh, getSessionFromCookie, sendEmailVerification, verifyEmailVerification, getEmailStatus } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per 15 minutes
  message: { success: false, error: "Too many authentication attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slightly higher limit for regular login/registration (20/min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { success: false, error: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Higher ceiling for token refresh (fires automatically every ~15 min per tab)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { success: false, error: "Too many refresh attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

// Middleware to attach user if authorization token is provided (optional auth)
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return requireAuth(req, res, next);
  }
  next();
};

authRouter.post("/register", loginLimiter, register);
authRouter.post("/register-admin", authLimiter, registerAdmin);
authRouter.post("/login", loginLimiter, login);
authRouter.post("/admin-login", authLimiter, adminLogin);
authRouter.post("/forgot-password", authLimiter, forgotPassword);
authRouter.post("/reset-password", authLimiter, resetPasswordController);
authRouter.post("/send-verification-otp", authLimiter, optionalAuth, sendEmailVerification);
authRouter.post("/send-email-otp", authLimiter, optionalAuth, sendEmailVerification);
authRouter.post("/verify-email-otp", authLimiter, optionalAuth, verifyEmailVerification);
authRouter.post("/verify-email", authLimiter, optionalAuth, verifyEmailVerification);
authRouter.get("/email-verification-status", optionalAuth, getEmailStatus);
authRouter.post("/refresh", refreshLimiter, refresh);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/session", getSessionFromCookie);
authRouter.get("/me", requireAuth, me);
authRouter.get("/session-check", requireAuth, sessionCheck);
authRouter.get("/github", authLimiter, githubAuth);
authRouter.get("/github/callback", authLimiter, githubCallback);
authRouter.get("/callback/github", authLimiter, githubCallback);
authRouter.get("/google", authLimiter, googleAuth);
authRouter.get("/google/callback", authLimiter, googleCallback);
authRouter.get("/callback/google", authLimiter, googleCallback);


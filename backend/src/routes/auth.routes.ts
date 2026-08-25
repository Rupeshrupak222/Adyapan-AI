import { Router } from "express";
import rateLimit from "express-rate-limit";
import { forgotPassword, resetPasswordController, githubAuth, githubCallback, googleAuth, googleCallback, login, adminLogin, logout, me, register, registerAdmin } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per 15 minutes
  message: { success: false, error: "Too many authentication attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/register-admin", authLimiter, registerAdmin);
authRouter.post("/login", login);
authRouter.post("/admin-login", authLimiter, adminLogin);
authRouter.post("/forgot-password", authLimiter, forgotPassword);
authRouter.post("/reset-password", authLimiter, resetPasswordController);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, me);
authRouter.get("/github", githubAuth);
authRouter.get("/github/callback", githubCallback);
authRouter.get("/callback/github", githubCallback);
authRouter.get("/google", googleAuth);
authRouter.get("/google/callback", googleCallback);
authRouter.get("/callback/google", googleCallback);


import { Router } from "express";
import { forgotPassword, resetPasswordController, githubAuth, githubCallback, login, adminLogin, logout, me, register, registerAdmin } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/register-admin", registerAdmin);
authRouter.post("/login", login);
authRouter.post("/admin-login", adminLogin);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPasswordController);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, me);
authRouter.get("/github", githubAuth);
authRouter.get("/github/callback", githubCallback);

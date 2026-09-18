import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboardStats, getDashboardAnalytics } from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", requireAuth, getDashboardStats);
dashboardRouter.get("/analytics", requireAuth, getDashboardAnalytics);

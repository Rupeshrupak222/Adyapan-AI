import { Router } from "express";
import {
  getDashboardStats,
  getActivityFeed,
  getAdminUsers,
  updateUserPlan,
  getAiAnalytics,
  getRevenueAnalytics,
  getSystemHealth,
  getModuleAnalytics,
  getSecurityLogs,
  getAdminJobs,
  createAdminJob,
  updateAdminJob,
  deleteAdminJob,
  triggerJobIngestion,
  getAdminSettings,
  updateAdminSettings,
  getAnalyticsBI,
} from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  getUserDatabases,
  getUserDatabaseStats,
  queryUserDb,
  deleteUserDatabase,
  getAggregatedStats,
} from "../controllers/admin-db.controller";

export const adminRouter = Router();

const guard = [requireAuth, requireRole("ADMIN")];

adminRouter.get("/dashboard", ...guard, getDashboardStats);
adminRouter.get("/activity", ...guard, getActivityFeed);
adminRouter.get("/users", ...guard, getAdminUsers);
adminRouter.post("/users/:id/action", ...guard, updateUserPlan);
adminRouter.get("/analytics/ai", ...guard, getAiAnalytics);
adminRouter.get("/analytics/revenue", ...guard, getRevenueAnalytics);
adminRouter.get("/analytics/bi", ...guard, getAnalyticsBI);
adminRouter.get("/system-health", ...guard, getSystemHealth);
adminRouter.get("/modules", ...guard, getModuleAnalytics);
adminRouter.get("/security", ...guard, getSecurityLogs);

// Job Discovery Management
adminRouter.get("/jobs", ...guard, getAdminJobs);
adminRouter.post("/jobs", ...guard, createAdminJob);
adminRouter.put("/jobs/:id", ...guard, updateAdminJob);
adminRouter.delete("/jobs/:id", ...guard, deleteAdminJob);
adminRouter.post("/jobs/ingest", ...guard, triggerJobIngestion);

// System Settings Management
adminRouter.get("/settings", ...guard, getAdminSettings);
adminRouter.put("/settings", ...guard, updateAdminSettings);

adminRouter.get("/performance", ...guard, (req, res) => {
  try {
    const { PerformanceMonitor } = require("../utils/monitoring");
    res.json({ success: true, stats: PerformanceMonitor.getStats() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to retrieve performance metrics" });
  }
});

adminRouter.get("/databases", ...guard, getUserDatabases);
adminRouter.get("/databases/stats", ...guard, getUserDatabaseStats);
adminRouter.get("/databases/aggregated", ...guard, getAggregatedStats);
adminRouter.post("/databases/:userId/query", ...guard, queryUserDb);
adminRouter.delete("/databases/:userId", ...guard, deleteUserDatabase);

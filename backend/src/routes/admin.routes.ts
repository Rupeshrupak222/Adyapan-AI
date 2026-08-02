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
  markNotificationRead,
  getAdminJobs,
  createAdminJob,
  updateAdminJob,
  deleteAdminJob,
  triggerJobIngestion,
  getAdminSettings,
  updateAdminSettings,
  getAnalyticsBI,
  getAdminNotifications,
  createAdminBroadcastNotification,
  toggleRevokeAdminNotification,
  deleteAdminNotification,
  getAdminSupportTickets,
  updateSupportTicketStatus,
  getAdminUserSettings,
} from "../controllers/admin.controller";
import { requireAdminAuth } from "../middleware/adminAuth";
import {
  getUserDatabases,
  getUserDatabaseStats,
  queryUserDb,
  deleteUserDatabase,
  getAggregatedStats,
} from "../controllers/admin-db.controller";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/coupon.controller";
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
} from "../controllers/plan.controller";
import {
  getAdminOrganizations,
  createAdminOrganization,
  updateAdminOrganization,
  deleteAdminOrganization,
  getOrganizationStudents,
  bulkRegisterOrganizationStudents,
} from "../controllers/organization.controller";

export const adminRouter = Router();

const guard = [requireAdminAuth];

// Organization & University/Company Management
adminRouter.get("/organizations", ...guard, getAdminOrganizations);
adminRouter.post("/organizations", ...guard, createAdminOrganization);
adminRouter.put("/organizations/:id", ...guard, updateAdminOrganization);
adminRouter.delete("/organizations/:id", ...guard, deleteAdminOrganization);
adminRouter.get("/organizations/:id/students", ...guard, getOrganizationStudents);
adminRouter.post("/organizations/bulk-students", ...guard, bulkRegisterOrganizationStudents);

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
adminRouter.post("/notifications/:id/read", ...guard, markNotificationRead);
adminRouter.get("/notifications", ...guard, getAdminNotifications);
adminRouter.post("/notifications", ...guard, createAdminBroadcastNotification);
adminRouter.put("/notifications/:id/revoke", ...guard, toggleRevokeAdminNotification);
adminRouter.delete("/notifications/:id", ...guard, deleteAdminNotification);
// Job Discovery Management
adminRouter.get("/jobs", ...guard, getAdminJobs);
adminRouter.post("/jobs", ...guard, createAdminJob);
adminRouter.put("/jobs/:id", ...guard, updateAdminJob);
adminRouter.delete("/jobs/:id", ...guard, deleteAdminJob);
adminRouter.post("/jobs/ingest", ...guard, triggerJobIngestion);

// System Settings Management
adminRouter.get("/settings", ...guard, getAdminSettings);
adminRouter.put("/settings", ...guard, updateAdminSettings);

// User Settings & Support Ticket Management
adminRouter.get("/support-tickets", ...guard, getAdminSupportTickets);
adminRouter.put("/support-tickets/:ticketId/status", ...guard, updateSupportTicketStatus);
adminRouter.get("/users/:userId/settings", ...guard, getAdminUserSettings);

// Coupon Management
adminRouter.get("/coupons", ...guard, getCoupons);
adminRouter.post("/coupons", ...guard, createCoupon);
adminRouter.put("/coupons/:id", ...guard, updateCoupon);
adminRouter.delete("/coupons/:id", ...guard, deleteCoupon);

// Plan Management
adminRouter.get("/plans", ...guard, getPlans);
adminRouter.post("/plans", ...guard, createPlan);
adminRouter.put("/plans/:id", ...guard, updatePlan);
adminRouter.delete("/plans/:id", ...guard, deletePlan);

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

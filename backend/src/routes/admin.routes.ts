import { Router } from "express";
import {
  getDashboardStats,
  getActivityFeed,
  getRegistrationAnalytics,
  getAdminUsers,
  updateUserPlan,
  createAdminUser,
  editAdminUser,
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
  getPremiumAnalytics,
  getAdminIntegrations,
  getAdminNotifications,
  createAdminBroadcastNotification,
  toggleRevokeAdminNotification,
  deleteAdminNotification,
  getAdminSupportTickets,
  updateSupportTicketStatus,
  getAdminTicketMessages,
  sendAdminTicketMessage,
  getAdminUserSettings,
  getAdminBlogs,
  updateAdminBlogStatus,
  deleteAdminBlog,
  generateAllTopicTestsAdminCtrl,
  getAptitudeOverviewAdminCtrl,
  getAptitudeTestsAdminCtrl,
  generateAptitudeTestAdminCtrl,
  deleteAptitudeTestAdminCtrl,
} from "../controllers/admin.controller";
import {
  handleAdminGetMCQOverview,
  handleAdminCreateTest,
  handleAdminGenerateAITest,
  handleAdminUpdateTest,
  handleAdminDeleteTest,
  handleAdminAddQuestionToTest,
  handleAdminDeleteQuestion,
  handleGetTests,
  handleGetTestById,
} from "../controllers/mcq.controller";
import { requireAdminAuth } from "../middleware/adminAuth";
import { requireAdminPermission } from "../middleware/adminPermission";
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
import {
  getFeatures,
  getFeatureById,
  getFeatureLogs,
  createFeature,
  updateFeature,
  deleteFeature,
  restoreFeature,
  updateFeatureStatus,
  updateFeatureRollout,
  updateFeaturePermissions,
  exportFeatures,
} from "../controllers/feature.controller";
import { subscriptionAdminRouter } from "./admin-subscription.routes";

export const adminRouter = Router();

const can = (resource: string, action = "*") => [requireAdminAuth, requireAdminPermission(resource, action)];

// Organization & University/Company Management
adminRouter.get("/organizations", ...can("organizations", "read"), getAdminOrganizations);
adminRouter.post("/organizations", ...can("organizations", "write"), createAdminOrganization);
adminRouter.put("/organizations/:id", ...can("organizations", "write"), updateAdminOrganization);
adminRouter.delete("/organizations/:id", ...can("organizations", "write"), deleteAdminOrganization);
adminRouter.get("/organizations/:id/students", ...can("organizations", "read"), getOrganizationStudents);
adminRouter.post("/organizations/bulk-students", ...can("organizations", "write"), bulkRegisterOrganizationStudents);

adminRouter.get("/dashboard", ...can("analytics", "read"), getDashboardStats);
adminRouter.get("/activity", ...can("analytics", "read"), getActivityFeed);
adminRouter.get("/analytics/registrations", ...can("analytics", "read"), getRegistrationAnalytics);
adminRouter.get("/users", ...can("users", "read"), getAdminUsers);
adminRouter.post("/users", ...can("users", "write"), createAdminUser);
adminRouter.put("/users/:id", ...can("users", "write"), editAdminUser);
adminRouter.post("/users/:id/action", ...can("users", "write"), updateUserPlan);
adminRouter.get("/analytics/ai", ...can("analytics", "read"), getAiAnalytics);
adminRouter.get("/analytics/revenue", ...can("analytics", "read"), getRevenueAnalytics);
adminRouter.get("/analytics/bi", ...can("analytics", "read"), getAnalyticsBI);
adminRouter.get("/analytics/premium", ...can("analytics", "read"), getPremiumAnalytics);
adminRouter.get("/system-health", ...can("system", "read"), getSystemHealth);
adminRouter.get("/modules", ...can("analytics", "read"), getModuleAnalytics);
adminRouter.post("/generate-all-tests", requireAdminAuth, generateAllTopicTestsAdminCtrl);
adminRouter.get("/security", ...can("security", "read"), getSecurityLogs);
adminRouter.post("/notifications/:id/read", ...can("security", "write"), markNotificationRead);
adminRouter.get("/notifications", ...can("notifications", "read"), getAdminNotifications);
adminRouter.post("/notifications", ...can("notifications", "write"), createAdminBroadcastNotification);
adminRouter.put("/notifications/:id/revoke", ...can("notifications", "write"), toggleRevokeAdminNotification);
adminRouter.delete("/notifications/:id", ...can("notifications", "write"), deleteAdminNotification);
// Job Discovery Management
adminRouter.get("/jobs", ...can("jobs", "read"), getAdminJobs);
adminRouter.post("/jobs", ...can("jobs", "write"), createAdminJob);
adminRouter.put("/jobs/:id", ...can("jobs", "write"), updateAdminJob);
adminRouter.delete("/jobs/:id", ...can("jobs", "write"), deleteAdminJob);
adminRouter.post("/jobs/ingest", ...can("jobs", "write"), triggerJobIngestion);

// System Settings Management
adminRouter.get("/settings", ...can("settings", "read"), getAdminSettings);
adminRouter.put("/settings", ...can("settings", "write"), updateAdminSettings);

// System Integrations Status
adminRouter.get("/integrations", ...can("settings", "read"), getAdminIntegrations);

// User Settings & Support Ticket Management
adminRouter.get("/support-tickets", ...can("support", "read"), getAdminSupportTickets);
adminRouter.put("/support-tickets/:ticketId/status", ...can("support", "write"), updateSupportTicketStatus);
adminRouter.get("/support-tickets/:ticketId/messages", ...can("support", "read"), getAdminTicketMessages);
adminRouter.post("/support-tickets/:ticketId/messages", ...can("support", "write"), sendAdminTicketMessage);
adminRouter.get("/users/:userId/settings", ...can("users", "read"), getAdminUserSettings);

// User Community Blog Management
adminRouter.get("/blogs", ...can("content", "read"), getAdminBlogs);
adminRouter.put("/blogs/:id/status", ...can("content", "write"), updateAdminBlogStatus);
adminRouter.delete("/blogs/:id", ...can("content", "write"), deleteAdminBlog);

// AI Technical Engine & MCQ Dynamic Tests Management
adminRouter.get("/mcq/overview", ...can("content", "read"), handleAdminGetMCQOverview);
adminRouter.get("/mcq/tests", ...can("content", "read"), handleGetTests);
adminRouter.get("/mcq/tests/:testId", ...can("content", "read"), handleGetTestById);
adminRouter.post("/mcq/tests", ...can("content", "write"), handleAdminCreateTest);
adminRouter.post("/mcq/tests/generate-ai", ...can("content", "write"), handleAdminGenerateAITest);
adminRouter.put("/mcq/tests/:testId", ...can("content", "write"), handleAdminUpdateTest);
adminRouter.delete("/mcq/tests/:testId", ...can("content", "write"), handleAdminDeleteTest);
adminRouter.post("/mcq/tests/:testId/questions", ...can("content", "write"), handleAdminAddQuestionToTest);
adminRouter.delete("/mcq/tests/:testId/questions/:questionId", ...can("content", "write"), handleAdminDeleteQuestion);

// AI Aptitude Engine & Topic Tests Management
adminRouter.get("/aptitude/overview", ...can("content", "read"), getAptitudeOverviewAdminCtrl);
adminRouter.get("/aptitude/tests", ...can("content", "read"), getAptitudeTestsAdminCtrl);
adminRouter.post("/aptitude/tests/generate", ...can("content", "write"), generateAptitudeTestAdminCtrl);
adminRouter.post("/aptitude/tests/generate-all", ...can("content", "write"), generateAllTopicTestsAdminCtrl);
adminRouter.delete("/aptitude/tests/:id", ...can("content", "write"), deleteAptitudeTestAdminCtrl);

// Coupon Management
adminRouter.get("/coupons", ...can("billing", "read"), getCoupons);
adminRouter.post("/coupons", ...can("billing", "write"), createCoupon);
adminRouter.put("/coupons/:id", ...can("billing", "write"), updateCoupon);
adminRouter.delete("/coupons/:id", ...can("billing", "write"), deleteCoupon);

// ── Feature Management (Enterprise Feature Flag System) ──
adminRouter.get("/features/export", ...can("features", "read"), exportFeatures);
adminRouter.get("/features/logs", ...can("features", "read"), getFeatureLogs);
adminRouter.get("/features", ...can("features", "read"), getFeatures);
adminRouter.get("/features/:id", ...can("features", "read"), getFeatureById);
adminRouter.post("/features", ...can("features", "write"), createFeature);
adminRouter.put("/features/:id", ...can("features", "write"), updateFeature);
adminRouter.patch("/features/status", ...can("features", "write"), updateFeatureStatus);
adminRouter.patch("/features/rollout", ...can("features", "write"), updateFeatureRollout);
adminRouter.patch("/features/permissions", ...can("features", "write"), updateFeaturePermissions);
adminRouter.delete("/features/:id", ...can("features", "write"), deleteFeature);
adminRouter.post("/features/:id/restore", ...can("features", "write"), restoreFeature);

// Plan Management
adminRouter.get("/plans", ...can("billing", "read"), getPlans);
adminRouter.post("/plans", ...can("billing", "write"), createPlan);
adminRouter.put("/plans/:id", ...can("billing", "write"), updatePlan);
adminRouter.delete("/plans/:id", ...can("billing", "write"), deletePlan);

// Enterprise Subscription System (analytics, subscriptions, refunds, feature access)
adminRouter.use("/subscriptions", subscriptionAdminRouter);

adminRouter.get("/performance", ...can("system", "read"), (req, res) => {
  try {
    const { PerformanceMonitor } = require("../utils/monitoring");
    res.json({ success: true, stats: PerformanceMonitor.getStats() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to retrieve performance metrics" });
  }
});

adminRouter.get("/databases", ...can("databases", "read"), getUserDatabases);
adminRouter.get("/databases/stats", ...can("databases", "read"), getUserDatabaseStats);
adminRouter.get("/databases/aggregated", ...can("databases", "read"), getAggregatedStats);
adminRouter.post("/databases/:userId/query", ...can("databases", "write"), queryUserDb);
adminRouter.delete("/databases/:userId", ...can("databases", "write"), deleteUserDatabase);

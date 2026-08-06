import { Router } from "express";
import { requireAdminAuth } from "../middleware/adminAuth";
import { requireAdminPermission } from "../middleware/adminPermission";
import {
  getSubscriptionAnalytics,
  listAllSubscriptions,
  listTransactions,
  refundPayment,
  getFeatureAccessAdmin,
  updateFeatureAccess,
  updateUsageLimit,
  createUsageLimit,
  deleteUsageLimit,
  grantPlan,
  refreshFeatureCatalog,
} from "../controllers/admin-subscription.controller";

export const subscriptionAdminRouter = Router();

const can = (resource: string, action = "*") => [requireAdminAuth, requireAdminPermission(resource, action)];

// Analytics
subscriptionAdminRouter.get("/analytics", ...can("billing", "read"), getSubscriptionAnalytics);

// Subscriptions
subscriptionAdminRouter.get("/", ...can("billing", "read"), listAllSubscriptions);
subscriptionAdminRouter.post("/users/:userId/grant", ...can("billing", "write"), grantPlan);

// Transactions & refunds
subscriptionAdminRouter.get("/transactions", ...can("billing", "read"), listTransactions);
subscriptionAdminRouter.post("/payments/:id/refund", ...can("billing", "write"), refundPayment);

// Feature access catalog
subscriptionAdminRouter.get("/features", ...can("billing", "read"), getFeatureAccessAdmin);
subscriptionAdminRouter.put("/features/:id", ...can("billing", "write"), updateFeatureAccess);
subscriptionAdminRouter.post("/features/refresh", ...can("billing", "write"), refreshFeatureCatalog);

// Usage limits
subscriptionAdminRouter.post("/limits", ...can("billing", "write"), createUsageLimit);
subscriptionAdminRouter.put("/limits/:id", ...can("billing", "write"), updateUsageLimit);
subscriptionAdminRouter.delete("/limits/:id", ...can("billing", "write"), deleteUsageLimit);

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getPlansCatalog,
  getFeaturesCatalog,
  getOverview,
  getMyFeatureAccess,
  createCheckoutOrder,
  verifyAndActivate,
  cancelMySubscription,
  renewSubscription,
  changeMyPlan,
  getMyInvoices,
  downloadInvoice,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getBillingAddress,
  upsertBillingAddress,
  getProviders,
} from "../controllers/subscription.controller";

export const subscriptionRouter = Router();

// Public catalog endpoints
subscriptionRouter.get("/plans", getPlansCatalog);
subscriptionRouter.get("/features", getFeaturesCatalog);

// Authenticated endpoints
subscriptionRouter.use(requireAuth);

subscriptionRouter.get("/", getOverview);
subscriptionRouter.get("/overview", getOverview);
subscriptionRouter.get("/feature-access", getMyFeatureAccess);

subscriptionRouter.post("/checkout", createCheckoutOrder);
subscriptionRouter.post("/verify", verifyAndActivate);
subscriptionRouter.post("/cancel", cancelMySubscription);
subscriptionRouter.post("/renew", renewSubscription);
subscriptionRouter.post("/change-plan", changeMyPlan);

subscriptionRouter.get("/invoices", getMyInvoices);
subscriptionRouter.get("/invoices/:invoiceNumber/download", downloadInvoice);

subscriptionRouter.get("/payment-methods", getPaymentMethods);
subscriptionRouter.post("/payment-methods", addPaymentMethod);
subscriptionRouter.delete("/payment-methods/:id", deletePaymentMethod);
subscriptionRouter.put("/payment-methods/:id/default", setDefaultPaymentMethod);

subscriptionRouter.get("/billing-address", getBillingAddress);
subscriptionRouter.put("/billing-address", upsertBillingAddress);

subscriptionRouter.get("/providers", getProviders);

import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getStatus,
  cancelSubscription,
  getInvoices,
} from "../controllers/payment.controller";
import { listPlans } from "../controllers/plan.controller";
import { listActiveCoupons, applyCoupon } from "../controllers/coupon.controller";
import { requireAuth } from "../middleware/auth";

export const paymentRouter = Router();

paymentRouter.get("/plans", listPlans);

paymentRouter.use(requireAuth);

paymentRouter.post("/create-order", createOrder);
paymentRouter.post("/verify", verifyPayment);
paymentRouter.get("/status", getStatus);
paymentRouter.post("/cancel", cancelSubscription);
paymentRouter.get("/invoices", getInvoices);
paymentRouter.get("/coupons", listActiveCoupons);
paymentRouter.post("/coupon/apply", applyCoupon);

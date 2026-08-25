import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getStatus,
  cancelSubscription,
  getInvoices,
  handleRazorpayWebhook,
} from "../controllers/payment.controller";
import { listPlans } from "../controllers/plan.controller";
import { listActiveCoupons, applyCoupon } from "../controllers/coupon.controller";
import { requireAuth } from "../middleware/auth";

export const paymentRouter = Router();

paymentRouter.get("/plans", listPlans);

// Razorpay webhook — must be mounted BEFORE requireAuth and receive raw body
// for HMAC signature verification. express.raw() is configured globally for
// the /webhook path.
paymentRouter.post(
  "/webhook",
  // Parse raw body for signature verification (express.raw sets req.body to Buffer)
  (req: any, _res, next) => {
    req.rawBody = typeof req.body === "string" ? req.body : Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
    next();
  },
  handleRazorpayWebhook
);

paymentRouter.use(requireAuth);

paymentRouter.post("/create-order", createOrder);
paymentRouter.post("/verify", verifyPayment);
paymentRouter.get("/status", getStatus);
paymentRouter.post("/cancel", cancelSubscription);
paymentRouter.get("/invoices", getInvoices);
paymentRouter.get("/coupons", listActiveCoupons);
paymentRouter.post("/coupon/apply", applyCoupon);

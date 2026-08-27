import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getUserPrisma } from "../config/dynamicPrisma";
import { env } from "../config/env";
import { httpError } from "../utils/httpError";
import { emitNotification } from "../lib/notificationEmitter";
import Razorpay from "razorpay";
import crypto from "crypto";
import { requireUserId } from "../utils/request";
import { resolvePlanPrice } from "./plan.controller";
import { validateCoupon } from "./coupon.controller";

let razorpay: any = null;
try {
  if (env.razorpay.keyId && env.razorpay.keySecret) {
    razorpay = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  } else {
    console.warn("[PaymentController] Razorpay credentials not configured.");
  }
} catch (e) {
  console.error("Failed to initialize Razorpay SDK:", e);
}

// ─── 1. Create Order ─────────────────────────────────────────────

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const { plan, couponCode, billingCycle } = req.body;
    const { amount, label } = await resolvePlanPrice(plan);

    // Apply coupon discount when provided.
    let discountAmount = 0;
    let appliedCoupon: string | null = null;
    if (couponCode && String(couponCode).trim().length > 0) {
      const coupon = await validateCoupon(String(couponCode));
      if (coupon.planCodes && coupon.planCodes.length > 0 && !coupon.planCodes.includes(plan)) {
        throw httpError(400, `This coupon is not valid for the ${plan} plan`);
      }
      if (coupon.minAmount != null && amount < coupon.minAmount * 100) {
        throw httpError(400, `This coupon requires a minimum order of ₹${coupon.minAmount}`);
      }
      let disc = Math.round((amount * coupon.discountPct) / 100);
      if (coupon.maxDiscountAmount != null) {
        disc = Math.min(disc, Math.round(coupon.maxDiscountAmount * 100));
      }
      discountAmount = disc;
      appliedCoupon = coupon.code;
      if (amount - discountAmount <= 0) {
        throw httpError(400, "Coupon makes this order free. Please contact support.");
      }
    }
    const finalAmount = amount - discountAmount;

    if (!razorpay) {
      throw httpError(503, "Razorpay payment gateway is not configured. Real payment gateway credentials required.");
    }

    const order = await razorpay.orders.create({
      amount: finalAmount,
      currency: "INR",
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: { userId, plan, label, couponCode: appliedCoupon ?? "" },
    });

    await prisma.payment.create({
      data: {
        userId,
        orderId: order.id,
        amount: finalAmount,
        currency: "INR",
        plan,
        billingCycle: billingCycle === "yearly" ? "yearly" : "monthly",
        provider: "razorpay",
        couponCode: appliedCoupon,
        discountAmount,
        status: "created",
      },
    });

    if (appliedCoupon) {
      await prisma.coupon.updateMany({
        where: { code: appliedCoupon },
        data: { usedCount: { increment: 1 } },
      });
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      coupon: appliedCoupon
        ? { code: appliedCoupon, discountAmount }
        : null,
      key: env.razorpay.keyId,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 2. Verify Payment ──────────────────────────────────────────

export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      throw httpError(400, "Missing payment verification fields");
    }

    if (env.razorpay.keySecret) {
      const expectedSig = crypto
        .createHmac("sha256", env.razorpay.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSig);
      const providedBuf = Buffer.from(String(signature));
      if (
        expectedBuf.length !== providedBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, providedBuf)
      ) {
        throw httpError(400, "Invalid payment signature");
      }
    } else {
      throw httpError(500, "Payment gateway is not configured. Cannot verify payment.");
    }

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw httpError(404, "Payment record not found");
    if (payment.userId !== userId) throw httpError(403, "Payment does not belong to this user");
    if (payment.status === "paid") throw httpError(400, "Payment already verified");

    let planLabel = payment.plan;
    try {
      planLabel = (await resolvePlanPrice(payment.plan)).label;
    } catch {
      /* fall back to raw plan value */
    }

    await prisma.payment.update({
      where: { orderId },
      data: { paymentId, signature, status: "paid" },
    });

    const now = new Date();
    const end = new Date(now);
    if (payment.plan === "pro_yearly") {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: planLabel.toLowerCase().replace(" ", "_"),
        razorpayCustomerId: paymentId,
        razorpaySubscriptionId: orderId,
        subscriptionStatus: "active",
        subscriptionEnd: end,
      },
    });

    // Record subscription + billing ledger (best-effort, non-blocking).
    try {
      const p = prisma as any;
      if (p.subscription) {
        await p.subscription.create({
          data: {
            userId,
            planCode: payment.plan,
            status: "active",
            price: (payment.amount || 0) / 100,
            currency: "INR",
            currentPeriodStart: now,
            currentPeriodEnd: end,
          },
        });
      }
      if (p.billing) {
        await p.billing.create({
          data: {
            userId,
            event: "subscription_activated",
            amount: (payment.amount || 0) / 100,
            currency: "INR",
            plan: payment.plan,
            status: "completed",
            reference: orderId,
          },
        });
      }
    } catch (ledgerErr) {
      console.warn("[verifyPayment] Failed to record subscription/billing ledger:", ledgerErr);
    }

    // Create notification and emit real-time event
    const userPrisma = await getUserPrisma(userId);
    const notif = await userPrisma.notification.create({
      data: {
        userId,
        type: "subscription",
        title: "Subscription Activated!",
        message: `Your ${planLabel} plan is now active${payment.plan === "pro_yearly" ? " for one year" : " until " + end.toLocaleDateString()}.`,
        link: "/premium",
      },
    });
    emitNotification(userId, notif);

    res.json({ success: true, message: "Payment verified and subscription activated" });
  } catch (error) {
    next(error);
  }
}

// ─── 3. Get Subscription Status ─────────────────────────────────

export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        razorpaySubscriptionId: true,
      },
    });

    if (!user) throw httpError(404, "User not found");

    const isActive = user.subscriptionStatus === "active" && user.subscriptionEnd && new Date(user.subscriptionEnd) > new Date();

    // Find the most recent paid payment that used a coupon, if any.
    let appliedCoupon: { code: string; discountPct: number } | null = null;
    const lastCouponPayment = await prisma.payment.findFirst({
      where: { userId, status: "paid", couponCode: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { couponCode: true, discountAmount: true },
    });
    if (lastCouponPayment?.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: lastCouponPayment.couponCode } });
      if (coupon) {
        appliedCoupon = { code: coupon.code, discountPct: coupon.discountPct };
      }
    }

    res.json({
      success: true,
      subscription: {
        plan: user.plan,
        status: isActive ? "active" : "inactive",
        endDate: user.subscriptionEnd,
        razorpaySubscriptionId: user.razorpaySubscriptionId,
        appliedCoupon,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 4. Get Invoices ─────────────────────────────────────────────

export async function getInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderId: true,
        paymentId: true,
        amount: true,
        discountAmount: true,
        couponCode: true,
        plan: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({ success: true, invoices: payments });
  } catch (error) {
    next(error);
  }
}

// ─── 4. Cancel Subscription ─────────────────────────────────────

export async function cancelSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw httpError(404, "User not found");
    if (user.subscriptionStatus !== "active") throw httpError(400, "No active subscription");

    // Cancel at Razorpay if subscription ID exists
    if (razorpay && user.razorpaySubscriptionId) {
      try {
        await razorpay.subscriptions.cancel(user.razorpaySubscriptionId);
      } catch {
        // subscription might not exist at Razorpay (one-time orders)
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: "cancelled",
        subscriptionEnd: new Date(),
      },
    });

    // Create notification and emit real-time event
    const userPrisma = await getUserPrisma(userId);
    const notif = await userPrisma.notification.create({
      data: {
        userId,
        type: "subscription",
        title: "Subscription Cancelled",
        message: "Your subscription has been cancelled. You'll lose access to premium features at the end of the billing period.",
        link: "/premium",
      },
    });
    emitNotification(userId, notif);

    res.json({ success: true, message: "Subscription cancelled" });
  } catch (error) {
    next(error);
  }
}

// ─── 6. Razorpay Webhook (server-to-server) ─────────────────────

export async function handleRazorpayWebhook(req: Request, res: Response) {
  try {
    const webhookSecret = env.razorpay.webhookSecret;
    if (!webhookSecret) {
      console.warn("[Webhook] RAZORPAY_WEBHOOK_SECRET not configured, ignoring webhook");
      return res.status(200).json({ received: true });
    }

    // Razorpay sends the raw body and X-Razorpay-Signature header
    const razorpaySignature = req.headers["x-razorpay-signature"] as string;
    if (!razorpaySignature) {
      return res.status(400).json({ error: "Missing signature" });
    }

    // The raw body is available as a string from express.raw() middleware.
    // We need to verify the HMAC signature.
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(400).json({ error: "Missing raw body" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpaySignature))) {
      console.warn("[Webhook] Invalid signature");
      return res.status(403).json({ error: "Invalid signature" });
    }

    const event = req.body;
    const eventType = event?.event;
    const payload = event?.payload;

    console.log(`[Webhook] Received event: ${eventType}`);

    switch (eventType) {
      case "payment.captured":
      case "payment.authorized": {
        const paymentEntity = payload?.payment?.entity;
        if (!paymentEntity) break;

        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;

        // Find the matching payment record
        const payment = await prisma.payment.findFirst({ where: { orderId } });
        if (!payment) {
          console.warn(`[Webhook] No payment record for order ${orderId}`);
          break;
        }

        if (payment.status !== "paid") {
          // Update payment record
          await prisma.payment.update({
            where: { orderId },
            data: { paymentId, status: "paid" },
          });

          // Activate subscription if not already
          const now = new Date();
          const end = new Date(now);
          if (payment.plan === "pro_yearly") {
            end.setFullYear(end.getFullYear() + 1);
          } else {
            end.setMonth(end.getMonth() + 1);
          }

          await prisma.user.update({
            where: { id: payment.userId },
            data: {
              plan: payment.plan,
              razorpayCustomerId: paymentId,
              razorpaySubscriptionId: orderId,
              subscriptionStatus: "active",
              subscriptionEnd: end,
            },
          });

          console.log(`[Webhook] Activated subscription for user ${payment.userId} via ${eventType}`);
        }
        break;
      }

      case "payment.failed": {
        const paymentEntity = payload?.payment?.entity;
        if (!paymentEntity) break;

        const orderId = paymentEntity.order_id;
        await prisma.payment.updateMany({
          where: { orderId, status: { not: "paid" } },
          data: { status: "failed" },
        });

        console.log(`[Webhook] Marked payment ${orderId} as failed`);
        break;
      }

      case "subscription.cancelled":
      case "subscription.paused": {
        const subEntity = payload?.subscription?.entity;
        if (!subEntity) break;

        // Find user by Razorpay subscription ID
        const user = await prisma.user.findFirst({
          where: { razorpaySubscriptionId: subEntity.id },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: "cancelled",
              subscriptionEnd: new Date(),
            },
          });
          console.log(`[Webhook] Cancelled subscription for user ${user.id}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    // Always return 200 to acknowledge receipt (Razorpay retries on non-200)
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    // Still return 200 to prevent infinite retries on processing errors
    res.status(200).json({ received: true });
  }
}

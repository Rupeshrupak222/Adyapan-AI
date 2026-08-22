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

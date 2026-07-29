import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getUserPrisma } from "../config/dynamicPrisma";
import { env } from "../config/env";
import { httpError } from "../utils/httpError";
import { emitNotification } from "../lib/notificationEmitter";
import Razorpay from "razorpay";
import crypto from "crypto";
import { requireUserId } from "../utils/request";

let razorpay: any = null;
try {
  if (env.razorpay.keyId && env.razorpay.keySecret) {
    razorpay = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  } else {
    console.warn("Razorpay credentials not set. Running in dummy payment mode.");
  }
} catch (e) {
  console.error("Failed to initialize Razorpay SDK:", e);
}

const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
  pro_monthly: { amount: 19900, label: "Pro Monthly" },
  pro_yearly: { amount: 199900, label: "Pro Yearly" },
};

// ─── 1. Create Order ─────────────────────────────────────────────

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const { plan } = req.body;
    if (!plan || !PLAN_PRICES[plan]) throw httpError(400, "Invalid plan. Choose pro_monthly or pro_yearly.");

    const { amount, label } = PLAN_PRICES[plan];

    const order = razorpay
      ? await razorpay.orders.create({
          amount,
          currency: "INR",
          receipt: `receipt_${userId}_${Date.now()}`,
          notes: { userId, plan, label },
        })
      : {
          id: `order_mock_${Math.random().toString(36).substring(7)}`,
          amount,
          currency: "INR",
          receipt: `receipt_${userId}_${Date.now()}`,
        };

    await prisma.payment.create({
      data: {
        userId,
        orderId: order.id,
        amount,
        currency: "INR",
        plan,
        status: "created",
      },
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
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

    const planKey = payment.plan as keyof typeof PLAN_PRICES;
    const planLabel = PLAN_PRICES[planKey]?.label ?? payment.plan;

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

    res.json({
      success: true,
      subscription: {
        plan: user.plan,
        status: isActive ? "active" : "inactive",
        endDate: user.subscriptionEnd,
        razorpaySubscriptionId: user.razorpaySubscriptionId,
      },
    });
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

// ─── 5. Plans List ──────────────────────────────────────────────

export async function listPlans(_req: Request, res: Response) {
  res.json({
    success: true,
    plans: Object.entries(PLAN_PRICES).map(([id, p]) => ({
      id,
      label: p.label,
      amount: p.amount,
      currency: "INR",
    })),
  });
}

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getUserPrisma } from "../config/dynamicPrisma";
import { httpError } from "../utils/httpError";
import { requireUserId } from "../utils/request";
import { emitNotification } from "../lib/notificationEmitter";
import { AiUsageService } from "../services/token-tracking.service";
import {
  getFeatureCatalog,
  buildUserFeatureMatrix,
  normalizePlanKind,
  getFeatureLimits,
} from "../services/feature-access.service";
import {
  activateSubscription,
  getActiveSubscription,
  checkAndExpire,
  requestCancellation,
  cancelImmediately,
  addPeriod,
  serializeSubscription,
  createTransaction,
  recordBillingEvent,
} from "../services/subscription.service";
import { createInvoiceRecord, listInvoices, getInvoice, generateInvoicePdf } from "../services/invoice.service";
import { getPaymentProvider, listConfiguredProviders } from "../services/payment-provider.service";
import { resolvePlanPrice } from "./plan.controller";
import { validateCoupon } from "./coupon.controller";

// ─── 1. Plans catalog (public) ────────────────────────────────────

export async function getPlansCatalog(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    const now = new Date();
    const coupons = await prisma.coupon
      .findMany({ where: { isActive: true, OR: [{ validUntil: null }, { validUntil: { gt: now } }] }, orderBy: { createdAt: "desc" } })
      .catch(() => []);

    res.json({
      success: true,
      plans: plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        features: Array.isArray(p.features) ? p.features : [],
        category: p.category,
        recommended: p.recommended,
        sortOrder: p.sortOrder,
        trialDays: p.trialDays,
        currency: "INR",
      })),
      coupons: coupons.map((c) => ({ code: c.code, discountPct: c.discountPct, validUntil: c.validUntil })),
      providers: listConfiguredProviders(),
    });
  } catch (error) {
    next(error);
  }
}

// ─── 2. Feature catalog (public) ──────────────────────────────────

export async function getFeaturesCatalog(_req: Request, res: Response, next: NextFunction) {
  try {
    const catalog = await getFeatureCatalog(true);
    res.json({ success: true, features: catalog });
  } catch (error) {
    next(error);
  }
}

// ─── 3. Subscription overview (usage dashboard) ───────────────────

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    // Auto-expire overdue subscriptions before returning state.
    await checkAndExpire(userId).catch(() => {});

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        razorpaySubscriptionId: true,
      },
    });
    if (!user) throw httpError(404, "User not found");

    const [activeSub, usage, invoices, paymentMethods, billingAddress] = await Promise.all([
      getActiveSubscription(userId),
      AiUsageService.getUsage(userId, user.plan, user.subscriptionStatus),
      listInvoices(userId),
      (prisma as any).paymentMethod.findMany({ where: { userId }, orderBy: { isDefault: "desc" } }).catch(() => []),
      (prisma as any).billingAddress.findUnique({ where: { userId } }).catch(() => null),
    ]);

    const planKind = normalizePlanKind(user.plan);
    const isActive = user.subscriptionStatus === "active" || user.subscriptionStatus === "cancel_at_period_end";
    const planLimits = await Promise.all(
      ["ai-requests", "resume-generate", "mock-interview", "ppt-generate", "notes-generate"].map(async (fk) => ({
        featureKey: fk,
        ...(await getFeatureLimits(fk, user.plan)),
      }))
    );

    res.json({
      success: true,
      subscription: {
        plan: user.plan,
        planKind,
        subscriptionStatus: user.subscriptionStatus,
        isActive,
        subscriptionEnd: user.subscriptionEnd,
        subscription: serializeSubscription(activeSub),
        nextBillingDate: activeSub?.currentPeriodEnd ?? user.subscriptionEnd ?? null,
        renewalAmount: activeSub?.price ?? null,
      },
      usage: usage
        ? {
            dailyTokensUsed: usage.dailyTokensUsed,
            dailyTokensLimit: usage.quota.dailyTokens,
            dailyTokensRemaining: usage.dailyTokensRemaining,
            dailyTokensPct: usage.dailyTokensPct,
            monthlyTokensUsed: usage.monthlyTokensUsed,
            monthlyTokensLimit: usage.quota.monthlyTokens,
            dailyRequestsUsed: usage.dailyRequests,
            dailyRequestsLimit: usage.quota.dailyRequests,
            dailyRequestsRemaining: usage.dailyRequestsRemaining,
            dailyRequestsPct: usage.dailyRequestsPct,
            monthlyRequestsUsed: usage.monthlyRequests,
            monthlyRequestsLimit: usage.quota.monthlyRequests,
            dailyResetAt: usage.dailyResetAt.toISOString(),
            monthlyResetAt: usage.monthlyResetAt.toISOString(),
          }
        : null,
      featureUsage: planLimits,
      invoices,
      paymentMethods: paymentMethods.map((pm: any) => ({
        id: pm.id,
        provider: pm.provider,
        type: pm.type,
        brand: pm.brand,
        last4: pm.last4,
        expiryMonth: pm.expiryMonth,
        expiryYear: pm.expiryYear,
        holderName: pm.holderName,
        email: pm.email,
        isDefault: pm.isDefault,
      })),
      billingAddress,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 4. Feature access matrix for current user ────────────────────

export async function getMyFeatureAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (!user) throw httpError(404, "User not found");

    const matrix = await buildUserFeatureMatrix(userId, user.plan);
    res.json({ success: true, plan: user.plan, features: matrix });
  } catch (error) {
    next(error);
  }
}

// ─── 5. Checkout / create order ───────────────────────────────────

export async function createCheckoutOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { plan, billingCycle, provider, couponCode } = req.body;

    if (typeof plan !== "string" || !plan.trim()) throw httpError(400, "Plan is required");
    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
    const providerName = String(provider || "").toLowerCase() || undefined;
    if (providerName && !["razorpay", "stripe", "paypal", "mock"].includes(providerName)) {
      throw httpError(400, "Unsupported payment provider");
    }

    if (plan === "free") throw httpError(400, "Free plan cannot be purchased");
    if (plan === "enterprise") {
      throw httpError(400, "Enterprise is a custom plan. Please contact sales@adyapan.ai to get started.");
    }

    const { amount, label } = await resolvePlanPrice(plan);

    // Coupon discount
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

    const gateway = getPaymentProvider(providerName);
    const receipt = `rcpt_${userId.slice(0, 8)}_${Date.now()}`;
    const order = await gateway.createOrder({
      userId,
      plan,
      billingCycle: cycle,
      amount: finalAmount,
      currency: "INR",
      receipt,
      description: `${label} ${cycle} subscription`,
    });

    await prisma.payment.create({
      data: {
        userId,
        orderId: order.providerOrderId,
        amount: finalAmount,
        currency: "INR",
        plan,
        billingCycle: cycle,
        provider: order.provider,
        couponCode: appliedCoupon,
        discountAmount,
        status: "created",
      },
    });

    if (appliedCoupon) {
      await prisma.coupon.updateMany({ where: { code: appliedCoupon }, data: { usedCount: { increment: 1 } } });
    }

    await createTransaction({
      userId,
      orderId: order.providerOrderId,
      type: "payment",
      provider: order.provider,
      providerRef: order.providerOrderId,
      amount: finalAmount,
      status: "pending",
      metadata: { plan, billingCycle: cycle, label },
    });

    res.json({
      success: true,
      order: {
        provider: order.provider,
        providerOrderId: order.providerOrderId,
        amount: order.amount,
        currency: order.currency,
        key: order.key,
        clientSecret: order.clientSecret,
        approvalUrl: order.approvalUrl,
        receipt,
      },
      coupon: appliedCoupon ? { code: appliedCoupon, discountAmount } : null,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 6. Verify payment + activate ─────────────────────────────────

export async function verifyAndActivate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { orderId, paymentId, signature, provider } = req.body;
    if (!orderId || !paymentId || !signature) {
      throw httpError(400, "Missing payment verification fields");
    }

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw httpError(404, "Payment record not found");
    if (payment.userId !== userId) throw httpError(403, "Payment does not belong to this user");
    if (payment.status === "paid") throw httpError(400, "Payment already verified");

    const gateway = getPaymentProvider(provider || payment.provider);
    const valid = await gateway.verifyPayment({ provider: gateway.name, orderId, paymentId, signature });
    if (!valid) throw httpError(400, "Payment verification failed");

    const planCode = payment.plan;
    const cycle: "monthly" | "yearly" = payment.billingCycle === "yearly" ? "yearly" : String(planCode).includes("yearly") ? "yearly" : "monthly";
    const now = new Date();
    const periodEnd = addPeriod(cycle, now);

    // Activate subscription + invoice
    await activateSubscription({
      userId,
      planCode,
      billingCycle: cycle,
      provider: gateway.name,
      providerSubscriptionId: payment.provider === "razorpay" ? orderId : null,
      price: (payment.amount || 0) / 100,
      periodStart: now,
      periodEnd,
      source: "purchase",
      paymentOrderId: orderId,
    });

    // Mark payment paid + create invoice
    await prisma.payment.update({ where: { orderId }, data: { paymentId, signature, status: "paid" } });
    await createInvoiceRecord({
      userId,
      plan: planCode,
      description: `${planCode} ${cycle} subscription`,
      amount: payment.amount || 0,
      paymentId: payment.id,
    });

    await createTransaction({
      userId,
      paymentId: payment.id,
      orderId,
      type: "payment",
      provider: gateway.name,
      providerRef: paymentId,
      amount: payment.amount || 0,
      status: "succeeded",
      metadata: { plan: planCode, billingCycle: cycle },
    });

    // Notification
    const userPrisma = await getUserPrisma(userId);
    const notif = await userPrisma.notification
      .create({
        data: {
          userId,
          type: "subscription",
          title: "Subscription Activated!",
          message: `Your ${planCode} ${cycle} plan is now active until ${periodEnd.toLocaleDateString()}.`,
          link: "/premium",
        },
      })
      .catch(() => null);
    if (notif) emitNotification(userId, notif);

    res.json({ success: true, message: "Payment verified and subscription activated", plan: planCode, expiresAt: periodEnd });
  } catch (error) {
    next(error);
  }
}

// ─── 7. Cancel / renew / change plan ──────────────────────────────

export async function cancelMySubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { immediate } = req.body;

    if (immediate) {
      const active = await cancelImmediately(userId);
      await recordBillingEvent({ userId, event: "subscription_cancelled_immediate", amount: 0, plan: active.planCode, reference: active.id });
      res.json({ success: true, message: "Subscription cancelled immediately", status: "cancelled" });
      return;
    }

    await requestCancellation(userId);
    res.json({ success: true, message: "Subscription will not renew. Access continues until the end of the billing period.", status: "cancel_at_period_end" });
  } catch (error) {
    next(error);
  }
}

export async function renewSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const active = await getActiveSubscription(userId);
    if (!active) throw httpError(400, "No active subscription to renew");
    if (active.autoRenew) throw httpError(400, "Subscription already set to auto-renew");

    await (prisma as any).subscription.update({
      where: { id: active.id },
      data: { autoRenew: true, cancellationRequestedAt: null },
    });
    await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: "active" } });

    res.json({ success: true, message: "Auto-renew enabled" });
  } catch (error) {
    next(error);
  }
}

export async function changeMyPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { plan, billingCycle, provider } = req.body;
    if (typeof plan !== "string" || !plan.trim()) throw httpError(400, "Plan is required");
    if (plan === "free") throw httpError(400, "Downgrade to free is handled through cancellation");
    if (plan === "enterprise") throw httpError(400, "Enterprise requires sales contact");

    const cycle: "monthly" | "yearly" = billingCycle === "yearly" ? "yearly" : "monthly";
    const { amount } = await resolvePlanPrice(plan);
    const gateway = getPaymentProvider(provider);
    const order = await gateway.createOrder({
      userId,
      plan,
      billingCycle: cycle,
      amount,
      currency: "INR",
      receipt: `rcpt_${userId.slice(0, 8)}_${Date.now()}`,
      description: `${plan} ${cycle} plan change`,
    });

    await prisma.payment.create({
      data: { userId, orderId: order.providerOrderId, amount, currency: "INR", plan, billingCycle: cycle, provider: gateway.name, status: "created" },
    });

    res.json({
      success: true,
      order: {
        provider: order.provider,
        providerOrderId: order.providerOrderId,
        amount: order.amount,
        currency: order.currency,
        key: order.key,
        clientSecret: order.clientSecret,
        approvalUrl: order.approvalUrl,
      },
      message: "Complete the payment to change your plan",
    });
  } catch (error) {
    next(error);
  }
}

// ─── 8. Invoices ──────────────────────────────────────────────────

export async function getMyInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const invoices = await listInvoices(userId);
    res.json({ success: true, invoices });
  } catch (error) {
    next(error);
  }
}

export async function downloadInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const invoiceNumber = req.params.invoiceNumber as string;
    const invoice = await getInvoice(userId, invoiceNumber);
    if (!invoice) throw httpError(404, "Invoice not found");

    const pdf = await generateInvoicePdf(invoice);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}

// ─── 9. Payment methods ───────────────────────────────────────────

export async function getPaymentMethods(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const methods = await (prisma as any).paymentMethod.findMany({ where: { userId }, orderBy: { isDefault: "desc" } });
    res.json({ success: true, paymentMethods: methods });
  } catch (error) {
    next(error);
  }
}

export async function addPaymentMethod(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { type, brand, last4, expiryMonth, expiryYear, holderName, email, providerToken, provider, isDefault } = req.body;

    if (typeof type !== "string" || !type.trim()) throw httpError(400, "Payment method type is required");

    if (isDefault) {
      await (prisma as any).paymentMethod.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const method = await (prisma as any).paymentMethod.create({
      data: {
        userId,
        provider: String(provider || "razorpay"),
        type,
        brand: brand ?? "",
        last4: last4 ?? null,
        expiryMonth: expiryMonth ?? null,
        expiryYear: expiryYear ?? null,
        holderName: holderName ?? null,
        email: email ?? null,
        providerToken: providerToken ?? null,
        isDefault: isDefault === true,
      },
    });

    res.json({ success: true, paymentMethod: method });
  } catch (error) {
    next(error);
  }
}

export async function deletePaymentMethod(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const id = req.params.id as string;
    const method = await (prisma as any).paymentMethod.findFirst({ where: { id, userId } });
    if (!method) throw httpError(404, "Payment method not found");

    await (prisma as any).paymentMethod.delete({ where: { id } });
    res.json({ success: true, message: "Payment method deleted" });
  } catch (error) {
    next(error);
  }
}

export async function setDefaultPaymentMethod(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const id = req.params.id as string;
    const method = await (prisma as any).paymentMethod.findFirst({ where: { id, userId } });
    if (!method) throw httpError(404, "Payment method not found");

    await (prisma as any).paymentMethod.updateMany({ where: { userId }, data: { isDefault: false } });
    await (prisma as any).paymentMethod.update({ where: { id }, data: { isDefault: true } });

    res.json({ success: true, message: "Default payment method updated" });
  } catch (error) {
    next(error);
  }
}

// ─── 10. Billing address ──────────────────────────────────────────

export async function getBillingAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const address = await (prisma as any).billingAddress.findUnique({ where: { userId } });
    res.json({ success: true, billingAddress: address });
  } catch (error) {
    next(error);
  }
}

export async function upsertBillingAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { name, email, phone, line1, line2, city, state, postalCode, country, gstin } = req.body;

    const address = await (prisma as any).billingAddress.upsert({
      where: { userId },
      update: {
        name: name ?? undefined,
        email: email ?? undefined,
        phone: phone ?? undefined,
        line1: line1 ?? undefined,
        line2: line2 ?? undefined,
        city: city ?? undefined,
        state: state ?? undefined,
        postalCode: postalCode ?? undefined,
        country: country ?? undefined,
        gstin: gstin ?? undefined,
      },
      create: {
        userId,
        name: name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        line1: line1 ?? null,
        line2: line2 ?? null,
        city: city ?? null,
        state: state ?? null,
        postalCode: postalCode ?? null,
        country: country ?? "IN",
        gstin: gstin ?? null,
      },
    });

    res.json({ success: true, billingAddress: address });
  } catch (error) {
    next(error);
  }
}

// ─── 11. Payment providers status ─────────────────────────────────

export async function getProviders(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, providers: listConfiguredProviders() });
  } catch (error) {
    next(error);
  }
}

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { httpError } from "../utils/httpError";
import { AdminAuditService } from "../services/admin-audit.service";
import { getFeatureCatalog } from "../services/feature-access.service";
import { activateSubscription, addPeriod, recordBillingEvent, createTransaction } from "../services/subscription.service";
import { normalizePlanKind } from "../services/feature-access.service";
import { getPaymentProvider } from "../services/payment-provider.service";

// ─── 1. Subscription analytics (MRR / ARR / churn / conversions) ──

export async function getSubscriptionAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Math.min(90, Math.max(7, parseInt((req.query.days as string) || "30", 10)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [subscriptions, payments, billingEvents, revenueReports, users, refundedPayments] = await Promise.all([
      (prisma as any).subscription.findMany({ where: { status: "active" } }).catch(() => []),
      (prisma as any).payment.findMany({ where: { status: "paid" } }).catch(() => []),
      (prisma as any).billing.findMany({ where: { createdAt: { gte: since } } }).catch(() => []),
      (prisma as any).revenueReport.findMany({ where: { date: { gte: since } }, orderBy: { date: "asc" } }).catch(() => []),
      prisma.user.findMany({ select: { plan: true, subscriptionStatus: true } }),
      (prisma as any).payment.findMany({ where: { refundStatus: { not: null } } }).catch(() => []),
    ]);

    // MRR / ARR
    let mrr = 0;
    const byPlan: Record<string, number> = {};
    for (const s of subscriptions) {
      const monthly = s.billingCycle === "yearly" ? Number(s.price || 0) / 12 : Number(s.price || 0);
      mrr += monthly;
      byPlan[s.planCode] = (byPlan[s.planCode] || 0) + 1;
    }

    const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) / 100;
    const refunded = refundedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) / 100;

    // New / churned within window
    const newSubs = await (prisma as any).subscription.count({ where: { createdAt: { gte: since } } }).catch(() => 0);
    const churned = await (prisma as any).subscription.count({
      where: { OR: [{ status: "expired", updatedAt: { gte: since } }, { status: "cancelled", updatedAt: { gte: since } }] },
    }).catch(() => 0);

    const activeUsers = users.filter((u: any) => u.subscriptionStatus === "active" || u.subscriptionStatus === "cancel_at_period_end").length;
    const churnRate = activeUsers + churned > 0 ? Math.round((churned / (activeUsers + churned)) * 1000) / 10 : 0;

    // Upgrade / downgrade events
    const upgrades = billingEvents.filter((e: any) => e.event === "plan_upgraded" || (e.event === "plan_changed" && String(e.reference || "").includes("up")));
    const downgrades = billingEvents.filter((e: any) => e.event === "plan_downgraded");
    const upgradeRate = billingEvents.length > 0 ? Math.round((upgrades.length / billingEvents.length) * 1000) / 10 : 0;
    const downgradeRate = billingEvents.length > 0 ? Math.round((downgrades.length / billingEvents.length) * 1000) / 10 : 0;

    const revenueSeries = revenueReports.map((r: any) => ({
      date: r.date,
      grossRevenue: r.grossRevenue,
      netRevenue: r.netRevenue,
      newSubscribers: r.newSubscribers,
      churnCount: r.churnCount,
    }));

    res.json({
      success: true,
      analytics: {
        periodDays: days,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        netRevenue: Math.round((totalRevenue - refunded) * 100) / 100,
        refunds: Math.round(refunded * 100) / 100,
        activeSubscriptions: subscriptions.length,
        activeUsers,
        newSubscribers: newSubs,
        churned,
        churnRate,
        upgradeRate,
        downgradeRate,
        freeUsers: users.filter((u: any) => normalizePlanKind(u.plan) === "free").length,
        premiumUsers: users.filter((u: any) => normalizePlanKind(u.plan) === "premium").length,
        enterpriseUsers: users.filter((u: any) => normalizePlanKind(u.plan) === "enterprise").length,
        subscribersByPlan: byPlan,
        revenueSeries,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 2. List subscriptions ────────────────────────────────────────

export async function listAllSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt((req.query.perPage as string) || "20", 10)));
    const status = req.query.status as string | undefined;
    const plan = req.query.plan as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (plan) where.planCode = plan;

    const [rows, total] = await Promise.all([
      (prisma as any).subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      (prisma as any).subscription.count({ where }),
    ]);

    // Attach user emails
    const userIds = Array.from(new Set<string>((rows as any[]).map((r: any) => String(r.userId))));
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    res.json({
      success: true,
      subscriptions: rows.map((r: any) => ({
        ...r,
        currentPeriodStart: undefined,
        user: userMap.get(r.userId) || null,
      })),
      pagination: { page, perPage, total, pages: Math.ceil(total / perPage) },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 3. Transactions ──────────────────────────────────────────────

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt((req.query.perPage as string) || "20", 10)));
    const type = req.query.type as string | undefined;

    const where: any = {};
    if (type) where.type = type;

    const [rows, total] = await Promise.all([
      (prisma as any).transaction.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }),
      (prisma as any).transaction.count({ where }),
    ]);

    const userIds = Array.from(new Set<string>((rows as any[]).map((r: any) => String(r.userId))));
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    res.json({
      success: true,
      transactions: rows.map((r: any) => ({ ...r, user: userMap.get(r.userId) || null })),
      pagination: { page, perPage, total, pages: Math.ceil(total / perPage) },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 4. Refund a payment ──────────────────────────────────────────

export async function refundPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const paymentId = req.params.id as string;
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw httpError(404, "Payment not found");
    if (payment.status !== "paid") throw httpError(400, "Only paid payments can be refunded");
    if (payment.refundStatus) throw httpError(400, "Payment already refunded");

    const gateway = getPaymentProvider(payment.provider);
    let refundId = `refund_${payment.id.slice(0, 8)}`;
    let refundStatus = "refunded";
    try {
      const refund = await gateway.refund({
        provider: gateway.name,
        providerPaymentId: payment.paymentId || payment.orderId,
        amount: payment.amount || 0,
        notes: "Admin refund",
      });
      refundId = refund.refundId;
      refundStatus = refund.status;
    } catch (e: any) {
      // Mock / unconfigured gateway — record locally anyway.
      console.warn("[admin] refund via provider failed, recording locally:", e?.message);
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { refundId, refundStatus, refundedAt: new Date(), status: "refunded" },
    });

    await createTransaction({
      userId: payment.userId,
      paymentId: payment.id,
      type: "refund",
      provider: payment.provider,
      providerRef: refundId,
      amount: -(payment.amount || 0),
      status: "refunded",
      metadata: { originalOrderId: payment.orderId },
    });

    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Payment Refunded",
      module: "Billing",
      targetId: payment.id,
      details: { amount: payment.amount, plan: payment.plan },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "Payment refunded", refund: { id: refundId, status: refundStatus } });
  } catch (error) {
    next(error);
  }
}

// ─── 5. Feature access management ─────────────────────────────────

export async function getFeatureAccessAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const [features, limits] = await Promise.all([
      (prisma as any).featureAccess.findMany({ orderBy: [{ category: "asc" }, { featureKey: "asc" }] }),
      (prisma as any).usageLimit.findMany(),
    ]);
    res.json({ success: true, features, usageLimits: limits });
  } catch (error) {
    next(error);
  }
}

export async function updateFeatureAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { requiredPlan, gated, name, description, category, routePattern } = req.body;

    const feature = await (prisma as any).featureAccess.findUnique({ where: { id } });
    if (!feature) throw httpError(404, "Feature not found");

    const data: any = {};
    if (requiredPlan != null) {
      const kind = normalizePlanKind(requiredPlan);
      data.requiredPlan = kind;
    }
    if (gated != null) data.gated = Boolean(gated);
    if (name != null) data.name = name;
    if (description != null) data.description = description;
    if (category != null) data.category = category;
    if (routePattern != null) data.routePattern = routePattern;

    const updated = await (prisma as any).featureAccess.update({ where: { id }, data });

    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Feature Access Updated",
      module: "Billing",
      targetId: updated.id,
      details: { featureKey: updated.featureKey, requiredPlan: updated.requiredPlan, gated: updated.gated },
      ipAddress: req.ip,
    });

    res.json({ success: true, feature: updated });
  } catch (error) {
    next(error);
  }
}

// ─── 6. Usage limits management ───────────────────────────────────

export async function updateUsageLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { dailyLimit, monthlyLimit, tokenLimit, storageMb, enabled } = req.body;

    const existing = await (prisma as any).usageLimit.findUnique({ where: { id } });
    if (!existing) throw httpError(404, "Usage limit not found");

    const data: any = {};
    if (dailyLimit !== undefined) data.dailyLimit = dailyLimit == null || dailyLimit === "" ? null : Math.max(0, Math.floor(Number(dailyLimit)));
    if (monthlyLimit !== undefined) data.monthlyLimit = monthlyLimit == null || monthlyLimit === "" ? null : Math.max(0, Math.floor(Number(monthlyLimit)));
    if (tokenLimit !== undefined) data.tokenLimit = tokenLimit == null || tokenLimit === "" ? null : Math.max(0, Math.floor(Number(tokenLimit)));
    if (storageMb !== undefined) data.storageMb = storageMb == null || storageMb === "" ? null : Math.max(0, Number(storageMb));
    if (enabled !== undefined) data.enabled = Boolean(enabled);

    const updated = await (prisma as any).usageLimit.update({ where: { id }, data });

    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Usage Limit Updated",
      module: "Billing",
      targetId: updated.id,
      details: { featureKey: updated.featureKey, planCode: updated.planCode, dailyLimit: updated.dailyLimit },
      ipAddress: req.ip,
    });

    res.json({ success: true, usageLimit: updated });
  } catch (error) {
    next(error);
  }
}

export async function createUsageLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const { featureKey, planCode, dailyLimit, monthlyLimit, tokenLimit, storageMb, enabled } = req.body;
    if (typeof featureKey !== "string" || !featureKey.trim()) throw httpError(400, "featureKey is required");
    if (typeof planCode !== "string" || !planCode.trim()) throw httpError(400, "planCode is required");

    const existing = await (prisma as any).usageLimit.findUnique({
      where: { featureKey_planCode: { featureKey, planCode } },
    });
    if (existing) throw httpError(409, "Usage limit already exists for this feature/plan");

    const created = await (prisma as any).usageLimit.create({
      data: {
        featureKey,
        planCode,
        dailyLimit: dailyLimit == null || dailyLimit === "" ? null : Math.max(0, Math.floor(Number(dailyLimit))),
        monthlyLimit: monthlyLimit == null || monthlyLimit === "" ? null : Math.max(0, Math.floor(Number(monthlyLimit))),
        tokenLimit: tokenLimit == null || tokenLimit === "" ? null : Math.max(0, Math.floor(Number(tokenLimit))),
        storageMb: storageMb == null || storageMb === "" ? null : Math.max(0, Number(storageMb)),
        enabled: enabled !== false,
      },
    });

    res.json({ success: true, usageLimit: created });
  } catch (error) {
    next(error);
  }
}

export async function deleteUsageLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const existing = await (prisma as any).usageLimit.findUnique({ where: { id } });
    if (!existing) throw httpError(404, "Usage limit not found");
    await (prisma as any).usageLimit.delete({ where: { id } });
    res.json({ success: true, message: "Usage limit deleted" });
  } catch (error) {
    next(error);
  }
}

// ─── 7. Grant enterprise / manual plan ────────────────────────────

export async function grantPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const { plan, billingCycle, durationDays } = req.body;

    if (typeof plan !== "string" || !plan.trim()) throw httpError(400, "Plan is required");
    if (!["enterprise", "pro_monthly", "pro_yearly", "free"].includes(plan)) {
      throw httpError(400, "Unsupported plan");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw httpError(404, "User not found");

    const now = new Date();
    const days = Math.min(3650, Math.max(1, Math.floor(Number(durationDays) || 30)));
    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const cycle: "monthly" | "yearly" = plan === "pro_yearly" ? "yearly" : String(billingCycle || "monthly") === "yearly" ? "yearly" : "monthly";

    if (plan === "free") {
      await prisma.user.update({ where: { id: userId }, data: { plan: "free", subscriptionStatus: "cancelled", subscriptionEnd: null } });
      res.json({ success: true, message: "User set to Free plan" });
      return;
    }

    await activateSubscription({
      userId,
      planCode: plan,
      billingCycle: cycle,
      provider: "admin",
      price: 0,
      periodStart: now,
      periodEnd,
      source: "admin",
    });

    await recordBillingEvent({ userId, event: "admin_grant", amount: 0, plan, reference: userId });

    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Plan Granted",
      module: "Billing",
      targetId: userId,
      details: { plan, durationDays: days },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Granted ${plan} for ${days} days`, expiresAt: periodEnd });
  } catch (error) {
    next(error);
  }
}

// ─── 8. Refresh feature catalog cache ─────────────────────────────

export async function refreshFeatureCatalog(_req: Request, res: Response, next: NextFunction) {
  try {
    await getFeatureCatalog(true);
    res.json({ success: true, message: "Feature catalog cache refreshed" });
  } catch (error) {
    next(error);
  }
}

export { getPaymentProvider };

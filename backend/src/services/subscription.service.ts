import { prisma } from "../config/prisma";
import { httpError } from "../utils/httpError";

// ─── Types ────────────────────────────────────────────────────────

export type BillingCycle = "monthly" | "yearly";

export interface ActivateSubscriptionParams {
  userId: string;
  planCode: string;
  planId?: string | null;
  billingCycle: BillingCycle;
  provider: string;
  providerSubscriptionId?: string | null;
  price: number; // in rupees (decimal)
  currency?: string;
  periodStart: Date;
  periodEnd: Date;
  autoRenew?: boolean;
  source?: "purchase" | "renewal" | "upgrade" | "downgrade" | "admin";
  paymentOrderId?: string | null;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────

export function addPeriod(cycle: BillingCycle, from: Date = new Date()): Date {
  return new Date(from.getTime() + (cycle === "yearly" ? YEAR_MS : MONTH_MS));
}

export function nextBillingDate(planCode: string, from: Date = new Date()): Date {
  const cycle: BillingCycle = String(planCode).includes("yearly") ? "yearly" : "monthly";
  return addPeriod(cycle, from);
}

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ADY-${year}-`;
  const last = await (prisma as any).invoice
    .findFirst({ where: { invoiceNumber: { startsWith: prefix } }, orderBy: { invoiceNumber: "desc" }, select: { invoiceNumber: true } })
    .catch(() => null);
  let seq = 1;
  if (last?.invoiceNumber) {
    const m = String(last.invoiceNumber).match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(6, "0")}`;
}

export async function recordBillingEvent(params: {
  userId: string;
  event: string;
  amount: number;
  plan?: string | null;
  reference?: string | null;
}) {
  await (prisma as any).billing
    .create({
      data: {
        userId: params.userId,
        event: params.event,
        amount: params.amount,
        currency: "INR",
        plan: params.plan ?? null,
        status: "completed",
        reference: params.reference ?? null,
      },
    })
    .catch(() => null);
}

export async function createTransaction(params: {
  userId: string;
  paymentId?: string | null;
  orderId?: string | null;
  type: string;
  provider: string;
  providerRef?: string | null;
  amount: number; // paise
  status?: string;
  metadata?: Record<string, unknown>;
}) {
  await (prisma as any).transaction
    .create({
      data: {
        userId: params.userId,
        paymentId: params.paymentId ?? null,
        orderId: params.orderId ?? null,
        type: params.type,
        provider: params.provider,
        providerRef: params.providerRef ?? null,
        amount: params.amount,
        currency: "INR",
        status: params.status ?? "pending",
        metadata: params.metadata ?? {},
      },
    })
    .catch(() => null);
}

export async function createInvoice(params: {
  userId: string;
  plan: string;
  description: string;
  amount: number; // paise
  taxAmount?: number;
  paymentId?: string | null;
  subscriptionId?: string | null;
}) {
  const invoiceNumber = await generateInvoiceNumber();
  await (prisma as any).invoice
    .create({
      data: {
        userId: params.userId,
        invoiceNumber,
        paymentId: params.paymentId ?? null,
        subscriptionId: params.subscriptionId ?? null,
        plan: params.plan,
        description: params.description,
        amount: params.amount,
        taxAmount: params.taxAmount ?? 0,
        currency: "INR",
        status: "paid",
        issuedAt: new Date(),
        paidAt: new Date(),
      },
    })
    .catch(() => null);
  return invoiceNumber;
}

// ─── Core lifecycle ───────────────────────────────────────────────

export async function getActiveSubscription(userId: string) {
  return (prisma as any).subscription
    .findFirst({
      where: { userId, status: { in: ["active", "past_due"] } },
      orderBy: { currentPeriodEnd: "desc" },
    })
    .catch(() => null);
}

/** Marks an overdue subscription expired and downgrades the user to free. */
export async function checkAndExpire(userId: string): Promise<boolean> {
  const now = new Date();
  const active = await getActiveSubscription(userId);
  if (!active) return false;

  if (active.autoRenew && active.currentPeriodEnd > now) return false;

  if (active.currentPeriodEnd <= now) {
    await (prisma as any).subscription
      .update({
        where: { id: active.id },
        data: { status: "expired", endedAt: now },
      })
      .catch(() => null);

    await prisma.user
      .update({
        where: { id: userId },
        data: { plan: "free", subscriptionStatus: "expired", subscriptionEnd: null },
      })
      .catch(() => null);

    await recordBillingEvent({
      userId,
      event: "subscription_expired",
      amount: 0,
      plan: active.planCode,
      reference: active.id,
    });
    return true;
  }

  // Cancellation requested but period hasn't ended yet — keep premium.
  if (active.cancellationRequestedAt && !active.canceledAt) {
    return false;
  }

  return false;
}

/**
 * Core activation: updates the user row, creates/updates the subscription
 * row, records billing events and creates an invoice for purchases.
 */
export async function activateSubscription(params: ActivateSubscriptionParams) {
  const { userId } = params;
  const price = Math.round(Number(params.price || 0) * 100);
  const currency = params.currency || "INR";

  // Expire any previous overdue subscription first.
  await checkAndExpire(userId).catch(() => {});

  // Deactivate existing active subscriptions (single active sub per user).
  await (prisma as any).subscription
    .updateMany({
      where: { userId, status: { in: ["active", "past_due"] } },
      data: { status: "superseded", endedAt: params.periodStart },
    })
    .catch(() => null);

  const subscription = await (prisma as any).subscription
    .create({
      data: {
        userId,
        planId: params.planId ?? null,
        planCode: params.planCode,
        billingCycle: params.billingCycle,
        status: "active",
        provider: params.provider,
        providerSubscriptionId: params.providerSubscriptionId ?? null,
        price: price / 100,
        currency,
        autoRenew: params.autoRenew !== false,
        currentPeriodStart: params.periodStart,
        currentPeriodEnd: params.periodEnd,
      },
    })
    .catch(() => null);

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: params.planCode,
      subscriptionStatus: "active",
      subscriptionEnd: params.periodEnd,
    },
  });

  await recordBillingEvent({
    userId,
    event: params.source === "renewal" ? "subscription_renewed" : params.source === "upgrade" || params.source === "downgrade" ? "plan_changed" : "subscription_activated",
    amount: price / 100,
    plan: params.planCode,
    reference: params.paymentOrderId ?? subscription?.id ?? null,
  });

  let invoiceNumber: string | null = null;
  if (price > 0) {
    invoiceNumber = await createInvoice({
      userId,
      plan: params.planCode,
      description: `Adyapan AI ${params.planCode} ${params.billingCycle} subscription`,
      amount: price,
      paymentId: params.paymentOrderId ?? null,
      subscriptionId: subscription?.id ?? null,
    });
  }

  return { subscription, invoiceNumber };
}

/** Cancel at period end (retain premium until currentPeriodEnd). */
export async function requestCancellation(userId: string) {
  const active = await getActiveSubscription(userId);
  if (!active) throw httpError(400, "No active subscription");

  await (prisma as any).subscription.update({
    where: { id: active.id },
    data: { autoRenew: false, cancellationRequestedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: "cancel_at_period_end" },
  });

  await recordBillingEvent({ userId, event: "cancel_requested", amount: 0, plan: active.planCode, reference: active.id });
  return active;
}

/** Cancel immediately — drops premium access right away. */
export async function cancelImmediately(userId: string) {
  const active = await getActiveSubscription(userId);
  if (!active) throw httpError(400, "No active subscription");

  const now = new Date();
  await (prisma as any).subscription.update({
    where: { id: active.id },
    data: { status: "cancelled", autoRenew: false, canceledAt: now, endedAt: now },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { plan: "free", subscriptionStatus: "cancelled", subscriptionEnd: null },
  });

  await recordBillingEvent({ userId, event: "subscription_cancelled", amount: 0, plan: active.planCode, reference: active.id });
  return active;
}

/** Change plan (upgrade/downgrade) starting a fresh billing period. */
export async function changePlan(userId: string, newPlanCode: string, billingCycle: BillingCycle, price: number, provider = "razorpay") {
  const now = new Date();
  const periodEnd = addPeriod(billingCycle, now);

  const result = await activateSubscription({
    userId,
    planCode: newPlanCode,
    billingCycle,
    provider,
    price,
    periodStart: now,
    periodEnd,
    source: "upgrade",
  });

  await recordBillingEvent({
    userId,
    event: "plan_changed",
    amount: price,
    plan: newPlanCode,
    reference: result.subscription?.id ?? null,
  });

  return result;
}

/** Serialize a subscription row for API responses. */
export function serializeSubscription(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    planCode: row.planCode,
    planId: row.planId,
    billingCycle: row.billingCycle,
    status: row.status,
    provider: row.provider,
    price: row.price,
    currency: row.currency,
    autoRenew: row.autoRenew,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancellationRequestedAt: row.cancellationRequestedAt,
    canceledAt: row.canceledAt,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
  };
}

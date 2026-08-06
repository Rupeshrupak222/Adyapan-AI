import { env } from "../config/env";
import { httpError } from "../utils/httpError";

// ─── Types ────────────────────────────────────────────────────────

export type PaymentProviderName = "razorpay" | "stripe" | "paypal" | "mock";

export interface CreateOrderInput {
  userId: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
  amount: number; // smallest currency unit (paise / cents)
  currency: string;
  receipt: string;
  description?: string;
  customer?: { name?: string; email?: string };
}

export interface CreateOrderResult {
  provider: PaymentProviderName;
  providerOrderId: string; // provider-side order / payment intent id
  amount: number;
  currency: string;
  key?: string; // Razorpay keyId for the checkout widget
  clientSecret?: string;
  approvalUrl?: string;
}

export interface VerifyPaymentInput {
  provider: PaymentProviderName;
  orderId: string; // provider order id
  paymentId: string;
  signature: string;
}

export interface RefundInput {
  provider: PaymentProviderName;
  providerPaymentId: string;
  amount: number; // smallest unit
  currency?: string;
  notes?: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  readonly configured: boolean;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<boolean>;
  cancelSubscription(providerSubscriptionId: string): Promise<boolean>;
  refund(input: RefundInput): Promise<{ refundId: string; status: string }>;
}

// ─── Razorpay provider ─────────────────────────────────────────────

let razorpay: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Razorpay = require("razorpay").default ?? require("razorpay");
  if (env.razorpay.keyId && env.razorpay.keySecret) {
    razorpay = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  }
} catch (e) {
  console.warn("[payment-provider] Razorpay SDK init failed:", e);
}

const crypto = require("crypto") as typeof import("crypto");

class RazorpayProvider implements PaymentProvider {
  readonly name = "razorpay" as const;
  get configured() {
    return Boolean(env.razorpay.keyId && env.razorpay.keySecret && razorpay);
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    if (!this.configured) throw httpError(503, "Razorpay is not configured");
    const order = await razorpay.orders.create({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: { userId: input.userId, plan: input.plan, billingCycle: input.billingCycle },
    });
    return {
      provider: "razorpay",
      providerOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: env.razorpay.keyId,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    if (!env.razorpay.keySecret) throw httpError(503, "Razorpay is not configured");
    const expected = crypto
      .createHmac("sha256", env.razorpay.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(String(input.signature));
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    if (!this.configured || !providerSubscriptionId) return false;
    try {
      await razorpay.subscriptions.cancel(providerSubscriptionId);
      return true;
    } catch {
      return false;
    }
  }

  async refund(input: RefundInput): Promise<{ refundId: string; status: string }> {
    if (!this.configured) throw httpError(503, "Razorpay is not configured");
    const r = await razorpay.payments.refund(input.providerPaymentId, {
      amount: input.amount,
      notes: { reason: input.notes || "Admin refund" },
    });
    return { refundId: r.id, status: r.status || "refunded" };
  }
}

// ─── Stripe provider (stub — activates when STRIPE_SECRET_KEY is set) ─────

class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  get configured() {
    return Boolean(env.stripe.secretKey);
  }

  private client(): any {
    if (!this.configured) throw httpError(503, "Stripe is not configured");
    // Lazy-load so the dependency is optional at runtime.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Stripe = require("stripe");
      return new Stripe(env.stripe.secretKey);
    } catch {
      throw httpError(503, "Stripe SDK is not installed");
    }
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const stripe = this.client();
    const intent = await stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency.toLowerCase(),
      description: input.description || `Adyapan AI ${input.plan}`,
      metadata: { userId: input.userId, plan: input.plan, billingCycle: input.billingCycle },
    });
    return {
      provider: "stripe",
      providerOrderId: intent.id,
      amount: input.amount,
      currency: input.currency,
      clientSecret: intent.client_secret,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    // `signature` doubles as the PaymentIntent id on stripe flows.
    const stripe = this.client();
    const intent = await stripe.paymentIntents.retrieve(input.paymentId);
    return intent?.status === "succeeded";
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    const stripe = this.client();
    try {
      await stripe.subscriptions.cancel(providerSubscriptionId);
      return true;
    } catch {
      return false;
    }
  }

  async refund(input: RefundInput): Promise<{ refundId: string; status: string }> {
    const stripe = this.client();
    const r = await stripe.refunds.create({ payment_intent: input.providerPaymentId, amount: input.amount });
    return { refundId: r.id, status: r.status };
  }
}

// ─── PayPal provider (stub — activates when PAYPAL_CLIENT_ID is set) ──────

class PayPalProvider implements PaymentProvider {
  readonly name = "paypal" as const;
  get configured() {
    return Boolean(env.paypal.clientId && env.paypal.clientSecret);
  }

  private baseUrl() {
    return env.paypal.mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  }

  private async accessToken(): Promise<string> {
    if (!this.configured) throw httpError(503, "PayPal is not configured");
    const auth = Buffer.from(`${env.paypal.clientId}:${env.paypal.clientSecret}`).toString("base64");
    const res = await fetch(`${this.baseUrl()}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw httpError(502, "Failed to obtain PayPal access token");
    const data: any = await res.json();
    return data.access_token;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const token = await this.accessToken();
    const amountInCurrency = input.amount / 100;
    const res = await fetch(`${this.baseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.receipt,
            description: input.description || `Adyapan AI ${input.plan}`,
            amount: { currency_code: input.currency, value: amountInCurrency.toFixed(2) },
          },
        ],
      }),
    });
    const data: any = await res.json();
    if (!res.ok) throw httpError(502, data?.message || "PayPal order creation failed");
    const approval = (data.links || []).find((l: any) => l.rel === "approve");
    return {
      provider: "paypal",
      providerOrderId: data.id,
      amount: input.amount,
      currency: input.currency,
      approvalUrl: approval?.href,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    const token = await this.accessToken();
    const res = await fetch(`${this.baseUrl()}/v2/checkout/orders/${input.paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: any = await res.json();
    return data?.status === "COMPLETED" || data?.status === "APPROVED";
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<boolean> {
    return false; // PayPal billing plans cancellation requires subscription id from capture
  }

  async refund(input: RefundInput): Promise<{ refundId: string; status: string }> {
    const token = await this.accessToken();
    const amountInCurrency = input.amount / 100;
    const res = await fetch(`${this.baseUrl()}/v2/payments/captures/${input.providerPaymentId}/refund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: { value: amountInCurrency.toFixed(2), currency_code: input.currency || "INR" } }),
    });
    const data: any = await res.json();
    if (!res.ok) throw httpError(502, data?.message || "PayPal refund failed");
    return { refundId: data.id, status: data.status || "COMPLETED" };
  }
}

// ─── Mock provider (no external gateway configured) ────────────────

class MockProvider implements PaymentProvider {
  readonly name = "mock" as const;
  get configured() {
    return true;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    return {
      provider: "mock",
      providerOrderId: `order_mock_${Math.random().toString(36).slice(2, 10)}`,
      amount: input.amount,
      currency: input.currency,
    };
  }

  async verifyPayment(): Promise<boolean> {
    return true;
  }

  async cancelSubscription(): Promise<boolean> {
    return true;
  }

  async refund(input: RefundInput): Promise<{ refundId: string; status: string }> {
    return { refundId: `refund_mock_${Math.random().toString(36).slice(2, 10)}`, status: "refunded" };
  }
}

// ─── Registry ──────────────────────────────────────────────────────

const providers: Record<string, PaymentProvider> = {
  razorpay: new RazorpayProvider(),
  stripe: new StripeProvider(),
  paypal: new PayPalProvider(),
  mock: new MockProvider(),
};

/**
 * Resolve a provider. When the requested provider is unavailable it falls
 * back in the order: razorpay → mock. This keeps the app usable in local
 * dev (no gateway keys) while preferring real gateways in production.
 */
export function getPaymentProvider(name?: string): PaymentProvider {
  const requested = String(name || "").toLowerCase();
  if (requested && providers[requested]) {
    if (providers[requested].configured) return providers[requested];
  }
  if (providers.razorpay.configured) return providers.razorpay;
  return providers.mock;
}

export function listConfiguredProviders(): Array<{ provider: PaymentProviderName; configured: boolean }> {
  return Object.values(providers).map((p) => ({ provider: p.name, configured: p.configured }));
}

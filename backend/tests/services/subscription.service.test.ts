import {
  addPeriod,
  nextBillingDate,
  generateInvoiceNumber,
  serializeSubscription,
  checkAndExpire,
  activateSubscription,
  requestCancellation,
  cancelImmediately,
  changePlan,
} from "../../src/services/subscription.service";
import { prisma } from "../../src/config/prisma";

jest.mock("../../src/config/prisma", () => ({
  prisma: {
    user: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn() },
    subscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({ id: "sub-1", ...(args?.data || {}) })
      ),
    },
    invoice: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ invoiceNumber: "ADY-X" }),
    },
    billing: { create: jest.fn().mockResolvedValue({}) },
    transaction: { create: jest.fn().mockResolvedValue({}) },
  },
}));

const mockSubscription = prisma.subscription as jest.Mocked<typeof prisma.subscription>;
const mockInvoice = prisma.invoice as jest.Mocked<typeof prisma.invoice>;
const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;

function makeSub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    userId: "user-1",
    planCode: "pro_monthly",
    billingCycle: "monthly",
    status: "active",
    provider: "razorpay",
    price: 199,
    currency: "INR",
    autoRenew: true,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancellationRequestedAt: null,
    canceledAt: null,
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInvoice.findFirst.mockResolvedValue(null as never);
  mockInvoice.create.mockResolvedValue({ invoiceNumber: "ADY-X" } as never);
  mockSubscription.findFirst.mockResolvedValue(null as never);
  mockSubscription.updateMany.mockResolvedValue({ count: 0 } as never);
  mockSubscription.update.mockResolvedValue({} as never);
  mockUser.update.mockResolvedValue({} as never);
});

describe("addPeriod", () => {
  it("adds ~1 month for a monthly cycle", () => {
    const from = new Date("2026-01-15T00:00:00Z");
    const next = addPeriod("monthly", from);
    expect(next.getTime() - from.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("adds ~1 year for a yearly cycle", () => {
    const from = new Date("2026-01-15T00:00:00Z");
    const next = addPeriod("yearly", from);
    expect(next.getTime() - from.getTime()).toBe(365 * 24 * 60 * 60 * 1000);
  });
});

describe("nextBillingDate", () => {
  it("uses yearly cycle when the plan code contains yearly", () => {
    const from = new Date("2026-01-15T00:00:00Z");
    expect(nextBillingDate("pro_yearly", from).getFullYear()).toBe(2027);
  });

  it("uses monthly cycle otherwise", () => {
    const from = new Date("2026-01-15T00:00:00Z");
    const next = nextBillingDate("pro_monthly", from);
    expect(next.getTime() - from.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("generateInvoiceNumber", () => {
  beforeEach(() => jest.clearAllMocks());

  it("starts at 000001 when no prior invoice exists", async () => {
    mockInvoice.findFirst.mockResolvedValue(null as never);
    const num = await generateInvoiceNumber();
    expect(num).toBe(`ADY-${new Date().getFullYear()}-000001`);
  });

  it("increments the last sequence number", async () => {
    mockInvoice.findFirst.mockResolvedValue({
      invoiceNumber: `ADY-${new Date().getFullYear()}-000042`,
    } as never);
    const num = await generateInvoiceNumber();
    expect(num).toBe(`ADY-${new Date().getFullYear()}-000043`);
  });
});

describe("serializeSubscription", () => {
  it("returns null for falsy input", () => {
    expect(serializeSubscription(null)).toBeNull();
    expect(serializeSubscription(undefined)).toBeNull();
  });

  it("maps snake_case-ish prisma row to API shape", () => {
    const row = makeSub();
    const out = serializeSubscription(row);
    expect(out).toMatchObject({
      id: "sub-1",
      planCode: "pro_monthly",
      billingCycle: "monthly",
      status: "active",
      price: 199,
      autoRenew: true,
    });
    expect(out).toHaveProperty("currentPeriodEnd");
    expect(out).toHaveProperty("createdAt");
  });
});

describe("checkAndExpire", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns false when an active auto-renew sub is within its period", async () => {
    mockSubscription.findFirst.mockResolvedValue(makeSub() as never);
    const result = await checkAndExpire("user-1");
    expect(result).toBe(false);
    expect(mockSubscription.update).not.toHaveBeenCalled();
  });

  it("expires an overdue subscription and downgrades the user to free", async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    mockSubscription.findFirst.mockResolvedValue(
      makeSub({ currentPeriodEnd: past }) as never
    );
    mockUser.update.mockResolvedValue({} as never);

    const result = await checkAndExpire("user-1");

    expect(result).toBe(true);
    expect(mockSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "expired" }) })
    );
    expect(mockUser.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "free", subscriptionStatus: "expired", subscriptionEnd: null },
    });
  });

  it("keeps a cancellation-requested subscription active until period end", async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10);
    mockSubscription.findFirst.mockResolvedValue(
      makeSub({ autoRenew: false, cancellationRequestedAt: new Date(), currentPeriodEnd: future }) as never
    );
    const result = await checkAndExpire("user-1");
    expect(result).toBe(false);
    expect(mockSubscription.update).not.toHaveBeenCalled();
  });
});

describe("activateSubscription", () => {
  beforeEach(() => jest.clearAllMocks());

  const base = {
    userId: "user-1",
    planCode: "pro_monthly",
    billingCycle: "monthly" as const,
    provider: "razorpay",
    price: 199,
    periodStart: new Date("2026-01-01T00:00:00Z"),
    periodEnd: new Date("2026-02-01T00:00:00Z"),
  };

  it("creates a subscription, updates the user and records a billing event", async () => {
    mockSubscription.findFirst.mockResolvedValue(null as never);
    mockSubscription.updateMany.mockResolvedValue({ count: 0 } as never);
    mockSubscription.create.mockImplementation(((args: any) =>
      Promise.resolve({ id: "sub-1", ...args.data })) as never);
    mockUser.update.mockResolvedValue({} as never);
    mockInvoice.create.mockResolvedValue({ invoiceNumber: "ADY-X" } as never);

    const result = await activateSubscription(base);

    expect(mockSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          planCode: "pro_monthly",
          status: "active",
          price: 199,
        }),
      })
    );
    expect(mockUser.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ plan: "pro_monthly", subscriptionStatus: "active" }),
    });
    expect(result.subscription?.id).toBe("sub-1");
  });

  it("creates an invoice for a paid subscription", async () => {
    mockSubscription.findFirst.mockResolvedValue(null as never);
    mockSubscription.updateMany.mockResolvedValue({ count: 0 } as never);
    mockSubscription.create.mockImplementation(((args: any) =>
      Promise.resolve({ id: "sub-1", ...args.data })) as never);
    mockUser.update.mockResolvedValue({} as never);
    mockInvoice.create.mockResolvedValue({ invoiceNumber: "ADY-X" } as never);

    const result = await activateSubscription(base);
    expect(mockInvoice.create).toHaveBeenCalled();
    expect(result.invoiceNumber).toMatch(/^ADY-\d{4}-\d{6}$/);
  });

  it("does not create an invoice for a free plan", async () => {
    mockSubscription.findFirst.mockResolvedValue(null as never);
    mockSubscription.updateMany.mockResolvedValue({ count: 0 } as never);
    mockSubscription.create.mockImplementation(((args: any) =>
      Promise.resolve({ id: "sub-1", ...args.data })) as never);
    mockUser.update.mockResolvedValue({} as never);

    await activateSubscription({ ...base, planCode: "free", price: 0 });
    expect(mockInvoice.create).not.toHaveBeenCalled();
  });

  it("supersedes existing active subscriptions", async () => {
    mockSubscription.findFirst.mockResolvedValue(null as never);
    mockSubscription.updateMany.mockResolvedValue({ count: 1 } as never);
    mockSubscription.create.mockImplementation(((args: any) =>
      Promise.resolve({ id: "sub-2", ...args.data })) as never);
    mockUser.update.mockResolvedValue({} as never);

    await activateSubscription(base);

    expect(mockSubscription.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: { in: ["active", "past_due"] } },
      data: expect.objectContaining({ status: "superseded" }),
    });
  });
});

describe("requestCancellation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws when there is no active subscription", async () => {
    mockSubscription.findFirst.mockResolvedValue(null as never);
    await expect(requestCancellation("user-1")).rejects.toThrow("No active subscription");
  });

  it("disables auto-renew and marks cancel_at_period_end", async () => {
    mockSubscription.findFirst.mockResolvedValue(makeSub() as never);
    mockSubscription.update.mockResolvedValue({} as never);
    mockUser.update.mockResolvedValue({} as never);

    await requestCancellation("user-1");

    expect(mockSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ autoRenew: false }),
      })
    );
    expect(mockUser.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ subscriptionStatus: "cancel_at_period_end" }),
    });
  });
});

describe("cancelImmediately", () => {
  beforeEach(() => jest.clearAllMocks());

  it("cancels the subscription and downgrades the user to free", async () => {
    mockSubscription.findFirst.mockResolvedValue(makeSub() as never);
    mockSubscription.update.mockResolvedValue({} as never);
    mockUser.update.mockResolvedValue({} as never);

    await cancelImmediately("user-1");

    expect(mockSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "cancelled", autoRenew: false }),
      })
    );
    expect(mockUser.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "free", subscriptionStatus: "cancelled", subscriptionEnd: null },
    });
  });
});

describe("changePlan", () => {
  beforeEach(() => jest.clearAllMocks());

  it("activates the new plan as an upgrade", async () => {
    mockSubscription.findFirst.mockResolvedValue(null as never);
    mockSubscription.updateMany.mockResolvedValue({ count: 0 } as never);
    mockSubscription.create.mockImplementation(((args: any) =>
      Promise.resolve({ id: "sub-1", ...args.data })) as never);
    mockUser.update.mockResolvedValue({} as never);

    await changePlan("user-1", "pro_yearly", "yearly", 1999);

    expect(mockSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planCode: "pro_yearly",
          billingCycle: "yearly",
          status: "active",
        }),
      })
    );
  });
});

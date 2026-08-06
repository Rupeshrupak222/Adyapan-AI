import { resolvePlanPrice } from "../../src/controllers/plan.controller";
import { validateCoupon } from "../../src/controllers/coupon.controller";
import { prisma } from "../../src/config/prisma";

jest.mock("../../src/config/prisma", () => ({
  prisma: {
    plan: { findUnique: jest.fn() },
    coupon: { findUnique: jest.fn() },
    adminAuditLog: { create: jest.fn() },
  },
}));

const mockPlan = prisma.plan as jest.Mocked<typeof prisma.plan>;
const mockCoupon = prisma.coupon as jest.Mocked<typeof prisma.coupon>;

describe("resolvePlanPrice", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws for a missing plan code", async () => {
    await expect(resolvePlanPrice("")).rejects.toThrow("Invalid plan code");
  });

  it("throws for an unknown plan code with no DB plan", async () => {
    mockPlan.findUnique.mockResolvedValue(null as never);
    await expect(resolvePlanPrice("nonexistent")).rejects.toThrow("Invalid plan code");
  });

  it("uses the DB plan monthly price when present", async () => {
    mockPlan.findUnique.mockResolvedValue({ code: "pro_monthly", priceMonthly: 249, priceYearly: 2499, name: "Pro" } as never);
    const { amount, label } = await resolvePlanPrice("pro_monthly");
    expect(amount).toBe(24900);
    expect(label).toBe("Pro");
  });

  it("uses the DB plan yearly price for yearly codes", async () => {
    mockPlan.findUnique.mockResolvedValue({ code: "pro_yearly", priceMonthly: 249, priceYearly: 2499, name: "Pro" } as never);
    const { amount } = await resolvePlanPrice("pro_yearly");
    expect(amount).toBe(249900);
  });

  it("falls back to default pricing when the plans table is empty", async () => {
    mockPlan.findUnique.mockResolvedValue(null as never);
    const pro = await resolvePlanPrice("pro_monthly");
    expect(pro.amount).toBe(19900);
    expect(pro.label).toBe("Pro Monthly");

    const enterprise = await resolvePlanPrice("enterprise");
    expect(enterprise.amount).toBe(0);

    const free = await resolvePlanPrice("free");
    expect(free.amount).toBe(0);
  });
});

describe("validateCoupon", () => {
  beforeEach(() => jest.clearAllMocks());

  const validCoupon = {
    id: "c1",
    code: "ADYAPAN20",
    discountPct: 20,
    validUntil: null,
    maxUses: null,
    usedCount: 0,
    isActive: true,
  };

  it("returns the coupon row when valid", async () => {
    mockCoupon.findUnique.mockResolvedValue(validCoupon as never);
    const coupon = await validateCoupon("adyapan20");
    expect(coupon.code).toBe("ADYAPAN20");
    expect(mockCoupon.findUnique).toHaveBeenCalledWith({ where: { code: "ADYAPAN20" } });
  });

  it("throws for an unknown code", async () => {
    mockCoupon.findUnique.mockResolvedValue(null as never);
    await expect(validateCoupon("NOPE")).rejects.toThrow("Invalid coupon code");
  });

  it("throws for an inactive coupon", async () => {
    mockCoupon.findUnique.mockResolvedValue({ ...validCoupon, isActive: false } as never);
    await expect(validateCoupon("ADYAPAN20")).rejects.toThrow("no longer active");
  });

  it("throws for an expired coupon", async () => {
    mockCoupon.findUnique.mockResolvedValue({
      ...validCoupon,
      validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
    } as never);
    await expect(validateCoupon("ADYAPAN20")).rejects.toThrow("expired");
  });

  it("throws when the usage limit is exhausted", async () => {
    mockCoupon.findUnique.mockResolvedValue({
      ...validCoupon,
      maxUses: 5,
      usedCount: 5,
    } as never);
    await expect(validateCoupon("ADYAPAN20")).rejects.toThrow("usage limit");
  });

  it("allows a coupon at exactly maxUses boundary when not yet consumed", async () => {
    mockCoupon.findUnique.mockResolvedValue({
      ...validCoupon,
      maxUses: 5,
      usedCount: 4,
    } as never);
    const coupon = await validateCoupon("ADYAPAN20");
    expect(coupon).toBeTruthy();
  });
});

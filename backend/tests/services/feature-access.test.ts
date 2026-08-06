import {
  normalizePlanKind,
  planRankOf,
  getFeatureCatalog,
  resolveFeatureForRoute,
  evaluateFeatureAccess,
  getFeatureLimits,
} from "../../src/services/feature-access.service";
import { prisma } from "../../src/config/prisma";

jest.mock("../../src/config/prisma", () => ({
  prisma: {
    featureAccess: { findMany: jest.fn() },
    usageLimit: { findUnique: jest.fn() },
    aiRequestLog: { findMany: jest.fn() },
    aiUsage: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}));

jest.mock("../../src/controllers/admin.controller", () => ({
  getSystemSettingsMemory: jest.fn().mockReturnValue({
    freeTierDailyRequests: 50,
    freeTierTokenLimit: 500000,
    premiumTierTokenLimit: 5000000,
    enterpriseTierDailyRequests: 1000,
    enterpriseTierDailyTokens: 20000000,
  }),
}));

const mockFeatureAccess = prisma.featureAccess as jest.Mocked<typeof prisma.featureAccess>;
const mockUsageLimit = prisma.usageLimit as jest.Mocked<typeof prisma.usageLimit>;
const mockAiRequestLog = prisma.aiRequestLog as jest.Mocked<typeof prisma.aiRequestLog>;
const mockAiUsage = prisma.aiUsage as jest.Mocked<typeof prisma.aiUsage>;

const CATALOG = [
  {
    featureKey: "ai-requests",
    name: "AI Requests",
    description: "Global AI requests",
    category: "AI",
    requiredPlan: "premium",
    routePattern: "^/ai",
    gated: true,
  },
  {
    featureKey: "resume-builder",
    name: "Resume Builder",
    description: "Build resumes",
    category: "Resume",
    requiredPlan: "premium",
    routePattern: "^/resume",
    gated: true,
  },
  {
    featureKey: "interview-hub",
    name: "Interview Hub",
    description: "Mock interviews",
    category: "Interview",
    requiredPlan: "enterprise",
    routePattern: "^/interview",
    gated: true,
  },
  {
    featureKey: "public-tool",
    name: "Public Tool",
    description: "Open feature",
    category: "Misc",
    requiredPlan: "free",
    routePattern: "^/public",
    gated: false,
  },
];

describe("normalizePlanKind", () => {
  it("maps free-like plans to free", () => {
    expect(normalizePlanKind("free")).toBe("free");
    expect(normalizePlanKind("")).toBe("free");
    expect(normalizePlanKind(null)).toBe("free");
  });

  it("maps everything else to premium", () => {
    expect(normalizePlanKind("pro_monthly")).toBe("premium");
    expect(normalizePlanKind("pro_yearly")).toBe("premium");
    expect(normalizePlanKind("premium")).toBe("premium");
  });

  it("maps enterprise and admin to enterprise", () => {
    expect(normalizePlanKind("enterprise")).toBe("enterprise");
    expect(normalizePlanKind("admin")).toBe("enterprise");
  });
});

describe("planRankOf", () => {
  it("ranks free < premium < enterprise", () => {
    expect(planRankOf("free")).toBe(0);
    expect(planRankOf("premium")).toBe(1);
    expect(planRankOf("enterprise")).toBe(2);
  });
});

describe("getFeatureCatalog + resolveFeatureForRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatureAccess.findMany.mockResolvedValue(CATALOG as never);
  });

  it("normalizes the catalog rows", async () => {
    const catalog = await getFeatureCatalog(true);
    expect(catalog).toHaveLength(CATALOG.length);
    expect(catalog[0]).toMatchObject({
      featureKey: "ai-requests",
      requiredPlan: "premium",
      gated: true,
    });
  });

  it("resolves the most specific route pattern", async () => {
    await getFeatureCatalog(true);
    const f = await resolveFeatureForRoute("/api/resume/upload");
    expect(f?.featureKey).toBe("resume-builder");
  });

  it("returns null when no route matches", async () => {
    await getFeatureCatalog(true);
    const f = await resolveFeatureForRoute("/api/auth/login");
    expect(f).toBeNull();
  });
});

describe("getFeatureLimits", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns a stored usage limit row", async () => {
    mockUsageLimit.findUnique.mockResolvedValue({
      featureKey: "ai-requests",
      planCode: "free",
      dailyLimit: 50,
      monthlyLimit: 1500,
      tokenLimit: 500000,
      storageMb: null,
      enabled: true,
    } as never);

    const limits = await getFeatureLimits("ai-requests", "free");
    expect(limits).toMatchObject({ dailyLimit: 50, monthlyLimit: 1500, enabled: true });
  });

  it("falls back to defaults for ai-requests without a stored row", async () => {
    mockUsageLimit.findUnique.mockResolvedValue(null as never);
    const free = await getFeatureLimits("ai-requests", "free");
    expect(free.dailyLimit).toBe(50);
    expect(free.monthlyLimit).toBe(1500);
    expect(free.tokenLimit).toBe(500000);

    const premium = await getFeatureLimits("ai-requests", "pro_monthly");
    expect(premium.dailyLimit).toBeNull();
    expect(premium.tokenLimit).toBe(5000000);
  });

  it("returns unlimited defaults for unknown features", async () => {
    mockUsageLimit.findUnique.mockResolvedValue(null as never);
    const limits = await getFeatureLimits("some-feature", "free");
    expect(limits).toMatchObject({ dailyLimit: null, monthlyLimit: null, enabled: true });
  });
});

describe("evaluateFeatureAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatureAccess.findMany.mockResolvedValue(CATALOG as never);
    mockUsageLimit.findUnique.mockResolvedValue(null as never);
    mockAiRequestLog.findMany.mockResolvedValue([] as never);
    mockAiUsage.findUnique.mockResolvedValue(null as never);
  });

  it("allows when the feature is not in the catalog (fails open)", async () => {
    const res = await evaluateFeatureAccess({ userId: "u1", plan: "free", featureKey: "unknown-thing" });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("not-found");
  });

  it("allows non-gated features for any plan", async () => {
    const res = await evaluateFeatureAccess({ userId: "u1", plan: "free", featureKey: "public-tool" });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("ok");
  });

  it("blocks a free user from a premium feature with an upgrade hint", async () => {
    const res = await evaluateFeatureAccess({ userId: "u1", plan: "free", featureKey: "ai-requests" });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("plan-gate");
    expect(res.upgradeRequired).toBe(true);
  });

  it("blocks a premium user from an enterprise feature", async () => {
    const res = await evaluateFeatureAccess({ userId: "u1", plan: "pro_monthly", featureKey: "interview-hub" });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("plan-gate");
    expect(res.requiredPlan).toBe("enterprise");
  });

  it("allows a premium user on a premium feature", async () => {
    const res = await evaluateFeatureAccess({ userId: "u1", plan: "pro_monthly", featureKey: "ai-requests" });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("ok");
  });

  it("blocks when the feature is disabled via usage_limits", async () => {
    mockUsageLimit.findUnique.mockResolvedValue({
      featureKey: "ai-requests",
      planCode: "pro_monthly",
      dailyLimit: null,
      monthlyLimit: null,
      tokenLimit: null,
      storageMb: null,
      enabled: false,
    } as never);

    const res = await evaluateFeatureAccess({ userId: "u1", plan: "pro_monthly", featureKey: "ai-requests" });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("feature-disabled");
  });

  it("blocks when the daily limit is reached", async () => {
    mockUsageLimit.findUnique.mockResolvedValue({
      featureKey: "ai-requests",
      planCode: "free",
      dailyLimit: 50,
      monthlyLimit: 1500,
      tokenLimit: 500000,
      storageMb: null,
      enabled: true,
    } as never);
    mockAiRequestLog.findMany.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        route: "/ai/chat",
        createdAt: new Date(),
        blocked: false,
      })) as never
    );

    const res = await evaluateFeatureAccess({ userId: "u1", plan: "pro_monthly", path: "/api/ai/chat" });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("daily-limit");
    expect(res.usage?.dailyUsed).toBe(50);
  });

  it("resolves the feature from the request path", async () => {
    const res = await evaluateFeatureAccess({ userId: "u1", plan: "premium", path: "/api/resume/upload" });
    expect(res.featureKey).toBe("resume-builder");
    expect(res.allowed).toBe(true);
  });
});

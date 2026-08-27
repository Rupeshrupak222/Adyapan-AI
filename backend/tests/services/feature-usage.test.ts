import { prisma } from "../../src/config/prisma";
import { FeatureUsageService, ConsumeResult } from "../../src/services/feature-usage.service";
import {
  DEFAULT_FREE_LIMITS,
  FEATURE_DISPLAY_NAMES,
  FeatureKey,
  isKnownFeatureKey,
} from "../../src/services/feature-keys";

/**
 * In-memory Prisma harness replicating the production access patterns of the
 * feature-usage engine:
 *   - userFeatureQuota keyed by (userId, featureKey, periodStart)
 *   - featureUsageAttempt unique on requestId (P2002 on duplicates)
 *   - $transaction executes the callback against the same mock
 */
jest.mock("../../src/config/prisma", () => {
  const quotaRows: any[] = [];
  const attempts: any[] = [];
  let seq = 0;
  const nid = () => `id-${++seq}`;

  const findRow = (userId: string, featureKey: string, periodStart: Date) =>
    quotaRows.find(
      (r) =>
        r.userId === userId &&
        r.featureKey === featureKey &&
        r.periodStart.getTime() === new Date(periodStart).getTime()
    );

  const prismaMock: any = {
    user: { findUnique: jest.fn() },
    usageLimit: { findMany: jest.fn().mockResolvedValue([]) },

    userFeatureQuota: {
      findUnique: jest.fn(async ({ where }: any) => {
        const { userId, featureKey, periodStart } = where.userId_featureKey_periodStart;
        const row = findRow(userId, featureKey, periodStart);
        return row ? { ...row } : null;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        quotaRows
          .filter(
            (r) =>
              (!where.userId || r.userId === where.userId) &&
              (!where.periodStart || r.periodStart.getTime() === new Date(where.periodStart).getTime())
          )
          .map((r) => ({ ...r }))
      ),
      upsert: jest.fn(async ({ where, create }: any) => {
        const { userId, featureKey, periodStart } = where.userId_featureKey_periodStart;
        let row = findRow(userId, featureKey, periodStart);
        if (!row) {
          row = {
            id: nid(),
            userId,
            featureKey,
            periodStart: new Date(periodStart),
            periodEnd: new Date(create.periodEnd),
            limit: create.limit,
            used: create.used ?? 0,
          };
          quotaRows.push(row);
        }
        return { ...row };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.id) {
          // Conditional consume shape: { id, used: { lt } }
          const row = quotaRows.find((r) => r.id === where.id);
          if (!row) return { count: 0 };
          if (where.used?.lt != null && row.used >= where.used.lt) return { count: 0 };
          row.used += data.used.increment ?? 0;
          return { count: 1 };
        }
        // Refund shape: { userId, featureKey, periodStart?, used: { gt } }
        const targets = quotaRows.filter(
          (r) =>
            (!where.userId || r.userId === where.userId) &&
            (!where.featureKey || r.featureKey === where.featureKey) &&
            (!where.periodStart || r.periodStart.getTime() === new Date(where.periodStart).getTime()) &&
            r.used > (where.used?.gt ?? 0)
        );
        for (const t of targets) t.used -= data.used.decrement ?? 0;
        return { count: targets.length };
      }),
    },

    featureUsageAttempt: {
      findUnique: jest.fn(async ({ where }: any) => {
        const a = attempts.find((x) => x.requestId === where.requestId);
        return a ? { ...a } : null;
      }),
      findMany: jest.fn(async ({ where, take }: any) =>
        attempts
          .filter(
            (a) =>
              (!where.userId || a.userId === where.userId) &&
              (!where.featureKey || a.featureKey === where.featureKey)
          )
          .slice(0, take ?? 20)
          .map((a) => ({ ...a }))
      ),
      create: jest.fn(async ({ data }: any) => {
        if (attempts.some((x) => x.requestId === data.requestId)) {
          const err: any = new Error("Unique constraint failed on requestId");
          err.code = "P2002";
          throw err;
        }
        const row = { id: nid(), status: "RESERVED", createdAt: new Date(), ...data };
        attempts.push(row);
        return { ...row };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const a = attempts.find((x) => x.id === where.id);
        if (!a) throw new Error("Attempt not found");
        Object.assign(a, data);
        return { ...a };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const matches = attempts.filter(
          (a) =>
            (!where.requestId || a.requestId === where.requestId) &&
            (!where.status || a.status === where.status) &&
            (!where.userId || a.userId === where.userId) &&
            (!where.featureKey || a.featureKey === String(where.featureKey))
        );
        for (const m of matches) Object.assign(m, data);
        return { count: matches.length };
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        let n = 0;
        for (let i = attempts.length - 1; i >= 0; i--) {
          if (!where.requestId || attempts[i].requestId === where.requestId) {
            attempts.splice(i, 1);
            n++;
          }
        }
        return { count: n };
      }),
    },

    $transaction: undefined as any,
    __harness: { quotaRows, attempts },
  };
  prismaMock.$transaction = jest.fn(async (cb: any) => cb(prismaMock));

  return { prisma: prismaMock };
});

const prismaAny = prisma as any;
const harness = (): { quotaRows: any[]; attempts: any[] } => prismaAny.__harness;

// ─── Test users ───────────────────────────────────────────────────────────────
const U_FREE = "user-free";
const U_PAID = "user-paid";
const U_EXPIRED = "user-expired";

beforeEach(() => {
  harness().quotaRows.length = 0;
  harness().attempts.length = 0;
  prismaAny.user.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.id === U_FREE) return { plan: "free", subscriptionStatus: "" };
    if (where.id === U_PAID) return { plan: "premium", subscriptionStatus: "active" };
    if (where.id === U_EXPIRED) return { plan: "premium", subscriptionStatus: "expired" };
    return null;
  });
});

function seedQuota(featureKey: string, used: number, userId = U_FREE): any {
  const { periodStart, periodEnd } = FeatureUsageService.getCurrentPeriod();
  const row = {
    id: `seed-${Math.random().toString(36).slice(2)}`,
    userId,
    featureKey,
    periodStart,
    periodEnd,
    limit: DEFAULT_FREE_LIMITS[featureKey] ?? 10,
    used,
  };
  harness().quotaRows.push(row);
  return row;
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE CONFIGURATION MATRIX (single source of truth)
// ═════════════════════════════════════════════════════════════════════════════

describe("Feature key registry — final feature matrix", () => {
  const TEN = [
    FeatureKey.STUDY_ASSISTANT,
    FeatureKey.NOTES_GENERATOR,
    FeatureKey.QUIZ_GENERATOR,
    FeatureKey.ASSIGNMENT_GENERATOR,
    FeatureKey.MIND_MAPS,
    FeatureKey.FLASHCARDS,
    FeatureKey.RESEARCH_PAPER_AI,
    FeatureKey.PLAGIARISM_CHECKER,
    FeatureKey.AI_APTITUDE_ENGINE,
    FeatureKey.TECHNICAL_MCQS,
    FeatureKey.AI_CHAT_ASSISTANT,
  ];
  const THREE = [
    FeatureKey.STUDY_PLANNER,
    FeatureKey.CODING_ROADMAP,
    FeatureKey.GITHUB_PORTFOLIO_BUILDER,
    FeatureKey.RESUME_UPLOAD,
    FeatureKey.RESUME_BUILDER,
    FeatureKey.ATS_CHECKER,
    FeatureKey.COVER_LETTER_GENERATOR,
    FeatureKey.LINKEDIN_OPTIMIZER,
  ];

  it("registers exactly 19 limited features", () => {
    expect(Object.keys(DEFAULT_FREE_LIMITS)).toHaveLength(19);
  });

  it("assigns 10 free attempts/month to every 10-limit feature", () => {
    for (const k of TEN) expect(DEFAULT_FREE_LIMITS[k]).toBe(10);
  });

  it("assigns 3 free attempts/month to every 3-limit feature", () => {
    for (const k of THREE) expect(DEFAULT_FREE_LIMITS[k]).toBe(3);
  });

  it("has display names and known-key detection for every feature", () => {
    for (const k of Object.keys(DEFAULT_FREE_LIMITS)) {
      expect(FEATURE_DISPLAY_NAMES[k]).toBeTruthy();
      expect(isKnownFeatureKey(k)).toBe(true);
      expect(isKnownFeatureKey(k.toLowerCase())).toBe(true);
      expect(isKnownFeatureKey("NOT_A_FEATURE")).toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PERIOD SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

describe("Monthly usage periods", () => {
  it("computes UTC calendar-month boundaries", () => {
    const aug = FeatureUsageService.getCurrentPeriod(new Date("2026-08-15T10:00:00Z"));
    expect(aug.periodStart.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(aug.periodEnd.toISOString()).toBe("2026-08-31T23:59:59.999Z");

    const feb = FeatureUsageService.getCurrentPeriod(new Date("2028-02-09T00:00:00Z"));
    expect(feb.periodEnd.getUTCMonth()).toBe(1); // February
    expect(feb.periodEnd.getUTCDate()).toBe(29); // leap year
  });

  it("rolls over cleanly at month boundaries", () => {
    const before = FeatureUsageService.getCurrentPeriod(new Date("2026-08-31T23:59:59.999Z"));
    const after = FeatureUsageService.getCurrentPeriod(new Date("2026-09-01T00:00:00.000Z"));
    expect(before.periodStart.getUTCMonth()).toBe(7);
    expect(after.periodStart.getUTCMonth()).toBe(8);
    expect(after.periodStart.getTime()).toBeGreaterThan(before.periodEnd.getTime());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SPEC SCENARIOS 1–10
// ═════════════════════════════════════════════════════════════════════════════

describe("Scenario 1 — fresh user receives full allowance", () => {
  it("reports 10/10 for a 10-limit feature with no usage row", async () => {
    const s = await FeatureUsageService.getFeatureUsage(U_FREE, "QUIZ_GENERATOR");
    expect(s.limit).toBe(10);
    expect(s.used).toBe(0);
    expect(s.remaining).toBe(10);
    expect(s.allowed).toBe(true);
    expect(s.unlimited).toBe(false);
    expect(s.plan.toLowerCase()).toContain("free");
  });

  it("reports 3/3 for a 3-limit feature", async () => {
    const s = await FeatureUsageService.getFeatureUsage(U_FREE, "ATS_CHECKER");
    expect(s.limit).toBe(3);
    expect(s.remaining).toBe(3);
  });

  it("global summary covers every registered feature", async () => {
    const summary = await FeatureUsageService.getGlobalUsageSummary(U_FREE);
    expect(Object.keys(summary.features)).toHaveLength(19);
    expect(summary.features["QUIZ_GENERATOR"].remaining).toBe(10);
    expect(summary.features["LINKEDIN_OPTIMIZER"].remaining).toBe(3);
  });
});

describe("Scenario 2 — one execution consumes exactly one credit", () => {
  it("decrements remaining from 10 to 9", async () => {
    seedQuota("QUIZ_GENERATOR", 0);
    const res: ConsumeResult = await FeatureUsageService.checkAndConsume(U_FREE, "QUIZ_GENERATOR", "rq-once");
    expect(res.allowed).toBe(true);
    expect(res.consumed).toBe(true);
    expect(res.status.used).toBe(1);
    expect(res.status.remaining).toBe(9);

    const after = await FeatureUsageService.getFeatureUsage(U_FREE, "QUIZ_GENERATOR");
    expect(after.used).toBe(1);
    expect(attemptOf("rq-once")?.status).toBe("RESERVED");
  });

  it("decrements 3-limit features to 2/3", async () => {
    seedQuota("COVER_LETTER_GENERATOR", 0);
    const res = await FeatureUsageService.checkAndConsume(U_FREE, "COVER_LETTER_GENERATOR");
    expect(res.consumed).toBe(true);
    expect(res.status.remaining).toBe(2);
  });

  it("auto-completes the attempt after success", async () => {
    seedQuota("MIND_MAPS", 0);
    const res = await FeatureUsageService.checkAndConsume(U_FREE, "MIND_MAPS", "rq-ok");
    await FeatureUsageService.markCompleted(U_FREE, "MIND_MAPS", res.requestId);
    expect(attemptOf(res.requestId)?.status).toBe("COMPLETED");
  });
});

describe("Scenario 3 — exhausted allowance blocks execution", () => {
  it("refuses consumption when used reaches the limit", async () => {
    seedQuota("QUIZ_GENERATOR", 10);
    const res = await FeatureUsageService.checkAndConsume(U_FREE, "QUIZ_GENERATOR", "rq-blocked");
    expect(res.allowed).toBe(false);
    expect(res.consumed).toBe(false);
    expect(res.status.used).toBe(10);
    expect(res.status.remaining).toBe(0);
    expect(res.status.resetAt).toBeTruthy();
  });

  it("blocks 3-limit features at zero too", async () => {
    seedQuota("ATS_CHECKER", 3);
    const res = await FeatureUsageService.checkAndConsume(U_FREE, "ATS_CHECKER");
    expect(res.allowed).toBe(false);
    expect(res.status.limit).toBe(3);
  });
});

describe("Scenario 4 — blocked request reserves nothing", () => {
  it("never records an attempt or mutates usage when disallowed", async () => {
    seedQuota("TECHNICAL_MCQS", 10);
    await FeatureUsageService.checkAndConsume(U_FREE, "TECHNICAL_MCQS", "rq-nope");
    expect(harness().attempts.filter((a) => a.requestId === "rq-nope")).toHaveLength(0);
    expect(rowFor("TECHNICAL_MCQS").used).toBe(10);
  });
});

describe("Scenario 5 — failed AI execution refunds the credit", () => {
  it("restores the allowance and marks the attempt REFUNDED", async () => {
    seedQuota("RESEARCH_PAPER_AI", 4);
    const res = await FeatureUsageService.checkAndConsume(U_FREE, "RESEARCH_PAPER_AI", "rq-fail");
    expect(res.consumed).toBe(true);
    expect(rowFor("RESEARCH_PAPER_AI").used).toBe(5);

    const ok = await FeatureUsageService.refundAttempt(U_FREE, "RESEARCH_PAPER_AI", "rq-fail");
    expect(ok).toBe(true);
    expect(rowFor("RESEARCH_PAPER_AI").used).toBe(4);
    expect(attemptOf("rq-fail")?.status).toBe("REFUNDED");

    const after = await FeatureUsageService.getFeatureUsage(U_FREE, "RESEARCH_PAPER_AI");
    expect(after.remaining).toBe(6);
  });

  it("is idempotent — double refunds never over-credit", async () => {
    seedQuota("STUDY_PLANNER", 2);
    await FeatureUsageService.checkAndConsume(U_FREE, "STUDY_PLANNER", "rq-refund-idem");
    await FeatureUsageService.refundAttempt(U_FREE, "STUDY_PLANNER", "rq-refund-idem");
    const again = await FeatureUsageService.refundAttempt(U_FREE, "STUDY_PLANNER", "rq-refund-idem");
    expect(again).toBe(false);
    expect(rowFor("STUDY_PLANNER").used).toBe(2);
  });

  it("cannot refund another user's attempt", async () => {
    seedQuota("FLASHCARDS", 0, U_FREE);
    seedQuota("FLASHCARDS", 0, U_PAID);
    await FeatureUsageService.checkAndConsume(U_FREE, "FLASHCARDS", "rq-cross");
    // U_PAID tries to refund U_FREE's request — ownership check must reject.
    const forged = await FeatureUsageService.refundAttempt(U_PAID, "FLASHCARDS", "rq-cross");
    expect(forged).toBe(false);
    expect(rowFor("FLASHCARDS", U_FREE).used).toBe(1);
  });
});

describe("Scenario 6 — double-click consumes exactly one credit", () => {
  it("replays the same requestId without deducting again", async () => {
    seedQuota("NOTES_GENERATOR", 0);
    const first = await FeatureUsageService.checkAndConsume(U_FREE, "NOTES_GENERATOR", "rq-dbl");
    const second = await FeatureUsageService.checkAndConsume(U_FREE, "NOTES_GENERATOR", "rq-dbl");

    expect(first.consumed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.consumed).toBe(false);
    expect(rowFor("NOTES_GENERATOR").used).toBe(1);
  });

  it("stays idempotent even when the replay arrives mid-flight (P2002 path)", async () => {
    seedQuota("ASSIGNMENT_GENERATOR", 0);
    const first = await FeatureUsageService.checkAndConsume(U_FREE, "ASSIGNMENT_GENERATOR", "rq-race");
    expect(first.consumed).toBe(true);
    const usedBefore = rowFor("ASSIGNMENT_GENERATOR").used;

    // Simulate a race where the fast-path lookup misses (stale read) but the
    // unique insert still collides: the worker must recognize its own attempt
    // during ownership verification and replay WITHOUT deducting twice.
    prismaAny.featureUsageAttempt.findUnique.mockImplementationOnce(async () => null);
    const second = await FeatureUsageService.checkAndConsume(U_FREE, "ASSIGNMENT_GENERATOR", "rq-race");
    expect(second.allowed).toBe(true);
    expect(second.consumed).toBe(false);
    expect(rowFor("ASSIGNMENT_GENERATOR").used).toBe(usedBefore);
  });
});

describe("Scenario 7 — two tabs / concurrent requests stay atomic", () => {
  it("serializes racing consumers to exactly the limit", async () => {
    seedQuota("AI_APTITUDE_ENGINE", 9); // one credit left
    const [a, b] = await Promise.all([
      FeatureUsageService.checkAndConsume(U_FREE, "AI_APTITUDE_ENGINE", "rq-tabA"),
      FeatureUsageService.checkAndConsume(U_FREE, "AI_APTITUDE_ENGINE", "rq-tabB"),
    ]);
    const consumed = [a, b].filter((r) => r.consumed);
    const blocked = [a, b].filter((r) => !r.allowed);
    expect(consumed).toHaveLength(1);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].status.remaining).toBe(0);
    expect(rowFor("AI_APTITUDE_ENGINE").used).toBe(10);
  });

  it("allows parallel distinct-feature consumption independently", async () => {
    seedQuota("STUDY_ASSISTANT", 0);
    seedQuota("PLAGIARISM_CHECKER", 0);
    const [a, b] = await Promise.all([
      FeatureUsageService.checkAndConsume(U_FREE, "STUDY_ASSISTANT", "rq-par-A"),
      FeatureUsageService.checkAndConsume(U_FREE, "PLAGIARISM_CHECKER", "rq-par-B"),
    ]);
    expect(a.consumed).toBe(true);
    expect(b.consumed).toBe(true);
    expect(rowFor("STUDY_ASSISTANT").used).toBe(1);
    expect(rowFor("PLAGIARISM_CHECKER").used).toBe(1);
  });
});

describe("Scenario 8 — monthly reset yields a fresh allowance", () => {
  it("ignores exhausted rows from previous periods", async () => {
    // Exhausted row stored under LAST month's period.
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
    const last = FeatureUsageService.getCurrentPeriod(lastMonth);
    harness().quotaRows.push({
      id: "old",
      userId: U_FREE,
      featureKey: "QUIZ_GENERATOR",
      periodStart: last.periodStart,
      periodEnd: last.periodEnd,
      limit: 10,
      used: 10,
    });

    const s = await FeatureUsageService.getFeatureUsage(U_FREE, "QUIZ_GENERATOR");
    expect(s.used).toBe(0);
    expect(s.remaining).toBe(10);
    expect(s.periodStart).toBe(FeatureUsageService.getCurrentPeriod().periodStart.toISOString());
  });

  it("serves a brand-new window when the service clock enters the next period", async () => {
    seedQuota("GITHUB_PORTFOLIO_BUILDER", 3); // exhausted this month
    const cur = FeatureUsageService.getCurrentPeriod();
    const next = FeatureUsageService.getCurrentPeriod(new Date(cur.periodEnd.getTime() + 1));

    const spy = jest.spyOn(FeatureUsageService, "getCurrentPeriod").mockReturnValue(next);
    try {
      const s = await FeatureUsageService.getFeatureUsage(U_FREE, "GITHUB_PORTFOLIO_BUILDER");
      expect(s.used).toBe(0);
      expect(s.remaining).toBe(3);
      expect(s.periodStart).toBe(next.periodStart.toISOString());
    } finally {
      spy.mockRestore();
    }

    // Original window is still exhausted.
    const still = await FeatureUsageService.getFeatureUsage(U_FREE, "GITHUB_PORTFOLIO_BUILDER");
    expect(still.remaining).toBe(0);
  });
});

describe("Scenario 9 — Premium plan receives 3x higher monthly allowance", () => {
  it("reports 30/30 for fresh Premium user on Group A features", async () => {
    const s = await FeatureUsageService.getFeatureUsage(U_PAID, "STUDY_ASSISTANT");
    expect(s.limit).toBe(30);
    expect(s.used).toBe(0);
    expect(s.remaining).toBe(30);
    expect(s.unlimited).toBe(false);
    expect(s.plan).toBe("premium");
  });

  it("reports 9/9 for fresh Premium user on Group B features", async () => {
    const s = await FeatureUsageService.getFeatureUsage(U_PAID, "ATS_CHECKER");
    expect(s.limit).toBe(9);
    expect(s.used).toBe(0);
    expect(s.remaining).toBe(9);
    expect(s.unlimited).toBe(false);
  });

  it("decrements Premium allowance from 30 to 29 on first execution", async () => {
    const res = await FeatureUsageService.checkAndConsume(U_PAID, "STUDY_ASSISTANT", "rq-prem-1");
    expect(res.allowed).toBe(true);
    expect(res.consumed).toBe(true);
    expect(res.status.limit).toBe(30);
    expect(res.status.used).toBe(1);
    expect(res.status.remaining).toBe(29);
    expect(res.status.unlimited).toBe(false);
  });

  it("blocks Premium user on Group A after 30 attempts (31st attempt rejected)", async () => {
    seedQuota("QUIZ_GENERATOR", 30, U_PAID);
    const res = await FeatureUsageService.checkAndConsume(U_PAID, "QUIZ_GENERATOR", "rq-prem-31");
    expect(res.allowed).toBe(false);
    expect(res.consumed).toBe(false);
    expect(res.status.limit).toBe(30);
    expect(res.status.used).toBe(30);
    expect(res.status.remaining).toBe(0);
  });

  it("blocks Premium user on Group B after 9 attempts (10th attempt rejected)", async () => {
    seedQuota("ATS_CHECKER", 9, U_PAID);
    const res = await FeatureUsageService.checkAndConsume(U_PAID, "ATS_CHECKER", "rq-prem-10");
    expect(res.allowed).toBe(false);
    expect(res.consumed).toBe(false);
    expect(res.status.limit).toBe(9);
    expect(res.status.used).toBe(9);
    expect(res.status.remaining).toBe(0);
  });

  it("refunds Premium attempt after a failed execution", async () => {
    const res = await FeatureUsageService.checkAndConsume(U_PAID, "NOTES_GENERATOR", "rq-prem-fail");
    expect(res.allowed).toBe(true);
    const refunded = await FeatureUsageService.refundAttempt(U_PAID, "NOTES_GENERATOR", "rq-prem-fail");
    expect(refunded).toBe(true);
    const after = await FeatureUsageService.getFeatureUsage(U_PAID, "NOTES_GENERATOR");
    expect(after.used).toBe(0);
    expect(after.remaining).toBe(30);
  });
});

describe("Scenario 9.1 — Mid-month Plan Upgrade and Downgrade", () => {
  it("preserves usage count against new entitlement upon upgrading from Free to Premium", async () => {
    // User starts Free and uses 8 / 10 Quiz attempts
    seedQuota("QUIZ_GENERATOR", 8, "user-upgrading");
    prismaAny.user.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === "user-upgrading") return { plan: "free", subscriptionStatus: "" };
      return null;
    });

    const before = await FeatureUsageService.getFeatureUsage("user-upgrading", "QUIZ_GENERATOR");
    expect(before.limit).toBe(10);
    expect(before.used).toBe(8);
    expect(before.remaining).toBe(2);

    // User upgrades to Premium
    prismaAny.user.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === "user-upgrading") return { plan: "premium", subscriptionStatus: "active" };
      return null;
    });

    const after = await FeatureUsageService.getFeatureUsage("user-upgrading", "QUIZ_GENERATOR");
    expect(after.limit).toBe(30);
    expect(after.used).toBe(8);
    expect(after.remaining).toBe(22); // 30 - 8 = 22 remaining!
  });

  it("gracefully clamps remaining to 0 upon plan downgrade or subscription expiration", async () => {
    // User used 18 / 30 Quiz attempts on Premium
    seedQuota("QUIZ_GENERATOR", 18, "user-downgrading");
    prismaAny.user.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === "user-downgrading") return { plan: "premium", subscriptionStatus: "expired" };
      return null;
    });

    const status = await FeatureUsageService.getFeatureUsage("user-downgrading", "QUIZ_GENERATOR");
    expect(status.plan).toBe("free");
    expect(status.limit).toBe(10);
    expect(status.used).toBe(18);
    expect(status.remaining).toBe(0); // Math.max(0, 10 - 18) = 0, never negative!
    expect(status.allowed).toBe(false);
  });
});

describe("Scenario 10 — frontend manipulation cannot alter server truth", () => {
  it("rejects unknown feature keys outright", async () => {
    await expect(
      FeatureUsageService.checkAndConsume(U_FREE, "HACKED_FEATURE" as any)
    ).rejects.toThrow(/Unknown feature key/i);
  });

  it("normalizes case/spelling instead of trusting client casing", async () => {
    seedQuota("quiz_generator", 4); // rogue lowercase row must be invisible
    const res = await FeatureUsageService.checkAndConsume(U_FREE, "quiz_generator", "rq-case");
    expect(res.allowed).toBe(true);
    // The fresh canonical uppercase row is used — the rogue one was ignored
    // and remains untouched at 4.
    expect(res.status.used).toBe(1);
    expect(res.status.remaining).toBe(9);
    expect(res.status.featureKey).toBe("QUIZ_GENERATOR");
    expect(rowFor("quiz_generator").used).toBe(4);
  });

  it("ignores crafted requestIds — limits always come from the registry", async () => {
    seedQuota("RESUME_UPLOAD", 3); // exhausted
    const res = await FeatureUsageService.checkAndConsume(
      U_FREE,
      "RESUME_UPLOAD",
      '{"remaining":999,"limit":99999}'
    );
    expect(res.allowed).toBe(false);
    expect(res.status.remaining).toBe(0);
  });

  it("cross-user requestId collisions never leak another user's state", async () => {
    seedQuota("CODING_ROADMAP", 0, U_PAID);
    await FeatureUsageService.checkAndConsume(U_PAID, "CODING_ROADMAP", "rq-stolen");
    // Attacker reuses victim's requestId: replay is skipped (different owner),
    // the unique constraint fires, and the service regenerates its OWN id —
    // the attacker is charged for their own execution, never rides free.
    const res = await FeatureUsageService.checkAndConsume(U_FREE, "CODING_ROADMAP", "rq-stolen");
    expect(res.allowed).toBe(true);
    expect(res.consumed).toBe(true);
    expect(res.requestId).not.toBe("rq-stolen");
    expect(rowFor("CODING_ROADMAP", U_PAID).used).toBe(1); // victim untouched
    expect(rowFor("CODING_ROADMAP", U_FREE).used).toBe(1); // attacker charged
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// USAGE HISTORY & SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

describe("Usage history & summary", () => {
  it("returns recent attempts newest-first for a feature", async () => {
    seedQuota("MIND_MAPS", 0);
    await FeatureUsageService.checkAndConsume(U_FREE, "MIND_MAPS", "rq-h1");
    await FeatureUsageService.markCompleted(U_FREE, "MIND_MAPS", "rq-h1");
    const history = await FeatureUsageService.getUsageHistory(U_FREE, "MIND_MAPS");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      requestId: "rq-h1",
      status: "COMPLETED",
      featureKey: "MIND_MAPS",
    });
    expect(typeof history[0].createdAt).toBe("string");
  });

  it("global summary carries plan + per-feature status objects", async () => {
    seedQuota("ATS_CHECKER", 2);
    const summary = await FeatureUsageService.getGlobalUsageSummary(U_FREE);
    expect(summary.plan.toLowerCase()).toContain("free");
    const ats = summary.features["ATS_CHECKER"];
    expect(ats).toMatchObject({ limit: 3, used: 2, remaining: 1, allowed: true });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN-CONFIGURED LIMIT OVERRIDES (usage_limits table)
// ═════════════════════════════════════════════════════════════════════════════

describe("Admin-configured limit overrides", () => {
  const realNow = Date.now.bind(Date);
  let offset = 0;
  let spy: jest.SpyInstance;

  beforeAll(() => {
    spy = jest.spyOn(Date, "now").mockImplementation(() => realNow() + offset);
  });
  afterAll(() => spy.mockRestore());

  /**
   * Force-expire the module's override cache. Monotonically increasing so a
   * reloaded cache timestamp is always older than the next expiry jump.
   */
  const expireCache = () => {
    offset += 120_000;
  };

  it("uses admin monthly_limit rows ahead of platform defaults", async () => {
    expireCache();
    prismaAny.usageLimit.findMany.mockResolvedValueOnce([
      { featureKey: "quiz-generator", planCode: "free", monthlyLimit: 5, enabled: true },
      { featureKey: "quiz-generator", planCode: "premium", monthlyLimit: 100, enabled: true },
    ]);

    const freeInfo = { plan: "free", planKind: "free" as const, isPaid: false };
    const freeLimit = await FeatureUsageService.resolveMonthlyLimit("QUIZ_GENERATOR", freeInfo);
    expect(freeLimit).toEqual({ limit: 5, unlimited: false });

    const paidInfo = { plan: "premium", planKind: "premium" as const, isPaid: true };
    const paidLimit = await FeatureUsageService.resolveMonthlyLimit("QUIZ_GENERATOR", paidInfo);
    expect(paidLimit).toEqual({ limit: 100, unlimited: false });
  });

  it("falls back to DEFAULT_PREMIUM_LIMITS for paid plans with no explicit admin row", async () => {
    expireCache();
    prismaAny.usageLimit.findMany.mockResolvedValueOnce([
      { featureKey: "ats-checker", planCode: "free", monthlyLimit: 3, enabled: true },
    ]);
    const paidInfo = { plan: "premium", planKind: "premium" as const, isPaid: true };
    const res = await FeatureUsageService.resolveMonthlyLimit("ATS_CHECKER", paidInfo);
    expect(res).toEqual({ limit: 9, unlimited: false });
  });

  it("ignores disabled override rows", async () => {
    expireCache();
    prismaAny.usageLimit.findMany.mockResolvedValueOnce([
      { featureKey: "notes-generator", planCode: "free", monthlyLimit: 0, enabled: false },
    ]);
    const freeInfo = { plan: "free", planKind: "free" as const, isPaid: false };
    const res = await FeatureUsageService.resolveMonthlyLimit("NOTES_GENERATOR", freeInfo);
    expect(res).toEqual({ limit: 10, unlimited: false });
  });

  it("enforces an admin override end-to-end through consume", async () => {
    seedQuota("FLASHCARDS", 1);

    // First call reloads the (expired) cache and consumes the queued rows.
    expireCache();
    prismaAny.usageLimit.findMany.mockResolvedValueOnce([
      { featureKey: "flashcards", planCode: "free", monthlyLimit: 2, enabled: true },
    ]);
    const ok = await FeatureUsageService.checkAndConsume(U_FREE, "FLASHCARDS", "rq-admin-1");
    expect(ok.allowed).toBe(true);
    expect(ok.status.limit).toBe(2);
    expect(ok.status.remaining).toBe(0);

    // Second consume must still see the override and be denied.
    expireCache();
    prismaAny.usageLimit.findMany.mockResolvedValueOnce([
      { featureKey: "flashcards", planCode: "free", monthlyLimit: 2, enabled: true },
    ]);
    const denied = await FeatureUsageService.checkAndConsume(U_FREE, "FLASHCARDS", "rq-admin-2");
    expect(denied.allowed).toBe(false);
    expect(denied.status.limit).toBe(2);
    expect(rowFor("FLASHCARDS").used).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE — requireFeatureQuota
// ═════════════════════════════════════════════════════════════════════════════

describe("requireFeatureQuota middleware", () => {
  let middleware: any;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    middleware = require("../../src/middleware/requireFeatureQuota").requireFeatureQuota;
  });

  const makeReq = (body: any = {}): any => ({
    user: { userId: U_FREE },
    body,
    headers: {},
  });

  const makeRes = () => {
    const res: any = {
      statusCode: 200,
      locals: {},
      headersSent: false,
      writableEnded: false,
      headers: {} as Record<string, string>,
      jsonBody: undefined as any,
      handlers: {} as Record<string, Function>,
    };
    res.status = jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn((payload: any) => {
      res.jsonBody = payload;
      return res;
    });
    res.setHeader = jest.fn((k: string, v: string) => {
      res.headers[k] = v;
      return res;
    });
    res.on = jest.fn((event: string, cb: Function) => {
      res.handlers[event] = cb;
      return res;
    });
    return res;
  };

  it("passes through and attaches quota context when allowed", async () => {
    seedQuota("QUIZ_GENERATOR", 3);
    const req = makeReq({ requestId: "rq-mw-ok" });
    const res = makeRes();
    const next = jest.fn();

    await middleware("QUIZ_GENERATOR")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(req.featureKey).toBe("QUIZ_GENERATOR");
    expect(req.featureRequestId).toBe("rq-mw-ok");
    expect(req.featureUsageStatus.remaining).toBe(6);
    expect(res.headers["X-Feature-Limit"]).toBe("10");
    expect(res.headers["X-Feature-Remaining"]).toBe("6");
    expect(rowFor("QUIZ_GENERATOR").used).toBe(4);
  });

  it("short-circuits with 429 FEATURE_LIMIT_REACHED when exhausted", async () => {
    seedQuota("ATS_CHECKER", 3);
    const req = makeReq({});
    const res = makeRes();
    const next = jest.fn();

    await middleware("ATS_CHECKER")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.jsonBody.code).toBe("FEATURE_LIMIT_REACHED");
    expect(res.jsonBody.upgradeRequired).toBe(true);
    expect(res.jsonBody.feature).toBe("ATS_CHECKER");
    expect(res.jsonBody.limit).toBe(3);
    expect(res.jsonBody.remaining).toBe(0);
    expect(res.jsonBody.resetAt).toBeTruthy();
  });

  it("requires authentication", async () => {
    const req: any = { body: {}, headers: {} };
    const res = makeRes();
    const next = jest.fn();

    await middleware("QUIZ_GENERATOR")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("marks the attempt COMPLETED on a 2xx response finish", async () => {
    seedQuota("NOTES_GENERATOR", 0);
    const req = makeReq({});
    const res = makeRes();
    const next = jest.fn();

    await middleware("NOTES_GENERATOR")(req, res, next);
    res.statusCode = 200;
    res.handlers["finish"]();
    // markCompleted is fire-and-forget; yield a tick.
    await new Promise((r) => setTimeout(r, 0));

    const attempt = harness().attempts.find((a) => a.requestId === req.featureRequestId);
    expect(attempt?.status).toBe("COMPLETED");
  });

  it("refunds automatically when the response finishes with an error status", async () => {
    seedQuota("STUDY_PLANNER", 1);
    const req = makeReq({});
    const res = makeRes();
    const next = jest.fn();

    await middleware("STUDY_PLANNER")(req, res, next);
    expect(rowFor("STUDY_PLANNER").used).toBe(2);

    res.statusCode = 500;
    res.handlers["finish"]();
    await new Promise((r) => setTimeout(r, 0));

    expect(rowFor("STUDY_PLANNER").used).toBe(1); // refunded
    const attempt = harness().attempts.find((a) => a.requestId === req.featureRequestId);
    expect(attempt?.status).toBe("REFUNDED");
  });
});

// ─── helpers ────────────────────────────────────────────────────────────────

function rowFor(featureKey: string, userId = U_FREE): any {
  const row = harness().quotaRows.find(
    (r) => r.userId === userId && r.featureKey === featureKey
  );
  if (!row) throw new Error(`No quota row for ${userId}/${featureKey}`);
  return row;
}

function attemptOf(requestId: string): any {
  return harness().attempts.find((a) => a.requestId === requestId) ?? null;
}

import {
  conceptSignature,
  dedupeQuestions,
  dedupeQuestionsWithReasons,
  dedupInfoFromQuestion,
  seenRegistryFromTexts,
  templateFingerprint,
} from "../../../src/lib/questions/question-fingerprint";
import {
  QuestionPoolExhaustedError,
  buildAvoidanceBlock,
  rejectAgainstBank,
  type BankSnapshot,
} from "../../../src/services/question-bank.service";

/**
 * These tests encode the rule the whole change exists to enforce:
 * a question CONCEPT may appear only once in the entire database, and
 * "same concept, different numbers" counts as the same concept.
 */

function snapshotOf(texts: string[]): BankSnapshot {
  const seen = seenRegistryFromTexts(texts, [], { recentTextCap: Infinity });
  return {
    fingerprints: seen.fingerprints,
    templates: seen.templates,
    conceptSignatures: seen.conceptSignatures,
    recentTexts: seen.recentTexts,
    promptConcepts: [],
    totalEntries: texts.length,
    conceptsTruncated: false,
  };
}

const VALUE_SWAP_A = "A trainee trains for 60% of 3 hours at 40 km/h. What distance is covered?";
const VALUE_SWAP_B = "A trainee trains for 75% of 5 hours at 40 km/h. What distance is covered?";
const GENUINELY_NEW = "Which scheduling algorithm minimises average waiting time for processes?";
const OTHER_NEW = "What is the page fault count under the LRU replacement policy?";

describe("conceptSignature", () => {
  it("collapses the same concept with different numbers, units and names", () => {
    expect(conceptSignature(VALUE_SWAP_A)).toBe(conceptSignature(VALUE_SWAP_B));
  });

  it("keeps genuinely different concepts apart", () => {
    expect(conceptSignature(GENUINELY_NEW)).not.toBe(conceptSignature(OTHER_NEW));
  });

  it("is non-empty for real question text", () => {
    expect(conceptSignature(GENUINELY_NEW)).toMatch(/^c[0-9a-f]{32}$/);
  });
});

describe("dedupeQuestions strict mode", () => {
  const pool = [
    { question: VALUE_SWAP_A, id: "q1" },
    { question: VALUE_SWAP_B, id: "q2" }, // same concept, different numbers
    { question: GENUINELY_NEW, id: "q3" },
    { question: OTHER_NEW, id: "q4" },
  ];

  it("REJECTS value-swapped variants (this is the reported bug)", () => {
    const kept = dedupeQuestions(pool, new Set(), { strict: true });
    expect(kept.map((q) => q.id)).toEqual(["q1", "q3", "q4"]);
  });

  it("reports WHY each question was rejected", () => {
    const { kept, rejected } = dedupeQuestionsWithReasons(pool, new Set(), { strict: true });
    expect(kept.map((q) => q.id)).toEqual(["q1", "q3", "q4"]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBe("template");
    expect(rejected[0].question.id).toBe("q2");
  });

  it("keeps the default non-strict behaviour for the per-user path", () => {
    const kept = dedupeQuestions(pool);
    expect(kept.map((q) => q.id)).toEqual(["q1", "q2", "q3", "q4"]);
  });

  it("respects pre-existing template and concept exclusions in strict mode", () => {
    const kept = dedupeQuestions(
      [{ question: GENUINELY_NEW, id: "x" }],
      new Set(),
      {
        strict: true,
        excludeTemplates: new Set([templateFingerprint(GENUINELY_NEW)]),
      }
    );
    expect(kept).toHaveLength(0);
  });
});

describe("rejectAgainstBank", () => {
  it("rejects an exact repeat of a banked concept", () => {
    const bank = snapshotOf([VALUE_SWAP_A]);
    const { kept, rejected } = rejectAgainstBank([{ question: VALUE_SWAP_A }], bank, {
      strict: true,
    });
    expect(kept).toHaveLength(0);
    expect(rejected).toHaveLength(1);
  });

  it("rejects a value-swapped variant of a banked concept", () => {
    const bank = snapshotOf([VALUE_SWAP_A]);
    const { kept, rejected } = rejectAgainstBank([{ question: VALUE_SWAP_B }], bank, {
      strict: true,
    });
    expect(kept).toHaveLength(0);
    expect(rejected).toHaveLength(1);
  });

  it("rejects a reworded near-duplicate via token similarity", () => {
    const bank = snapshotOf([
      "Which data structure uses FIFO ordering, allowing insertion at the back and removal from the front?",
    ]);
    const { kept } = rejectAgainstBank(
      [
        {
          question:
            "Which data structure uses FIFO ordering for its operations, allowing insertion at the back and removal from the front?",
        },
      ],
      bank,
      { strict: true }
    );
    expect(kept).toHaveLength(0);
  });

  it("keeps genuinely new concepts", () => {
    const bank = snapshotOf([VALUE_SWAP_A]);
    const { kept } = rejectAgainstBank(
      [{ question: GENUINELY_NEW }, { question: OTHER_NEW }],
      bank,
      { strict: true }
    );
    expect(kept).toHaveLength(2);
  });

  it("collapses duplicates within a single batch", () => {
    const bank = snapshotOf([]);
    const { kept } = rejectAgainstBank(
      [{ question: GENUINELY_NEW }, { question: GENUINELY_NEW }, { question: OTHER_NEW }],
      bank,
      { strict: true }
    );
    expect(kept).toHaveLength(2);
  });

  it("treats extraTexts from the same run as already-banked", () => {
    const bank = snapshotOf([]);
    const { kept } = rejectAgainstBank([{ question: GENUINELY_NEW }], bank, {
      strict: true,
      extraTexts: [GENUINELY_NEW],
    });
    expect(kept).toHaveLength(0);
  });
});

describe("bank scope is global, not per-source", () => {
  it("an aptitude concept also blocks the identical MCQ concept", () => {
    // Uniqueness was chosen to be global: a concept appears once in the whole
    // database regardless of which engine proposes it.
    const bank = snapshotOf([VALUE_SWAP_A]);
    const { kept } = rejectAgainstBank([{ question: VALUE_SWAP_A }], bank, { strict: true });
    expect(kept).toHaveLength(0);
  });

  it("exposes the concept signature for reporting", () => {
    const d = dedupInfoFromQuestion({ question: VALUE_SWAP_A });
    expect(d.conceptSignature).toMatch(/^c[0-9a-f]{32}$/);
  });
});

describe("buildAvoidanceBlock", () => {
  it("is empty when the bank has no entries", () => {
    expect(buildAvoidanceBlock(snapshotOf([]))).toBe("");
  });

  it("tells the model that renumbering is not a new question", () => {
    const block = buildAvoidanceBlock(snapshotOf([VALUE_SWAP_A, OTHER_NEW]));
    expect(block).toContain("ABSOLUTE UNIQUENESS REQUIREMENT");
    expect(block).toMatch(/NUMBERS/);
    expect(block).toContain("rejected");
  });
});

describe("QuestionPoolExhaustedError", () => {
  it("is a 409 with an actionable payload rather than a 500", () => {
    const err = new QuestionPoolExhaustedError("Time & Work", 30, 12, ["trains at 40 km/h"]);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(409);
    expect(err.status).toBe(409);
    expect(err.requested).toBe(30);
    expect(err.uniqueAvailable).toBe(12);
    expect(err.details.reason).toBe("question_pool_exhausted");
    expect(err.details.scope).toBe("Time & Work");
    expect(err.message).toContain("No duplicates were written");
  });
});

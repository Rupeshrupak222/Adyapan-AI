import {
  SIMILARITY_THRESHOLD,
  areSimilar,
  dedupInfoFromQuestion,
  filterQuestionsAgainstSeen,
  fingerprint,
  isTextSeen,
  normalizeQuestionText,
  sanitizeGeneratedQuestions,
  seenRegistryFromTexts,
  similarityScore,
  stripBracketedPrefix,
  templateFingerprint,
  validateGeneratedQuestion,
} from "../../../src/lib/questions/question-fingerprint";

const EXACT_A = "Which data structure uses FIFO ordering, allowing insertion at the back and removal from the front?";
const ATTR_ORDER_A = "Which data structure uses FIFO ordering for its operations, allowing insertion at the back and removal from the front?";
const UNRELATED_B = "Which sorting algorithm recursively divides the array and merges the halves back in sorted order?";

describe("stripBracketedPrefix", () => {
  it("strips [Company Exam Pattern] style prefixes", () => {
    expect(stripBracketedPrefix("[Company Exam Pattern] In Ruby, nil is an object.")).toBe(
      "In Ruby, nil is an object."
    );
  });

  it("strips [Topic Test N Q i] style prefixes", () => {
    expect(stripBracketedPrefix("[Topic Test 3 - Q7] What is 7 * 6?")).toBe("What is 7 * 6?");
  });

  it("strips multiple stacked prefixes and trims", () => {
    expect(stripBracketedPrefix("   [Section A] [Company Exam Pattern]   Which type is immutable?  ")).toBe(
      "Which type is immutable?"
    );
  });

  it("leaves plain text untouched", () => {
    expect(stripBracketedPrefix("What is the time complexity of binary search?")).toBe(
      "What is the time complexity of binary search?"
    );
  });
});

describe("normalizeQuestionText", () => {
  it("lowercases, collapses whitespace and removes emphasis markup", () => {
    expect(normalizeQuestionText("What   is  RDBMS?\n  It is a  database")).toBe(
      "what is rdbms? it is a database"
    );
  });

  it("ignores inline code and bullets", () => {
    const out = normalizeQuestionText("• Given `x = 5`, what is x?");
    expect(out).toContain("given");
    expect(out).toContain("5");
    expect(out).not.toContain("•");
    expect(out).not.toContain("=");
  });

  it("keeps unicode letters", () => {
    expect(normalizeQuestionText("Qué es un índice?")).toBe("qué es un índice?");
  });
});

describe("fingerprint vs templateFingerprint", () => {
  it("is identical for byte-identical text", () => {
    expect(fingerprint("What is 2+2?")).toBe(fingerprint("  what is 2+2?  "));
  });

  it("ignores bracketed prefixes", () => {
    expect(fingerprint("[Company Exam Pattern] What is 2+2?")).toBe(fingerprint("What is 2+2?"));
  });

  it("fingerprint (number-sensitive) differs when numbers change", () => {
    expect(fingerprint("What is 2+2?")).not.toBe(fingerprint("What is 3+3?"));
  });

  it("template fingerprint masks digit changes", () => {
    expect(templateFingerprint("What is 2+2?")).toBe(templateFingerprint("What is 3+3?"));
  });

  it("template fingerprint still distinguishes real wording differences", () => {
    expect(templateFingerprint("What is 2+2?")).not.toBe(templateFingerprint("Which is a prime number?"));
  });

  it("dedupInfoFromQuestion prefers question over text and appends the code snippet", () => {
    const d = dedupInfoFromQuestion({
      question: "[Company Exam Pattern] What does `nil` return?",
      text: "IGNORED",
      codeSnippet: "puts nil.nil?",
    });
    expect(d.text).toContain("What does");
    expect(d.text).toContain("puts nil.nil?");
    expect(d.text).not.toContain("IGNORED");
    expect(d.normalized).not.toContain("[company exam pattern]");
  });
});

describe("similarity", () => {
  it("flags reworded near-identical questions as similar", () => {
    expect(similarityScore(EXACT_A, ATTR_ORDER_A)).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    expect(areSimilar(EXACT_A, ATTR_ORDER_A)).toBe(true);
  });

  it("keeps genuinely different questions as not similar", () => {
    expect(similarityScore(EXACT_A, UNRELATED_B)).toBeLessThan(SIMILARITY_THRESHOLD);
    expect(areSimilar(EXACT_A, UNRELATED_B)).toBe(false);
  });

  it("returns 1 for exact and template-equivalent questions", () => {
    expect(similarityScore("Add 2 and 3", "add 2 and 3")).toBe(1);
    expect(similarityScore("Add 27 and 39", "add 100 and 7")).toBe(1);
  });
});

describe("isTextSeen / seenRegistryFromTexts", () => {
  it("detects exact, template-variant and similar repeats", () => {
    const seen = seenRegistryFromTexts(["[Company Exam Pattern] " + EXACT_A]);
    expect(isTextSeen(EXACT_A, seen)).toBe(true);
    expect(isTextSeen(ATTR_ORDER_A, seen)).toBe(true);
    expect(isTextSeen(UNRELATED_B, seen)).toBe(false);
  });
});

describe("filterQuestionsAgainstSeen", () => {
  it("drops duplicates, template variants and similar rewrites while keeping distinct questions", () => {
    const seen = seenRegistryFromTexts(["Where does 5 + 5 land?"]);
    const pool = [
      { question: "Where does 5 + 5 land?", id: "q1" },
      { question: "Where does 25 + 25 land?", id: "q2" }, // same template
      { question: EXACT_A, id: "q3" },
      { question: ATTR_ORDER_A, id: "q4" }, // similar to q3
      { question: UNRELATED_B, id: "q5" },
    ];
    const kept = filterQuestionsAgainstSeen(pool, seen);
    const ids = kept.map((k) => k.id);
    expect(ids).toContain("q5");
    expect(ids).not.toContain("q2");
    expect(ids.reduce((acc, id) => acc + (id === "q3" || id === "q4" ? 1 : 0), 0)).toBe(1);
  });
});

describe("quality validation", () => {
  it("rejects missing, short, placeholder and malformed questions", () => {
    expect(validateGeneratedQuestion({ question: "x", options: [], correctIdx: 0 }, 0)).not.toBeNull();
    expect(
      validateGeneratedQuestion({ question: "temporarily busy generating", options: ["a", "b", "c", "d"], correctIdx: 0 }, 0)
    ).not.toBeNull();
    const ok = validateGeneratedQuestion(
      { question: "A valid question of sufficient length?", options: ["a", "b", "c", "d"], correctIdx: 2 },
      0
    );
    expect(ok).toBeNull();
  });

  it("sanitizeGeneratedQuestions splits valid from rejected", () => {
    const { valid, rejected } = sanitizeGeneratedQuestions([
      { question: "A valid question of sufficient length?", options: ["a", "b", "c", "d"], correctIdx: 0 },
      { question: "bad", options: ["x"], correctIdx: 9 },
    ]);
    expect(valid).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ index: 1 });
  });
});
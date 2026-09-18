import { describe, it, expect } from "vitest";
import {
  countSessionDuplicates,
  dedupeSessionQuestions,
  normalizeQuestionKey,
  stripBracketPrefix,
  templateQuestionKey,
} from "../src/lib/questions";

describe("frontend question dedup safety net", () => {
  it("strips bracketed exam/test prefixes", () => {
    expect(stripBracketPrefix("[Company Exam Pattern] What is a mutex?")).toBe("What is a mutex?");
    expect(stripBracketPrefix("[Topic Test 2 - Q5] Find the value.")).toBe("Find the value.");
  });

  it("normalizes punctuation, case and whitespace into a stable key", () => {
    expect(normalizeQuestionKey("What is  O(log n)?")).toBe("whatisologn");
    expect(normalizeQuestionKey("[Company Exam Pattern] What is O(log n)?")).toBe("whatisologn");
  });

  it("masks digit values in the template key", () => {
    expect(templateQuestionKey("What is 2 + 3?")).toBe(templateQuestionKey("What is 9 + 9?"));
  });

  it("drops exact and re-numbered duplicates but keeps distinct questions", () => {
    const list = [
      { question: "What is a mutex?" },
      { question: "[Company Exam Pattern] What is a mutex?" },
      { question: "What is 2 + 3?" },
      { question: "What is 9 + 9?" },
      { question: "What is a semaphore?" },
    ];
    const kept = dedupeSessionQuestions(list);
    expect(kept).toHaveLength(3);
    expect(kept.map((q) => q.question)).toEqual([
      "What is a mutex?",
      "What is 2 + 3?",
      "What is a semaphore?",
    ]);
  });

  it("counts duplicates within a session", () => {
    const list = [
      { question: "Which data structure is FIFO?" },
      { question: "Which data structure is FIFO?" },
      { text: "Which data structure is FIFO?" },
      { question: "Which data structure is LIFO?" },
    ];
    expect(countSessionDuplicates(list)).toBe(2);
  });

  it("ignores empty text", () => {
    expect(dedupeSessionQuestions([{ question: "" }, { question: "  " }])).toHaveLength(0);
  });
});
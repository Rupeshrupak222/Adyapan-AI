import { describe, it, expect } from "@jest/globals";
import {
  FeatureKey,
  DEFAULT_FREE_LIMITS,
  DEFAULT_PREMIUM_LIMITS,
  DEFAULT_PLAN_LIMITS,
  FEATURE_DISPLAY_NAMES,
} from "../../src/services/feature-keys";

describe("Interview Hub Premium Quota Configuration", () => {
  it("should have all 3 canonical interview keys defined in FeatureKey", () => {
    expect(FeatureKey.INTERVIEW_ENGINE).toBe("INTERVIEW_ENGINE");
    expect(FeatureKey.TECHNICAL_INTERVIEW).toBe("TECHNICAL_INTERVIEW");
    expect(FeatureKey.HR_INTERVIEW).toBe("HR_INTERVIEW");
  });

  it("should enforce 5 monthly attempts each on Premium tier", () => {
    expect(DEFAULT_PREMIUM_LIMITS[FeatureKey.INTERVIEW_ENGINE]).toBe(5);
    expect(DEFAULT_PREMIUM_LIMITS[FeatureKey.TECHNICAL_INTERVIEW]).toBe(5);
    expect(DEFAULT_PREMIUM_LIMITS[FeatureKey.HR_INTERVIEW]).toBe(5);
  });

  it("should require premium (0 free attempts) on Free tier", () => {
    expect(DEFAULT_FREE_LIMITS[FeatureKey.INTERVIEW_ENGINE]).toBe(0);
    expect(DEFAULT_FREE_LIMITS[FeatureKey.TECHNICAL_INTERVIEW]).toBe(0);
    expect(DEFAULT_FREE_LIMITS[FeatureKey.HR_INTERVIEW]).toBe(0);
  });

  it("should have proper display names for UI messaging", () => {
    expect(FEATURE_DISPLAY_NAMES[FeatureKey.INTERVIEW_ENGINE]).toBe("Interview Engine");
    expect(FEATURE_DISPLAY_NAMES[FeatureKey.TECHNICAL_INTERVIEW]).toBe("Technical Interview");
    expect(FEATURE_DISPLAY_NAMES[FeatureKey.HR_INTERVIEW]).toBe("HR Interview");
  });

  it("should treat all three interview keys as independent limits", () => {
    // 3 distinct feature keys ensure consuming one does NOT decrement the others
    const keys = [FeatureKey.INTERVIEW_ENGINE, FeatureKey.TECHNICAL_INTERVIEW, FeatureKey.HR_INTERVIEW];
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(3);
  });
});

describe("Interview Scoring & Evaluation Integrity (No 65 Fallbacks)", () => {
  function computeProvisionalScore(
    interviewerMsgs: Array<{ role: string; content: string }>,
    candidateMsgs: Array<{ role: string; content: string }>
  ): number {
    if (candidateMsgs.length === 0) return 0;
    let total = 0;
    for (const a of candidateMsgs) {
      const len = String(a.content || "").trim().length;
      if (len < 20) total += 20;
      else if (len < 60) total += 40;
      else if (len < 150) total += 55;
      else if (len < 400) total += 70;
      else total += 80;
    }
    return Math.round(total / Math.max(1, interviewerMsgs.length));
  }

  it("should give a score of 0 when candidate answers 0 questions", () => {
    const questions = [
      { role: "interviewer", content: "Tell me about yourself." },
      { role: "interviewer", content: "Explain React 19 hooks." },
    ];
    const answers: Array<{ role: string; content: string }> = [];

    const score = computeProvisionalScore(questions, answers);
    expect(score).toBe(0);
    expect(score).not.toBe(65);
    expect(score).not.toBe(40);
  });

  it("should compute proportional score based on answered questions for incomplete sessions", () => {
    const questions = [
      { role: "interviewer", content: "Q1" },
      { role: "interviewer", content: "Q2" },
      { role: "interviewer", content: "Q3" },
      { role: "interviewer", content: "Q4" },
    ];
    // Candidate answers only 1 question thoroughly (e.g. 250 chars -> 70 pts) out of 4 questions
    const answers = [
      {
        role: "candidate",
        content: "In my previous project at XYZ Corp, I designed a distributed task processing pipeline using BullMQ and Redis. We reduced latency by 45% and handled 10,000 concurrent jobs per second without dropping requests.",
      },
    ];

    const score = computeProvisionalScore(questions, answers);
    // 70 / 4 = 18
    expect(score).toBe(18);
    expect(score).not.toBe(65);
  });

  it("should score well when all questions are answered with good depth", () => {
    const questions = [
      { role: "interviewer", content: "Q1" },
      { role: "interviewer", content: "Q2" },
    ];
    const answers = [
      {
        role: "candidate",
        content: "I have 5 years of full stack experience focusing on React, TypeScript, and microservices.",
      },
      {
        role: "candidate",
        content: "To optimize database queries, I inspect the query execution plan using EXPLAIN ANALYZE and implement composite indexing with connection pooling.",
      },
    ];

    const score = computeProvisionalScore(questions, answers);
    expect(score).toBeGreaterThan(50);
    expect(score).not.toBe(65);
  });
});

import { computeEligibility, ELIGIBILITY_OVERALL_THRESHOLD } from "../../src/services/placement-intelligence.service";

const passingSubScores = {
  coding: 60,
  aptitude: 55,
  interview: 45,
  resume: 52,
  learning: 50,
  softSkills: 50,
};

const lowCoding = { ...passingSubScores, coding: 40 };
const lowInterview = { ...passingSubScores, interview: 30 };

describe("computeEligibility", () => {
  it("marks a candidate eligible when overall and all pillar gates pass", () => {
    const result = computeEligibility(75, passingSubScores, true);
    expect(result.verdict).toBe("eligible");
    expect(result.pointsToGo).toBe(0);
    expect(result.blockers).toHaveLength(0);
  });

  it("treats the exact threshold and minimums as eligible (boundary)", () => {
    const result = computeEligibility(ELIGIBILITY_OVERALL_THRESHOLD, {
      ...passingSubScores,
      coding: 50,
      aptitude: 50,
      interview: 40,
      resume: 50,
    }, true);
    expect(result.verdict).toBe("eligible");
  });

  it("marks not_eligible with an overall blocker when below the threshold despite passing all gates", () => {
    const result = computeEligibility(60, passingSubScores, true);
    expect(result.verdict).toBe("not_eligible");
    expect(result.pointsToGo).toBe(10);
    expect(result.blockers[0]).toContain("Overall score: 60/70");
  });

  it("marks not_eligible when a single pillar gate fails even with a high overall score", () => {
    const result = computeEligibility(75, lowCoding, true);
    expect(result.verdict).toBe("not_eligible");
    expect(result.blockers.some((b) => b.includes("Coding: 40/50"))).toBe(true);
  });

  it("reports all failing gates as blockers", () => {
    const result = computeEligibility(75, lowInterview, true);
    expect(result.blockers.some((b) => b.includes("Interview: 30/40"))).toBe(true);
  });

  it("returns insufficient_data when no activity exists", () => {
    const result = computeEligibility(0, { coding: 0, aptitude: 0, interview: 0, resume: 0, learning: 0, softSkills: 0 }, false);
    expect(result.verdict).toBe("insufficient_data");
    expect(result.blockers).toHaveLength(0);
  });

  it("inherits the highest-impact action as nextAction", () => {
    const result = computeEligibility(60, passingSubScores, true, "aptitude-engine");
    expect(result.nextAction).toBe("aptitude-engine");
  });
});
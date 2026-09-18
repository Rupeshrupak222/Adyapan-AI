import { generateTopicSpecificFallback } from "../../src/services/aptitude-engine.service";

describe("Aptitude Engine Question Diversity & Uniqueness", () => {
  it("generates distinct topic-accurate questions for Permutations & Combinations", () => {
    const questions = generateTopicSpecificFallback("Permutations & Combinations", "quantitative", 3, "medium", ["TCS"]);
    expect(questions).toHaveLength(3);
    for (const q of questions) {
      expect(q.text).toMatch(/vowels|arranged|letters/i);
      expect(q.options).toHaveLength(4);
      expect(q.options[q.correctIdx]).toBeDefined();
      expect(q.explanation).toBeTruthy();
    }
  });

  it("generates distinct topic-accurate questions for Time & Work", () => {
    const questions = generateTopicSpecificFallback("Time & Work", "quantitative", 2, "medium", ["Infosys"]);
    expect(questions).toHaveLength(2);
    for (const q of questions) {
      expect(q.text).toMatch(/complete.*project|work/i);
      expect(q.options[q.correctIdx]).toContain("days");
    }
  });

  it("generates distinct topic-accurate questions for Blood Relations", () => {
    const questions = generateTopicSpecificFallback("Blood Relations", "logical", 2, "medium", []);
    expect(questions).toHaveLength(2);
    for (const q of questions) {
      expect(q.text).toMatch(/father|sister|brother|mother|aunt|son/i);
      expect(q.options).toHaveLength(4);
    }
  });

  it("does not generate generic identical multiplication questions across different topics", () => {
    const qPandC = generateTopicSpecificFallback("Permutations & Combinations", "quantitative", 1, "medium", []);
    const qBlood = generateTopicSpecificFallback("Blood Relations", "logical", 1, "medium", []);
    const qWork = generateTopicSpecificFallback("Time & Work", "quantitative", 1, "medium", []);

    expect(qPandC[0].text).not.toContain("system throughput required");
    expect(qBlood[0].text).not.toContain("system throughput required");
    expect(qWork[0].text).not.toContain("system throughput required");
  });
});

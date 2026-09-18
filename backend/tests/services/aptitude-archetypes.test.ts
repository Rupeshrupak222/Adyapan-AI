import { buildDiversifiedTopicTest } from "../../src/services/aptitude-archetypes";
import { ALL_TOPICS_BY_CATEGORY } from "../../src/services/aptitude-test-bank.service";

function stripPrefix(text: string): string {
  return text.replace(/^\[[^\]]*\]\s*/, "").trim();
}

describe("Diversified Topic Test Builder (Aptitude Archetypes)", () => {
  it("every quantitative topic produces 30 distinct, internally valid questions per test", () => {
    for (const topic of ALL_TOPICS_BY_CATEGORY.quantitative) {
      const test = buildDiversifiedTopicTest(topic, "quantitative", 1);
      expect(test).toHaveLength(30);

      const texts = new Set<string>();
      for (const q of test) {
        expect(q.options).toHaveLength(4);
        expect(q.correctIdx).toBeGreaterThanOrEqual(0);
        expect(q.correctIdx).toBeLessThan(4);
        expect(q.options[q.correctIdx]).toBeTruthy();
        expect(q.explanation).toBeTruthy();
        expect(q.options.filter((o, idx) => idx !== q.correctIdx)).not.toContain(q.options[q.correctIdx]);
        texts.add(q.text.trim());
      }
      expect(texts.size).toBe(30);
    }
  });

  it("same topic shows different question patterns across successive tests", () => {
    for (const topic of ALL_TOPICS_BY_CATEGORY.quantitative) {
      const t1 = buildDiversifiedTopicTest(topic, "quantitative", 1);
      const t2 = buildDiversifiedTopicTest(topic, "quantitative", 2);

      // Position-by-position: the archetype at each slot is biased by testNum,
      // so the same slot in Test 1 and Test 2 must not be the same question stem.
      const identicalSlots = t1.filter((q, idx) => stripPrefix(q.text) === stripPrefix(t2[idx].text)).length;
      expect(identicalSlots).toBeLessThanOrEqual(10);
    }
  });

  it("different quantitative topics no longer share the same generic pattern set", () => {
    const testsByTopic = new Map<string, Set<string>>();
    for (const topic of ALL_TOPICS_BY_CATEGORY.quantitative) {
      const test = buildDiversifiedTopicTest(topic, "quantitative", 1);
      testsByTopic.set(topic, new Set(test.map(q => stripPrefix(q.text))));
    }

    const topics = Array.from(testsByTopic.keys());
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const shared = Array.from(testsByTopic.get(topics[j])!).filter(text => testsByTopic.get(topics[i])!.has(text)).length;
        expect(shared).toBeLessThanOrEqual(15);
      }
    }
  });

  it("company tests rotate through a broad mix of quantitative families", () => {
    const test = buildDiversifiedTopicTest("TCS", "company", 1);
    expect(test).toHaveLength(30);

    const topics = new Set(test.map(q => q.topic));
    const quantitativeCount = test.filter(q => q.category === "quantitative").length;
    expect(topics.size).toBeGreaterThanOrEqual(6);
    expect(quantitativeCount).toBeGreaterThanOrEqual(10);
  });
});
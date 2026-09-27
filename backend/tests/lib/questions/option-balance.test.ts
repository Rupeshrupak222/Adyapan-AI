import {
  balanceCorrectOptionPositions,
  correctOptionDistribution,
  moveCorrectOptionTo,
} from "../../../src/lib/questions/option-balance";

describe("correct-answer position balancing", () => {
  describe("moveCorrectOptionTo", () => {
    it("moves the correct option to the requested index and keeps the value", () => {
      const q = { options: ["A", "B", "C", "D"], correctIdx: 0 };
      const moved = moveCorrectOptionTo(q, 2);

      expect(moved.correctIdx).toBe(2);
      expect(moved.options[2]).toBe("A");
      // Distractors keep their relative order.
      expect(moved.options).toEqual(["B", "C", "A", "D"]);
    });

    it("is a no-op when the correct option is already in place", () => {
      const q = { options: ["A", "B", "C", "D"], correctIdx: 1 };
      expect(moveCorrectOptionTo(q, 1)).toBe(q);
    });

    it("clamps an out-of-range target instead of corrupting the options", () => {
      const q = { options: ["A", "B", "C", "D"], correctIdx: 0 };
      const moved = moveCorrectOptionTo(q, 99);
      expect(moved.correctIdx).toBe(3);
      expect(moved.options).toHaveLength(4);
      expect(moved.options).toContain("A");
    });

    it("leaves a malformed question alone", () => {
      expect(moveCorrectOptionTo({ options: ["A"], correctIdx: 0 }, 1).options).toEqual(["A"]);
      expect(moveCorrectOptionTo({ options: ["A", "B"], correctIdx: 5 }, 0).options).toEqual(["A", "B"]);
    });
  });

  describe("balanceCorrectOptionPositions", () => {
    it("fixes a test where every answer is option A", () => {
      const questions = Array.from({ length: 30 }, (_, i) => ({
        options: ["A", "B", "C", "D"],
        correctIdx: 0,
        id: `q${i}`,
      }));

      const balanced = balanceCorrectOptionPositions(questions);
      const dist = correctOptionDistribution(balanced);

      // 30 questions over 4 positions => 7/8 each, never 21 at index 0.
      expect(dist[0]).toBeLessThanOrEqual(8);
      for (const pos of [0, 1, 2, 3]) {
        expect(dist[pos]).toBeGreaterThanOrEqual(7);
        expect(dist[pos]).toBeLessThanOrEqual(8);
      }
    });

    it("preserves the correct answer's VALUE in every question", () => {
      const questions = Array.from({ length: 12 }, (_, i) => ({
        options: [`right${i}`, "w1", "w2", "w3"],
        correctIdx: 0,
      }));

      const balanced = balanceCorrectOptionPositions(questions);
      balanced.forEach((q, i) => {
        expect(q.options[q.correctIdx]).toBe(`right${i}`);
        // All distractors survive.
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
      });
    });

    it("does not cluster answers onto one letter in sequence", () => {
      const questions = Array.from({ length: 8 }, () => ({
        options: ["A", "B", "C", "D"],
        correctIdx: 0,
      }));
      const balanced = balanceCorrectOptionPositions(questions);
      const seq = balanced.map((q) => q.correctIdx);
      // Adjacent repeats would signal a fixed, guessable pattern.
      for (let i = 1; i < seq.length; i++) {
        expect(seq[i]).not.toBe(seq[i - 1]);
      }
    });

    it("handles mixed option counts without dropping questions", () => {
      const questions = [
        { options: ["A", "B", "C", "D"], correctIdx: 0 },
        { options: ["A", "B", "C"], correctIdx: 0 },
        { options: ["A", "B", "C", "D", "E"], correctIdx: 0 },
        { options: ["only"], correctIdx: 0 },
      ];
      const balanced = balanceCorrectOptionPositions(questions);

      expect(balanced).toHaveLength(4);
      expect(balanced[0].correctIdx).toBeGreaterThan(0);
      expect(balanced[1].correctIdx).toBeGreaterThan(0);
      expect(balanced[2].correctIdx).toBeGreaterThan(0);
      // A single-option question cannot be moved.
      expect(balanced[3].correctIdx).toBe(0);
    });

    it("tolerates an empty batch", () => {
      expect(balanceCorrectOptionPositions([])).toEqual([]);
    });
  });
});

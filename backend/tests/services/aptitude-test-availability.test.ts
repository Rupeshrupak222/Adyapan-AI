/**
 * Guards the temporary state left by the global duplicate prune: a test whose
 * questions were removed must be reported honestly, never refilled with
 * templated legacy content.
 */
const mockAptitudeTopicTest = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
};

const mockDb = {
  aptitudeTopicTest: mockAptitudeTopicTest,
};

jest.mock("../../src/utils/prisma", () => ({
  getPrisma: () => mockDb,
  masterPrisma: mockDb,
}));

import {
  AptitudeTestUnavailableError,
  getTopicTestByIdFromDb,
  getTopicTestsFromDb,
} from "../../src/services/aptitude-test-bank.service";

function makeQuestion(i: number) {
  return {
    id: `q${i}`,
    text: `Statement I concerns scenario ${i}. Statement II describes outcome ${i}.`,
    options: ["I causes II", "II causes I", "independent", "common cause"],
    correctIdx: 0,
    explanation: "Because of causality.",
  };
}

describe("Aptitude test availability after the global duplicate prune", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTopicTestsFromDb", () => {
    it("reports the real question count instead of the intended total", async () => {
      mockAptitudeTopicTest.findMany.mockResolvedValue([
        {
          id: "t1",
          category: "logical",
          topic: "Cause and Effect",
          testNumber: 1,
          title: "Test 1",
          // totalQuestions still says 30, but only 4 questions survived.
          totalQuestions: 30,
          questionsJson: [makeQuestion(1), makeQuestion(2), makeQuestion(3), makeQuestion(4)],
          difficulty: "medium",
        },
      ]);

      const [summary] = await getTopicTestsFromDb("Cause and Effect", "logical");

      expect(summary.totalQuestions).toBe(4);
      expect(summary.targetQuestions).toBe(30);
      expect(summary.isAvailable).toBe(true);
      expect(summary.status).toBe("available");
    });

    it("marks a fully emptied test as rebuilding rather than showing 30 questions", async () => {
      mockAptitudeTopicTest.findMany.mockResolvedValue([
        {
          id: "t2",
          category: "logical",
          topic: "Cause and Effect",
          testNumber: 2,
          title: "Test 2",
          totalQuestions: 0,
          questionsJson: [],
          difficulty: "medium",
        },
      ]);

      const [summary] = await getTopicTestsFromDb("Cause and Effect", "logical");

      // The old `t.totalQuestions || 30` reported 30 here and sent users into a
      // blank test.
      expect(summary.totalQuestions).toBe(0);
      expect(summary.isAvailable).toBe(false);
      expect(summary.status).toBe("rebuilding");
    });

    it("treats a whitespace-only question as no question", async () => {
      mockAptitudeTopicTest.findMany.mockResolvedValue([
        {
          id: "t3",
          category: "quantitative",
          topic: "Averages",
          testNumber: 1,
          title: "Test 1",
          totalQuestions: 30,
          questionsJson: [{ text: "   " }, { text: "" }],
          difficulty: "medium",
        },
      ]);

      const [summary] = await getTopicTestsFromDb("Averages", "quantitative");
      expect(summary.isAvailable).toBe(false);
    });
  });

  describe("getTopicTestByIdFromDb", () => {
    it("refuses to serve an emptied test and never rewrites it with legacy questions", async () => {
      mockAptitudeTopicTest.findUnique.mockResolvedValue({
        id: "t2",
        category: "logical",
        topic: "Cause and Effect",
        testNumber: 2,
        title: "Test 2",
        totalQuestions: 0,
        questionsJson: [],
        difficulty: "medium",
      });

      await expect(getTopicTestByIdFromDb("t2")).rejects.toBeInstanceOf(
        AptitudeTestUnavailableError
      );

      // This is the important assertion: the legacy fallback used to fire for
      // empty arrays and persist 30 templated duplicates, undoing the prune.
      expect(mockAptitudeTopicTest.update).not.toHaveBeenCalled();
    });

    it("exposes an actionable 503 payload for the client", async () => {
      mockAptitudeTopicTest.findUnique.mockResolvedValue({
        id: "t2",
        category: "logical",
        topic: "Cause and Effect",
        testNumber: 2,
        title: "Test 2",
        totalQuestions: 0,
        questionsJson: [],
        difficulty: "medium",
      });

      const err: AptitudeTestUnavailableError = await getTopicTestByIdFromDb("t2").catch((e) => e);

      expect(err.statusCode).toBe(503);
      expect(err.code).toBe("TEST_BEING_REBUILT");
      // 5xx messages are masked in production unless explicitly exposed.
      expect(err.expose).toBe(true);
      expect(err.details.reason).toBe("no_questions_yet");
      expect(err.message).toMatch(/being rebuilt/i);
    });

    it("still serves a partially filled test with its real question count", async () => {
      mockAptitudeTopicTest.findUnique.mockResolvedValue({
        id: "t4",
        category: "quantitative",
        topic: "Averages",
        testNumber: 1,
        title: "Test 1",
        totalQuestions: 30,
        questionsJson: [makeQuestion(1), makeQuestion(2)],
        difficulty: "medium",
      });

      const result = await getTopicTestByIdFromDb("t4");

      expect(result.questions).toHaveLength(2);
      expect(result.totalQuestions).toBe(2);
      expect(mockAptitudeTopicTest.update).not.toHaveBeenCalled();
    });
  });
});

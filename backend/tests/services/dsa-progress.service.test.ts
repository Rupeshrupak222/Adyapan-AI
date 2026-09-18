import { DsaProgressService } from "../../src/services/dsa-progress.service";

describe("DsaProgressService", () => {
  const mockUserPrisma = {
    userQuestionProgress: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    submission: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    challengeSubmission: {
      findMany: jest.fn(),
    },
    codeExecution: {
      findMany: jest.fn(),
    },
    learningStreak: {
      findUnique: jest.fn(),
    },
    dSAProgress: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    codingSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    codingMessage: {
      create: jest.fn(),
    },
    streakEvent: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateAndSyncProgress", () => {
    it("correctly aggregates solved count, accuracy, and streak across modules", async () => {
      mockUserPrisma.userQuestionProgress.findMany.mockResolvedValueOnce([
        { questionId: "q1" },
        { questionId: "q2" },
      ]);
      mockUserPrisma.submission.findMany.mockResolvedValueOnce([
        { problemId: "q2" }, // Duplicate with q2
        { problemId: "q3" },
      ]);
      mockUserPrisma.challengeSubmission.findMany.mockResolvedValueOnce([
        { challengeId: "c1" },
      ]);

      // Executions: 4 total, 3 accepted => 75% accuracy
      mockUserPrisma.codeExecution.findMany.mockResolvedValueOnce([
        { status: "Accepted" },
        { status: "Accepted" },
        { status: "Runtime Error" },
        { status: "Accepted" },
      ]);
      mockUserPrisma.submission.findMany.mockResolvedValueOnce([]);
      mockUserPrisma.userQuestionProgress.findMany.mockResolvedValueOnce([]);

      mockUserPrisma.learningStreak.findUnique.mockResolvedValueOnce({
        currentStreak: 5,
      });

      mockUserPrisma.dSAProgress.findFirst.mockResolvedValueOnce({
        id: "dsa-1",
        solved: 0,
        accuracy: 0,
        streak: 0,
      });

      mockUserPrisma.dSAProgress.update.mockResolvedValueOnce({
        id: "dsa-1",
        solved: 4,
        accuracy: 75,
        streak: 5,
      });

      const result = await DsaProgressService.calculateAndSyncProgress("user-1", mockUserPrisma);

      expect(result.solved).toBe(4); // q1, q2, q3, c1
      expect(result.accuracy).toBe(75);
      expect(result.streak).toBe(5);
      expect(result.challengesSolved).toBe(1);
    });

    it("handles empty activity gracefully", async () => {
      mockUserPrisma.userQuestionProgress.findMany.mockResolvedValueOnce([]);
      mockUserPrisma.submission.findMany.mockResolvedValueOnce([]);
      mockUserPrisma.challengeSubmission.findMany.mockResolvedValueOnce([]);
      mockUserPrisma.codeExecution.findMany.mockResolvedValueOnce([]);
      mockUserPrisma.submission.findMany.mockResolvedValueOnce([]);
      mockUserPrisma.userQuestionProgress.findMany.mockResolvedValueOnce([]);
      mockUserPrisma.learningStreak.findUnique.mockResolvedValueOnce(null);
      mockUserPrisma.dSAProgress.findFirst.mockResolvedValueOnce(null);
      mockUserPrisma.dSAProgress.create.mockResolvedValueOnce({
        id: "dsa-new",
        solved: 0,
        accuracy: 0,
        streak: 0,
      });

      const result = await DsaProgressService.calculateAndSyncProgress("user-empty", mockUserPrisma);

      expect(result.solved).toBe(0);
      expect(result.accuracy).toBe(0);
      expect(result.streak).toBe(0);
      expect(result.challengesSolved).toBe(0);
    });
  });

  describe("recordAICodingChat", () => {
    it("creates a session and messages when chat session does not exist", async () => {
      mockUserPrisma.codingSession.findFirst.mockResolvedValueOnce(null);
      mockUserPrisma.codingSession.create.mockResolvedValueOnce({
        id: "session-1",
        userId: "user-1",
        title: "AI Coach: Two Sum",
        mode: "chat",
      });
      mockUserPrisma.codingMessage.create.mockResolvedValue({});
      mockUserPrisma.codingSession.update.mockResolvedValue({});

      const session = await DsaProgressService.recordAICodingChat(
        "user-1",
        "AI Coach: Two Sum",
        "How do I use a hash map?",
        "Store elements and check complement.",
        mockUserPrisma,
        "chat"
      );

      expect(session).toBeDefined();
      expect(mockUserPrisma.codingSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          mode: "chat",
        }),
      });
      expect(mockUserPrisma.codingMessage.create).toHaveBeenCalledTimes(2);
    });
  });
});

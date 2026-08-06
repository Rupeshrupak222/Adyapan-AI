import type { Request, Response, NextFunction } from "express";

// ─── Mocks (must appear before imports) ──────────────────────────────────────

const mockGetUserPrismaFromRequest = jest.fn();

jest.mock("../../src/utils/prisma", () => ({
  getUserPrismaFromRequest: (...args: unknown[]) => mockGetUserPrismaFromRequest(...args),
}));

jest.mock("../../src/middleware/auth", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = { userId: "user-1", email: "test@test.com", role: "USER" };
    next();
  },
}));

const mockExecuteCode = jest.fn();
const mockRunTestCases = jest.fn();

jest.mock("../../src/services/piston.service", () => ({
  executeCode: (...args: unknown[]) => mockExecuteCode(...args),
  runTestCases: (...args: unknown[]) => mockRunTestCases(...args),
}));

jest.mock("../../src/utils/routeError", () => ({
  handleRouteError: (res: any, _error: any, _context: string, message: string) => {
    res.status(500).json({ error: message });
  },
}));

// ─── Imports after mocks ────────────────────────────────────────────────────

import request from "supertest";
import express from "express";
import { challengesRouter } from "../../src/routes/challenges.routes";

// ─── Test helpers ───────────────────────────────────────────────────────────

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/challenges", challengesRouter);
  return app;
}

function createMockPrisma(overrides: Record<string, any> = {}) {
  const defaults = {
    challengeCategory: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    challenge: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    userQuestionProgress: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    challengeSubmission: {
      create: jest.fn().mockImplementation((_args: any) =>
        Promise.resolve({ id: "sub-1", ...(_args.data || {}) })
      ),
      findMany: jest.fn().mockResolvedValue([]),
    },
    leaderboard: {
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  return { ...defaults, ...overrides };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Challenges Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  // ─── GET / ────────────────────────────────────────────────────────────────

  describe("GET /api/challenges", () => {
    it("returns list of active challenges", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findMany.mockResolvedValue([
        { id: "ch-1", slug: "two-sum", title: "Two Sum", difficulty: "Easy" },
      ]);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app).get("/api/challenges");

      expect(res.status).toBe(200);
      expect(res.body.challenges).toHaveLength(1);
      expect(mockPrisma.challenge.findMany).toHaveBeenCalledWith({
        where: { category: { isActive: true } },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  // ─── GET /categories ──────────────────────────────────────────────────────

  describe("GET /api/challenges/categories", () => {
    it("returns empty array when no categories exist", async () => {
      const mockPrisma = createMockPrisma();
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app).get("/api/challenges/categories");

      expect(res.status).toBe(200);
      expect(res.body.categories).toEqual([]);
    });

    it("returns categories with computed stats", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challengeCategory.findMany.mockResolvedValue([
        {
          id: "cat-1",
          name: "DSA",
          slug: "dsa",
          description: "Data Structures",
          icon: "BinaryTree",
          gradient: "from-emerald-500 to-teal-500",
          color: "#10b981",
          sortOrder: 1,
          isActive: true,
          challenges: [
            { id: "ch-1", difficulty: "Easy" },
            { id: "ch-2", difficulty: "Medium" },
            { id: "ch-3", difficulty: "Hard" },
          ],
        },
      ]);
      mockPrisma.userQuestionProgress.findMany.mockResolvedValue([
        { questionId: "ch-1" },
      ]);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app).get("/api/challenges/categories");

      expect(res.status).toBe(200);
      expect(res.body.categories).toHaveLength(1);
      expect(res.body.categories[0].name).toBe("DSA");
      expect(res.body.categories[0].challengeCount).toBe(3);
      expect(res.body.categories[0].breakdown).toEqual({ easy: 1, medium: 1, hard: 1 });
      expect(res.body.categories[0].solved).toBe(1);
      expect(res.body.categories[0].progress).toBe(33);
    });

    it("calls handleRouteError on prisma failure", async () => {
      mockGetUserPrismaFromRequest.mockRejectedValue(new Error("DB connection failed"));

      const res = await request(app).get("/api/challenges/categories");

      expect(res.status).toBe(500);
    });
  });

  // ─── GET /categories/:slug ────────────────────────────────────────────────

  describe("GET /api/challenges/categories/:slug", () => {
    it("returns 404 for non-existent category", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challengeCategory.findUnique.mockResolvedValue(null);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app).get("/api/challenges/categories/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Category not found");
    });

    it("returns challenges for a valid category", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challengeCategory.findUnique.mockResolvedValue({
        id: "cat-1",
        name: "DSA",
        slug: "dsa",
        description: "Data Structures",
        icon: "BinaryTree",
        gradient: "from-emerald-500 to-teal-500",
        color: "#10b981",
      });
      mockPrisma.challenge.findMany.mockResolvedValue([
        { id: "ch-1", slug: "two-sum", title: "Two Sum", difficulty: "Easy", points: 100, topics: ["Arrays"], createdAt: new Date() },
        { id: "ch-2", slug: "valid-paren", title: "Valid Parentheses", difficulty: "Easy", points: 120, topics: ["Stack"], createdAt: new Date() },
      ]);
      mockPrisma.userQuestionProgress.findMany.mockResolvedValue([
        { questionId: "ch-1", solved: true, attempted: true, timeSpent: 120 },
      ]);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app).get("/api/challenges/categories/dsa");

      expect(res.status).toBe(200);
      expect(res.body.category.name).toBe("DSA");
      expect(res.body.challenges).toHaveLength(2);
      expect(res.body.stats.total).toBe(2);
      expect(res.body.stats.solved).toBe(1);
      expect(res.body.challenges[0].userStatus).toBe("solved");
      expect(res.body.challenges[1].userStatus).toBe("unsolved");
    });

    it("filters by difficulty", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challengeCategory.findUnique.mockResolvedValue({
        id: "cat-1", name: "DSA", slug: "dsa", description: "", icon: "", gradient: "", color: "",
      });
      mockPrisma.challenge.findMany.mockResolvedValue([
        { id: "ch-1", slug: "a", title: "A", difficulty: "Medium", points: 100, topics: [], createdAt: new Date() },
      ]);
      mockPrisma.userQuestionProgress.findMany.mockResolvedValue([]);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app)
        .get("/api/challenges/categories/dsa")
        .query({ difficulty: "Medium" });

      expect(res.status).toBe(200);
      expect(mockPrisma.challenge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ difficulty: "Medium" }) })
      );
    });

    it("filters by search query", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challengeCategory.findUnique.mockResolvedValue({
        id: "cat-1", name: "DSA", slug: "dsa", description: "", icon: "", gradient: "", color: "",
      });
      mockPrisma.challenge.findMany.mockResolvedValue([]);
      mockPrisma.userQuestionProgress.findMany.mockResolvedValue([]);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      await request(app)
        .get("/api/challenges/categories/dsa")
        .query({ search: "two" });

      expect(mockPrisma.challenge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ title: expect.objectContaining({ contains: "two" }) }) })
      );
    });
  });

  // ─── GET /:slug ───────────────────────────────────────────────────────────

  describe("GET /api/challenges/:slug", () => {
    it("returns 404 for non-existent challenge", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue(null);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app).get("/api/challenges/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Challenge not found");
    });

    it("returns challenge detail with category info", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue({
        id: "ch-1",
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "Easy",
        points: 100,
        description: "Given an array...",
        topics: ["Arrays", "Hash Map"],
        testCases: [{ input: "[2,7,11,15], 9", expected: "[0,1]" }],
        category: { slug: "dsa", name: "DSA" },
      });
      mockPrisma.userQuestionProgress.findUnique.mockResolvedValue({
        userId: "user-1",
        questionId: "ch-1",
        solved: true,
        attempted: true,
        timeSpent: 60,
      });
      mockPrisma.challengeSubmission.findMany.mockResolvedValue([]);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app).get("/api/challenges/two-sum");

      expect(res.status).toBe(200);
      expect(res.body.challenge.title).toBe("Two Sum");
      expect(res.body.challenge.categorySlug).toBe("dsa");
      expect(res.body.challenge.categoryName).toBe("DSA");
      expect(res.body.userProgress.solved).toBe(true);
    });
  });

  // ─── POST /run ────────────────────────────────────────────────────────────

  describe("POST /api/challenges/run", () => {
    it("returns 400 when required fields are missing", async () => {
      const mockPrisma = createMockPrisma();
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app)
        .post("/api/challenges/run")
        .send({ challengeId: "ch-1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });

    it("returns 404 when challenge is not found", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue(null);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app)
        .post("/api/challenges/run")
        .send({ challengeId: "missing", code: "console.log(1)", language: "javascript" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Challenge not found");
    });

    it("runs code with custom stdin", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue({
        id: "ch-1",
        testCases: [{ input: "1", expected: "2" }],
      });
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);
      mockExecuteCode.mockResolvedValue({
        success: true,
        stdout: "hello",
        stderr: "",
        compile_output: "",
        executionTime: 0.1,
        memory: 1024,
        status: "Accepted",
      });

      const res = await request(app)
        .post("/api/challenges/run")
        .send({ challengeId: "ch-1", code: "console.log('hello')", language: "javascript", stdin: "test-input" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.output).toBe("hello");
      expect(mockExecuteCode).toHaveBeenCalledWith("javascript", "console.log('hello')", "test-input");
    });

    it("runs code against stored test cases when no stdin", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue({
        id: "ch-1",
        testCases: JSON.stringify([
          { input: "1", expected: "2" },
          { input: "3", expected: "4" },
        ]),
      });
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);
      mockRunTestCases.mockResolvedValue({
        allPassed: true,
        totalTests: 2,
        passedTests: 2,
        executionTime: 0.5,
        testResults: [
          { input: "1", expectedOutput: "2", actualOutput: "2", passed: true },
          { input: "3", expectedOutput: "4", actualOutput: "4", passed: true },
        ],
      });

      const res = await request(app)
        .post("/api/challenges/run")
        .send({ challengeId: "ch-1", code: "console.log(1)", language: "javascript" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sampleResults).toHaveLength(2);
      expect(mockRunTestCases).toHaveBeenCalled();
    });

    it("handles no test cases gracefully", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue({
        id: "ch-1",
        testCases: null,
      });
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);
      mockExecuteCode.mockResolvedValue({
        success: true,
        stdout: "output",
        stderr: "",
        compile_output: "",
        executionTime: 0.1,
        memory: 512,
        status: "Accepted",
      });

      const res = await request(app)
        .post("/api/challenges/run")
        .send({ challengeId: "ch-1", code: "console.log(1)", language: "javascript" });

      expect(res.status).toBe(200);
      expect(res.body.sampleResults).toEqual([]);
    });
  });

  // ─── POST /submit ─────────────────────────────────────────────────────────

  describe("POST /api/challenges/submit", () => {
    it("returns 400 when required fields are missing", async () => {
      const mockPrisma = createMockPrisma();
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app)
        .post("/api/challenges/submit")
        .send({ challengeId: "ch-1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });

    it("returns 404 when challenge is not found", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue(null);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app)
        .post("/api/challenges/submit")
        .send({ challengeId: "missing", code: "code", language: "javascript" });

      expect(res.status).toBe(404);
    });

    it("submits and awards XP when all test cases pass", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue({
        id: "ch-1",
        points: 250,
        testCases: JSON.stringify([{ input: "1", expected: "2" }]),
      });
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);
      mockRunTestCases.mockResolvedValue({
        allPassed: true,
        totalTests: 1,
        passedTests: 1,
        executionTime: 0.3,
        testResults: [
          { input: "1", expectedOutput: "2", actualOutput: "2", passed: true, executionResult: { executionTime: 0.3 } },
        ],
      });

      const res = await request(app)
        .post("/api/challenges/submit")
        .send({ challengeId: "ch-1", code: "solve(1)", language: "javascript" });

      expect(res.status).toBe(200);
      expect(res.body.allPassed).toBe(true);
      expect(res.body.submission.status).toBe("Accepted");
      expect(res.body.submission.score).toBe(250);
      expect(mockPrisma.leaderboard.upsert).toHaveBeenCalled();
      expect(mockPrisma.challengeSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "Accepted", score: 250 }),
        })
      );
    });

    it("does not award XP when test cases fail", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue({
        id: "ch-1",
        points: 250,
        testCases: JSON.stringify([{ input: "1", expected: "2" }]),
      });
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);
      mockRunTestCases.mockResolvedValue({
        allPassed: false,
        totalTests: 1,
        passedTests: 0,
        executionTime: 0.3,
        testResults: [
          { input: "1", expectedOutput: "2", actualOutput: "3", passed: false, executionResult: { executionTime: 0.3 } },
        ],
      });

      const res = await request(app)
        .post("/api/challenges/submit")
        .send({ challengeId: "ch-1", code: "solve(1)", language: "javascript" });

      expect(res.status).toBe(200);
      expect(res.body.allPassed).toBe(false);
      expect(res.body.submission.status).toBe("Failed");
      expect(res.body.submission.score).toBe(0);
      expect(mockPrisma.leaderboard.upsert).not.toHaveBeenCalled();
    });

    it("handles no test cases by running code directly", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.challenge.findUnique.mockResolvedValue({
        id: "ch-1",
        points: 100,
        testCases: null,
      });
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);
      mockExecuteCode.mockResolvedValue({
        success: true,
        stdout: "ok",
        stderr: "",
        executionTime: 0.1,
        memory: 512,
        status: "Accepted",
      });

      const res = await request(app)
        .post("/api/challenges/submit")
        .send({ challengeId: "ch-1", code: "console.log(1)", language: "javascript" });

      expect(res.status).toBe(200);
      expect(res.body.allPassed).toBe(true);
      expect(res.body.submission.status).toBe("Accepted");
      expect(mockExecuteCode).toHaveBeenCalled();
    });
  });

  // ─── GET /leaderboard/top ─────────────────────────────────────────────────

  describe("GET /api/challenges/leaderboard/top", () => {
    it("returns top 10 leaderboard entries", async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.leaderboard.findMany.mockResolvedValue([
        { userId: "u1", score: 500 },
        { userId: "u2", score: 300 },
      ]);
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app).get("/api/challenges/leaderboard/top");

      expect(res.status).toBe(200);
      expect(res.body.leaderboard).toHaveLength(2);
      expect(res.body.leaderboard[0].score).toBe(500);
      expect(mockPrisma.leaderboard.findMany).toHaveBeenCalledWith({
        orderBy: { score: "desc" },
        take: 10,
      });
    });

    it("returns empty leaderboard when no entries exist", async () => {
      const mockPrisma = createMockPrisma();
      mockGetUserPrismaFromRequest.mockResolvedValue(mockPrisma);

      const res = await request(app).get("/api/challenges/leaderboard/top");

      expect(res.status).toBe(200);
      expect(res.body.leaderboard).toEqual([]);
    });
  });
});

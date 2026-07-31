import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateDsaHint, reviewDsaSolution } from "../lib/ai/dsa";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { StreakService } from "../services/streak.service";
import { handleRouteError } from "../utils/routeError";
import { getTimezone } from "../utils/request";
import { executeCode } from "../services/piston.service";
import { prisma as masterPrisma } from "../config/prisma";

const router = Router();
router.use(requireAuth);

router.get("/problems", async (req: any, res) => {
  try {
    const { category, difficulty, company } = req.query;
    const filter: any = {};
    if (category) filter.category = category as string;
    if (difficulty) filter.difficulty = difficulty as string;
    if (company) filter.companies = { has: company as string };

    let problems: any[] = [];
    try {
      const userPrisma = await getUserPrismaFromRequest(req);
      problems = await userPrisma.problem.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' }
      });
    } catch { }

    if (!problems || problems.length === 0) {
      try {
        const cfProblems = await masterPrisma.codingQuestion.findMany({
          take: 100,
          orderBy: { rating: 'asc' }
        });
        if (cfProblems && cfProblems.length > 0) {
          problems = cfProblems.map((p: any) => ({
            id: p.id || p.externalId,
            title: p.title,
            category: p.topic || "Arrays",
            difficulty: p.difficulty || "Medium",
            rating: p.rating || 1200,
            description: `Solve the problem: ${p.title}. Topic: ${p.topic || "Data Structures"}.`,
            problemUrl: p.problemUrl || `https://codeforces.com/problemset`,
            source: p.source || "Codeforces",
            tags: p.tagsJson || ["Core DSA"],
          }));
        }
      } catch { }
    }

    if (!problems || problems.length === 0) {
      problems = [
        { id: "cf-1", title: "Two Sum", category: "Arrays", difficulty: "Easy", rating: 800, description: "Find indices of two numbers that add up to target.", source: "Codeforces/LeetCode" },
        { id: "cf-2", title: "Best Time to Buy and Sell Stock", category: "Arrays", difficulty: "Easy", rating: 900, description: "Maximize profit by choosing single day to buy and sell stock.", source: "Codeforces/LeetCode" },
        { id: "cf-3", title: "3Sum", category: "Two Pointers", difficulty: "Medium", rating: 1300, description: "Find all unique triplets in array that sum to zero.", source: "Codeforces/LeetCode" },
        { id: "cf-4", title: "Longest Substring Without Repeating Characters", category: "Sliding Window", difficulty: "Medium", rating: 1200, description: "Find length of longest substring without repeating characters.", source: "Codeforces/LeetCode" },
        { id: "cf-5", title: "Valid Parentheses", category: "Stacks", difficulty: "Easy", rating: 800, description: "Determine if input string of brackets is valid.", source: "Codeforces/LeetCode" },
        { id: "cf-6", title: "Merge K Sorted Lists", category: "Heaps", difficulty: "Hard", rating: 1700, description: "Merge k sorted linked lists into one sorted list.", source: "Codeforces/LeetCode" },
        { id: "cf-7", title: "Climbing Stairs", category: "Dynamic Programming", difficulty: "Easy", rating: 900, description: "Calculate distinct ways to climb n steps.", source: "Codeforces/LeetCode" },
        { id: "cf-8", title: "Coin Change", category: "Dynamic Programming", difficulty: "Medium", rating: 1400, description: "Compute fewest number of coins needed to make up amount.", source: "Codeforces/LeetCode" },
        { id: "cf-9", title: "Course Schedule", category: "Graphs", difficulty: "Medium", rating: 1500, description: "Determine if it is possible to finish all courses given prerequisites.", source: "Codeforces/LeetCode" },
        { id: "cf-10", title: "Word Search", category: "Backtracking", difficulty: "Medium", rating: 1400, description: "Find if word exists in 2D board of characters.", source: "Codeforces/LeetCode" },
        { id: "cf-11", title: "Implement Trie (Prefix Tree)", category: "Tries", difficulty: "Medium", rating: 1300, description: "Implement insert, search, and startsWith methods for Trie.", source: "Codeforces/LeetCode" },
        { id: "cf-12", title: "Binary Tree Level Order Traversal", category: "Binary Trees", difficulty: "Medium", rating: 1200, description: "Return level order traversal of binary tree nodes' values.", source: "Codeforces/LeetCode" },
      ];
    }

    res.json({ success: true, problems });
  } catch (error) {
    handleRouteError(res, error, "Dsa.problems", "Failed to fetch problems");
  }
});

router.post("/hint", async (req: any, res) => {
  try {
    const problemContext = req.body.problemContext || req.body.problemId || "";
    const currentCode = req.body.currentCode || req.body.code || "";

    if (!problemContext || !currentCode) {
      return res.status(400).json({ error: "Problem context and current code are required" });
    }

    let context = problemContext;
    if (req.body.problemId && !req.body.problemContext) {
      try {
        const userPrisma = await getUserPrismaFromRequest(req);
        const problem = await userPrisma.problem.findUnique({ where: { id: problemContext } });
        if (problem) {
          context = `${problem.title}\n${(problem as any).description || ""}`;
        }
      } catch { }
    }

    const result = await generateDsaHint(context, currentCode);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, "Dsa.hint", "Failed to generate hint");
  }
});

router.post("/run", async (req: any, res) => {
  try {
    const { problemId, code, language, stdin = "" } = req.body;
    if (!code || !language) {
      return res.status(400).json({ error: "code and language are required" });
    }

    const result = await executeCode(language, code, stdin);
    res.json({
      success: result.success,
      output: result.stdout || "",
      error: result.stderr || result.compile_output || "",
      executionTime: result.executionTime,
      memory: result.memory,
      status: result.status,
    });
  } catch (error) {
    handleRouteError(res, error, "Dsa.run", "Failed to execute code");
  }
});

router.post("/review", async (req: any, res) => {
  try {
    const { problemId, code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "code is required" });
    }

    let problemContext = "Unknown problem";
    if (problemId) {
      try {
        const userPrisma = await getUserPrismaFromRequest(req);
        const problem = await userPrisma.problem.findUnique({ where: { id: problemId } });
        if (problem) {
          problemContext = `${problem.title}\n${(problem as any).description || ""}`;
        }
      } catch { }
    }

    const review = await reviewDsaSolution(problemContext, code);
    res.json(review);
  } catch (error) {
    handleRouteError(res, error, "Dsa.review", "Failed to generate review");
  }
});

router.post("/submit", async (req: any, res) => {
  try {
    const { problemId, code, language, problemContext } = req.body;
    if (!problemId || !code || !language) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);

    let context = problemContext || "Unknown problem";
    if (!problemContext && problemId) {
      try {
        const problem = await userPrisma.problem.findUnique({ where: { id: problemId } });
        if (problem) {
          context = `${problem.title}\n${(problem as any).description || ""}`;
        }
      } catch { }
    }

    const review = await reviewDsaSolution(context, code);

    let executionResult: any = null;
    try {
      executionResult = await executeCode(language, code);
    } catch { }

    const submission = await userPrisma.submission.create({
      data: {
        userId: req.user!.userId,
        problemId,
        code,
        language,
        status: executionResult ? (executionResult.success ? "Accepted" : "Runtime Error") : "Pending Review",
        timeMs: executionResult?.executionTime || null,
        memoryKb: executionResult?.memory || null,
        aiReview: review,
      }
    });

    const progress = await userPrisma.dSAProgress.upsert({
      where: { id: req.user!.userId },
      create: {
        userId: req.user!.userId,
        solved: executionResult?.success ? 1 : 0,
        accuracy: executionResult?.success ? 100 : 0,
        streak: 1,
      },
      update: {
        solved: executionResult?.success ? { increment: 1 } : undefined,
      }
    });

    StreakService.trackActivity(
      req.user!.userId,
      "PRACTICE_QUESTIONS",
      "dsa_practice",
      submission.id,
      25,
      getTimezone(req),
      userPrisma
    ).catch(err => console.error("Streak tracking error:", err));

    res.json({ submission, review, progress });
  } catch (error) {
    handleRouteError(res, error, "Dsa.submit", "Failed to submit code");
  }
});

router.get("/progress", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    let progress = await userPrisma.dSAProgress.findFirst({
      where: { userId: req.user!.userId }
    });

    if (!progress) {
      progress = await userPrisma.dSAProgress.create({
        data: { userId: req.user!.userId }
      });
    }

    res.json({ progress });
  } catch (error) {
    handleRouteError(res, error, "Dsa.progress", "Failed to fetch progress");
  }
});

export const dsaRouter = router;

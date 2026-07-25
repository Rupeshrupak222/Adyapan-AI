import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateDsaHint, reviewDsaSolution } from "../lib/ai/dsa";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { StreakService } from "../services/streak.service";
import { handleRouteError } from "../utils/routeError";
import { getTimezone } from "../utils/request";
import { executeCode } from "../services/piston.service";

const router = Router();
router.use(requireAuth);

router.get("/problems", async (req: any, res) => {
  try {
    const { category, difficulty, company } = req.query;
    const filter: any = {};
    if (category) filter.category = category as string;
    if (difficulty) filter.difficulty = difficulty as string;
    if (company) filter.companies = { has: company as string };

    const userPrisma = await getUserPrismaFromRequest(req);
    const problems = await userPrisma.problem.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ problems });
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

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
    const { category, difficulty, search } = req.query;
    const where: any = {};
    if (category) where.topic = category as string;
    if (difficulty) where.difficulty = difficulty as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { externalId: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const dsaQuestions = await masterPrisma.codingQuestion.findMany({
      where,
      orderBy: { externalId: 'asc' }
    });

    const problems = dsaQuestions.map((p: any) => ({
      id: p.id,
      externalId: p.externalId,
      title: p.title,
      category: p.topic || "Arrays",
      difficulty: p.difficulty || "Easy",
      rating: p.rating || 1000,
      description: p.statement || `Solve the problem: ${p.title}.`,
      statement: p.statement,
      constraints: p.constraints,
      inputFormat: p.inputFormat,
      outputFormat: p.outputFormat,
      examples: p.examples || p.visibleTestCases || [],
      source: "Curated DSA",
      tags: p.tagsJson || ["Core DSA"],
    }));

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

import { DsaProgressService } from "../services/dsa-progress.service";

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

    const isAccepted = executionResult ? executionResult.success : true;

    const submission = await userPrisma.submission.create({
      data: {
        userId: req.user!.userId,
        problemId,
        code,
        language,
        status: isAccepted ? "Accepted" : "Runtime Error",
        timeMs: executionResult?.executionTime || null,
        memoryKb: executionResult?.memory || null,
        aiReview: review,
      }
    });

    let progress: any = null;
    if (isAccepted) {
      progress = await DsaProgressService.recordSolved(
        req.user!.userId,
        problemId,
        userPrisma,
        req
      );
    } else {
      progress = await DsaProgressService.calculateAndSyncProgress(
        req.user!.userId,
        userPrisma
      );
    }

    res.json({ submission, review, progress, executionResult });
  } catch (error) {
    handleRouteError(res, error, "Dsa.submit", "Failed to submit code");
  }
});

router.get("/progress", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const progress = await DsaProgressService.calculateAndSyncProgress(
      req.user!.userId,
      userPrisma
    );

    res.json({ progress });
  } catch (error) {
    handleRouteError(res, error, "Dsa.progress", "Failed to fetch progress");
  }
});

export const dsaRouter = router;

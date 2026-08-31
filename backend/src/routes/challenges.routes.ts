import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";
import { executeCode, runTestCases } from "../services/piston.service";
import { generateJSON, MODELS } from "../lib/ai/openrouter";

const router = Router();
router.use(requireAuth);

// ─── All active challenges ───────────────────────────────────────────────────

router.get("/", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const challenges = await userPrisma.challenge.findMany({
      where: { category: { isActive: true } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ challenges });
  } catch (error) {
    handleRouteError(res, error, "Challenges.list", "Failed to fetch challenges");
  }
});

// ─── Categories ─────────────────────────────────────────────────────────────

router.get("/categories", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const categories = await userPrisma.challengeCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        challenges: {
          select: { id: true, difficulty: true },
        },
      },
    });

    const userId = req.user?.userId || req.user?.id;

    const result = await Promise.all(
      categories.map(async (cat) => {
        const total = cat.challenges.length;
        const easy = cat.challenges.filter((c) => c.difficulty === "Easy").length;
        const medium = cat.challenges.filter((c) => c.difficulty === "Medium").length;
        const hard = cat.challenges.filter((c) => c.difficulty === "Hard").length;

        let solved = 0;
        if (userId && total > 0) {
          const challengeIds = cat.challenges.map((c) => c.id);
          const progress = await userPrisma.userQuestionProgress.findMany({
            where: { userId, solved: true, questionId: { in: challengeIds } },
          });
          solved = progress.length;
        }

        const difficultyRange = hard > 0 ? (medium > 0 ? "Easy → Hard" : "Easy → Hard") : medium > 0 ? "Easy → Medium" : "Easy";

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          gradient: cat.gradient,
          color: cat.color,
          challengeCount: total,
          difficultyRange,
          breakdown: { easy, medium, hard },
          solved,
          progress: total > 0 ? Math.round((solved / total) * 100) : 0,
          popularity: total * 12,
        };
      })
    );

    res.json({ categories: result });
  } catch (error) {
    handleRouteError(res, error, "Challenges.categories", "Failed to fetch categories");
  }
});

// ─── Challenges by Category ─────────────────────────────────────────────────

router.get("/categories/:slug", async (req: any, res) => {
  try {
    const { slug } = req.params;
    const { difficulty, status, search, sort } = req.query;
    const userId = req.user?.userId || req.user?.id;

    const userPrisma = await getUserPrismaFromRequest(req);

    const category = await userPrisma.challengeCategory.findUnique({
      where: { slug },
    });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const where: Record<string, unknown> = { categoryId: category.id };
    if (difficulty && difficulty !== "All") {
      where.difficulty = difficulty;
    }
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const orderBy: Record<string, string> =
      sort === "points" ? { points: "desc" } :
      sort === "difficulty" ? { difficulty: "asc" } :
      { createdAt: "desc" };

    const challenges = await userPrisma.challenge.findMany({
      where,
      orderBy,
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        points: true,
        topics: true,
        createdAt: true,
      },
    });

    let progressMap: Record<string, { solved: boolean; attempted: boolean; timeSpent: number }> = {};
    if (userId) {
      const challengeIds = challenges.map((c) => c.id);
      const progress = await userPrisma.userQuestionProgress.findMany({
        where: { userId, questionId: { in: challengeIds } },
        select: { questionId: true, solved: true, attempted: true, timeSpent: true },
      });
      for (const p of progress) {
        progressMap[p.questionId] = {
          solved: p.solved,
          attempted: p.attempted,
          timeSpent: p.timeSpent,
        };
      }
    }

    const enriched = challenges.map((ch) => {
      const prog = progressMap[ch.id];
      const userStatus = prog?.solved ? "solved" : prog?.attempted ? "attempted" : "unsolved";
      return {
        ...ch,
        userStatus,
        timeSpent: prog?.timeSpent || 0,
      };
    });

    const filtered =
      status && status !== "All"
        ? enriched.filter((ch) => ch.userStatus === (status as string).toLowerCase())
        : enriched;

    const totalSolved = enriched.filter((ch) => ch.userStatus === "solved").length;
    const totalAttempted = enriched.filter((ch) => ch.userStatus === "attempted").length;

    res.json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        gradient: category.gradient,
        color: category.color,
      },
      challenges: filtered,
      stats: {
        total: enriched.length,
        solved: totalSolved,
        attempted: totalAttempted,
        unsolved: enriched.length - totalSolved - totalAttempted,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Challenges.byCategory", "Failed to fetch challenges");
  }
});

// ─── Run Code Against Challenge Test Cases ───────────────────────────────────

router.post("/run", async (req: any, res) => {
  try {
    const { challengeId, code, language, stdin } = req.body;
    if (!challengeId || !code || !language) {
      return res.status(400).json({ error: "challengeId, code, and language are required" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const challenge = await userPrisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    if (stdin) {
      const result = await executeCode(language, code, stdin);
      res.json({
        success: result.success,
        output: result.stdout,
        error: result.stderr || result.compile_output,
        executionTime: result.executionTime,
        memory: result.memory,
        status: result.status,
      });
    } else {
      let testCases: Array<{ input: string; expectedOutput: string }> = [];
      if (challenge.testCases) {
        const raw = typeof challenge.testCases === "string" ? JSON.parse(challenge.testCases as string) : challenge.testCases;
        if (Array.isArray(raw)) {
          testCases = raw.map((tc: any) => ({ input: tc.input, expectedOutput: tc.expected }));
        }
      }
      if (testCases.length === 0) {
        const result = await executeCode(language, code, "");
        res.json({
          success: result.success,
          output: result.stdout,
          error: result.stderr || result.compile_output,
          executionTime: result.executionTime,
          memory: result.memory,
          status: result.status,
          sampleResults: [],
        });
        return;
      }
      const submission = await runTestCases(language, code, testCases, 15000);
      res.json({
        success: submission.allPassed,
        output: submission.testResults.map((tr) => tr.actualOutput).join("\n---\n"),
        error: "",
        executionTime: submission.executionTime,
        memory: 0,
        status: submission.allPassed ? "Accepted" : "Failed",
        sampleResults: submission.testResults.map((tr) => ({
          input: tr.input,
          expected: tr.expectedOutput,
          actual: tr.actualOutput,
          passed: tr.passed,
        })),
      });
    }
  } catch (error) {
    handleRouteError(res, error, "Challenges.run", "Failed to execute code");
  }
});

// ─── Submit Challenge ───────────────────────────────────────────────────────

router.post("/submit", async (req: any, res) => {
  try {
    const { challengeId, code, language } = req.body;
    if (!challengeId || !code || !language) {
      return res.status(400).json({ error: "challengeId, code, and language are required" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const challenge = await userPrisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    let testCases: Array<{ input: string; expectedOutput: string }> = [];
    if (challenge.testCases) {
      const raw = typeof challenge.testCases === "string" ? JSON.parse(challenge.testCases as string) : challenge.testCases;
      if (Array.isArray(raw)) {
        testCases = raw.map((tc: any) => ({ input: tc.input, expectedOutput: tc.expected }));
      }
    }

    if (testCases.length === 0) {
      const result = await executeCode(language, code, "");
      const status = result.success ? "Accepted" : "Failed";
      const score = status === "Accepted" ? (challenge.points || 100) : 0;

      const submission = await userPrisma.challengeSubmission.create({
        data: { userId: req.user.userId, challengeId, code, language, status, score },
      });
      if (status === "Accepted") {
        const existing = await userPrisma.leaderboard.findFirst({ where: { userId: req.user.userId } });
        if (existing) {
          await userPrisma.leaderboard.update({ where: { id: existing.id }, data: { score: { increment: score } } });
        } else {
          await userPrisma.leaderboard.create({ data: { userId: req.user.userId, score } });
        }
      }
      res.json({
        submission,
        testResults: [{ testCase: 1, input: "(custom)", expected: "(success)", actual: result.stdout || result.stderr, passed: result.success }],
        allPassed: result.success,
        totalTests: 1,
        passedTests: result.success ? 1 : 0,
        executionTime: result.executionTime,
        memory: result.memory,
      });
      return;
    }

    const submission = await runTestCases(language, code, testCases, 15000);
    const isAllPassed = submission.allPassed;
    const status = isAllPassed ? "Accepted" : "Failed";
    const score = isAllPassed ? (challenge.points || 100) : 0;

    const record = await userPrisma.challengeSubmission.create({
      data: { userId: req.user.userId, challengeId, code, language, status, score },
    });

    if (isAllPassed) {
      const existing = await userPrisma.leaderboard.findFirst({ where: { userId: req.user.userId } });
      if (existing) {
        await userPrisma.leaderboard.update({ where: { id: existing.id }, data: { score: { increment: score } } });
      } else {
        await userPrisma.leaderboard.create({ data: { userId: req.user.userId, score } });
      }
    }

    res.json({
      submission: record,
      testResults: submission.testResults.map((tr, i) => ({
        testCase: i + 1,
        input: tr.input,
        expected: tr.expectedOutput,
        actual: tr.actualOutput,
        passed: tr.passed,
        executionTime: tr.executionResult.executionTime,
      })),
      allPassed: isAllPassed,
      totalTests: submission.totalTests,
      passedTests: submission.passedTests,
      executionTime: submission.executionTime,
      memory: 0,
    });
  } catch (error) {
    handleRouteError(res, error, "Challenges.submit", "Failed to submit challenge");
  }
});

// ─── Leaderboard ────────────────────────────────────────────────────────────

router.get("/leaderboard/top", async (_req, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(_req);
    const leaderboard = await userPrisma.leaderboard.findMany({
      orderBy: { score: "desc" },
      take: 10,
    });
    res.json({ leaderboard });
  } catch (error) {
    handleRouteError(res, error, "Challenges.leaderboard", "Failed to fetch leaderboard");
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AI-POWERED ENDPOINTS (must be before /:slug catch-all)
// ═══════════════════════════════════════════════════════════════════════════

// ─── POST /ai/hint ─ AI hint for a challenge ────────────────────────────────
router.post("/ai/hint", async (req: any, res) => {
  try {
    const { challengeId, code, language } = req.body;
    if (!challengeId) {
      return res.status(400).json({ error: "challengeId is required" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const challenge = await userPrisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    const fallback = { hint: "Try breaking the problem into smaller steps and think about the edge cases.", approach: "", complexity: "" };

    const prompt = `You are a helpful coding mentor. Provide a hint for the following challenge WITHOUT giving away the full solution.

Challenge:
- Title: ${challenge.title}
- Difficulty: ${challenge.difficulty}
- Description: ${challenge.description || "No description"}
- Topics: ${challenge.topics || "General"}
${code ? `- User's current code (${language}):\n\`\`\`\n${code}\n\`\`\`` : ""}

Provide a hint that guides the user toward the solution without spoiling it.

Return a JSON object with:
- hint: a brief, actionable hint (1-2 sentences)
- approach: a high-level approach description (2-3 sentences describing the algorithm/technique without code)
- complexity: expected time/space complexity of the optimal solution

Return ONLY the JSON object, no other text.`;

    const result = await generateJSON(
      "You are a helpful coding mentor who provides hints without giving away solutions.",
      prompt,
      { model: MODELS.FAST, temperature: 0.4 },
      fallback
    );

    const data = result && typeof result === "object" ? result : fallback;
    res.json({ success: true, hint: (data as any).hint || "", approach: (data as any).approach || "", complexity: (data as any).complexity || "" });
  } catch (error) {
    handleRouteError(res, error, "Challenges.aiHint", "Failed to generate hint");
  }
});

// ─── POST /ai/review ─ AI code review after submission ──────────────────────
router.post("/ai/review", async (req: any, res) => {
  try {
    const { challengeId, code, language, passed } = req.body;
    if (!challengeId || !code || !language) {
      return res.status(400).json({ error: "challengeId, code, and language are required" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const challenge = await userPrisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    const fallback = { review: "Good effort! Keep practicing.", suggestions: [] as string[], timeComplexity: "", spaceComplexity: "", improvedCode: "" };

    const prompt = `You are an expert code reviewer. Review the following submission for a coding challenge.

Challenge:
- Title: ${challenge.title}
- Difficulty: ${challenge.difficulty}
- Description: ${challenge.description || "No description"}

Submission:
- Language: ${language}
- Passed: ${passed ? "Yes" : "No"}
\`\`\`${language}
${code}
\`\`\`

Provide a thorough code review.

Return a JSON object with:
- review: overall assessment (2-3 sentences)
- suggestions: array of 2-4 specific improvement suggestions
- timeComplexity: time complexity analysis
- spaceComplexity: space complexity analysis
- improvedCode: an improved version of the code if applicable (empty string if already optimal)

Return ONLY the JSON object, no other text.`;

    const result = await generateJSON(
      "You are an expert code reviewer who provides constructive, actionable feedback.",
      prompt,
      { model: MODELS.FAST, temperature: 0.4 },
      fallback
    );

    const data = result && typeof result === "object" ? result : fallback;
    res.json({
      success: true,
      review: (data as any).review || "",
      suggestions: Array.isArray((data as any).suggestions) ? (data as any).suggestions : [],
      timeComplexity: (data as any).timeComplexity || "",
      spaceComplexity: (data as any).spaceComplexity || "",
      improvedCode: (data as any).improvedCode || "",
    });
  } catch (error) {
    handleRouteError(res, error, "Challenges.aiReview", "Failed to generate code review");
  }
});

// ─── POST /ai/recommend ─ AI challenge recommendations ─────────────────────
router.post("/ai/recommend", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { skills = [], difficulty, topics } = req.body;

    const where: Record<string, any> = {};
    if (difficulty && difficulty !== "All") where.difficulty = difficulty;

    const challenges = await userPrisma.challenge.findMany({
      where,
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    if (challenges.length === 0) {
      return res.json({ success: true, recommendations: [] });
    }

    let solvedIds: string[] = [];
    if (userId) {
      const progress = await userPrisma.userQuestionProgress.findMany({
        where: { userId, solved: true },
        select: { questionId: true },
      });
      solvedIds = progress.map((p: any) => p.questionId);
    }

    const fallback = challenges.filter((c: any) => !solvedIds.includes(c.id)).slice(0, 5).map((c: any) => ({
      challengeId: c.id,
      score: 50,
      reasons: ["Available challenge"],
    }));

    const prompt = `You are a coding challenge recommendation engine. Analyze the user's profile and recommend the best challenges.

User Profile:
- Skills: ${skills.join(", ") || "Not specified"}
- Preferred Difficulty: ${difficulty || "Any"}
- Preferred Topics: ${topics || "Any"}

Available Challenges:
${challenges.map((c: any) => `[${c.id}] ${c.title} | Difficulty: ${c.difficulty} | Topics: ${c.topics || "General"} | Points: ${c.points || 100}`).join("\n")}

Already Solved: ${solvedIds.length > 0 ? solvedIds.join(", ") : "None"}

Recommend the top 5 challenges sorted by relevance. Each object must have:
- challengeId: the challenge ID
- score: relevance score 0-100
- reasons: array of 1-3 reason strings

Return ONLY the JSON array, no other text.`;

    const recommendations = await generateJSON(
      "You are an expert coding challenge recommendation engine.",
      prompt,
      { model: MODELS.FAST, temperature: 0.3 },
      fallback
    );

    const recArray = Array.isArray(recommendations) ? recommendations : [];
    res.json({ success: true, recommendations: recArray });
  } catch (error) {
    handleRouteError(res, error, "Challenges.aiRecommend", "Failed to generate recommendations");
  }
});

// ─── Single Challenge Detail (MUST be last — catch-all param route) ─────────

router.get("/:slug", async (req: any, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const userPrisma = await getUserPrismaFromRequest(req);

    const challenge = await userPrisma.challenge.findUnique({
      where: { slug },
      include: { category: true },
    });
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    let userProgress = null;
    if (userId) {
      userProgress = await userPrisma.userQuestionProgress.findUnique({
        where: { userId_questionId: { userId, questionId: challenge.id } },
      });
    }

    const recentSubmissions = await userPrisma.challengeSubmission.findMany({
      where: { challengeId: challenge.id, userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, status: true, score: true, language: true, createdAt: true },
    });

    res.json({
      challenge: {
        ...challenge,
        category: undefined,
        categorySlug: challenge.category?.slug,
        categoryName: challenge.category?.name,
      },
      userProgress,
      recentSubmissions,
    });
  } catch (error) {
    handleRouteError(res, error, "Challenges.detail", "Failed to fetch challenge");
  }
});

export const challengesRouter = router;

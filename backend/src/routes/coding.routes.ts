import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateCode, debugCode, explainCode, generateProject, generateMultiLanguageCode } from "../lib/ai/coding";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";
import { prisma as masterPrisma } from "../config/prisma";
import { CodeforcesService, scrapeCodeforcesProblem } from "../services/codeforces.service";
import { AICodingService } from "../services/ai-coding.service";
import { executeCode, runTestCases, checkPistonHealth } from "../services/piston.service";
import { AIReviewService } from "../services/ai-review.service";
import { ComplexityService } from "../services/complexity.service";
import { CodingRoadmapService } from "../services/coding-roadmap.service";
import { requireUserId } from "../utils/request";
import { generateText, MODELS } from "../lib/ai/openrouter";
import { generateHiddenTestCases, detectHardcodedOutput } from "../services/testcase-generator.service";



const router = Router();
router.use(requireAuth);



// ─── Multi-Language Code Generation (Standalone) ──────────────────────────────

router.post("/generate-multi", async (req: any, res) => {
  try {
    const { prompt, languages } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({ error: "At least one language is required" });
    }
    const result = await generateMultiLanguageCode(prompt, languages);
    res.json({ success: true, results: result });
  } catch (error) {
    handleRouteError(res, error, "Coding.generateMulti", "Failed to generate multi-language code");
  }
});

// ─── Standalone Code Execution (via Piston) ───────────────────────────────────

router.post("/run", async (req: any, res) => {
  try {
    const { code, language, stdin = "" } = req.body;
    if (!code || !language) {
      return res.status(400).json({ error: "code and language are required" });
    }
    const result = await executeCode(language, code, stdin);
    res.json({
      success: result.success,
      output: result.stdout,
      error: result.stderr || result.compile_output,
      executionTime: result.executionTime,
      memory: result.memory,
      status: result.status,
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.run", "Failed to execute code");
  }
});

// ─── Existing AI Code Helper Routes ──────────────────────────────────────────

router.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    
    const result = await generateCode(prompt);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, "Coding.generate", "Failed to generate code");
  }
});

router.post("/debug", async (req, res) => {
  try {
    const { errorMsg, codeSnippet } = req.body;
    if (!errorMsg || !codeSnippet) return res.status(400).json({ error: "Error message and code snippet are required" });
    
    const result = await debugCode(errorMsg, codeSnippet);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, "Coding.debug", "Failed to debug code");
  }
});

router.post("/explain", async (req, res) => {
  try {
    const { codeSnippet } = req.body;
    if (!codeSnippet) return res.status(400).json({ error: "Code snippet is required" });
    
    const result = await explainCode(codeSnippet);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, "Coding.explain", "Failed to explain code");
  }
});

router.post("/project", async (req, res) => {
  try {
    const { projectName } = req.body;
    if (!projectName) return res.status(400).json({ error: "Project name is required" });
    
    const result = await generateProject(projectName);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, "Coding.project", "Failed to generate project");
  }
});

router.get("/history", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const sessions = await userPrisma.codingSession.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: true }
    });
    res.json({ sessions });
  } catch (error) {
    handleRouteError(res, error, "Coding.history", "Failed to fetch history");
  }
});

// ─── Day 11 DSA Question Bank Routes ──────────────────────────────────────────

// Sync Codeforces Problems (manual or triggered)
router.post("/sync-codeforces", async (req, res) => {
  try {
    const syncResult = await CodeforcesService.syncProblems();
    res.json(syncResult);
  } catch (error) {
    handleRouteError(res, error, "Coding.syncCodeforces", "Failed to sync Codeforces problems");
  }
});

// Get Coding Dashboard Statistics & Data
router.get("/dashboard", async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    // 1. Fetch user progress records
    const userProgress = await userPrisma.userQuestionProgress.findMany({
      where: { userId }
    });

    const progressMap = new Map(userProgress.map((p: any) => [p.questionId, p]));

    // 2. Fetch global statistics from Master DB
    const totalQuestions = await masterPrisma.codingQuestion.count();
    
    // Solved & Attempted & Bookmarks from user progress
    const solvedCount = userProgress.filter((p: any) => p.status === "solved").length;
    const attemptedCount = userProgress.filter((p: any) => p.status === "attempted" || p.status === "solved").length;
    const bookmarkedCount = userProgress.filter((p: any) => p.bookmarked).length;

    // 3. Topic Explorer metrics
    // Fetch all global questions
    const globalQuestions = await masterPrisma.codingQuestion.findMany({
      select: { id: true, topic: true, difficulty: true }
    });

    const topics = [
      "Arrays", "Strings", "Hashing", "Linked Lists", "Stacks", "Queues",
      "Trees", "Binary Trees", "BST", "Heaps", "Recursion", "Backtracking",
      "Greedy", "Dynamic Programming", "Graphs", "Tries", "Sliding Window",
      "Two Pointers", "Bit Manipulation"
    ];

    // Compute metrics per topic
    const topicExplorer = topics.map(topicName => {
      const topicQuestions = globalQuestions.filter(q => q.topic === topicName);
      const totalQ = topicQuestions.length;
      
      const solvedQ = topicQuestions.filter(q => (progressMap.get(q.id) as any)?.status === "solved").length;
      const completionPercentage = totalQ > 0 ? Math.round((solvedQ / totalQ) * 100) : 0;

      // Difficulty distribution
      const difficultyDist = { Easy: 0, Medium: 0, Hard: 0, Expert: 0 };
      topicQuestions.forEach(q => {
        const diff = q.difficulty as keyof typeof difficultyDist;
        if (diff in difficultyDist) {
          difficultyDist[diff]++;
        } else {
          difficultyDist["Easy"]++;
        }
      });

      return {
        topicName,
        questionCount: totalQ,
        solvedCount: solvedQ,
        completionPercentage,
        difficultyDistribution: difficultyDist
      };
    });

    // 4. Daily Challenge (get or resolve)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let daily = await masterPrisma.dailyChallenge.findFirst({
      where: {
        challengeDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      include: { question: true }
    });

    if (!daily && totalQuestions > 0) {
      const skip = Math.floor(Math.random() * totalQuestions);
      const randomQ = await masterPrisma.codingQuestion.findMany({
        take: 1,
        skip
      });
      if (randomQ.length > 0) {
        daily = await masterPrisma.dailyChallenge.create({
          data: {
            questionId: randomQ[0].id,
            challengeDate: today
          },
          include: { question: true }
        });
      }
    }

    let dailyProgress = null;
    if (daily) {
      dailyProgress = progressMap.get(daily.questionId) || null;
    }

    // 5. Recent Activity
    const recentProgress = userProgress
      .sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);

    let recentActivity: any[] = [];
    if (recentProgress.length > 0) {
      const recentQuestions = await masterPrisma.codingQuestion.findMany({
        where: { id: { in: recentProgress.map((rp: any) => rp.questionId) } }
      });

      const recentQuestionsMap = new Map(recentQuestions.map(q => [q.id, q]));
      recentActivity = recentProgress.map((rp: any) => {
        const q: any = recentQuestionsMap.get(rp.questionId);
        return {
          questionId: rp.questionId,
          title: q ? q.title : "Unknown Problem",
          difficulty: q ? q.difficulty : "Easy",
          topic: q ? q.topic : "Arrays",
          status: rp.status,
          bookmarked: rp.bookmarked,
          updatedAt: rp.updatedAt
        };
      });
    }

    // 6. AI Recommendations
    let recommendedQuestions: any[] = [];
    const startedTopics = topicExplorer.filter(t => t.solvedCount > 0 && t.completionPercentage < 100);
    
    let targetTopic = "Arrays";
    let targetDifficulty = "Easy";
    let message = "Let's build your foundation in Arrays.";

    if (startedTopics.length > 0) {
      const lowest = startedTopics.sort((a, b) => a.completionPercentage - b.completionPercentage)[0];
      targetTopic = lowest.topicName;
      targetDifficulty = lowest.completionPercentage >= 50 ? "Medium" : "Easy";
      message = `You solved ${lowest.solvedCount} problems in ${lowest.topicName}. Next recommendation in this topic:`;
    } else {
      const unstarted = topicExplorer.find(t => t.questionCount > 0 && t.solvedCount === 0);
      if (unstarted) {
        targetTopic = unstarted.topicName;
        targetDifficulty = "Easy";
        message = `Start learning your next topic: ${unstarted.topicName}.`;
      }
    }

    recommendedQuestions = await masterPrisma.codingQuestion.findMany({
      where: {
        topic: targetTopic,
        difficulty: targetDifficulty,
        id: { notIn: userProgress.filter((p: any) => p.status === "solved").map((p: any) => p.questionId) }
      },
      take: 3
    });

    if (recommendedQuestions.length === 0) {
      recommendedQuestions = await masterPrisma.codingQuestion.findMany({
        take: 3
      });
    }

    const aiRecommendations = {
      message,
      topic: targetTopic,
      difficulty: targetDifficulty,
      questions: recommendedQuestions
    };

    res.json({
      stats: {
        questionsAvailable: totalQuestions,
        topicsCovered: new Set(globalQuestions.map(q => q.topic)).size,
        solved: solvedCount,
        attempted: attemptedCount,
        bookmarks: bookmarkedCount
      },
      topicExplorer,
      dailyChallenge: daily ? {
        ...daily.question,
        progress: dailyProgress
      } : null,
      recentActivity,
      aiRecommendations
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.dashboard", "Failed to fetch coding dashboard data");
  }
});

// Get Paginated & Filtered DSA Questions
router.get("/questions", async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { topic, difficulty, rating, status, bookmarked, search, limit = 50, page = 1 } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Build filters for CodingQuestion
    const whereClause: any = {};
    if (topic) whereClause.topic = topic as string;
    if (difficulty) whereClause.difficulty = difficulty as string;
    if (rating) {
      const rVal = parseInt(rating as string);
      if (!isNaN(rVal)) {
        whereClause.rating = rVal;
      }
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { externalId: { contains: search as string, mode: "insensitive" } }
      ];
    }

    // Fetch user progress filters
    const userPrisma = await getUserPrismaFromRequest(req);
    const userProgress = await userPrisma.userQuestionProgress.findMany({
      where: { userId }
    });

    const progressMap = new Map(userProgress.map((p: any) => [p.questionId, p]));

    // Retrieve questions matching criteria
    const questions = await masterPrisma.codingQuestion.findMany({
      where: whereClause,
      orderBy: { rating: 'asc' }
    });

    let mappedQuestions = questions.map((q: any) => {
      const p: any = progressMap.get(q.id);
      return {
        ...q,
        progress: {
          status: p ? p.status : "unsolved",
          viewed: p ? p.viewed : false,
          attempted: p ? p.attempted : false,
          solved: p ? p.solved : false,
          bookmarked: p ? p.bookmarked : false,
          timeSpent: p ? p.timeSpent : 0
        }
      };
    });

    // Apply client-side filters for progress status if requested (status / bookmarked)
    if (status) {
      mappedQuestions = mappedQuestions.filter(q => q.progress.status === status);
    }
    if (bookmarked === "true") {
      mappedQuestions = mappedQuestions.filter(q => q.progress.bookmarked === true);
    }

    // Paginate in-memory after joining progress (since status filter depends on user DB)
    const totalCount = mappedQuestions.length;
    const paginated = mappedQuestions.slice(skip, skip + limitNum);

    res.json({
      questions: paginated,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.questions", "Failed to fetch questions");
  }
});

// Get Single Question Details + User Progress + AI Explanation
router.get("/question/:id", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;

    const question = await masterPrisma.codingQuestion.findUnique({
      where: { id: questionId },
      include: { aiAnalyses: { take: 1, orderBy: { generatedAt: 'desc' } } }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    
    // Mark viewed as true when fetched
    const progress = await userPrisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: { viewed: true },
      create: { userId, questionId, viewed: true }
    });

    res.json({
      question,
      progress: {
        status: progress.status,
        viewed: progress.viewed,
        attempted: progress.attempted,
        solved: progress.solved,
        bookmarked: progress.bookmarked,
        timeSpent: progress.timeSpent
      },
      aiAnalysis: question.aiAnalyses[0] ? question.aiAnalyses[0].explanationJson : null
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.questionDetails", "Failed to get question details");
  }
});

// Bookmark/Unbookmark Question
router.post("/question/:id/bookmark", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { bookmarked } = req.body;

    const userPrisma = await getUserPrismaFromRequest(req);
    const progress = await userPrisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: { bookmarked: !!bookmarked },
      create: { userId, questionId, bookmarked: !!bookmarked }
    });

    res.json({ success: true, progress });
  } catch (error) {
    handleRouteError(res, error, "Coding.bookmark", "Failed to toggle bookmark");
  }
});

// Mark Question as Attempted
router.post("/question/:id/attempt", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { timeSpent = 0 } = req.body;

    const userPrisma = await getUserPrismaFromRequest(req);
    
    // Fetch current progress first to ensure we don't downgrade "solved" status to "attempted"
    const current = await userPrisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } }
    });

    const isAlreadySolved = current?.status === "solved";

    const progress = await userPrisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {
        attempted: true,
        status: isAlreadySolved ? "solved" : "attempted",
        timeSpent: { increment: timeSpent }
      },
      create: {
        userId,
        questionId,
        attempted: true,
        status: "attempted",
        timeSpent
      }
    });

    res.json({ success: true, progress });
  } catch (error) {
    handleRouteError(res, error, "Coding.attempt", "Failed to mark attempted");
  }
});

// Mark Question as Solved
router.post("/question/:id/solve", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { timeSpent = 0 } = req.body;

    const userPrisma = await getUserPrismaFromRequest(req);
    const progress = await userPrisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {
        solved: true,
        status: "solved",
        timeSpent: { increment: timeSpent }
      },
      create: {
        userId,
        questionId,
        solved: true,
        status: "solved",
        timeSpent
      }
    });

    res.json({ success: true, progress });
  } catch (error) {
    handleRouteError(res, error, "Coding.solve", "Failed to mark solved");
  }
});

// Generate or Fetch AI Analysis
router.post("/question/:id/analyze", async (req, res) => {
  try {
    const questionId = req.params.id;
    const analysis = await AICodingService.getAnalysis(questionId);
    res.json({ success: true, analysis });
  } catch (error) {
    handleRouteError(res, error, "Coding.analyze", "Failed to generate AI analysis");
  }
});

// Get Daily Challenge Question
router.get("/daily-challenge", async (req: any, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daily = await masterPrisma.dailyChallenge.findFirst({
      where: {
        challengeDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      include: { question: true }
    });

    if (!daily) {
      const count = await masterPrisma.codingQuestion.count();
      if (count === 0) {
        return res.status(404).json({ error: "No questions available. Please sync repository." });
      }
      const skip = Math.floor(Math.random() * count);
      const randomQ = await masterPrisma.codingQuestion.findMany({
        take: 1,
        skip: skip
      });

      if (randomQ.length > 0) {
        daily = await masterPrisma.dailyChallenge.create({
          data: {
            questionId: randomQ[0].id,
            challengeDate: today
          },
          include: { question: true }
        });
      }
    }

    let progress = null;
    if (daily) {
      const userPrisma = await getUserPrismaFromRequest(req);
      progress = await userPrisma.userQuestionProgress.findFirst({
        where: {
          userId: req.user.userId,
          questionId: daily.questionId
        }
      });
    }
    
    res.json({
      challenge: daily ? daily.question : null,
      progress
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.dailyChallenge", "Failed to fetch daily challenge");
  }
});

// ─── Day 12 Problem Workspace API Endpoints ────────────────────────────────────

// GET /api/coding/workspace/:id
// Get Workspace: returns problem details, progress tracking stats, notes, bookmarks, active code session, and discussion logs.
router.get("/workspace/:id", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;

    // 1. Fetch coding question from master DB
    const question = await masterPrisma.codingQuestion.findUnique({
      where: { id: questionId },
      include: { aiAnalyses: { take: 1, orderBy: { generatedAt: 'desc' } } }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);

    // 2. Mark viewed as true and update/upsert userQuestionProgress in user DB
    const progress = await userPrisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: { viewed: true },
      create: { userId, questionId, viewed: true, status: "in_progress" }
    });

    // 3. Fetch active code session for this workspace
    const session = await userPrisma.problemWorkspaceSession.findUnique({
      where: { userId_questionId: { userId, questionId } }
    });

    // 4. Fetch notes for this question
    const notes = await userPrisma.problemNote.findMany({
      where: { userId, questionId },
      orderBy: [
        { pinned: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    // 5. Check if bookmarked in bookmarks table
    const bookmarkRecord = await userPrisma.problemBookmark.findUnique({
      where: { userId_questionId: { userId, questionId } }
    });

    // 6. Fetch discussions (comments)
    const discussions = await userPrisma.problemDiscussion.findMany({
      where: { questionId },
      orderBy: { createdAt: 'asc' }
    });

    // 7. Fetch or auto-generate AI Analysis for full problem explanation and examples
    let aiAnalysisData: any = null;
    let scrapedProblemData: any = null;

    if (question.externalId && (question.source === "codeforces" || question.externalId.includes("-"))) {
      try {
        const scraped = await scrapeCodeforcesProblem(question.externalId);
        if (scraped && scraped.description) {
          scrapedProblemData = scraped;
          aiAnalysisData = {
            ...(question.aiAnalyses[0] ? (question.aiAnalyses[0].explanationJson as any) : {}),
            problem_explanation: scraped.description,
            inputSpecification: scraped.inputSpecification || "",
            outputSpecification: scraped.outputSpecification || "",
            constraints: scraped.constraints || "",
            timeLimit: scraped.timeLimit || "",
            memoryLimit: scraped.memoryLimit || "",
            examples: scraped.examples,
            note: scraped.note || ""
          };
        }
      } catch (err) {
        console.warn("Failed to scrape live Codeforces problem:", err);
      }
    }

    if (!aiAnalysisData) {
      aiAnalysisData = question.aiAnalyses[0] ? (question.aiAnalyses[0].explanationJson as any) : null;
      if (!aiAnalysisData || !aiAnalysisData.problem_explanation || !aiAnalysisData.examples || aiAnalysisData.examples.length === 0 || aiAnalysisData.problem_explanation.includes("You are given an array of integers")) {
        try {
          aiAnalysisData = await AICodingService.getAnalysis(questionId);
        } catch (err) {
          console.warn("Failed to generate AI analysis on workspace load:", err);
        }
      }
    }

    res.json({
      question,
      progress: {
        status: progress.status,
        viewed: progress.viewed,
        attempted: progress.attempted,
        solved: progress.solved,
        bookmarked: !!bookmarkRecord || progress.bookmarked,
        timeSpent: progress.timeSpent
      },
      session,
      notes,
      isBookmarked: !!bookmarkRecord,
      discussions,
      aiAnalysis: aiAnalysisData,
      scrapedProblem: scrapedProblemData
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace", "Failed to retrieve workspace details");
  }
});

// POST /api/coding/workspace/:id/save
// Save Code: auto-save session state (code_content, language, status, time_spent).
router.post("/workspace/:id/save", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { codeContent, language, status = "In Progress", timeSpent = 0 } = req.body;

    if (codeContent === undefined || !language) {
      return res.status(400).json({ error: "codeContent and language are required" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);

    // Update session
    const session = await userPrisma.problemWorkspaceSession.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {
        codeContent,
        language,
        status,
        timeSpent: { increment: timeSpent },
        lastOpened: new Date()
      },
      create: {
        userId,
        questionId,
        codeContent,
        language,
        status,
        timeSpent,
        lastOpened: new Date()
      }
    });

    // Also update the UserQuestionProgress time spent and status
    const currentProgress = await userPrisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } }
    });

    // Keep "solved" status if already solved, otherwise update status
    const nextStatus = currentProgress?.status === "solved" ? "solved" : status.toLowerCase() === "solved" ? "solved" : "attempted";

    const progress = await userPrisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {
        timeSpent: { increment: timeSpent },
        status: nextStatus,
        attempted: true
      },
      create: {
        userId,
        questionId,
        timeSpent,
        status: nextStatus,
        attempted: true,
        viewed: true
      }
    });

    res.json({ success: true, session, progress });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.save", "Failed to save workspace session");
  }
});

// POST /api/coding/workspace/:id/notes
// Save Note: Create, Update, Pin, or Delete note.
router.post("/workspace/:id/notes", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { id, noteContent, pinned = false, action = "save" } = req.body;

    const userPrisma = await getUserPrismaFromRequest(req);

    if (action === "delete") {
      if (!id) return res.status(400).json({ error: "Note ID is required for deletion" });
      await userPrisma.problemNote.delete({
        where: { id }
      });
      return res.json({ success: true, message: "Note deleted successfully" });
    }

    if (!noteContent) {
      return res.status(400).json({ error: "noteContent is required" });
    }

    let note;
    if (id) {
      // Update existing note
      note = await userPrisma.problemNote.update({
        where: { id },
        data: {
          noteContent,
          pinned
        }
      });
    } else {
      // Create new note
      note = await userPrisma.problemNote.create({
        data: {
          userId,
          questionId,
          noteContent,
          pinned
        }
      });
    }

    res.json({ success: true, note });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.notes", "Failed to modify notes");
  }
});

// GET /api/coding/workspace/:id/notes
// Get Notes: Fetch notes for this question
router.get("/workspace/:id/notes", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;

    const userPrisma = await getUserPrismaFromRequest(req);
    const notes = await userPrisma.problemNote.findMany({
      where: { userId, questionId },
      orderBy: [
        { pinned: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    res.json({ notes });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.getNotes", "Failed to retrieve notes");
  }
});

// POST /api/coding/workspace/:id/bookmark
// Toggle Bookmark: Bookmarks/unbookmarks a problem in the bookmarks table and progress
router.post("/workspace/:id/bookmark", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { bookmarked } = req.body; // true = bookmark, false = unbookmark

    const userPrisma = await getUserPrismaFromRequest(req);

    if (bookmarked) {
      // Bookmark
      await userPrisma.problemBookmark.upsert({
        where: { userId_questionId: { userId, questionId } },
        update: {},
        create: { userId, questionId }
      });
    } else {
      // Unbookmark
      await userPrisma.problemBookmark.deleteMany({
        where: { userId, questionId }
      });
    }

    // Keep userQuestionProgress in sync
    const progress = await userPrisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: { bookmarked: !!bookmarked },
      create: { userId, questionId, bookmarked: !!bookmarked }
    });

    res.json({ success: true, bookmarked, progress });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.bookmark", "Failed to toggle bookmark");
  }
});

// POST /api/coding/workspace/:id/discussion
// Post comment/discussion message
router.post("/workspace/:id/discussion", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message content is required" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const discussion = await userPrisma.problemDiscussion.create({
      data: {
        userId,
        questionId,
        message
      }
    });

    res.json({ success: true, discussion });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.discussion", "Failed to post message");
  }
});

// POST /api/coding/workspace/:id/explain
// Explain Action: Explain constraints, example, edge cases, complexity, interview perspective
router.post("/workspace/:id/explain", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const { type, codeSnippet = "" } = req.body; // type: "constraints" | "example" | "edge_cases" | "complexity" | "interview" | "placement" | "problem"

    const question = await masterPrisma.codingQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const systemPrompt = `You are an expert FAANG Interview Coach, Competitive Programming Mentor, and EdTech Platform Architect.
Help the student learn. Provide helpful explanations in clear markdown. Maintain an instructional, supportive, and extremely clear tone.`;

    let userPrompt = "";

    if (type === "constraints") {
      userPrompt = `Please explain the constraints of this problem in detail and what they imply for acceptable time/space complexities:
Title: ${question.title}
Topic: ${question.topic}
Difficulty: ${question.difficulty}
Tags: ${JSON.stringify(question.tagsJson)}

Suggest what big-O complexity is expected based on the inputs size.`;
    } else if (type === "example") {
      userPrompt = `Please explain the examples for this problem, walking through the logic step-by-step to show how the input transforms to the output:
Title: ${question.title}
Topic: ${question.topic}
Difficulty: ${question.difficulty}

Detail why the transformation happens.`;
    } else if (type === "edge_cases") {
      userPrompt = `Please list and discuss the critical edge cases, boundary inputs, and special inputs the student must handle:
Title: ${question.title}
Topic: ${question.topic}

Provide specific input examples and outputs for these edge cases.`;
    } else if (type === "complexity") {
      userPrompt = `Please perform a complexity analysis of the brute-force vs optimal approaches for this problem:
Title: ${question.title}
Topic: ${question.topic}

If a code snippet is provided below, analyze its time and space complexity:
Code snippet:
\`\`\`
${codeSnippet}
\`\`\`

State the Big-O notations clearly and explain why they hold.`;
    } else if (type === "interview") {
      userPrompt = `Please provide the FAANG Interview Perspective for this problem:
Title: ${question.title}
Topic: ${question.topic}

Answer:
- What core conceptual skills does this question test?
- How should a student explain this in an interview?
- What follow-up questions do interviewers typically ask?`;
    } else if (type === "placement") {
      userPrompt = `Please provide the Placement and Corporate Assessment Perspective for this problem:
Title: ${question.title}
Topic: ${question.topic}
Placement Importance: ${question.placementImportance ? "High" : "Medium"}

Discuss typical corporate online assessment formats, time pressure handling, and optimal test coverage.`;
    } else {
      userPrompt = `Provide a comprehensive walk-through explanation of the problem statement and approach strategy:
Title: ${question.title}
Topic: ${question.topic}
Difficulty: ${question.difficulty}`;
    }

    const explanation = await generateText(systemPrompt, userPrompt, { model: MODELS.CODE, temperature: 0.6 });

    res.json({ success: true, explanation });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.explain", "Failed to generate AI explanation");
  }
});

// POST /api/coding/workspace/:id/hint
// Hint Action: Progressive Hints
router.post("/workspace/:id/hint", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const { hintIndex } = req.body; // 1, 2, or 3

    if (!hintIndex || hintIndex < 1 || hintIndex > 3) {
      return res.status(400).json({ error: "hintIndex must be 1, 2, or 3" });
    }

    // Retrieve AI analysis Cache
    const analysis = await AICodingService.getAnalysis(questionId);

    let hint = "";
    if (hintIndex === 1) {
      hint = analysis.hint_1;
    } else if (hintIndex === 2) {
      hint = analysis.hint_2;
    } else {
      hint = analysis.hint_3;
    }

    res.json({
      success: true,
      hintIndex,
      hint,
      commonMistakes: hintIndex === 3 ? analysis.common_mistakes : undefined
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.hint", "Failed to generate hint");
  }
});

// ─── Code Execution Routes (Piston) ──────────────────────────────────────────

router.get("/piston/health", async (_req, res) => {
  try {
    const healthy = await checkPistonHealth();
    res.json({ healthy });
  } catch (error) {
    handleRouteError(res, error, "Coding.piston.health", "Failed to check Piston health");
  }
});

router.post("/workspace/:id/run", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { code, language, stdin = "" } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "code and language are required" });
    }

    const question = await masterPrisma.codingQuestion.findUnique({
      where: { id: questionId }
    });
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const analysis = await AICodingService.getAnalysis(questionId);
    const examples = analysis.examples || [];

    const result = await executeCode(language, code, stdin);
    const userPrisma = await getUserPrismaFromRequest(req);

    // Save Execution
    const execution = await userPrisma.codeExecution.create({
      data: {
        userId,
        questionId,
        language,
        codeSnapshot: code,
        stdin,
        stdout: result.stdout,
        stderr: result.stderr || result.compile_output,
        status: result.status,
        executionTime: result.executionTime,
      }
    });

    // Create Execution History Snapshot
    const previousExecCount = await userPrisma.codeExecution.count({
      where: { userId, questionId }
    });
    await userPrisma.executionHistory.create({
      data: {
        executionId: execution.id,
        versionNumber: previousExecCount,
        codeSnapshot: code,
      }
    });

    // Update statistics in UserQuestionProgress
    const progressRecord = await userPrisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } }
    });

    let langUsage: Record<string, number> = {};
    if (progressRecord?.languageUsage) {
      try {
        langUsage = typeof progressRecord.languageUsage === "string"
          ? JSON.parse(progressRecord.languageUsage)
          : (progressRecord.languageUsage as Record<string, number>) || {};
      } catch {
        langUsage = {};
      }
    }
    langUsage[language] = (langUsage[language] || 0) + 1;

    const nextStatus = progressRecord?.status === "solved" ? "solved" : "attempted";

    await userPrisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {
        runCount: { increment: 1 },
        successfulRuns: result.success ? { increment: 1 } : undefined,
        failedRuns: !result.success ? { increment: 1 } : undefined,
        languageUsage: langUsage,
        status: nextStatus,
        attempted: true,
      },
      create: {
        userId,
        questionId,
        runCount: 1,
        successfulRuns: result.success ? 1 : 0,
        failedRuns: !result.success ? 1 : 0,
        languageUsage: langUsage,
        status: nextStatus,
        attempted: true,
        viewed: true,
      }
    });

    let sampleResults: Array<{ input: string; expected: string; actual: string; passed: boolean }> = [];
    if (examples.length > 0) {
      // Anti-cheat: detect hardcoded outputs
      const cheatCheck = detectHardcodedOutput(code, examples.map(e => ({ input: e.input, output: e.output })));
      
      if (cheatCheck.isHardcoded && cheatCheck.confidence >= 0.7) {
        sampleResults = examples.map((ex, i) => ({
          input: ex.input,
          expected: ex.output,
          actual: "Hardcoded output detected — your code must read and process the input.",
          passed: false,
        }));
      } else {
        const testCases = examples.map(ex => ({ input: ex.input, expectedOutput: ex.output }));
        const submission = await runTestCases(language, code, testCases, 10000);
        sampleResults = submission.testResults.map(tr => ({
          input: tr.input,
          expected: tr.expectedOutput,
          actual: tr.actualOutput,
          passed: tr.passed,
        }));
      }
    }

    res.json({
      success: result.success,
      output: result.stdout,
      error: result.stderr || result.compile_output,
      executionTime: result.executionTime,
      memory: result.memory,
      status: result.status,
      sampleResults,
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.run", "Failed to execute code");
  }
});

router.post("/workspace/:id/submit", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "code and language are required" });
    }

    const question = await masterPrisma.codingQuestion.findUnique({
      where: { id: questionId }
    });
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const analysis = await AICodingService.getAnalysis(questionId);
    let examples = analysis.examples || [];

    if (examples.length === 0) {
      examples = [
        {
          input: "5\n1 2 3 4 5",
          output: "15",
          explanation: "Fallback test case."
        }
      ];
    }

    // Step 1: Anti-cheat detection
    const cheatCheck = detectHardcodedOutput(code, examples.map(e => ({ input: e.input, output: e.output })));
    if (cheatCheck.isHardcoded && cheatCheck.confidence >= 0.85) {
      return res.json({
        allPassed: false,
        totalTests: examples.length,
        passedTests: 0,
        executionTime: 0,
        memory: 0,
        testResults: [{
          testCase: 1,
          input: "(hidden)",
          expected: "(hidden)",
          actual: "Hardcoded output detected",
          passed: false,
          executionTime: 0,
        }],
        cheatingDetected: true,
        cheatingReason: cheatCheck.reason,
      });
    }

    // Step 2: Run against sample test cases (visible to user)
    const sampleTestCases = examples.map(ex => ({ input: ex.input, expectedOutput: ex.output }));
    const sampleSubmission = await runTestCases(language, code, sampleTestCases, 10000);

    // Step 3: Generate and run against hidden test cases (not visible to user)
    let hiddenResults = { allPassed: true, passedTests: 0, totalTests: 0, testResults: [] as any[] };

    try {
      const hiddenTestCases = await generateHiddenTestCases(
        questionId,
        analysis.problem_explanation || question.title,
        analysis.inputSpecification || "",
        analysis.outputSpecification || "",
        analysis.constraints || "",
        examples.map(e => ({ input: e.input, output: e.output })),
        question.difficulty
      );

      if (hiddenTestCases.length > 0) {
        const hiddenFormatted = hiddenTestCases.map(tc => ({ input: tc.input, expectedOutput: tc.output }));
        const hiddenSubmission = await runTestCases(language, code, hiddenFormatted, 12000);
        hiddenResults = {
          allPassed: hiddenSubmission.allPassed,
          passedTests: hiddenSubmission.passedTests,
          totalTests: hiddenSubmission.totalTests,
          testResults: hiddenSubmission.testResults.map((tr, i) => ({
            testCase: sampleSubmission.totalTests + i + 1,
            input: "(hidden test case)",
            expected: "(hidden)",
            actual: tr.passed ? "(correct)" : tr.actualOutput.substring(0, 50) + (tr.actualOutput.length > 50 ? "..." : ""),
            passed: tr.passed,
            executionTime: tr.executionResult.executionTime,
          })),
        };
      }
    } catch (err) {
      console.warn("[Submit] Hidden test case generation/execution failed, using sample results only:", err);
    }

    // Step 4: Combine results
    const totalTests = sampleSubmission.totalTests + hiddenResults.totalTests;
    const totalPassed = sampleSubmission.passedTests + hiddenResults.passedTests;
    const isAllPassed = sampleSubmission.allPassed && hiddenResults.allPassed;

    const sampleTestResults = sampleSubmission.testResults.map((tr, i) => ({
      testCase: i + 1,
      input: tr.input,
      expected: tr.expectedOutput,
      actual: tr.actualOutput,
      passed: tr.passed,
      executionTime: tr.executionResult.executionTime,
    }));

    const testResults = [...sampleTestResults, ...hiddenResults.testResults];

    const userPrisma = await getUserPrismaFromRequest(req);
    const status = isAllPassed ? "Accepted" : "Failed";

    // Save Execution
    const execution = await userPrisma.codeExecution.create({
      data: {
        userId,
        questionId,
        language,
        codeSnapshot: code,
        stdin: "all_test_cases",
        stdout: `Passed ${totalPassed}/${totalTests} test cases (${sampleSubmission.passedTests}/${sampleSubmission.totalTests} sample + ${hiddenResults.passedTests}/${hiddenResults.totalTests} hidden).`,
        stderr: isAllPassed ? "" : "Some test cases failed.",
        status,
        executionTime: sampleSubmission.executionTime + (hiddenResults.testResults.reduce((sum: number, t: any) => sum + (t.executionTime || 0), 0)),
      }
    });

    // Create Execution History Snapshot
    const previousExecCount = await userPrisma.codeExecution.count({
      where: { userId, questionId }
    });
    await userPrisma.executionHistory.create({
      data: {
        executionId: execution.id,
        versionNumber: previousExecCount,
        codeSnapshot: code,
      }
    });

    // Update statistics in UserQuestionProgress
    const progressRecord = await userPrisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } }
    });

    let langUsage: Record<string, number> = {};
    if (progressRecord?.languageUsage) {
      try {
        langUsage = typeof progressRecord.languageUsage === "string"
          ? JSON.parse(progressRecord.languageUsage)
          : (progressRecord.languageUsage as Record<string, number>) || {};
      } catch {
        langUsage = {};
      }
    }
    langUsage[language] = (langUsage[language] || 0) + 1;

    const finalStatus = (isAllPassed || progressRecord?.status === "solved") ? "solved" : "attempted";

    await userPrisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {
        runCount: { increment: 1 },
        successfulRuns: isAllPassed ? { increment: 1 } : undefined,
        failedRuns: !isAllPassed ? { increment: 1 } : undefined,
        languageUsage: langUsage,
        status: finalStatus,
        solved: isAllPassed ? true : undefined,
        attempted: true,
      },
      create: {
        userId,
        questionId,
        runCount: 1,
        successfulRuns: isAllPassed ? 1 : 0,
        failedRuns: !isAllPassed ? 1 : 0,
        languageUsage: langUsage,
        status: finalStatus,
        solved: isAllPassed,
        attempted: true,
        viewed: true,
      }
    });

    // Auto save workspace session snapshot
    await userPrisma.problemWorkspaceSession.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {
        codeContent: code,
        language,
        status: finalStatus
      },
      create: {
        userId,
        questionId,
        codeContent: code,
        language,
        status: finalStatus
      }
    });

    res.json({
      allPassed: isAllPassed,
      totalTests,
      passedTests: totalPassed,
      executionTime: sampleSubmission.executionTime,
      memory: sampleSubmission.memory,
      testResults,
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.submit", "Failed to submit code");
  }
});

router.get("/workspace/:id/executions", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    const executions = await userPrisma.codeExecution.findMany({
      where: { userId, questionId },
      orderBy: { createdAt: "desc" },
      include: {
        history: true
      }
    });

    res.json({ success: true, executions });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.executions", "Failed to retrieve executions");
  }
});

router.get("/workspace/:id/execution/:executionId", async (req: any, res) => {
  try {
    const executionId = req.params.executionId;
    const userPrisma = await getUserPrismaFromRequest(req);

    const execution = await userPrisma.codeExecution.findUnique({
      where: { id: executionId },
      include: {
        history: true
      }
    });

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    res.json({ success: true, execution });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.executionDetails", "Failed to retrieve execution details");
  }
});

router.post("/workspace/:id/execution/restore", async (req: any, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.userId;
    const { executionId } = req.body;

    if (!executionId) {
      return res.status(400).json({ error: "executionId is required" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const execution = await userPrisma.codeExecution.findUnique({
      where: { id: executionId }
    });

    if (!execution || execution.questionId !== questionId) {
      return res.status(404).json({ error: "Execution history snapshot not found" });
    }

    // Update the current active workspace session with restored code
    const session = await userPrisma.problemWorkspaceSession.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {
        codeContent: execution.codeSnapshot,
        language: execution.language,
        lastOpened: new Date()
      },
      create: {
        userId,
        questionId,
        codeContent: execution.codeSnapshot,
        language: execution.language,
        status: "In Progress",
        timeSpent: 0,
        lastOpened: new Date()
      }
    });

    res.json({ success: true, codeContent: execution.codeSnapshot, language: execution.language, session });
  } catch (error) {
    handleRouteError(res, error, "Coding.workspace.restore", "Failed to restore execution code");
  }
});



// ─── Day 15 AI Complexity Analysis Engine API Endpoints ─────────────────────

// POST /api/coding/complexity/analyze
// Generate complexity analysis
router.post("/complexity/analyze", async (req: any, res) => {
  try {
    const { questionId, code, language } = req.body;
    const userId = req.user.userId;

    if (!questionId || !code || !language) {
      return res.status(400).json({ error: "questionId, code, and language are required" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);

    // Generate Complexity analysis from ComplexityService
    const analysisJson = await ComplexityService.generateAnalysis(
      userPrisma,
      userId,
      questionId,
      code,
      language
    );

    // Find if there's a last execution of this user for context to attach
    const lastExecution = await userPrisma.codeExecution.findFirst({
      where: { userId, questionId },
      orderBy: { createdAt: "desc" }
    });

    // Find if there's a last review of this user
    const lastReview = await userPrisma.codeReview.findFirst({
      where: { userId, questionId },
      orderBy: { generatedAt: "desc" }
    });

    // Save complexity analysis record to Database
    const complexityAnalysis = await userPrisma.complexityAnalysis.create({
      data: {
        userId,
        questionId,
        executionId: lastExecution?.id || null,
        reviewId: lastReview?.id || null,
        timeComplexity: analysisJson.time_complexity,
        spaceComplexity: analysisJson.space_complexity,
        efficiencyScore: analysisJson.efficiency_score,
        analysisJson: analysisJson as any
      }
    });

    res.json({ success: true, complexityAnalysis });
  } catch (error) {
    handleRouteError(res, error, "Coding.complexity.analyze", "Failed to generate complexity analysis");
  }
});

// GET /api/coding/complexity/history
// Fetch history of previous complexity analyses
router.get("/complexity/history", async (req: any, res) => {
  try {
    const { questionId } = req.query;
    const userId = req.user.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    const whereClause: any = { userId };
    if (questionId) {
      whereClause.questionId = questionId as string;
    }

    const history = await userPrisma.complexityAnalysis.findMany({
      where: whereClause,
      orderBy: { generatedAt: "desc" }
    });

    res.json({ success: true, history });
  } catch (error) {
    handleRouteError(res, error, "Coding.complexity.history", "Failed to retrieve complexity history");
  }
});

// GET /api/coding/complexity/:id
// Get details of a specific complexity analysis
router.get("/complexity/:id", async (req: any, res) => {
  try {
    const id = req.params.id;
    const userPrisma = await getUserPrismaFromRequest(req);

    const complexityAnalysis = await userPrisma.complexityAnalysis.findUnique({
      where: { id }
    });

    if (!complexityAnalysis) {
      return res.status(404).json({ error: "Complexity analysis not found" });
    }

    res.json({ success: true, complexityAnalysis });
  } catch (error) {
    handleRouteError(res, error, "Coding.complexity.getDetails", "Failed to retrieve complexity details");
  }
});

// ─── Coding Roadmap Generator Endpoints ──────────────────────────────────────────

// POST /api/coding/roadmap/generate
router.post("/roadmap/generate", async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userPrisma = await getUserPrismaFromRequest(req);
    const { skillLevel, targetRole, targetCompany, dailyStudyTime, targetTimeline, preferredLanguage } = req.body;

    if (!skillLevel || !targetRole || !targetCompany || !targetTimeline) {
      return res.status(400).json({ error: "Missing required onboarding parameters." });
    }

    const roadmap = await CodingRoadmapService.generateRoadmap(userId, userPrisma, {
      skillLevel,
      targetRole,
      targetCompany,
      dailyStudyTime: dailyStudyTime || "1 hour",
      targetTimeline: Number(targetTimeline) || 8,
      preferredLanguage: preferredLanguage || "JavaScript"
    });

    res.json({ success: true, roadmap });
  } catch (error) {
    handleRouteError(res, error, "Coding.roadmap.generate", "Failed to generate roadmap");
  }
});

// GET /api/coding/roadmap
router.get("/roadmap", async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userPrisma = await getUserPrismaFromRequest(req);
    const roadmap = await CodingRoadmapService.getRoadmap(userId, userPrisma);

    res.json({ success: true, roadmap });
  } catch (error) {
    handleRouteError(res, error, "Coding.roadmap.get", "Failed to retrieve roadmap");
  }
});

// POST /api/coding/roadmap/update
router.post("/roadmap/update", async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userPrisma = await getUserPrismaFromRequest(req);
    const { milestoneId, status, completionPercentage } = req.body;

    if (!milestoneId) {
      return res.status(400).json({ error: "milestoneId is required" });
    }

    const validStatuses = ["pending", "in_progress", "completed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const milestone = await userPrisma.roadmapMilestone.findFirst({ where: { id: milestoneId, roadmap: { userId } } });
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    const updated = await userPrisma.roadmapMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(status && { status }),
        ...(typeof completionPercentage === "number" && { completionPercentage }),
      },
    });

    const allMilestones = await userPrisma.roadmapMilestone.findMany({ where: { roadmapId: milestone.roadmapId } });
    const avgCompletion = Math.round(allMilestones.reduce((s: number, m: any) => s + (m.completionPercentage || 0), 0) / allMilestones.length);

    await userPrisma.codingRoadmap.update({
      where: { id: milestone.roadmapId },
      data: { completionPercentage: avgCompletion },
    });

    res.json({ success: true, milestone: updated, roadmapCompletion: avgCompletion });
  } catch (error) {
    handleRouteError(res, error, "Coding.roadmap.update", "Failed to update roadmap");
  }
});

// GET /api/coding/roadmap/recommendations
router.get("/roadmap/recommendations", async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userPrisma = await getUserPrismaFromRequest(req);
    const recommendations = await CodingRoadmapService.getRecommendations(userId, userPrisma);

    res.json({ success: true, recommendations });
  } catch (error) {
    handleRouteError(res, error, "Coding.roadmap.recommendations", "Failed to retrieve recommendations");
  }
});

// GET /api/coding/roadmap/readiness
router.get("/roadmap/readiness", async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userPrisma = await getUserPrismaFromRequest(req);
    const readiness = await CodingRoadmapService.getReadinessScores(userId, userPrisma);

    res.json({ success: true, readiness });
  } catch (error) {
    handleRouteError(res, error, "Coding.roadmap.readiness", "Failed to retrieve readiness scores");
  }
});

// ─── Day 19 AI Coding Dashboard Analytics ────────────────────────────────────

router.get("/dashboard/analytics", async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    // 1. User Question Progress
    const userProgress = await userPrisma.userQuestionProgress.findMany({ where: { userId } });
    const progressMap = new Map(userProgress.map((p: any) => [p.questionId, p]));
    const solvedCount = userProgress.filter((p: any) => p.status === "solved").length;
    const attemptedCount = userProgress.length;

    // 2. Topic Explorer (reuse existing logic pattern)
    const globalQuestions = await masterPrisma.codingQuestion.findMany({
      select: { id: true, topic: true, difficulty: true }
    });
    const topicNames = [...new Set(globalQuestions.map(q => q.topic))];

    const topicMastery = topicNames.map(topicName => {
      const topicQs = globalQuestions.filter(q => q.topic === topicName);
      const totalQ = topicQs.length;
      const solvedQ = topicQs.filter(q => (progressMap.get(q.id) as any)?.status === "solved").length;
      return {
        topic: topicName,
        score: totalQ > 0 ? Math.round((solvedQ / totalQ) * 100) : 0,
        solved: solvedQ,
        total: totalQ
      };
    });

    // 3. Difficulty Distribution
    const solvedQuestionIds = userProgress.filter((p: any) => p.status === "solved").map((p: any) => p.questionId);
    const solvedQuestions = solvedQuestionIds.length > 0
      ? await masterPrisma.codingQuestion.findMany({ where: { id: { in: solvedQuestionIds } } })
      : [];
    const difficultyDistribution = { Easy: 0, Medium: 0, Hard: 0, Expert: 0 };
    solvedQuestions.forEach(q => {
      const d = q.difficulty as keyof typeof difficultyDistribution;
      if (d in difficultyDistribution) difficultyDistribution[d]++;
    });

    // 4. Challenge Analytics
    const challengeSubmissions = await userPrisma.challengeSubmission.findMany({ where: { userId } });
    const acceptedSubmissions = challengeSubmissions.filter((s: any) => s.status === "Accepted");
    const challengesCompleted = acceptedSubmissions.length;
    const challengesStarted = challengeSubmissions.length;
    const successRate = challengesStarted > 0 ? Math.round((challengesCompleted / challengesStarted) * 100) : 0;
    const xpEarned = acceptedSubmissions.reduce((sum: number, s: any) => sum + (s.score || 0), 0);

    // 5. Achievement count from streak
    const achievements = await userPrisma.streakAchievement.findMany({ where: { userId } });

    // 6. Code Review Insights
    const reviews = await userPrisma.codeReview.findMany({ where: { userId }, orderBy: { generatedAt: "desc" } });
    const reviewAggregate = reviews.length > 0
      ? { avg: Math.round(reviews.reduce((s: number, r: any) => s + r.overallScore, 0) / reviews.length) }
      : { avg: 0 };

    // Most common mistakes from reviews
    const mistakeMap: Record<string, number> = {};
    reviews.forEach((r: any) => {
      const rj = r.reviewJson as any;
      if (rj?.weaknesses) {
        (Array.isArray(rj.weaknesses) ? rj.weaknesses : []).forEach((w: string) => {
          const key = typeof w === "string" ? w.slice(0, 60) : "Unknown";
          mistakeMap[key] = (mistakeMap[key] || 0) + 1;
        });
      }
    });
    const commonMistakes = Object.entries(mistakeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mistake, count]) => ({ mistake, count }));

    // 7. Complexity Analytics
    const complexities = await userPrisma.complexityAnalysis.findMany({ where: { userId }, orderBy: { generatedAt: "desc" } });
    const complexityAggregate = complexities.length > 0
      ? { avgEfficiency: Math.round(complexities.reduce((s: number, c: any) => s + c.efficiencyScore, 0) / complexities.length) }
      : { avgEfficiency: 0 };

    const timeComplexityCounts: Record<string, number> = {};
    const spaceComplexityCounts: Record<string, number> = {};
    complexities.forEach((c: any) => {
      const tc = c.timeComplexity || "O(n)";
      const sc = c.spaceComplexity || "O(1)";
      timeComplexityCounts[tc] = (timeComplexityCounts[tc] || 0) + 1;
      spaceComplexityCounts[sc] = (spaceComplexityCounts[sc] || 0) + 1;
    });

    const mostCommonTimeComplexity = Object.entries(timeComplexityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const mostCommonSpaceComplexity = Object.entries(spaceComplexityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    // Efficiency trend (last 20 analyses)
    const efficiencyTrend = complexities.slice(0, 20).reverse().map((c: any) => ({
      score: c.efficiencyScore,
      date: c.generatedAt
    }));

    // 8. Weak Topics
    const weakTopics = await userPrisma.weakTopic.findMany({
      where: { userId },
      orderBy: { strengthScore: "asc" }
    });
    const topWeakTopics = weakTopics.slice(0, 5).map((wt: any) => ({
      topic: wt.topicName,
      mastery: wt.strengthScore,
      riskLevel: wt.riskLevel,
      status: wt.status,
      revisionPriority: wt.revisionPriority
    }));

    // 9. Strong Topics (top performing)
    const strongTopics = [...topicMastery]
      .sort((a, b) => b.score - a.score)
      .filter(t => t.score > 0)
      .slice(0, 5);

    // 10. Roadmap Data
    const roadmap = await userPrisma.codingRoadmap.findFirst({ where: { userId } });
    let roadmapProgress = null;
    if (roadmap) {
      const roadmapData = roadmap.roadmapJson as any;
      const milestones = await userPrisma.roadmapMilestone.findMany({ where: { roadmapId: roadmap.id } });
      const currentMilestone = milestones.find((m: any) => m.status === "in_progress") || milestones.find((m: any) => m.status === "pending");
      const nextMilestone = milestones.find((m: any) => m.status === "pending");
      roadmapProgress = {
        type: roadmap.roadmapType,
        skillLevel: roadmap.skillLevel,
        targetCompany: roadmap.targetCompany,
        completionPercentage: roadmap.completionPercentage,
        currentTopic: roadmapData?.weeks?.find((w: any) => w.status === "in_progress")?.topics?.[0] || roadmapData?.weeks?.[0]?.topics?.[0] || "N/A",
        nextMilestone: nextMilestone?.title || currentMilestone?.title || "All Complete",
        estimatedCompletion: roadmapData?.estimated_completion || "N/A",
        totalWeeks: roadmap.timelineWeeks,
        guidance: roadmapData?.guidance || ""
      };
    }

    // 11. Activity Heatmap (last 365 days)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentProgress = userProgress.filter((p: any) => new Date(p.updatedAt) >= oneYearAgo);
    const heatmap: Record<string, number> = {};
    recentProgress.forEach((p: any) => {
      const day = new Date(p.updatedAt).toISOString().split("T")[0];
      heatmap[day] = (heatmap[day] || 0) + 1;
    });

    // 12. Activity Chart (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30Progress = userProgress.filter((p: any) => new Date(p.updatedAt) >= thirtyDaysAgo);
    const dailyData: Record<string, { solved: number; sessions: number; timeSpent: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyData[key] = { solved: 0, sessions: 0, timeSpent: 0 };
    }
    last30Progress.forEach((p: any) => {
      const day = new Date(p.updatedAt).toISOString().split("T")[0];
      if (dailyData[day]) {
        if (p.status === "solved") dailyData[day].solved++;
        dailyData[day].sessions++;
        dailyData[day].timeSpent += Math.round((p.timeSpent || 0) / 60);
      }
    });

    const activityChart = {
      labels: Object.keys(dailyData),
      questionsSolved: Object.values(dailyData).map(d => d.solved),
      sessions: Object.values(dailyData).map(d => d.sessions),
      timeSpent: Object.values(dailyData).map(d => d.timeSpent)
    };

    // 13. Streak
    const streak = await userPrisma.learningStreak.findFirst({ where: { userId } });

    // 14. Code Execution Stats
    const executionCount = await userPrisma.codeExecution.count({ where: { userId } });

    // 15. AI Coding Brief
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklySolved = userProgress.filter((p: any) => p.status === "solved" && new Date(p.updatedAt) >= weekAgo).length;
    const weakestTopic = [...topicMastery].sort((a, b) => a.score - b.score).find(t => t.solved > 0 || true);

    // Placement & Interview Readiness (reuse logic from roadmap service)
    const complexityScore = complexities.length > 0 ? (complexityAggregate.avgEfficiency || 0) : 0;
    const roadmapWeight = (roadmap?.completionPercentage || 0) * 0.40;
    const solvedWeight = Math.min(30, (solvedCount / 60) * 30);
    const complexityWeight = complexityScore * 0.15;
    const challengeWeight = Math.min(15, challengesCompleted * 5);
    const placementReadiness = Math.min(100, Math.round(roadmapWeight + solvedWeight + complexityWeight + challengeWeight));

    const topicCoverage = new Set(solvedQuestions.map(q => q.topic)).size;
    const accuracyScore = attemptedCount > 0 ? (solvedCount / attemptedCount) * 100 : 0;
    const reviewScore = reviews.length > 0 ? (reviewAggregate.avg || 0) : 0;
    const coverageWeight = Math.min(35, (topicCoverage / 10) * 35);
    const reviewWeight = reviewScore * 0.35;
    const accuracyWeight = accuracyScore * 0.30;
    const interviewReadiness = Math.min(100, Math.round(coverageWeight + reviewWeight + accuracyWeight));

    // Optimization opportunities count
    const optimizationOpportunities = complexities.filter((c: any) => c.efficiencyScore < 70).length;

    res.json({
      overview: {
        questionsSolved: solvedCount,
        challengesCompleted,
        currentStreak: streak?.currentStreak || 0,
        roadmapCompletion: roadmap?.completionPercentage || 0,
        interviewReadiness,
        placementReadiness
      },
      aiBrief: {
        greeting,
        weeklySolved,
        weakestTopic: weakestTopic?.topic || "None",
        weakestTopicMastery: weakestTopic?.score || 0,
        interviewReadiness,
        improvementPotential: Math.min(100 - interviewReadiness, 15)
      },
      topicMastery: topicMastery.filter(t => t.total > 0).sort((a, b) => b.score - a.score),
      difficultyDistribution,
      activityChart,
      roadmapProgress,
      challengeAnalytics: {
        started: challengesStarted,
        completed: challengesCompleted,
        successRate,
        xpEarned,
        achievementsUnlocked: achievements.length
      },
      reviewInsights: {
        avgCodeQuality: reviewAggregate.avg,
        totalReviews: reviews.length,
        optimizationOpportunities,
        commonMistakes
      },
      complexityAnalytics: {
        avgEfficiencyScore: complexityAggregate.avgEfficiency,
        mostCommonTimeComplexity,
        mostCommonSpaceComplexity,
        totalAnalyses: complexities.length,
        efficiencyTrend
      },
      weakTopics: topWeakTopics,
      strongTopics,
      recentActivity: userProgress
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8)
        .map((p: any) => ({ questionId: p.questionId, status: p.status, updatedAt: p.updatedAt })),
      heatmap,
      executionStats: {
        totalExecutions: executionCount,
        streakPoints: streak?.points || 0
      }
    });
  } catch (error) {
    handleRouteError(res, error, "Coding.dashboard.analytics", "Failed to fetch dashboard analytics");
  }
});

export const codingRouter = router;



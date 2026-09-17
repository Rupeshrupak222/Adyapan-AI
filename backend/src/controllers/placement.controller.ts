import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/httpError";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { requireUserId } from "../utils/request";
import {
  getTopics,
  startPracticeSession,
  generateMockTest,
  getDefaultMockTests,
  placementCoachChat,
  getReadinessReport,
} from "../services/placement.service";

/**
 * 1. Get placement topics
 */
export async function getPlacementTopics(_req: Request, res: Response, next: NextFunction) {
  try {
    const topics = await getTopics();
    res.json({ success: true, ...topics });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Start a practice session (generates AI questions)
 */
export async function startPractice(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { topic, category, count, difficulty } = req.body;

    if (!topic || !category) {
      throw httpError(400, "topic and category are required");
    }
    if (!["aptitude", "reasoning", "mcqs"].includes(category)) {
      throw httpError(400, "category must be aptitude, reasoning, or mcqs");
    }

    const result = await startPracticeSession(
      topic,
      category,
      Math.min(Number(count) || 10, 30),
      difficulty,
      userId
    );

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Submit practice answers and save session
 */
export async function submitPractice(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { topic, category, answers, questions, score } = req.body;

    if (!topic || !category || !answers || !questions) {
      throw httpError(400, "topic, category, answers, and questions are required");
    }

    // Save session to user DB
    const session = await userPrisma.placementSession.create({
      data: {
        userId,
        category,
        topic,
        questions: questions as any,
        answers: answers as any,
        score: Number(score) || 0,
        totalQuestions: questions.length,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    res.json({ success: true, sessionId: session.id, score: session.score });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Get user's practice history
 */
export async function getPracticeHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const sessions = await userPrisma.placementSession.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 50,
    });

    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. Generate a mock test (AI-powered, company-specific)
 */
export async function createMockTest(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { company, sections } = req.body;

    if (!company) {
      throw httpError(400, "company is required");
    }

    const defaultSections = sections || [
      { name: "Aptitude", topic: "Percentages", questionCount: 15 },
      { name: "Reasoning", topic: "Puzzles", questionCount: 10 },
      { name: "Technical", topic: "Data Structures", questionCount: 10 },
    ];

    const mockTest = await generateMockTest(company, defaultSections, userId);
    res.json({ success: true, mockTest });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. Get default mock tests (TCS, Infosys, etc.)
 */
export async function listMockTests(_req: Request, res: Response, next: NextFunction) {
  try {
    const tests = await getDefaultMockTests();
    res.json({ success: true, tests });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Submit mock test and save results
 */
export async function submitMockTest(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { testId, company, answers, sections, score, totalQuestions, durationMs } = req.body;

    const result = await userPrisma.mockTestResult.create({
      data: {
        userId,
        testId: testId || `mock-${Date.now()}`,
        company: company || "Unknown",
        answers: answers as any,
        sections: sections as any,
        score: Number(score) || 0,
        totalQuestions: Number(totalQuestions) || 0,
        durationMs: Number(durationMs) || 0,
        completedAt: new Date(),
      },
    });

    res.json({ success: true, resultId: result.id, score: result.score });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. Get mock test history
 */
export async function getMockTestHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const results = await userPrisma.mockTestResult.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 20,
    });

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
}

/**
 * 9. AI Placement Coach chat
 */
export async function coachChat(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw httpError(400, "messages array is required");
    }

    const reply = await placementCoachChat(messages, userId);
    res.json({ success: true, reply });
  } catch (error) {
    next(error);
  }
}

/**
 * 10. Get readiness report
 */
export async function readinessReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const sessions = await userPrisma.placementSession.findMany({
      where: { userId },
      select: { topic: true, category: true, score: true, totalQuestions: true },
    });

    const mockResults = await userPrisma.mockTestResult.findMany({
      where: { userId },
      select: { company: true, score: true, totalQuestions: true },
    });

    const sessionData = sessions.map((s) => ({
      topic: s.topic,
      category: s.category,
      score: s.score,
      total: s.totalQuestions,
    }));

    // Include mock test results as additional sessions
    mockResults.forEach((m) => {
      sessionData.push({
        topic: m.company + " Mock",
        category: "mcqs",
        score: m.score,
        total: m.totalQuestions,
      });
    });

    const report = await getReadinessReport(sessionData);
    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
}

import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/httpError";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { requireUserId } from "../utils/request";
import {
  getAptitudeCategories,
  getCompanyPresets,
  generateAptitudeQuestions,
  generateAdaptiveQuestions,
  generateAIExplanation,
  generateDailyChallenge,
  generateStudyPlan,
  getSessionReview,
  type AptitudeCategory,
  type Difficulty,
} from "../services/aptitude-engine.service";
import {
  getTopicTestsFromDb,
  getTopicTestByIdFromDb,
  generateWeeklyTopicTest,
} from "../services/aptitude-test-bank.service";

/**
 * 1. Get all aptitude categories with topics
 */
export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getAptitudeCategories();
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

/**
 * Get DB-stored tests for a topic (Test 1, Test 2, Test 3, etc.)
 */
export async function getTopicTests(req: Request, res: Response, next: NextFunction) {
  try {
    const { topic, category } = req.query;
    if (!topic) {
      throw httpError(400, "topic parameter is required");
    }
    const userPrisma = await getUserPrismaFromRequest(req);
    const tests = await getTopicTestsFromDb(String(topic), String(category || "quantitative"), userPrisma);
    
    const userId = (req.user as any)?.id || (req.user as any)?.userId || (req as any).userId;
    if (userId) {
      const userSessions = await userPrisma.aptitudeSession.findMany({
        where: { userId, topic: String(topic) },
        orderBy: { createdAt: "desc" },
      });
      const enriched = tests.map(t => {
        const match = userSessions.find((s: any) => s.questionsJson && Array.isArray(s.questionsJson) && s.questionsJson.length === t.totalQuestions);
        return {
          ...t,
          completed: !!match,
          score: match?.score || 0,
          accuracy: match?.accuracy || 0,
        };
      });
      return res.json({ success: true, tests: enriched });
    }

    res.json({ success: true, tests });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Get all company presets
 */
export async function getCompanyPresetsCtrl(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getCompanyPresets();
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Start an aptitude session
 */
export async function startSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const {
      mode,
      company,
      role,
      category,
      topic,
      difficulty,
      count,
      testId,
    } = req.body;

    if (!mode) {
      throw httpError(400, "mode is required (practice, timed_quiz, topic_test, company_test, adaptive, daily_challenge)");
    }

    const validModes = ["practice", "timed_quiz", "topic_test", "company_test", "adaptive", "daily_challenge", "revision"];
    if (!validModes.includes(mode)) {
      throw httpError(400, `mode must be one of: ${validModes.join(", ")}`);
    }

    const questionCount = Math.min(Math.max(Number(count) || 10, 1), 50);
    let questions;
    let sessionDifficulty = (difficulty as Difficulty) || "medium";

    // If testId is provided or mode is topic_test with topic, fetch 30 questions from DB test bank!
    if (testId) {
      const dbTest = await getTopicTestByIdFromDb(testId, userPrisma);
      if (dbTest) {
        questions = dbTest.questions;
        sessionDifficulty = (dbTest.difficulty as Difficulty) || "medium";
      }
    } else if (mode === "topic_test" && topic) {
      const tests = await getTopicTestsFromDb(topic, category || "quantitative", userPrisma);
      if (tests.length > 0) {
        const firstTest = await getTopicTestByIdFromDb(tests[0].id, userPrisma);
        if (firstTest) {
          questions = firstTest.questions;
          sessionDifficulty = (firstTest.difficulty as Difficulty) || "medium";
        }
      }
    }

    if (!questions || questions.length === 0) {
      if (mode === "adaptive") {
        const analytics = await userPrisma.aptitudeAnalytics.findUnique({ where: { userId } });

        const weakTopics: string[] = analytics
          ? (analytics.topicMastery as any)?.weakTopics || []
          : [];
        const strongTopics: string[] = analytics
          ? (analytics.topicMastery as any)?.strongTopics || []
          : [];
        const recentAccuracy = analytics?.overallAccuracy || 50;

        sessionDifficulty =
          recentAccuracy >= 80 ? "hard" : recentAccuracy >= 50 ? "medium" : "easy";

        questions = await generateAdaptiveQuestions({
          weakTopics,
          strongTopics,
          recentAccuracy,
          targetDifficulty: sessionDifficulty,
          count: questionCount,
        });
      } else if (mode === "company_test" && company) {
        questions = await generateAptitudeQuestions({
          company,
          count: questionCount,
          difficulty: sessionDifficulty,
        });
      } else {
        questions = await generateAptitudeQuestions({
          topic,
          category: category as AptitudeCategory | undefined,
          count: questionCount,
          difficulty: sessionDifficulty,
          company,
        });
      }
    }

    if (!questions || questions.length === 0) {
      throw httpError(503, "AI question generation failed. Please try again in a moment.");
    }

    const isAllFallback = questions.every((q: any) => q.text?.includes("temporarily busy"));
    if (isAllFallback && questions.length > 0) {
      throw httpError(503, "AI question generation service is temporarily unavailable. Please try again.");
    }

    const session = await userPrisma.aptitudeSession.create({
      data: {
        userId,
        mode,
        company: company || null,
        role: role || null,
        category: category || null,
        topic: topic || null,
        difficulty: sessionDifficulty,
        questionsJson: questions as any,
        totalQuestions: questions.length,
        score: 0,
        accuracy: 0,
        totalTimeMs: 0,
        avgTimePerQMs: 0,
        xpEarned: 0,
        streakMaintained: false,
        weakTopics: [],
        strongTopics: [],
        startedAt: new Date(),
      },
    });

    res.json({
      success: true,
      session: {
        id: session.id,
        mode: session.mode,
        company: session.company || undefined,
        role: session.role || undefined,
        category: session.category || undefined,
        topic: session.topic || undefined,
        difficulty: sessionDifficulty,
        questions,
        totalQuestions: questions.length,
        score: 0,
        accuracy: 0,
        totalTimeMs: 0,
        avgTimePerQMs: 0,
        xpEarned: 0,
        weakTopics: [],
        strongTopics: [],
        startedAt: session.startedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Submit a single answer during a session
 */
export async function submitAnswer(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const {
      sessionId,
      questionIdx,
      selectedIdx,
      timeTakenMs,
      bookmarked,
      flagged,
      notes,
    } = req.body;

    if (!sessionId || questionIdx === undefined || selectedIdx === undefined) {
      throw httpError(400, "sessionId, questionIdx, and selectedIdx are required");
    }

    const session = await userPrisma.aptitudeSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw httpError(404, "Session not found");
    }
    if (session.userId !== userId) {
      throw httpError(403, "Not authorized to access this session");
    }

    const questions = session.questionsJson as any[];
    const question = questions[questionIdx];
    if (!question) {
      throw httpError(400, `Invalid questionIdx: ${questionIdx}`);
    }

    const isCorrect = selectedIdx === question.correctIdx;

    const answer = await userPrisma.aptitudeAnswer.create({
      data: {
        sessionId,
        userId,
        questionIdx,
        questionId: question.id || null,
        topic: question.topic || session.topic || null,
        category: question.category || session.category || null,
        difficulty: question.difficulty || session.difficulty || null,
        selectedIdx,
        correct: isCorrect,
        timeTakenMs: Number(timeTakenMs) || 0,
        bookmarked: Boolean(bookmarked),
        flagged: Boolean(flagged),
        notes: notes || null,
      },
    });

    let aiExplanation = null;
    try {
      const explanation = await generateAIExplanation({
        question: question.text,
        options: question.options,
        userAnswer: selectedIdx,
        correctAnswer: question.correctIdx,
        timeTaken: Math.round((Number(timeTakenMs) || 0) / 1000),
        topic: question.topic,
      });

      aiExplanation = explanation;
      await userPrisma.aptitudeAnswer.update({
        where: { id: answer.id },
        data: { aiExplanation: JSON.stringify(explanation) },
      });
    } catch {
      // AI explanation is optional; continue without it
    }

    res.json({
      success: true,
      correct: isCorrect,
      correctIdx: question.correctIdx,
      explanation: question.explanation,
      shortcut: question.shortcut || null,
      aiExplanation,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. Complete a session — save full data and return review
 */
export async function completeSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { sessionId, answers, totalTimeMs } = req.body;

    if (!sessionId) {
      throw httpError(400, "sessionId is required");
    }

    const session = await userPrisma.aptitudeSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw httpError(404, "Session not found");
    }
    if (session.userId !== userId) {
      throw httpError(403, "Not authorized");
    }

    const questions = session.questionsJson as any[];
    const submittedAnswers = Array.isArray(answers) ? answers : [];

    let correctCount = 0;
    const topicStats: Record<string, { correct: number; total: number; totalTime: number }> = {};

    for (const ans of submittedAnswers) {
      const q = questions[ans.questionIdx];
      if (!q) continue;

      const isCorrect = ans.selectedIdx === q.correctIdx;
      if (isCorrect) correctCount++;

      const topic = q.topic || session.topic || "General";
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0, totalTime: 0 };
      topicStats[topic].total += 1;
      topicStats[topic].totalTime += Number(ans.timeTakenMs) || 0;
      if (isCorrect) topicStats[topic].correct += 1;
    }

    const totalAnswered = submittedAnswers.length || questions.length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const avgTimePerQ = totalAnswered > 0 ? Math.round((Number(totalTimeMs) || 0) / totalAnswered) : 0;

    const weakTopics = Object.entries(topicStats)
      .filter(([_, s]) => s.total > 0 && (s.correct / s.total) < 0.5)
      .map(([topic]) => topic);
    const strongTopics = Object.entries(topicStats)
      .filter(([_, s]) => s.total > 0 && (s.correct / s.total) >= 0.75)
      .map(([topic]) => topic);

    const xpEarned = correctCount * 10 + (accuracy >= 80 ? 20 : accuracy >= 60 ? 10 : 0);

    const updatedSession = await userPrisma.aptitudeSession.update({
      where: { id: sessionId },
      data: {
        score: correctCount,
        accuracy,
        totalTimeMs: Number(totalTimeMs) || 0,
        avgTimePerQMs: avgTimePerQ,
        xpEarned,
        weakTopics,
        strongTopics,
        completedAt: new Date(),
      },
    });

    // Upsert analytics
    const existingAnalytics = await userPrisma.aptitudeAnalytics.findUnique({ where: { userId } });

    const totalSessions = (existingAnalytics?.totalSessions || 0) + 1;
    const totalQuestions = (existingAnalytics?.totalQuestions || 0) + totalAnswered;
    const totalCorrect = (existingAnalytics?.totalCorrect || 0) + correctCount;
    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const avgTimePerQMs = existingAnalytics
      ? (existingAnalytics.avgTimePerQMs * (totalSessions - 1) + avgTimePerQ) / totalSessions
      : avgTimePerQ;
    const xp = (existingAnalytics?.xp || 0) + xpEarned;
    const level = Math.floor(xp / 200) + 1;

    const topicMastery = { ...(existingAnalytics?.topicMastery as any || {}) };
    for (const [topic, stats] of Object.entries(topicStats)) {
      if (!topicMastery[topic]) topicMastery[topic] = { correct: 0, total: 0, accuracy: 0 };
      topicMastery[topic].correct += stats.correct;
      topicMastery[topic].total += stats.total;
      topicMastery[topic].accuracy = Math.round(
        (topicMastery[topic].correct / topicMastery[topic].total) * 100
      );
    }
    topicMastery.weakTopics = weakTopics;
    topicMastery.strongTopics = strongTopics;

    const companyReadiness = { ...(existingAnalytics?.companyReadiness as any || {}) };
    if (session.company) {
      if (!companyReadiness[session.company]) {
        companyReadiness[session.company] = { score: 0, sessions: 0 };
      }
      companyReadiness[session.company].sessions += 1;
      companyReadiness[session.company].score = Math.round(
        ((companyReadiness[session.company].score * (companyReadiness[session.company].sessions - 1)) + accuracy) /
        companyReadiness[session.company].sessions
      );
    }

    const categoryScores = { ...(existingAnalytics?.categoryScores as any || {}) };
    if (session.category) {
      if (!categoryScores[session.category]) {
        categoryScores[session.category] = { correct: 0, total: 0, accuracy: 0 };
      }
      const catStats = Object.entries(topicStats)
        .filter(([topic]) => questions.find((q: any) => q.topic === topic && q.category === session.category));
      for (const [_, stats] of catStats) {
        categoryScores[session.category].correct += stats.correct;
        categoryScores[session.category].total += stats.total;
      }
      if (categoryScores[session.category].total > 0) {
        categoryScores[session.category].accuracy = Math.round(
          (categoryScores[session.category].correct / categoryScores[session.category].total) * 100
        );
      }
    }

    const weeklyProgress = [...((existingAnalytics?.weeklyProgress as any[]) || [])];
    const now = new Date();
    const weekKey = `${now.getFullYear()}-W${String((() => { const soy = new Date(now.getFullYear(), 0, 1); return Math.ceil(((now.getTime() - soy.getTime()) / 86400000 + soy.getDay() + 1) / 7); })()).padStart(2, "0")}`;
    const currentWeek = weeklyProgress.find((w: any) => w.week === weekKey);
    if (currentWeek) {
      currentWeek.sessions += 1;
      currentWeek.correct += correctCount;
      currentWeek.total += totalAnswered;
      currentWeek.accuracy = Math.round((currentWeek.correct / currentWeek.total) * 100);
    } else {
      weeklyProgress.push({
        week: weekKey,
        sessions: 1,
        correct: correctCount,
        total: totalAnswered,
        accuracy,
      });
    }

    const placementReadiness = Math.min(100, Math.round(overallAccuracy * 0.6 + (totalSessions >= 10 ? 20 : totalSessions * 2) + (xp > 500 ? 20 : xp / 25)));

    await userPrisma.aptitudeAnalytics.upsert({
      where: { userId },
      create: {
        userId,
        totalSessions,
        totalQuestions,
        totalCorrect,
        overallAccuracy,
        avgTimePerQMs,
        xp,
        level,
        streak: 0,
        bestStreak: 0,
        topicMastery,
        companyReadiness,
        categoryScores,
        difficultyHistory: [],
        weeklyProgress,
        placementReadiness,
        lastPracticedAt: new Date(),
      },
      update: {
        totalSessions,
        totalQuestions,
        totalCorrect,
        overallAccuracy,
        avgTimePerQMs,
        xp,
        level,
        topicMastery,
        companyReadiness,
        categoryScores,
        weeklyProgress,
        placementReadiness,
        lastPracticedAt: new Date(),
      },
    });

    // Generate AI session review
    let review = null;
    try {
      review = await getSessionReview({
        topic: session.topic || "Mixed",
        questions,
        answers: submittedAnswers.map((a: any) => ({
          questionIdx: a.questionIdx,
          selectedIdx: a.selectedIdx,
          timeTakenSec: Math.round((Number(a.timeTakenMs) || 0) / 1000),
        })),
        totalTimeTaken: Math.round((Number(totalTimeMs) || 0) / 1000),
        score: correctCount,
        totalQuestions: totalAnswered,
      });

      await userPrisma.aptitudeSession.update({
        where: { id: sessionId },
        data: { reportJson: review as any },
      });
    } catch {
      // Review generation is optional
    }

    res.json({
      success: true,
      sessionId: updatedSession.id,
      score: correctCount,
      totalQuestions: totalAnswered,
      accuracy,
      timeTakenMs: Number(totalTimeMs) || 0,
      avgTimePerQMs: avgTimePerQ,
      weakTopics,
      strongTopics,
      xpEarned,
      review,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. Get a specific session with all answers
 */
export async function getSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { id } = req.params;

    if (!id) {
      throw httpError(400, "Session ID is required");
    }

    const session = await userPrisma.aptitudeSession.findUnique({ where: { id } });
    if (!session) {
      throw httpError(404, "Session not found");
    }
    if (session.userId !== userId) {
      throw httpError(403, "Not authorized");
    }

    const answers = await userPrisma.aptitudeAnswer.findMany({
      where: { sessionId: id },
      orderBy: { questionIdx: "asc" },
    });

    res.json({ success: true, session, answers });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Get paginated session history
 */
export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const {
      limit: rawLimit,
      offset: rawOffset,
      mode,
      company,
    } = req.query;

    const limit = Math.min(Math.max(Number(rawLimit) || 20, 1), 100);
    const offset = Math.max(Number(rawOffset) || 0, 0);

    const where: any = { userId };
    if (mode && typeof mode === "string") where.mode = mode;
    if (company && typeof company === "string") where.company = company;

    const [sessions, total] = await Promise.all([
      userPrisma.aptitudeSession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      userPrisma.aptitudeSession.count({ where }),
    ]);

    res.json({
      success: true,
      sessions,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. Get comprehensive performance analytics
 */
export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const analytics = await userPrisma.aptitudeAnalytics.findUnique({ where: { userId } });
    const recentSessions = await userPrisma.aptitudeSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        mode: true,
        company: true,
        topic: true,
        category: true,
        score: true,
        totalQuestions: true,
        accuracy: true,
        totalTimeMs: true,
        weakTopics: true,
        strongTopics: true,
        createdAt: true,
      },
    });

    if (!analytics) {
      return res.json({
        success: true,
        analytics: {
          totalSessions: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          overallAccuracy: 0,
          avgTimePerQMs: 0,
          xp: 0,
          level: 1,
          streak: 0,
          bestStreak: 0,
          topicMastery: [],
          companyReadiness: [],
          categoryScores: {},
          weeklyProgress: [],
          placementReadiness: 0,
          weakTopics: [],
          strongTopics: [],
        },
        recentSessions: [],
      });
    }

    const rawTopicMastery = (analytics.topicMastery as any) || {};
    const rawCompanyReadiness = (analytics.companyReadiness as any) || {};
    const categoryScores = (analytics.categoryScores as any) || {};
    const weeklyProgress = (analytics.weeklyProgress as any[]) || [];

    const weakTopics: string[] = rawTopicMastery.weakTopics || [];
    const strongTopics: string[] = rawTopicMastery.strongTopics || [];

    const topicMasteryArr: any[] = Object.entries(rawTopicMastery)
      .filter(([key]) => !["weakTopics", "strongTopics"].includes(key))
      .map(([topic, stats]: [string, any]) => ({
        topic,
        accuracy: stats.accuracy || 0,
        totalAttempted: stats.total || 0,
        totalCorrect: stats.correct || 0,
        avgTimeMs: stats.avgTimeMs || 0,
        difficulty: stats.difficulty || "medium",
        trend: stats.trend || "stable",
        lastPracticed: stats.lastPracticed || null,
      }));

    const companyReadinessArr: any[] = Object.entries(rawCompanyReadiness).map(([company, data]: [string, any]) => ({
      company,
      score: data.score || 0,
      ready: (data.score || 0) >= 60,
      gapTopics: data.gapTopics || [],
      recommendation: data.recommendation || "",
    }));

    res.json({
      success: true,
      analytics: {
        totalSessions: analytics.totalSessions,
        totalQuestions: analytics.totalQuestions,
        totalCorrect: analytics.totalCorrect,
        overallAccuracy: analytics.overallAccuracy,
        avgTimePerQMs: analytics.avgTimePerQMs,
        xp: analytics.xp,
        level: analytics.level,
        streak: analytics.streak,
        bestStreak: analytics.bestStreak,
        topicMastery: topicMasteryArr,
        companyReadiness: companyReadinessArr,
        categoryScores,
        weeklyProgress,
        placementReadiness: analytics.placementReadiness,
        lastPracticedAt: analytics.lastPracticedAt,
        weakTopics,
        strongTopics,
      },
      recentSessions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 9. Get AI-generated learning recommendations
 */
export async function getRecommendations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const analytics = await userPrisma.aptitudeAnalytics.findUnique({ where: { userId } });

    const topicMastery = (analytics?.topicMastery as any) || {};
    const weakTopics: string[] = topicMastery.weakTopics || [];
    const strongTopics: string[] = topicMastery.strongTopics || [];
    const overallAccuracy = analytics?.overallAccuracy || 0;

    const companyReadiness = (analytics?.companyReadiness as any) || {};
    const targetCompanies = Object.keys(companyReadiness);

    const plan = await generateStudyPlan({
      weakTopics,
      strongTopics,
      overallAccuracy,
      targetCompanies,
      daysUntilPlacement: 30,
      dailyAvailableMinutes: 60,
      completedTopics: strongTopics,
    });

    res.json({ success: true, recommendations: plan });
  } catch (error) {
    next(error);
  }
}

/**
 * 10. Start or get daily challenge
 */
export async function getDailyChallenge(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const dailyId = `daily-${dateStr}`;

    const existingSession = await userPrisma.aptitudeSession.findFirst({
      where: {
        userId,
        mode: "daily_challenge",
        id: { contains: dailyId },
      },
    });

    if (existingSession && existingSession.completedAt) {
      return res.json({
        success: true,
        alreadyCompleted: true,
        sessionId: existingSession.id,
        session: existingSession,
      });
    }

    if (existingSession && !existingSession.completedAt) {
      const questions = existingSession.questionsJson as any[];
      return res.json({
        success: true,
        alreadyCompleted: false,
        sessionId: existingSession.id,
        questions,
        session: existingSession,
      });
    }

    const challenge = await generateDailyChallenge();

    const session = await userPrisma.aptitudeSession.create({
      data: {
        userId,
        mode: "daily_challenge",
        company: null,
        role: null,
        category: null,
        topic: "Daily Challenge",
        difficulty: "medium",
        questionsJson: challenge.questions as any,
        totalQuestions: challenge.questions.length,
        score: 0,
        accuracy: 0,
        totalTimeMs: 0,
        avgTimePerQMs: 0,
        xpEarned: 0,
        streakMaintained: false,
        weakTopics: [],
        strongTopics: [],
        reportJson: { dailyChallengeId: challenge.id, rewardPoints: challenge.rewardPoints } as any,
        startedAt: new Date(),
      },
    });

    res.json({
      success: true,
      alreadyCompleted: false,
      session: {
        id: session.id,
        mode: "daily_challenge",
        company: undefined,
        role: undefined,
        category: undefined,
        topic: "Daily Challenge",
        difficulty: "medium",
        questions: challenge.questions,
        totalQuestions: challenge.questions.length,
        score: 0,
        accuracy: 0,
        totalTimeMs: 0,
        avgTimePerQMs: 0,
        xpEarned: 0,
        weakTopics: [],
        strongTopics: [],
        startedAt: session.startedAt.toISOString(),
      },
      challenge: {
        id: challenge.id,
        title: challenge.title,
        date: challenge.date,
        timeLimitMinutes: challenge.timeLimitMinutes,
        rewardPoints: challenge.rewardPoints,
        description: challenge.description,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 11. Batch submit all answers for a session
 */
export async function submitSessionAnswers(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { sessionId, answers, totalTimeMs } = req.body;

    if (!sessionId) {
      throw httpError(400, "sessionId is required");
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      throw httpError(400, "answers array is required and must not be empty");
    }

    const session = await userPrisma.aptitudeSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw httpError(404, "Session not found");
    }
    if (session.userId !== userId) {
      throw httpError(403, "Not authorized");
    }

    const questions = session.questionsJson as any[];
    const createdAnswers = [];
    let correctCount = 0;
    const topicStats: Record<string, { correct: number; total: number; totalTime: number }> = {};

    for (const ans of answers) {
      const { questionIdx, selectedIdx, timeTakenMs, bookmarked, flagged, notes } = ans;

      if (questionIdx === undefined || selectedIdx === undefined) continue;

      const q = questions[questionIdx];
      if (!q) continue;

      const isCorrect = selectedIdx === q.correctIdx;
      if (isCorrect) correctCount++;

      const topic = q.topic || session.topic || "General";
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0, totalTime: 0 };
      topicStats[topic].total += 1;
      topicStats[topic].totalTime += Number(timeTakenMs) || 0;
      if (isCorrect) topicStats[topic].correct += 1;

      const created = await userPrisma.aptitudeAnswer.create({
        data: {
          sessionId,
          userId,
          questionIdx,
          questionId: q.id || null,
          topic: q.topic || session.topic || null,
          category: q.category || session.category || null,
          difficulty: q.difficulty || session.difficulty || null,
          selectedIdx,
          correct: isCorrect,
          timeTakenMs: Number(timeTakenMs) || 0,
          bookmarked: Boolean(bookmarked),
          flagged: Boolean(flagged),
          notes: notes || null,
        },
      });
      createdAnswers.push(created);
    }

    const totalAnswered = answers.length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const avgTimePerQ = totalAnswered > 0 ? Math.round((Number(totalTimeMs) || 0) / totalAnswered) : 0;

    const weakTopics = Object.entries(topicStats)
      .filter(([_, s]) => s.total > 0 && (s.correct / s.total) < 0.5)
      .map(([topic]) => topic);
    const strongTopics = Object.entries(topicStats)
      .filter(([_, s]) => s.total > 0 && (s.correct / s.total) >= 0.75)
      .map(([topic]) => topic);

    const xpEarned = correctCount * 10 + (accuracy >= 80 ? 20 : accuracy >= 60 ? 10 : 0);

    const updatedSession = await userPrisma.aptitudeSession.update({
      where: { id: sessionId },
      data: {
        score: correctCount,
        accuracy,
        totalTimeMs: Number(totalTimeMs) || 0,
        avgTimePerQMs: avgTimePerQ,
        xpEarned,
        weakTopics,
        strongTopics,
        completedAt: new Date(),
      },
    });

    // Upsert analytics
    const existingAnalytics = await userPrisma.aptitudeAnalytics.findUnique({ where: { userId } });

    const totalSessions = (existingAnalytics?.totalSessions || 0) + 1;
    const totalQuestions = (existingAnalytics?.totalQuestions || 0) + totalAnswered;
    const totalCorrect = (existingAnalytics?.totalCorrect || 0) + correctCount;
    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const avgTimePerQMs = existingAnalytics
      ? (existingAnalytics.avgTimePerQMs * (totalSessions - 1) + avgTimePerQ) / totalSessions
      : avgTimePerQ;
    const xp = (existingAnalytics?.xp || 0) + xpEarned;
    const level = Math.floor(xp / 200) + 1;

    const topicMastery = { ...(existingAnalytics?.topicMastery as any || {}) };
    for (const [topic, stats] of Object.entries(topicStats)) {
      if (!topicMastery[topic]) topicMastery[topic] = { correct: 0, total: 0, accuracy: 0 };
      topicMastery[topic].correct += stats.correct;
      topicMastery[topic].total += stats.total;
      topicMastery[topic].accuracy = Math.round(
        (topicMastery[topic].correct / topicMastery[topic].total) * 100
      );
    }
    topicMastery.weakTopics = weakTopics;
    topicMastery.strongTopics = strongTopics;

    const companyReadiness = { ...(existingAnalytics?.companyReadiness as any || {}) };
    if (session.company) {
      if (!companyReadiness[session.company]) {
        companyReadiness[session.company] = { score: 0, sessions: 0 };
      }
      companyReadiness[session.company].sessions += 1;
      companyReadiness[session.company].score = Math.round(
        ((companyReadiness[session.company].score * (companyReadiness[session.company].sessions - 1)) + accuracy) /
        companyReadiness[session.company].sessions
      );
    }

    const categoryScores = { ...(existingAnalytics?.categoryScores as any || {}) };
    if (session.category) {
      if (!categoryScores[session.category]) {
        categoryScores[session.category] = { correct: 0, total: 0, accuracy: 0 };
      }
      for (const [_, stats] of Object.entries(topicStats)) {
        categoryScores[session.category].correct += stats.correct;
        categoryScores[session.category].total += stats.total;
      }
      if (categoryScores[session.category].total > 0) {
        categoryScores[session.category].accuracy = Math.round(
          (categoryScores[session.category].correct / categoryScores[session.category].total) * 100
        );
      }
    }

    const weeklyProgress = [...((existingAnalytics?.weeklyProgress as any[]) || [])];
    const now = new Date();
    const weekKey = `${now.getFullYear()}-W${String((() => { const soy = new Date(now.getFullYear(), 0, 1); return Math.ceil(((now.getTime() - soy.getTime()) / 86400000 + soy.getDay() + 1) / 7); })()).padStart(2, "0")}`;
    const currentWeek = weeklyProgress.find((w: any) => w.week === weekKey);
    if (currentWeek) {
      currentWeek.sessions += 1;
      currentWeek.correct += correctCount;
      currentWeek.total += totalAnswered;
      currentWeek.accuracy = Math.round((currentWeek.correct / currentWeek.total) * 100);
    } else {
      weeklyProgress.push({
        week: weekKey,
        sessions: 1,
        correct: correctCount,
        total: totalAnswered,
        accuracy,
      });
    }

    const placementReadiness = Math.min(100, Math.round(overallAccuracy * 0.6 + (totalSessions >= 10 ? 20 : totalSessions * 2) + (xp > 500 ? 20 : xp / 25)));

    await userPrisma.aptitudeAnalytics.upsert({
      where: { userId },
      create: {
        userId,
        totalSessions,
        totalQuestions,
        totalCorrect,
        overallAccuracy,
        avgTimePerQMs,
        xp,
        level,
        streak: 0,
        bestStreak: 0,
        topicMastery,
        companyReadiness,
        categoryScores,
        difficultyHistory: [],
        weeklyProgress,
        placementReadiness,
        lastPracticedAt: new Date(),
      },
      update: {
        totalSessions,
        totalQuestions,
        totalCorrect,
        overallAccuracy,
        avgTimePerQMs,
        xp,
        level,
        topicMastery,
        companyReadiness,
        categoryScores,
        weeklyProgress,
        placementReadiness,
        lastPracticedAt: new Date(),
      },
    });

    // Generate AI session review
    let review = null;
    try {
      review = await getSessionReview({
        topic: session.topic || "Mixed",
        questions,
        answers: answers.map((a: any) => ({
          questionIdx: a.questionIdx,
          selectedIdx: a.selectedIdx,
          timeTakenSec: Math.round((Number(a.timeTakenMs) || 0) / 1000),
        })),
        totalTimeTaken: Math.round((Number(totalTimeMs) || 0) / 1000),
        score: correctCount,
        totalQuestions: totalAnswered,
      });

      await userPrisma.aptitudeSession.update({
        where: { id: sessionId },
        data: { reportJson: review as any },
      });
    } catch {
      // Review generation is optional
    }

    res.json({
      success: true,
      sessionId: updatedSession.id,
      score: correctCount,
      totalQuestions: totalAnswered,
      accuracy,
      timeTakenMs: Number(totalTimeMs) || 0,
      avgTimePerQMs: avgTimePerQ,
      weakTopics,
      strongTopics,
      xpEarned,
      answers: createdAnswers,
      review,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 12. Get overall placement readiness score
 */
export async function getPlacementReadiness(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const analytics = await userPrisma.aptitudeAnalytics.findUnique({ where: { userId } });

    if (!analytics) {
      return res.json({
        success: true,
        readiness: {
          overall: 0,
          totalSessions: 0,
          totalQuestions: 0,
          xp: 0,
          level: 1,
          companyReadiness: {},
          categoryScores: {},
          topicMastery: {},
        },
      });
    }

    const topicMastery = (analytics.topicMastery as any) || {};
    const companyReadiness = (analytics.companyReadiness as any) || {};
    const categoryScores = (analytics.categoryScores as any) || {};

    const companyBreakdown = Object.entries(companyReadiness).map(([company, data]: [string, any]) => ({
      company,
      score: data.score || 0,
      sessions: data.sessions || 0,
    }));

    const categoryBreakdown = Object.entries(categoryScores).map(([category, data]: [string, any]) => ({
      category,
      accuracy: data.accuracy || 0,
      correct: data.correct || 0,
      total: data.total || 0,
    }));

    res.json({
      success: true,
      readiness: {
        overall: analytics.placementReadiness,
        totalSessions: analytics.totalSessions,
        totalQuestions: analytics.totalQuestions,
        totalCorrect: analytics.totalCorrect,
        overallAccuracy: analytics.overallAccuracy,
        xp: analytics.xp,
        level: analytics.level,
        streak: analytics.streak,
        bestStreak: analytics.bestStreak,
        companyReadiness: companyBreakdown,
        categoryScores: categoryBreakdown,
        topicMastery,
        weakTopics: topicMastery.weakTopics || [],
        strongTopics: topicMastery.strongTopics || [],
        lastPracticedAt: analytics.lastPracticedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

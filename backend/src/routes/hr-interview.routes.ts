import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import {
  generateHRQuestion,
  generateHREvaluation,
  generateHRFollowUp,
  analyzeSTAR,
  analyzeCommunication,
  ensureQuestionFormat,
} from "../lib/ai/hr-interview.service";
import { handleRouteError } from "../utils/routeError";

export const hrInterviewRouter = Router();

hrInterviewRouter.use(requireAuth);

// ─── Start new HR interview session ─────────────────────────────────────
hrInterviewRouter.post("/start", async (req, res) => {
  try {
    const {
      interviewType, targetRole, targetCompany, difficulty,
      experienceLevel, durationMinutes, language,
      aiVoiceEnabled, voiceGender, voiceSpeed, voicePitch,
      resumeAware, customInstructions,
    } = req.body;

    if (!targetRole) {
      res.status(400).json({ success: false, error: "Target role is required" });
      return;
    }

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.create({
      data: {
        userId: req.user!.userId,
        role: targetRole,
        company: targetCompany || null,
        type: interviewType || "hr",
        difficulty: difficulty || "medium",
        language: language || "english",
        durationMinutes: durationMinutes || 30,
        aiVoiceEnabled: aiVoiceEnabled !== false,
        videoEnabled: false,
        status: "in_progress",
        violationPoints: 0,
        violationThreshold: 10,
        startedAt: new Date(),
        configuration: {
          interviewType: interviewType || "hr",
          targetRole,
          targetCompany: targetCompany || null,
          difficulty: difficulty || "medium",
          experienceLevel: experienceLevel || "mid",
          durationMinutes: durationMinutes || 30,
          language: language || "english",
          aiVoiceEnabled: aiVoiceEnabled !== false,
          voiceGender: voiceGender || "female",
          voiceSpeed: voiceSpeed || 1,
          voicePitch: voicePitch || 1,
          resumeAware: resumeAware !== false,
          customInstructions: customInstructions || "",
        },
      },
    });

    let resumeContext = null;
    if (resumeAware) {
      const resume = await p.resume.findFirst({
        where: { userId: req.user!.userId },
      });
      if (resume) {
        resumeContext = resume.summary || resume.content || null;
      }
    }

    const firstQuestion = await generateHRQuestion(
      {
        interviewType: interviewType || "hr",
        targetRole,
        targetCompany: targetCompany || "",
        difficulty: difficulty || "medium",
        experienceLevel: experienceLevel || "mid",
        durationMinutes: durationMinutes || 30,
        language: language || "english",
        resumeContext: resumeContext || "",
        customInstructions: customInstructions || "",
      },
      [],
      false
    );

    await p.interviewMessage.create({
      data: {
        sessionId: session.id,
        role: "interviewer",
        content: firstQuestion.question,
      },
    });

    const messages = await p.interviewMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    res.json({
      success: true,
      session,
      messages,
      firstQuestion: firstQuestion.question,
      resumeContext,
      questionMeta: {
        category: firstQuestion.category,
        competency: firstQuestion.competency,
        expectedSTAR: firstQuestion.expectedSTAR,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "HR.start", "Failed to start HR interview");
  }
});

// ─── Submit answer, get follow-up or next question ──────────────────────
hrInterviewRouter.post("/:sessionId/answer", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer, isFollowUp } = req.body;

    if (!answer) {
      res.status(400).json({ success: false, error: "Answer is required" });
      return;
    }

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "HR interview session not found" });
      return;
    }

    if (session.status === "completed" || session.status === "terminated") {
      res.status(400).json({ success: false, error: "This session has already ended" });
      return;
    }

    await p.interviewMessage.create({
      data: { sessionId, role: "candidate", content: answer },
    });

    const allMessages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    const history = allMessages.map((m: any) => ({ role: m.role, content: m.content }));
    const config = session.configuration || {};

    let resumeContext = null;
    if (config.resumeAware) {
      const resume = await p.resume.findFirst({
        where: { userId: req.user!.userId },
      });
      if (resume) {
        resumeContext = resume.summary || resume.content || null;
      }
    }

    const questionCount = allMessages.filter((m: any) => m.role === "interviewer").length;
    const elapsedMinutes = Math.round(
      (Date.now() - new Date(session.startedAt).getTime()) / 60000
    );
    const isComplete = questionCount >= 15 || elapsedMinutes >= (session.durationMinutes || 30);

    if (isComplete) {
      const updatedMessages = await p.interviewMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      });
      res.json({
        success: true,
        messages: updatedMessages,
        nextQuestion: null,
        isComplete: true,
        questionNumber: questionCount,
      });
      return;
    }

    const hrConfig = {
      interviewType: config.interviewType || "hr",
      targetRole: session.role,
      targetCompany: session.company || "",
      difficulty: session.difficulty || "medium",
      experienceLevel: config.experienceLevel || "mid",
      durationMinutes: session.durationMinutes || 30,
      language: session.language || "english",
      resumeContext: resumeContext || "",
      customInstructions: config.customInstructions || "",
    };

    const lastQuestion = allMessages.filter((m: any) => m.role === "interviewer").pop();
    const starAnalysis = lastQuestion
      ? await analyzeSTAR(lastQuestion.content, answer, hrConfig)
      : { hasSituation: false, hasTask: false, hasAction: false, hasResult: false, score: 50, feedback: "", missingElements: [] };

    const shouldFollowUp = !isFollowUp && starAnalysis.score < 60 && questionCount < 12;

    let nextContent: string;
    let questionMeta: any;

    if (shouldFollowUp) {
      nextContent = await generateHRFollowUp(
        lastQuestion?.content || "",
        answer,
        hrConfig,
        starAnalysis
      );
      questionMeta = { isFollowUp: true, category: "follow_up", competency: "communication", expectedSTAR: true };
    } else {
      const nextQ = await generateHRQuestion(hrConfig, history, false);
      nextContent = nextQ.question;
      questionMeta = {
        isFollowUp: false,
        category: nextQ.category,
        competency: nextQ.competency,
        expectedSTAR: nextQ.expectedSTAR,
      };
    }

    nextContent = ensureQuestionFormat(nextContent, hrConfig.interviewType);

    await p.interviewMessage.create({
      data: { sessionId, role: "interviewer", content: nextContent },
    });

    const updatedMessages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    const [starResult, commResult] = await Promise.all([
      analyzeSTAR(lastQuestion?.content || "", answer, hrConfig),
      analyzeCommunication(lastQuestion?.content || "", answer, hrConfig),
    ]);

    res.json({
      success: true,
      messages: updatedMessages,
      nextQuestion: nextContent,
      isComplete: false,
      questionNumber: questionCount + 1,
      shouldFollowUp,
      questionMeta,
      liveAnalysis: {
        starAnalysis: starResult,
        communicationAnalysis: commResult,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "HR.answer", "Failed to process HR answer");
  }
});

// ─── Evaluate HR interview ──────────────────────────────────────────────
hrInterviewRouter.post("/:sessionId/evaluate", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "HR interview session not found" });
      return;
    }

    const messages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    if (messages.length === 0) {
      res.status(400).json({ success: false, error: "No messages to evaluate" });
      return;
    }

    let resumeContext = null;
    const config = session.configuration || {};
    if (config.resumeAware) {
      const resume = await p.resume.findFirst({
        where: { userId: req.user!.userId },
      });
      if (resume) {
        resumeContext = resume.summary || resume.content || null;
      }
    }

    const history = messages.map((m: any) => ({ role: m.role, content: m.content }));

    const evaluation = await generateHREvaluation(
      {
        interviewType: config.interviewType || "hr",
        targetRole: session.role,
        targetCompany: session.company || "",
        difficulty: session.difficulty || "medium",
        experienceLevel: config.experienceLevel || "mid",
        durationMinutes: session.durationMinutes || 30,
        language: session.language || "english",
        resumeContext: resumeContext || "",
        customInstructions: config.customInstructions || "",
      },
      history
    );

    let intelligenceData = null;
    try {
      const { generateIntelligenceLayer } = await import("../lib/ai/intelligence.service.js");
      let previousEvaluation = null;
      const prevSessions = await p.interviewSession.findMany({
        where: { userId: req.user!.userId, id: { not: sessionId }, status: "completed" },
        include: { evaluations: { take: 1 } },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      if (prevSessions.length > 0 && prevSessions[0].evaluations?.[0]) {
        previousEvaluation = {
          overallScore: prevSessions[0].evaluations[0].overallScore,
          strengths: prevSessions[0].evaluations[0].strengths,
          weaknesses: prevSessions[0].evaluations[0].weaknesses,
        };
      }
      intelligenceData = await generateIntelligenceLayer(
        {
          overallScore: evaluation.overallScore,
          communication: evaluation.communicationScore,
          confidence: evaluation.confidenceScore,
          problemSolving: 0,
          leadership: evaluation.leadershipScore || 0,
          roleFit: evaluation.overallScore,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          improvements: evaluation.improvements,
          hiringRecommendation: evaluation.hiringRecommendation,
          summary: evaluation.summary,
        },
        history.map((m: any) => ({ role: m.role, content: m.content })),
        {
          interviewType: config.interviewType || "hr",
          targetRole: session.role,
          targetCompany: session.company,
          difficulty: session.difficulty,
          experienceLevel: config.experienceLevel || "mid",
        },
        previousEvaluation
      );
    } catch (intelErr) {
      console.warn("[HR] Intelligence generation failed:", intelErr);
    }

    await p.interviewEvaluation.create({
      data: {
        sessionId,
        overallScore: evaluation.overallScore || 0,
        communicationScore: evaluation.communicationScore || 0,
        technicalScore: null,
        hrScore: evaluation.overallScore || 0,
        confidenceScore: evaluation.confidenceScore || 0,
        fluencyScore: evaluation.starScore || 0,
        bodyLanguageScore: null,
        strengths: evaluation.strengths || [],
        weaknesses: evaluation.weaknesses || [],
        improvements: evaluation.improvements || [],
        summary: evaluation.summary || "",
        hiringRecommendation: evaluation.hiringRecommendation || "maybe",
        detailedAnalysis: {
          ...evaluation,
          leadershipScore: evaluation.leadershipScore,
          teamworkScore: evaluation.teamworkScore,
          ownershipScore: evaluation.ownershipScore,
          adaptabilityScore: evaluation.adaptabilityScore,
          emotionalIntelligence: evaluation.emotionalIntelligence,
          professionalism: evaluation.professionalism,
          culturalFit: evaluation.culturalFit,
          motivation: evaluation.motivation,
          competencyMatrix: evaluation.competencyMatrix,
          nextPracticeTopics: evaluation.nextPracticeTopics,
          recruiterPerspective: evaluation.recruiterPerspective,
          intelligence: intelligenceData,
        },
      },
    });

    const endedAt = new Date();
    await p.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        endedAt,
        feedback: evaluation.summary || "",
      },
    });

    const savedEvaluation = await p.interviewEvaluation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      evaluation: savedEvaluation,
    });
  } catch (error) {
    handleRouteError(res, error, "HR.evaluate", "Failed to evaluate HR interview");
  }
});

// ─── End HR interview early ─────────────────────────────────────────────
hrInterviewRouter.post("/:sessionId/end", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    await p.interviewSession.update({
      where: { id: sessionId },
      data: { status: "terminated", endedAt: new Date() },
    });

    const messages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    let evaluation = null;
    if (messages.length >= 3) {
      const config = session.configuration || {};
      let resumeContext = null;
      if (config.resumeAware) {
        const resume = await p.resume.findFirst({
          where: { userId: req.user!.userId },
        });
        if (resume) resumeContext = resume.summary || resume.content || null;
      }

      const history = messages.map((m: any) => ({ role: m.role, content: m.content }));
      evaluation = await generateHREvaluation(
        {
          interviewType: config.interviewType || "hr",
          targetRole: session.role,
          targetCompany: session.company || "",
          difficulty: session.difficulty || "medium",
          experienceLevel: config.experienceLevel || "mid",
          durationMinutes: session.durationMinutes || 30,
          language: session.language || "english",
          resumeContext: resumeContext || "",
          customInstructions: config.customInstructions || "",
        },
        history
      );

      await p.interviewEvaluation.create({
        data: {
          sessionId,
          overallScore: evaluation.overallScore || 0,
          communicationScore: evaluation.communicationScore || 0,
          technicalScore: null,
          hrScore: evaluation.overallScore || 0,
          confidenceScore: evaluation.confidenceScore || 0,
          fluencyScore: evaluation.starScore || 0,
          bodyLanguageScore: null,
          strengths: evaluation.strengths || [],
          weaknesses: evaluation.weaknesses || [],
          improvements: evaluation.improvements || [],
          summary: evaluation.summary || "Interview terminated early.",
          hiringRecommendation: evaluation.hiringRecommendation || "maybe",
          detailedAnalysis: evaluation,
        },
      });
    }

    res.json({ success: true, evaluation });
  } catch (error) {
    handleRouteError(res, error, "HR.end", "Failed to end HR interview");
  }
});

// ─── HR interview history ───────────────────────────────────────────────
hrInterviewRouter.get("/history", async (req, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const sessions = await p.interviewSession.findMany({
      where: {
        userId: req.user!.userId,
        type: { in: ["hr", "behavioral", "campus-placement", "fresh-graduate", "experienced-professional", "managerial", "internship"] },
      },
      include: { evaluations: { take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const summaries = sessions.map((s: any) => ({
      id: s.id,
      type: s.type,
      role: s.role,
      company: s.company,
      difficulty: s.difficulty,
      status: s.status,
      overallScore: s.evaluations?.[0]?.overallScore || null,
      communicationScore: s.evaluations?.[0]?.communicationScore || null,
      leadershipScore: s.evaluations?.[0]?.detailedAnalysis?.leadershipScore || null,
      starScore: s.evaluations?.[0]?.fluencyScore || null,
      date: s.createdAt,
      createdAt: s.createdAt,
      endedAt: s.endedAt,
      duration: s.endedAt
        ? Math.round((new Date(s.endedAt).getTime() - new Date(s.createdAt).getTime()) / 60000)
        : 0,
    }));

    res.json({ success: true, sessions: summaries });
  } catch (error) {
    handleRouteError(res, error, "HR.history", "Failed to fetch HR history");
  }
});

// ─── HR analytics ───────────────────────────────────────────────────────
hrInterviewRouter.get("/analytics", async (req, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const sessions = await p.interviewSession.findMany({
      where: {
        userId: req.user!.userId,
        type: { in: ["hr", "behavioral", "campus-placement", "fresh-graduate", "experienced-professional", "managerial", "internship"] },
      },
      include: { evaluations: { take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const completed = sessions.filter((s: any) => s.evaluations?.[0]);

    const totalInterviews = completed.length;
    const bestScore = completed.length
      ? Math.max(...completed.map((s: any) => s.evaluations?.[0]?.overallScore || 0))
      : 0;
    const averageScore = completed.length
      ? Math.round(completed.reduce((a: number, s: any) => a + (s.evaluations?.[0]?.overallScore || 0), 0) / completed.length)
      : 0;

    const scoreTrend = [...completed].reverse().map((s: any) => ({
      date: s.createdAt?.toISOString?.() || String(s.createdAt),
      score: s.evaluations?.[0]?.overallScore || 0,
    }));

    const competencyKeys = ["communicationScore", "leadershipScore", "confidenceScore", "hrScore"] as const;
    const competencySums: Record<string, number> = {};
    const competencyCounts: Record<string, number> = {};
    for (const key of competencyKeys) {
      competencySums[key] = 0;
      competencyCounts[key] = 0;
    }
    for (const s of completed) {
      const ev = s.evaluations?.[0];
      if (!ev) continue;
      for (const key of competencyKeys) {
        const val = ev[key];
        if (typeof val === "number") {
          competencySums[key] += val;
          competencyCounts[key] += 1;
        }
      }
    }
    const competencyAverages = {
      communication: competencyCounts.communicationScore ? Math.round(competencySums.communicationScore / competencyCounts.communicationScore) : 0,
      leadership: competencyCounts.leadershipScore ? Math.round(competencySums.leadershipScore / competencyCounts.leadershipScore) : 0,
      confidence: competencyCounts.confidenceScore ? Math.round(competencySums.confidenceScore / competencyCounts.confidenceScore) : 0,
      overallHR: competencyCounts.hrScore ? Math.round(competencySums.hrScore / competencyCounts.hrScore) : 0,
    };

    const typeMap = new Map<string, { count: number; totalScore: number }>();
    for (const s of completed) {
      const t = s.type || "hr";
      const entry = typeMap.get(t) || { count: 0, totalScore: 0 };
      entry.count += 1;
      entry.totalScore += s.evaluations?.[0]?.overallScore || 0;
      typeMap.set(t, entry);
    }
    const typeBreakdown = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count),
    }));

    const now = new Date();
    const weeklyActivity = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7 * (7 - i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const weekSessions = completed.filter((s: any) => {
        const d = new Date(s.createdAt);
        return d >= weekStart && d < weekEnd;
      });
      return {
        week: `W${i + 1}`,
        count: weekSessions.length,
        avgScore: weekSessions.length
          ? Math.round(weekSessions.reduce((a: number, s: any) => a + (s.evaluations?.[0]?.overallScore || 0), 0) / weekSessions.length)
          : 0,
      };
    });

    const scoreDistribution = { excellent: 0, good: 0, average: 0, needsWork: 0 };
    for (const s of completed) {
      const score = s.evaluations?.[0]?.overallScore || 0;
      if (score >= 80) scoreDistribution.excellent += 1;
      else if (score >= 60) scoreDistribution.good += 1;
      else if (score >= 40) scoreDistribution.average += 1;
      else scoreDistribution.needsWork += 1;
    }

    res.json({
      totalInterviews,
      bestScore,
      averageScore,
      scoreTrend,
      competencyAverages,
      typeBreakdown,
      weeklyActivity,
      scoreDistribution,
    });
  } catch (error) {
    handleRouteError(res, error, "HR.analytics", "Failed to fetch HR analytics");
  }
});

// ─── Get HR session report ──────────────────────────────────────────────
hrInterviewRouter.get("/:sessionId/report", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        evaluations: { take: 1 },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    const evaluation = session.evaluations?.[0] || null;
    const interviewerMsgs = session.messages.filter((m: any) => m.role === "interviewer");
    const candidateMsgs = session.messages.filter((m: any) => m.role === "candidate");

    const questionPairs = interviewerMsgs.map((q: any, i: number) => ({
      questionNumber: i + 1,
      question: q.content,
      answer: candidateMsgs[i]?.content || "No answer provided",
    }));

    const duration = session.endedAt
      ? Math.round((new Date(session.endedAt).getTime() - new Date(session.createdAt).getTime()) / 60000)
      : 0;

    res.json({
      success: true,
      report: {
        sessionId: session.id,
        role: session.role,
        company: session.company,
        type: session.type,
        difficulty: session.difficulty,
        status: session.status,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
        duration,
        configuration: session.configuration,
        evaluation,
        questionPairs,
        totalQuestions: interviewerMsgs.length,
        totalAnswers: candidateMsgs.length,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "HR.report", "Failed to fetch HR report");
  }
});

// ─── HR Intelligence coaching endpoint ─────────────────────────────────
hrInterviewRouter.post("/:sessionId/coach", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    const evalRecord = await p.interviewEvaluation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });
    if (!evalRecord) {
      res.status(400).json({ success: false, error: "No evaluation found" });
      return;
    }

    const detailedAnalysis = (evalRecord.detailedAnalysis as any) || {};
    if (detailedAnalysis.intelligence) {
      res.json({ success: true, intelligence: detailedAnalysis.intelligence });
      return;
    }

    const messages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
    const config = session.configuration || {};

    let previousEvaluation = null;
    const prevSessions = await p.interviewSession.findMany({
      where: { userId: req.user!.userId, id: { not: sessionId }, status: "completed" },
      include: { evaluations: { take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    if (prevSessions.length > 0 && prevSessions[0].evaluations?.[0]) {
      previousEvaluation = {
        overallScore: prevSessions[0].evaluations[0].overallScore,
        strengths: prevSessions[0].evaluations[0].strengths,
        weaknesses: prevSessions[0].evaluations[0].weaknesses,
      };
    }

    const { generateIntelligenceLayer } = await import("../lib/ai/intelligence.service.js");
    const intelligence = await generateIntelligenceLayer(
      {
        overallScore: evalRecord.overallScore,
        communication: evalRecord.communicationScore,
        confidence: evalRecord.confidenceScore,
        leadership: detailedAnalysis.leadershipScore || 0,
        roleFit: evalRecord.overallScore,
        strengths: evalRecord.strengths,
        weaknesses: evalRecord.weaknesses,
        improvements: evalRecord.improvements,
        hiringRecommendation: evalRecord.hiringRecommendation,
        summary: evalRecord.summary,
      },
      messages,
      {
        interviewType: config.interviewType || session.type,
        targetRole: session.role,
        targetCompany: session.company,
        difficulty: session.difficulty,
        experienceLevel: config.experienceLevel || "mid",
      },
      previousEvaluation
    );

    await p.interviewEvaluation.update({
      where: { id: evalRecord.id },
      data: {
        detailedAnalysis: {
          ...detailedAnalysis,
          intelligence,
        },
      },
    });

    res.json({ success: true, intelligence });
  } catch (error) {
    handleRouteError(res, error, "HR.coach", "Failed to generate coaching intelligence");
  }
});

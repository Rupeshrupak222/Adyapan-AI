import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { generateEngineQuestion, generateEngineEvaluation } from "../lib/ai/engine-question.service";
import { handleRouteError } from "../utils/routeError";

export const engineRouter = Router();

engineRouter.use(requireAuth);

// ─── Start new engine interview session ──────────────────────────────────
engineRouter.post("/start", async (req, res) => {
  try {
    const {
      interviewType, targetRole, targetCompany, difficulty,
      experienceLevel, durationMinutes, technology, language,
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
        type: interviewType || "technical",
        difficulty: difficulty || "medium",
        language: language || "english",
        durationMinutes: durationMinutes || 30,
        technology: technology || null,
        aiVoiceEnabled: aiVoiceEnabled !== false,
        videoEnabled: false,
        status: "in_progress",
        violationPoints: 0,
        violationThreshold: 10,
        startedAt: new Date(),
        configuration: {
          interviewType: interviewType || "technical",
          targetRole,
          targetCompany: targetCompany || null,
          difficulty: difficulty || "medium",
          experienceLevel: experienceLevel || "mid",
          durationMinutes: durationMinutes || 30,
          technology: technology || null,
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

    const firstQuestion = await generateEngineQuestion({
      role: targetRole,
      company: targetCompany || "",
      type: interviewType || "technical",
      difficulty: difficulty || "medium",
      technology: technology || "",
      language: language || "english",
      experienceLevel: experienceLevel || "mid",
      history: [],
      resumeContext: resumeContext || "",
      customInstructions: customInstructions || "",
    });

    await p.interviewMessage.create({
      data: {
        sessionId: session.id,
        role: "interviewer",
        content: firstQuestion,
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
      firstQuestion,
      resumeContext,
    });
  } catch (error) {
    handleRouteError(res, error, "Engine.start", "Failed to start engine interview");
  }
});

// ─── Submit answer and get next question ─────────────────────────────────
engineRouter.post("/:sessionId/answer", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

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
      res.status(404).json({ success: false, error: "Interview session not found" });
      return;
    }

    if (session.status === "completed" || session.status === "terminated") {
      res.status(400).json({ success: false, error: "This interview session has already ended" });
      return;
    }

    await p.interviewMessage.create({
      data: {
        sessionId,
        role: "candidate",
        content: answer,
      },
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
      res.json({
        success: true,
        messages: await p.interviewMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        }),
        nextQuestion: null,
        isComplete: true,
        questionNumber: questionCount,
      });
      return;
    }

    const nextQuestion = await generateEngineQuestion({
      role: session.role,
      company: session.company || "",
      type: session.type || "technical",
      difficulty: session.difficulty || "medium",
      technology: session.technology || "",
      language: session.language || "english",
      experienceLevel: config.experienceLevel || "mid",
      history,
      resumeContext: resumeContext || "",
      customInstructions: config.customInstructions || "",
    });

    await p.interviewMessage.create({
      data: {
        sessionId,
        role: "interviewer",
        content: nextQuestion,
      },
    });

    const updatedMessages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    res.json({
      success: true,
      messages: updatedMessages,
      nextQuestion,
      isComplete: false,
      questionNumber: questionCount + 1,
    });
  } catch (error) {
    handleRouteError(res, error, "Engine.answer", "Failed to process answer");
  }
});

// ─── Voice input endpoint ────────────────────────────────────────────────
engineRouter.post("/:sessionId/voice", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { text, duration } = req.body;

    if (!text) {
      res.status(400).json({ success: false, error: "Text is required" });
      return;
    }

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "Interview session not found" });
      return;
    }

    if (session.status === "completed" || session.status === "terminated") {
      res.status(400).json({ success: false, error: "This interview session has already ended" });
      return;
    }

    await p.interviewMessage.create({
      data: {
        sessionId,
        role: "candidate",
        content: text,
        audioUrl: req.body.audioUrl || null,
        duration: duration || null,
      },
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
      res.json({
        success: true,
        messages: await p.interviewMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        }),
        nextQuestion: null,
        isComplete: true,
        questionNumber: questionCount,
      });
      return;
    }

    const nextQuestion = await generateEngineQuestion({
      role: session.role,
      company: session.company || "",
      type: session.type || "technical",
      difficulty: session.difficulty || "medium",
      technology: session.technology || "",
      language: session.language || "english",
      experienceLevel: config.experienceLevel || "mid",
      history,
      resumeContext: resumeContext || "",
      customInstructions: config.customInstructions || "",
    });

    await p.interviewMessage.create({
      data: {
        sessionId,
        role: "interviewer",
        content: nextQuestion,
      },
    });

    const updatedMessages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    res.json({
      success: true,
      messages: updatedMessages,
      nextQuestion,
      isComplete: false,
      questionNumber: questionCount + 1,
    });
  } catch (error) {
    handleRouteError(res, error, "Engine.voice", "Failed to process voice input");
  }
});

export function formatEngineEvaluation(dbEval: any) {
  if (!dbEval) return null;
  const details = typeof dbEval.detailedAnalysis === "object" && dbEval.detailedAnalysis !== null ? dbEval.detailedAnalysis : {};

  return {
    id: dbEval.id,
    sessionId: dbEval.sessionId,
    overallScore: dbEval.overallScore ?? 0,
    communicationScore: dbEval.communicationScore ?? 0,
    technicalScore: dbEval.technicalScore ?? 0,
    hrScore: dbEval.hrScore ?? 0,
    confidenceScore: dbEval.confidenceScore ?? 0,
    fluencyScore: dbEval.fluencyScore ?? 0,
    bodyLanguageScore: dbEval.bodyLanguageScore ?? 0,

    communication: dbEval.communicationScore ?? details.subScores?.communication ?? details.communicationClarity ?? 0,
    technical: dbEval.technicalScore ?? details.subScores?.technical ?? details.technicalDepth ?? 0,
    confidence: dbEval.confidenceScore ?? details.subScores?.confidence ?? 0,
    problemSolving: details.subScores?.problemSolving ?? details.problemSolving ?? 0,
    leadership: details.subScores?.leadership ?? details.culturalFit ?? 0,
    roleFit: details.subScores?.roleFit ?? dbEval.overallScore ?? 0,

    strengths: Array.isArray(dbEval.strengths) ? dbEval.strengths : [],
    weaknesses: Array.isArray(dbEval.weaknesses) ? dbEval.weaknesses : [],
    improvements: Array.isArray(dbEval.improvements) ? dbEval.improvements : [],
    summary: dbEval.summary || "",
    hiringRecommendation: dbEval.hiringRecommendation || "maybe",
    detailedAnalysis: details,
    answerBreakdowns: Array.isArray(details.answerBreakdowns) ? details.answerBreakdowns : [],
    missedOpportunities: Array.isArray(details.missedOpportunities) ? details.missedOpportunities : [],
    recommendedTopics: Array.isArray(details.recommendedTopics) ? details.recommendedTopics : [],
    communicationTips: Array.isArray(details.communicationTips) ? details.communicationTips : [],
    technicalImprovements: Array.isArray(details.technicalImprovements) ? details.technicalImprovements : [],
    nextPracticePlan: details.nextPracticePlan || null,
    createdAt: dbEval.createdAt,
  };
}

// ─── Evaluate interview ──────────────────────────────────────────────────
engineRouter.post("/:sessionId/evaluate", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "Interview session not found" });
      return;
    }

    // Check if an evaluation already exists
    const existingEvaluation = await p.interviewEvaluation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });
    if (existingEvaluation) {
      res.json({
        success: true,
        evaluation: formatEngineEvaluation(existingEvaluation),
        session,
      });
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

    const evaluation = await generateEngineEvaluation({
      role: session.role,
      company: session.company || "",
      type: session.type || "technical",
      difficulty: session.difficulty || "medium",
      technology: session.technology || "",
      language: session.language || "english",
      history,
      resumeContext: resumeContext || "",
    });

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
          technical: evaluation.technicalScore,
          confidence: evaluation.confidenceScore,
          problemSolving: evaluation.subScores?.problemSolving || 0,
          leadership: evaluation.subScores?.leadership || 0,
          roleFit: evaluation.subScores?.roleFit || evaluation.overallScore,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          improvements: evaluation.improvements,
          hiringRecommendation: evaluation.hiringRecommendation,
          summary: evaluation.summary,
        },
        history.map((m: any) => ({ role: m.role, content: m.content })),
        {
          interviewType: session.type,
          targetRole: session.role,
          targetCompany: session.company,
          difficulty: session.difficulty,
          experienceLevel: (session.configuration as any)?.experienceLevel || "mid",
        },
        previousEvaluation
      );
    } catch (intelErr) {
      console.warn("[Engine] Intelligence generation failed:", intelErr);
    }

    await p.interviewEvaluation.create({
      data: {
        sessionId,
        overallScore: evaluation.overallScore || 0,
        communicationScore: evaluation.communicationScore || 0,
        technicalScore: evaluation.technicalScore || 0,
        hrScore: evaluation.hrScore || 0,
        confidenceScore: evaluation.confidenceScore || 0,
        fluencyScore: evaluation.fluencyScore || 0,
        bodyLanguageScore: evaluation.bodyLanguageScore || 0,
        strengths: evaluation.strengths || [],
        weaknesses: evaluation.weaknesses || [],
        improvements: evaluation.improvements || [],
        summary: evaluation.summary || "",
        hiringRecommendation: evaluation.hiringRecommendation || "maybe",
        detailedAnalysis: {
          ...(evaluation.detailedAnalysis || {}),
          subScores: evaluation.subScores || {},
          answerBreakdowns: evaluation.answerBreakdowns || [],
          missedOpportunities: evaluation.missedOpportunities || [],
          recommendedTopics: evaluation.recommendedTopics || [],
          communicationTips: evaluation.communicationTips || [],
          technicalImprovements: evaluation.technicalImprovements || [],
          nextPracticePlan: evaluation.nextPracticePlan || null,
          intelligence: intelligenceData,
        },
      },
    });

    const endedAt = new Date();
    const updatedSession = await p.interviewSession.update({
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
      evaluation: formatEngineEvaluation(savedEvaluation),
      session: updatedSession,
    });
  } catch (error) {
    handleRouteError(res, error, "Engine.evaluate", "Failed to evaluate interview");
  }
});

// ─── End interview (early termination) ───────────────────────────────────
engineRouter.post("/:sessionId/end", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "Interview session not found" });
      return;
    }

    const endedAt = new Date();
    const updatedSession = await p.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "terminated",
        endedAt,
      },
    });

    const existingEvaluation = await p.interviewEvaluation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    if (existingEvaluation) {
      res.json({
        success: true,
        session: updatedSession,
        evaluation: formatEngineEvaluation(existingEvaluation),
      });
      return;
    }

    const messages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    let evaluation = null;
    if (messages.length >= 1) {
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

      const partialEvaluation = await generateEngineEvaluation({
        role: session.role,
        company: session.company || "",
        type: session.type || "technical",
        difficulty: session.difficulty || "medium",
        technology: session.technology || "",
        language: session.language || "english",
        history,
        resumeContext: resumeContext || "",
      });

      const savedEval = await p.interviewEvaluation.create({
        data: {
          sessionId,
          overallScore: partialEvaluation.overallScore || 0,
          communicationScore: partialEvaluation.communicationScore || 0,
          technicalScore: partialEvaluation.technicalScore || 0,
          hrScore: partialEvaluation.hrScore || 0,
          confidenceScore: partialEvaluation.confidenceScore || 0,
          fluencyScore: partialEvaluation.fluencyScore || 0,
          bodyLanguageScore: partialEvaluation.bodyLanguageScore || 0,
          strengths: partialEvaluation.strengths || [],
          weaknesses: partialEvaluation.weaknesses || [],
          improvements: partialEvaluation.improvements || [],
          summary: partialEvaluation.summary || "Interview terminated early.",
          hiringRecommendation: partialEvaluation.hiringRecommendation || "maybe",
          detailedAnalysis: {
            ...(partialEvaluation.detailedAnalysis || {}),
            subScores: partialEvaluation.subScores || {},
            answerBreakdowns: partialEvaluation.answerBreakdowns || [],
            missedOpportunities: partialEvaluation.missedOpportunities || [],
            recommendedTopics: partialEvaluation.recommendedTopics || [],
            communicationTips: partialEvaluation.communicationTips || [],
            technicalImprovements: partialEvaluation.technicalImprovements || [],
            nextPracticePlan: partialEvaluation.nextPracticePlan || null,
          },
        },
      });
      evaluation = formatEngineEvaluation(savedEval);
    }

    res.json({
      success: true,
      session: updatedSession,
      evaluation,
    });
  } catch (error) {
    handleRouteError(res, error, "Engine.end", "Failed to end interview");
  }
});

// ─── Analytics endpoint ──────────────────────────────────────────────────
engineRouter.get("/analytics", async (req, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const sessions = await p.interviewSession.findMany({
      where: { userId: req.user!.userId },
      include: {
        evaluations: { take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const completed = sessions.filter((s: any) => s.evaluations?.[0]);

    const totalInterviews = completed.length;
    const bestScore = completed.length
      ? Math.max(
          ...completed.map((s: any) => s.evaluations?.[0]?.overallScore || 0),
        )
      : 0;
    const averageScore = completed.length
      ? Math.round(
          completed.reduce(
            (a: number, s: any) => a + (s.evaluations?.[0]?.overallScore || 0),
            0,
          ) / completed.length,
        )
      : 0;
    const totalHours = Math.round(
      sessions.reduce((a: number, s: any) => a + (s.durationMinutes || 0), 0) / 60,
    );

    // Score trend per session (newest last)
    const scoreTrend = [...completed]
      .reverse()
      .map((s: any) => ({
        date: s.createdAt?.toISOString?.() || String(s.createdAt),
        score: s.evaluations?.[0]?.overallScore || 0,
      }));

    // Skill averages from evaluations
    const skillKeys = ["communication", "technical", "confidence", "problemSolving", "leadership", "roleFit"] as const;
    const skillSums: Record<string, number> = {};
    const skillCounts: Record<string, number> = {};
    for (const key of skillKeys) {
      skillSums[key] = 0;
      skillCounts[key] = 0;
    }
    for (const s of completed) {
      const ev = s.evaluations?.[0];
      if (!ev) continue;
      for (const key of skillKeys) {
        const val = ev[key];
        if (typeof val === "number") {
          skillSums[key] += val;
          skillCounts[key] += 1;
        }
      }
    }
    const skillAverages = {
      communication: skillCounts.communication ? Math.round(skillSums.communication / skillCounts.communication) : 0,
      technical: skillCounts.technical ? Math.round(skillSums.technical / skillCounts.technical) : 0,
      confidence: skillCounts.confidence ? Math.round(skillSums.confidence / skillCounts.confidence) : 0,
      problemSolving: skillCounts.problemSolving ? Math.round(skillSums.problemSolving / skillCounts.problemSolving) : 0,
      leadership: skillCounts.leadership ? Math.round(skillSums.leadership / skillCounts.leadership) : 0,
      roleFit: skillCounts.roleFit ? Math.round(skillSums.roleFit / skillCounts.roleFit) : 0,
    };

    // Type breakdown from all completed sessions
    const typeMap = new Map<string, { count: number; totalScore: number }>();
    for (const s of completed) {
      const t = s.type || "general";
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

    // Weekly activity (last 8 weeks)
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

      const weekAvg = weekSessions.length
        ? Math.round(
            weekSessions.reduce(
              (a: number, s: any) => a + (s.evaluations?.[0]?.overallScore || 0),
              0,
            ) / weekSessions.length,
          )
        : 0;

      return {
        week: `W${i + 1}`,
        count: weekSessions.length,
        avgScore: weekAvg,
      };
    });

    // Score distribution
    const scoreDistribution = { excellent: 0, good: 0, average: 0, needsWork: 0 };
    for (const s of completed) {
      const score = s.evaluations?.[0]?.overallScore || 0;
      if (score >= 80) scoreDistribution.excellent += 1;
      else if (score >= 60) scoreDistribution.good += 1;
      else if (score >= 40) scoreDistribution.average += 1;
      else scoreDistribution.needsWork += 1;
    }

    // Generate insights
    const insights: string[] = [];
    if (totalInterviews === 0) {
      insights.push("Start your first interview to see personalized insights.");
    } else {
      if (averageScore >= 75) insights.push("Your scores are strong — keep refining edge cases.");
      else if (averageScore >= 50) insights.push("You're making solid progress. Focus on your weaker skill areas.");
      else insights.push("Practice consistently to improve your scores.");

      if (skillAverages.communication < 50) insights.push("Work on articulating your thoughts more clearly.");
      if (skillAverages.technical < 50) insights.push("Brush up on core technical fundamentals.");
      if (skillAverages.problemSolving < 50) insights.push("Practice breaking down problems step by step.");

      const recentSessions = scoreTrend.slice(-5);
      if (recentSessions.length >= 2) {
        const recentAvg = recentSessions.reduce((a, b) => a + b.score, 0) / recentSessions.length;
        if (recentAvg > averageScore) insights.push("Your recent trend is improving — great momentum!");
        else if (recentAvg < averageScore - 10) insights.push("Scores dipped recently. Review missed topics.");
      }
    }

    res.json({
      totalInterviews,
      bestScore,
      averageScore,
      totalHours,
      scoreTrend,
      skillAverages,
      typeBreakdown,
      weeklyActivity,
      scoreDistribution,
      insights,
    });
  } catch (error) {
    handleRouteError(res, error, "Engine.analytics", "Failed to fetch analytics");
  }
});

// ─── Interview history ───────────────────────────────────────────────────
engineRouter.get("/history", async (req, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const sessions = await p.interviewSession.findMany({
      where: { userId: req.user!.userId },
      include: {
        evaluations: { take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const summaries = sessions.map((s: any) => ({
      id: s.id,
      type: s.type,
      role: s.role,
      company: s.company,
      difficulty: s.difficulty,
      technology: s.technology,
      language: s.language,
      status: s.status,
      overallScore: s.evaluations?.[0]?.overallScore || null,
      evaluation: s.evaluations?.[0] || null,
      createdAt: s.createdAt,
      endedAt: s.endedAt,
      duration: s.endedAt
        ? Math.round(
            (new Date(s.endedAt).getTime() - new Date(s.createdAt).getTime()) /
              60000,
          )
        : 0,
    }));

    res.json({ success: true, sessions: summaries });
  } catch (error) {
    handleRouteError(res, error, "Engine.history", "Failed to fetch interview history");
  }
});

// ─── Get full session with messages and evaluation ───────────────────────
engineRouter.get("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        evaluations: true,
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Interview session not found" });
      return;
    }

    res.json({ success: true, session });
  } catch (error) {
    handleRouteError(res, error, "Engine.getSession", "Failed to fetch session");
  }
});

// ─── Detailed report with answer breakdowns ──────────────────────────────
engineRouter.get("/:sessionId/report", async (req, res) => {
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
      res.status(404).json({ success: false, error: "Interview session not found" });
      return;
    }

    const evaluation = session.evaluations?.[0] || null;

    const questionPairs: Array<{
      questionNumber: number;
      question: string;
      answer: string;
    }> = [];

    const interviewerMsgs = session.messages.filter(
      (m: any) => m.role === "interviewer",
    );
    const candidateMsgs = session.messages.filter(
      (m: any) => m.role === "candidate",
    );

    for (let i = 0; i < interviewerMsgs.length; i++) {
      questionPairs.push({
        questionNumber: i + 1,
        question: interviewerMsgs[i].content,
        answer: candidateMsgs[i]?.content || "No answer provided",
      });
    }

    const duration = session.endedAt
      ? Math.round(
          (new Date(session.endedAt).getTime() -
            new Date(session.createdAt).getTime()) /
            60000,
        )
      : 0;

    res.json({
      success: true,
      report: {
        sessionId: session.id,
        role: session.role,
        company: session.company,
        type: session.type,
        difficulty: session.difficulty,
        technology: session.technology,
        language: session.language,
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
    handleRouteError(res, error, "Engine.report", "Failed to fetch report data");
  }
});

// ─── Intelligence coaching endpoint ────────────────────────────────────
engineRouter.post("/:sessionId/coach", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "Interview session not found" });
      return;
    }

    const existingEval = await p.interviewEvaluation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    if (!existingEval) {
      res.status(400).json({ success: false, error: "No evaluation found for this session" });
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
      where: {
        userId: req.user!.userId,
        id: { not: sessionId },
        status: "completed",
      },
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

    const evalFormatted = {
      overallScore: existingEval.overallScore,
      communication: existingEval.communicationScore,
      technical: existingEval.technicalScore,
      confidence: existingEval.confidenceScore,
      problemSolving: (existingEval.detailedAnalysis as any)?.subScores?.problemSolving || 0,
      leadership: (existingEval.detailedAnalysis as any)?.subScores?.leadership || 0,
      roleFit: (existingEval.detailedAnalysis as any)?.subScores?.roleFit || existingEval.overallScore,
      strengths: existingEval.strengths,
      weaknesses: existingEval.weaknesses,
      improvements: existingEval.improvements,
      hiringRecommendation: existingEval.hiringRecommendation,
      summary: existingEval.summary,
    };

    const intelligence = await generateIntelligenceLayer(
      evalFormatted,
      messages,
      {
        interviewType: config.interviewType || session.type,
        targetRole: config.targetRole || session.role,
        targetCompany: config.targetCompany || session.company,
        difficulty: session.difficulty,
        experienceLevel: config.experienceLevel || "mid",
      },
      previousEvaluation
    );

    res.json({ success: true, intelligence });
  } catch (error) {
    handleRouteError(res, error, "Engine.coach", "Failed to generate coaching intelligence");
  }
});

// ─── Get intelligence data (cached from evaluation) ────────────────────
engineRouter.get("/:sessionId/intelligence", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "Interview session not found" });
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
    const intelligence = detailedAnalysis.intelligence || null;

    if (intelligence) {
      res.json({ success: true, intelligence });
      return;
    }

    res.json({ success: true, intelligence: null, message: "Intelligence data not yet generated. Call POST /:sessionId/coach to generate." });
  } catch (error) {
    handleRouteError(res, error, "Engine.getIntelligence", "Failed to fetch intelligence data");
  }
});

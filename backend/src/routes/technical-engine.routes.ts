import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";
import {
  generateTechnicalQuestion,
  generateFollowUp,
  reviewCode,
  generateTechnicalEvaluation,
  type TechnicalTopic,
  type CodingLanguage,
  type InterviewMode,
} from "../lib/ai/technical-engine.service";
import { generateIntelligenceLayer } from "../lib/ai/intelligence.service";

export const technicalEngineRouter = Router();
technicalEngineRouter.use(requireAuth);

// ─── Start technical interview ──────────────────────────────────────────────
technicalEngineRouter.post("/start", async (req, res) => {
  try {
    const {
      topic, role, company, difficulty, experienceLevel,
      durationMinutes, language, codingLanguage, mode,
      aiVoiceEnabled, voiceGender, voiceSpeed, voicePitch,
      resumeAware, customInstructions,
    } = req.body;

    if (!role) {
      res.status(400).json({ success: false, error: "Target role is required" });
      return;
    }

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.create({
      data: {
        userId: req.user!.userId,
        role,
        company: company || null,
        type: "technical",
        difficulty: difficulty || "medium",
        language: language || "english",
        durationMinutes: durationMinutes || 45,
        technology: topic || null,
        aiVoiceEnabled: aiVoiceEnabled !== false,
        videoEnabled: false,
        status: "in_progress",
        violationPoints: 0,
        violationThreshold: 10,
        startedAt: new Date(),
        configuration: {
          interviewType: "technical",
          targetRole: role,
          targetCompany: company || null,
          difficulty: difficulty || "medium",
          experienceLevel: experienceLevel || "mid",
          durationMinutes: durationMinutes || 45,
          technology: topic || "dsa",
          language: language || "english",
          aiVoiceEnabled: aiVoiceEnabled !== false,
          voiceGender: voiceGender || "neutral",
          voiceSpeed: voiceSpeed || 1,
          voicePitch: voicePitch || 1,
          resumeAware: resumeAware !== false,
          customInstructions: customInstructions || "",
          codingLanguage: codingLanguage || "javascript",
          mode: mode || "voice+coding",
        },
      },
    });

    let resumeContext = null;
    if (resumeAware) {
      try {
        const resume = await p.resume.findFirst({
          where: { userId: req.user!.userId },
        });
        if (resume) {
          resumeContext = resume.summary || resume.content || null;
        }
      } catch (resumeErr) {
        console.warn("[technical-engine/start] Could not load resume context (continuing):", resumeErr);
      }
    }

    let firstQuestionText = `Welcome to the ${role} technical interview${company ? ` for ${company}` : ""}. Let's begin with a discussion on ${topic || "DSA"}. Could you share your technical background in this area?`;
    let firstQuestionObj: any = {
      question: firstQuestionText,
      category: topic || "technical",
      difficulty: difficulty || "medium",
      isCodingChallenge: false,
      codingProblem: null,
      expectedTopics: [topic || "fundamentals"],
      followUpHint: "Probe deeper into technical background",
      timeEstimate: "3 minutes",
      tips: ["Assess candidate baseline clarity"],
    };

    try {
      const generated = await generateTechnicalQuestion({
        topic: (topic || "dsa") as any,
        role,
        company: company || "",
        difficulty: difficulty || "medium",
        experienceLevel: experienceLevel || "mid",
        codingLanguage: (codingLanguage || "javascript") as any,
        mode: (mode || "voice+coding") as any,
        history: [],
        resumeContext: resumeContext || "",
        customInstructions: customInstructions || "",
        questionNumber: 1,
        totalQuestions: Math.ceil((durationMinutes || 45) / 5),
        durationMinutes: durationMinutes || 45,
      });
      if (generated && generated.question) {
        firstQuestionObj = generated;
      }
    } catch (aiErr) {
      console.warn("[technical-engine/start] Question generation error (using fallback):", aiErr);
    }

    await p.interviewMessage.create({
      data: {
        sessionId: session.id,
        role: "interviewer",
        content: firstQuestionObj.question,
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
      firstQuestion: firstQuestionObj,
      resumeContext,
    });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.start", "Failed to start technical interview");
  }
});

// ─── Submit answer and get next question ────────────────────────────────────
technicalEngineRouter.post("/:sessionId/answer", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer, questionNumber } = req.body;

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
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    if (session.status === "completed" || session.status === "terminated") {
      res.status(400).json({ success: false, error: "Session already ended" });
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
    const totalQuestions = Math.ceil((session.durationMinutes || 45) / 5);
    const isComplete = questionCount >= totalQuestions || elapsedMinutes >= (session.durationMinutes || 45);

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

    const nextQuestion = await generateTechnicalQuestion({
      topic: (config.technology || "dsa") as TechnicalTopic,
      role: session.role,
      company: session.company || "",
      difficulty: session.difficulty || "medium",
      experienceLevel: config.experienceLevel || "mid",
      codingLanguage: (config.codingLanguage || "javascript") as CodingLanguage,
      mode: (config.mode || "voice+coding") as InterviewMode,
      history,
      resumeContext: resumeContext || "",
      customInstructions: config.customInstructions || "",
      questionNumber: questionCount + 1,
      totalQuestions,
      durationMinutes: session.durationMinutes || 45,
    });

    await p.interviewMessage.create({
      data: { sessionId, role: "interviewer", content: nextQuestion.question },
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
      totalQuestions,
    });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.answer", "Failed to process answer");
  }
});

// ─── Request follow-up question ─────────────────────────────────────────────
technicalEngineRouter.post("/:sessionId/followup", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { originalQuestion, candidateAnswer } = req.body;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    const config = session.configuration || {};

    const allMessages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
    const history = allMessages.map((m: any) => ({ role: m.role, content: m.content }));

    const followUp = await generateFollowUp({
      originalQuestion: originalQuestion || "",
      candidateAnswer: candidateAnswer || "",
      topic: (config.technology || "dsa") as TechnicalTopic,
      difficulty: session.difficulty || "medium",
      codingLanguage: (config.codingLanguage || "javascript") as CodingLanguage,
      history,
    });

    res.json({ success: true, followUp });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.followup", "Failed to generate follow-up");
  }
});

// ─── Code review endpoint ───────────────────────────────────────────────────
technicalEngineRouter.post("/:sessionId/review", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code, language, problem, topic, output, passed } = req.body;

    const review = await reviewCode({
      code: code || "",
      language: language || "javascript",
      problem: problem || "",
      topic: (topic || "dsa") as TechnicalTopic,
      output: output || "",
      passed: passed || false,
    });

    res.json({ success: true, review });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.review", "Failed to review code");
  }
});

export function formatTechnicalEvaluation(dbEval: any) {
  if (!dbEval) return null;
  const details = typeof dbEval.detailedAnalysis === "object" && dbEval.detailedAnalysis !== null ? dbEval.detailedAnalysis : {};

  return {
    id: dbEval.id,
    sessionId: dbEval.sessionId,
    overallScore: dbEval.overallScore ?? 0,
    technicalDepth: dbEval.technicalScore ?? details.technicalDepth ?? 0,
    codeQuality: dbEval.fluencyScore ?? details.codeQuality ?? details.culturalFit ?? 0,
    problemSolving: dbEval.confidenceScore ?? details.problemSolving ?? 0,
    communication: dbEval.communicationScore ?? details.communication ?? details.communicationClarity ?? 0,

    strengths: Array.isArray(dbEval.strengths) ? dbEval.strengths : [],
    weaknesses: Array.isArray(dbEval.weaknesses) ? dbEval.weaknesses : [],
    improvements: Array.isArray(dbEval.improvements) ? dbEval.improvements : [],
    summary: dbEval.summary || "",
    hiringRecommendation: dbEval.hiringRecommendation || "maybe",
    detailedAnalysis: details,
    answerBreakdowns: Array.isArray(details.answerBreakdowns) ? details.answerBreakdowns : [],
    createdAt: dbEval.createdAt,
  };
}

// ─── Evaluate interview ─────────────────────────────────────────────────────
technicalEngineRouter.post("/:sessionId/evaluate", async (req, res) => {
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

    const existingEvaluation = await p.interviewEvaluation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });
    if (existingEvaluation) {
      res.json({
        success: true,
        evaluation: formatTechnicalEvaluation(existingEvaluation),
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

    const history = messages.map((m: any) => ({ role: m.role, content: m.content }));

    const evaluation = await generateTechnicalEvaluation({
      role: session.role,
      company: session.company || "",
      topic: (config.technology || "dsa") as TechnicalTopic,
      difficulty: session.difficulty || "medium",
      experienceLevel: config.experienceLevel || "mid",
      codingLanguage: (config.codingLanguage || "javascript") as CodingLanguage,
      history,
      resumeContext: resumeContext || "",
    });

    await p.interviewEvaluation.create({
      data: {
        sessionId,
        overallScore: evaluation.overallScore || 0,
        communicationScore: evaluation.communication || 0,
        technicalScore: evaluation.technicalDepth || 0,
        hrScore: null,
        confidenceScore: evaluation.problemSolving || 0,
        fluencyScore: evaluation.codeQuality || 0,
        bodyLanguageScore: null,
        strengths: evaluation.strengths || [],
        weaknesses: evaluation.weaknesses || [],
        improvements: evaluation.improvements || [],
        summary: evaluation.summary || "",
        hiringRecommendation: evaluation.hiringRecommendation || "maybe",
        detailedAnalysis: {
          answerQuality: evaluation.overallScore,
          technicalDepth: evaluation.technicalDepth,
          communicationClarity: evaluation.communication,
          problemSolving: evaluation.problemSolving,
          codeQuality: evaluation.codeQuality,
          answerBreakdowns: evaluation.answerBreakdowns || [],
        },
      },
    });

    const updatedSession = await p.interviewSession.update({
      where: { id: sessionId },
      data: { status: "completed", endedAt: new Date(), feedback: evaluation.summary || "" },
    });

    const savedEvaluation = await p.interviewEvaluation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, evaluation: formatTechnicalEvaluation(savedEvaluation), session: updatedSession });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.evaluate", "Failed to evaluate");
  }
});

// ─── End interview early ────────────────────────────────────────────────────
technicalEngineRouter.post("/:sessionId/end", async (req, res) => {
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

    const updatedSession = await p.interviewSession.update({
      where: { id: sessionId },
      data: { status: "terminated", endedAt: new Date() },
    });

    const existingEvaluation = await p.interviewEvaluation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    if (existingEvaluation) {
      res.json({
        success: true,
        session: updatedSession,
        evaluation: formatTechnicalEvaluation(existingEvaluation),
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
      const history = messages.map((m: any) => ({ role: m.role, content: m.content }));
      const partialEvaluation = await generateTechnicalEvaluation({
        role: session.role,
        company: session.company || "",
        topic: (config.technology || "dsa") as TechnicalTopic,
        difficulty: session.difficulty || "medium",
        experienceLevel: config.experienceLevel || "mid",
        codingLanguage: (config.codingLanguage || "javascript") as CodingLanguage,
        history,
        resumeContext: resumeContext || "",
      });
      const savedEval = await p.interviewEvaluation.create({
        data: {
          sessionId,
          overallScore: partialEvaluation.overallScore || 0,
          communicationScore: partialEvaluation.communication || 0,
          technicalScore: partialEvaluation.technicalDepth || 0,
          hrScore: null,
          confidenceScore: partialEvaluation.problemSolving || 0,
          fluencyScore: partialEvaluation.codeQuality || 0,
          bodyLanguageScore: null,
          strengths: partialEvaluation.strengths || [],
          weaknesses: partialEvaluation.weaknesses || [],
          improvements: partialEvaluation.improvements || [],
          summary: partialEvaluation.summary || "Interview ended early.",
          hiringRecommendation: partialEvaluation.hiringRecommendation || "maybe",
          detailedAnalysis: {
            answerQuality: partialEvaluation.overallScore,
            technicalDepth: partialEvaluation.technicalDepth,
            communicationClarity: partialEvaluation.communication,
            problemSolving: partialEvaluation.problemSolving,
            codeQuality: partialEvaluation.codeQuality,
            answerBreakdowns: partialEvaluation.answerBreakdowns || [],
          },
        },
      });
      evaluation = formatTechnicalEvaluation(savedEval);
    }

    res.json({ success: true, session: updatedSession, evaluation });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.end", "Failed to end interview");
  }
});

// ─── Get session ────────────────────────────────────────────────────────────
technicalEngineRouter.get("/:sessionId", async (req, res) => {
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
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    res.json({ success: true, session });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.getSession", "Failed to fetch session");
  }
});

// ─── Analytics ──────────────────────────────────────────────────────────────
technicalEngineRouter.get("/analytics/overview", async (req, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const sessions = await p.interviewSession.findMany({
      where: { userId: req.user!.userId, type: "technical" },
      include: { evaluations: { take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const completed = sessions.filter((s: any) => s.evaluations?.[0]);
    const totalSessions = sessions.length;
    const completedSessions = completed.length;
    const avgScore = completed.length
      ? Math.round(completed.reduce((a: number, s: any) => a + (s.evaluations?.[0]?.overallScore || 0), 0) / completed.length)
      : 0;
    const bestScore = completed.length
      ? Math.max(...completed.map((s: any) => s.evaluations?.[0]?.overallScore || 0))
      : 0;

    const topicMap = new Map<string, { count: number; totalScore: number }>();
    for (const s of completed) {
      const topic = s.technology || "dsa";
      const entry = topicMap.get(topic) || { count: 0, totalScore: 0 };
      entry.count += 1;
      entry.totalScore += s.evaluations?.[0]?.overallScore || 0;
      topicMap.set(topic, entry);
    }
    const topicBreakdown = Array.from(topicMap.entries()).map(([topic, data]) => ({
      topic,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count),
    }));

    res.json({
      success: true,
      analytics: { totalSessions, completedSessions, avgScore, bestScore, topicBreakdown },
    });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.analytics", "Failed to fetch analytics");
  }
});

// ─── History ────────────────────────────────────────────────────────────────
technicalEngineRouter.get("/history/list", async (req, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const sessions = await p.interviewSession.findMany({
      where: { userId: req.user!.userId, type: "technical" },
      include: { evaluations: { take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const summaries = sessions.map((s: any) => {
      const calcDuration = s.endedAt
        ? Math.round((new Date(s.endedAt).getTime() - new Date(s.createdAt).getTime()) / 60000)
        : (s.durationMinutes || 0);
      const computedScore = s.evaluations?.[0]?.overallScore ?? null;

      return {
        id: s.id,
        type: s.type,
        interviewType: s.type,
        role: s.role,
        targetRole: s.role,
        company: s.company,
        targetCompany: s.company,
        difficulty: s.difficulty,
        technology: s.technology,
        status: s.status,
        overallScore: computedScore,
        score: computedScore,
        date: s.createdAt,
        createdAt: s.createdAt,
        endedAt: s.endedAt,
        duration: calcDuration,
        durationMinutes: calcDuration,
      };
    });

    res.json({ success: true, sessions: summaries });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.history", "Failed to fetch history");
  }
});

// ─── Report ─────────────────────────────────────────────────────────────────
technicalEngineRouter.get("/:sessionId/report", async (req, res) => {
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
        technology: session.technology,
        status: session.status,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
        duration,
        configuration: session.configuration,
        evaluation,
        questionPairs,
        totalQuestions: interviewerMsgs.length,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.report", "Failed to fetch report");
  }
});

// ─── Coaching Intelligence ──────────────────────────────────────────────────
technicalEngineRouter.post("/:sessionId/coach", async (req, res) => {
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

    const evaluation = session.evaluations?.[0] || {
      overallScore: 70,
      communicationScore: 70,
      technicalScore: 75,
      confidenceScore: 70,
      strengths: ["Technical problem solving"],
      weaknesses: ["Trade-off explanations"],
      improvements: ["Practice STAR format"],
      summary: "Technical interview evaluation.",
    };

    const previousSession = await p.interviewSession.findFirst({
      where: {
        userId: req.user!.userId,
        id: { not: sessionId },
        type: "technical",
        status: "completed",
      },
      include: { evaluations: { take: 1 } },
      orderBy: { createdAt: "desc" },
    });

    const previousEvaluation = previousSession?.evaluations?.[0] || undefined;
    const config = session.configuration || {
      interviewType: "technical",
      targetRole: session.role || "Software Engineer",
      targetCompany: session.company || "Tech Company",
    };

    const intelligence = await generateIntelligenceLayer(
      evaluation,
      session.messages || [],
      config,
      previousEvaluation
    );

    res.json({ success: true, intelligence });
  } catch (error) {
    handleRouteError(res, error, "TechnicalEngine.coach", "Failed to generate coaching intelligence");
  }
});

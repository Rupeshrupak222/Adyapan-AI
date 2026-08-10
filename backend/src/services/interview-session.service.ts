import type { PrismaClient } from "@prisma/user-client";
import type { Prisma } from "@prisma/user-client";
import { httpError } from "../utils/httpError";
import {
  generateInterviewQuestion,
  generateInterviewFeedback,
} from "../lib/ai/gemini";
import { generateComprehensiveEvaluation } from "../lib/ai/evaluation";

export interface InterviewConfig {
  role: string;
  company?: string;
  type: "technical" | "behavioral" | "general";
  difficulty: "easy" | "medium" | "hard";
  language: string;
  durationMinutes: number;
  technology?: string;
  aiVoiceEnabled: boolean;
  videoEnabled: boolean;
}

export interface SessionState {
  id: string;
  status: string;
  phase: string;
  violationPoints: number;
  violationThreshold: number;
  currentQuestion: number;
  startedAt: Date | null;
}

export async function createInterviewSession(
  userId: string,
  config: InterviewConfig,
  prisma: PrismaClient
): Promise<{ session: any; firstQuestion: string }> {
  if (!config.role || config.role.trim().length === 0) {
    throw httpError(400, "Interview role is required");
  }

  if (config.durationMinutes < 5 || config.durationMinutes > 120) {
    throw httpError(400, "Duration must be between 5 and 120 minutes");
  }

  const session = await prisma.interviewSession.create({
    data: {
      userId,
      role: config.role,
      company: config.company || null,
      type: config.type,
      difficulty: config.difficulty,
      language: config.language,
      durationMinutes: config.durationMinutes,
      technology: config.technology || null,
      aiVoiceEnabled: config.aiVoiceEnabled,
      videoEnabled: config.videoEnabled,
      status: "in_progress",
      violationPoints: 0,
      violationThreshold: 10,
      startedAt: new Date(),
      configuration: config as any,
    },
  });

  let firstQuestion: string;
  try {
    firstQuestion = await generateInterviewQuestion(
      config.role,
      config.company || null,
      config.type,
      config.difficulty,
      []
    );
  } catch (error) {
    console.error("[InterviewSession] Failed to generate first question:", error);
    firstQuestion = `Tell me about your background and experience relevant to the ${config.role} position.`;
  }

  await prisma.interviewMessage.create({
    data: {
      sessionId: session.id,
      role: "interviewer",
      content: firstQuestion,
    },
  });

  return { session, firstQuestion };
}

export async function processAnswer(
  sessionId: string,
  answer: string,
  prisma: PrismaClient
): Promise<{
  feedback: string | null;
  nextQuestion: string;
  messages: Array<{ role: string; content: string }>;
  isComplete: boolean;
}> {
  if (!answer || answer.trim().length === 0) {
    throw httpError(400, "Answer cannot be empty");
  }

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    throw httpError(404, "Interview session not found");
  }

  if (session.status !== "in_progress") {
    throw httpError(400, "Interview session is not in progress");
  }

  await prisma.interviewMessage.create({
    data: {
      sessionId,
      role: "candidate",
      content: answer,
    },
  });

  const allMessages = [
    ...session.messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "candidate", content: answer },
  ];

  const interviewType = session.type;
  const isLastQuestion =
    allMessages.filter((m) => m.role === "interviewer").length >=
    Math.ceil(session.durationMinutes / 5);

  let nextQuestion: string;
  let feedback: string | null = null;

  try {
    const aiResponse = await generateInterviewQuestion(
      session.role,
      session.company,
      interviewType,
      session.difficulty,
      allMessages
    );

    if (isLastQuestion) {
      feedback = aiResponse;
      nextQuestion = "";
    } else {
      const feedbackMatch = aiResponse.match(/\*{0,2}Feedback:?\*{0,2}\s*([\s\S]*?)(?=\*{0,2}Question:?\*{0,2}|$)/i);
      if (feedbackMatch) {
        feedback = feedbackMatch[1].trim();
        nextQuestion = aiResponse.replace(feedbackMatch[0], "").trim();
      } else {
        nextQuestion = aiResponse;
      }

      if (!nextQuestion || nextQuestion.trim().length === 0) {
        nextQuestion = "Can you elaborate more on your approach to that problem?";
      }
    }
  } catch (error) {
    console.error("[InterviewSession] Failed to generate next question:", error);
    nextQuestion = "Could you walk me through your thought process on that?";
  }

  if (nextQuestion) {
    await prisma.interviewMessage.create({
      data: {
        sessionId,
        role: "interviewer",
        content: nextQuestion,
      },
    });
  }

  const updatedMessages = await prisma.interviewMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  return {
    feedback,
    nextQuestion,
    messages: updatedMessages,
    isComplete: isLastQuestion,
  };
}

export async function endInterviewSession(
  sessionId: string,
  prisma: PrismaClient
): Promise<{ session: any; evaluation: any }> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      },
      evaluations: true,
    },
  });

  if (!session) {
    throw httpError(404, "Interview session not found");
  }

  let updatedSession = session;
  if (session.status !== "completed") {
    updatedSession = await (prisma as any).interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        endedAt: session.endedAt || new Date(),
      },
    });
  }

  if (session.evaluations && session.evaluations.length > 0) {
    return { session: updatedSession, evaluation: session.evaluations[0] };
  }

  let savedEvaluation: any = null;
  try {
    const evaluation = await generateInterviewFeedback(
      session.role,
      session.company,
      session.type,
      session.messages.map((m) => ({ role: m.role, content: m.content }))
    );

    let comprehensiveEvaluation: any = null;
    try {
      comprehensiveEvaluation = await generateComprehensiveEvaluation(
        session.role,
        session.company,
        session.type,
        session.difficulty,
        session.messages.map((m) => ({ role: m.role, content: m.content })),
        evaluation
      );
    } catch (error) {
      console.error("[InterviewSession] Comprehensive evaluation failed, using basic:", error);
    }

    const strengths = comprehensiveEvaluation?.strengths || evaluation.strengths;
    const weaknesses = comprehensiveEvaluation?.weaknesses || evaluation.weaknesses;
    const improvements =
      comprehensiveEvaluation?.improvements || evaluation.areasForImprovement;

    savedEvaluation = await (prisma as any).interviewEvaluation.create({
      data: {
        sessionId,
        overallScore: comprehensiveEvaluation?.overallScore || evaluation.overallScore || 65,
        communicationScore: comprehensiveEvaluation?.communicationScore || 70,
        technicalScore: comprehensiveEvaluation?.technicalScore || null,
        hrScore: comprehensiveEvaluation?.hrScore || null,
        confidenceScore: comprehensiveEvaluation?.confidenceScore || null,
        fluencyScore: comprehensiveEvaluation?.fluencyScore || null,
        bodyLanguageScore: comprehensiveEvaluation?.bodyLanguageScore || null,
        strengths: strengths as any,
        weaknesses: weaknesses as any,
        improvements: improvements as any,
        summary: comprehensiveEvaluation?.summary || generateSummaryFromFeedback(evaluation),
        hiringRecommendation:
          comprehensiveEvaluation?.hiringRecommendation ||
          (evaluation.overallScore >= 70 ? "recommend" : "maybe"),
        detailedAnalysis: comprehensiveEvaluation?.detailedAnalysis || null,
      },
    });
  } catch (error) {
    console.error("[InterviewSession] Evaluation generation failed, saving default evaluation:", error);
    try {
      savedEvaluation = await (prisma as any).interviewEvaluation.create({
        data: {
          sessionId,
          overallScore: 65,
          communicationScore: 70,
          strengths: ["Completed interview session"],
          weaknesses: ["Session concluded early or evaluated with partial responses"],
          improvements: ["Complete full interview responses for deeper analysis"],
          summary: "Interview session concluded and saved.",
          hiringRecommendation: "maybe",
        },
      });
    } catch {}
  }

  return { session: updatedSession, evaluation: savedEvaluation };
}

export async function getSessionState(
  sessionId: string,
  prisma: PrismaClient
): Promise<SessionState> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      violationPoints: true,
      violationThreshold: true,
      startedAt: true,
      messages: {
        select: { id: true },
      },
    },
  });

  if (!session) {
    throw httpError(404, "Interview session not found");
  }

  const questionCount = session.messages.length;

  let phase = "not_started";
  if (session.status === "completed") {
    phase = "completed";
  } else if (session.status === "terminated") {
    phase = "terminated";
  } else if (session.status === "in_progress") {
    if (questionCount <= 1) phase = "intro";
    else if (questionCount <= 5) phase = "early";
    else if (questionCount <= 12) phase = "mid";
    else phase = "late";
  }

  return {
    id: session.id,
    status: session.status,
    phase,
    violationPoints: session.violationPoints,
    violationThreshold: session.violationThreshold,
    currentQuestion: questionCount,
    startedAt: session.startedAt,
  };
}

export async function addViolationPoints(
  sessionId: string,
  points: number,
  prisma: PrismaClient
): Promise<{ terminated: boolean; totalPoints: number; threshold: number }> {
  if (points <= 0) {
    throw httpError(400, "Violation points must be positive");
  }

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw httpError(404, "Interview session not found");
  }

  if (session.status !== "in_progress") {
    return {
      terminated: false,
      totalPoints: session.violationPoints,
      threshold: session.violationThreshold,
    };
  }

  const newTotal = session.violationPoints + points;
  const terminated = newTotal >= session.violationThreshold;

  const updatedSession = await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      violationPoints: newTotal,
      ...(terminated
        ? {
            status: "terminated",
            endedAt: new Date(),
          }
        : {}),
    },
  });

  if (terminated) {
    try {
      await endInterviewSession(sessionId, prisma);
    } catch (error) {
      console.error("[InterviewSession] Failed to auto-end terminated session:", error);
    }
  }

  return {
    terminated,
    totalPoints: updatedSession.violationPoints,
    threshold: updatedSession.violationThreshold,
  };
}

export async function logProctoringEvent(
  sessionId: string,
  event: {
    eventType: string;
    category: string;
    description: string;
    confidence?: number;
    screenshotData?: string;
    severity?: string;
    actionTaken?: string;
    pointsDeducted?: number;
    metadata?: any;
  },
  prisma: PrismaClient
): Promise<any> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw httpError(404, "Interview session not found");
  }

  const proctoringEvent = await prisma.proctoringEvent.create({
    data: {
      sessionId,
      eventType: event.eventType,
      category: event.category,
      description: event.description,
      confidence: event.confidence ?? 0,
      screenshotData: event.screenshotData || null,
      severity: event.severity || "info",
      actionTaken: event.actionTaken || null,
      pointsDeducted: event.pointsDeducted ?? 0,
      metadata: event.metadata || null,
    },
  });

  if (event.pointsDeducted && event.pointsDeducted > 0) {
    await addViolationPoints(sessionId, event.pointsDeducted, prisma);
  }

  return proctoringEvent;
}

function generateSummaryFromFeedback(feedback: {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
}): string {
  const scoreLabel =
    feedback.overallScore >= 80
      ? "strong"
      : feedback.overallScore >= 60
      ? "satisfactory"
      : "needs improvement";

  return `The candidate demonstrated a ${scoreLabel} performance with an overall score of ${feedback.overallScore}/100. ${
    feedback.strengths.length > 0
      ? `Key strengths include: ${feedback.strengths.slice(0, 2).join(", ")}.`
      : ""
  } ${
    feedback.weaknesses.length > 0
      ? `Areas for development: ${feedback.weaknesses.slice(0, 2).join(", ")}.`
      : ""
  }`;
}

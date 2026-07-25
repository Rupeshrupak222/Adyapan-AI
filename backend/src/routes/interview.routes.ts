import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { generateInterviewQuestion } from "../lib/ai/gemini";
import {
  createInterviewSession,
  processAnswer,
  endInterviewSession,
  logProctoringEvent,
  type InterviewConfig,
} from "../services/interview-session.service";
import {
  verifyIdentity,
  performSystemCheck,
  performEnvironmentScan,
  storeDeviceInfo,
  type EnvironmentScanData,
} from "../services/identity.service";
import { analyzeProctoringEvent } from "../lib/ai/proctoring";
import { generateViolationReport } from "../lib/ai/proctoring";
import { handleRouteError } from "../utils/routeError";
import { getSessionState } from "../services/interview-session.service";

export const interviewRouter = Router();

interviewRouter.use(requireAuth);

// ─── Phase 3: Start new interview session ──────────────────────────────────
interviewRouter.post("/start", async (req, res) => {
  try {
    const {
      role, company, type, difficulty,
      language, durationMinutes, technology,
      aiVoiceEnabled, videoEnabled,
    } = req.body;

    if (!role || !type) {
      res.status(400).json({ error: "Role and type are required" });
      return;
    }

    const config: InterviewConfig = {
      role,
      company: company || undefined,
      type,
      difficulty: difficulty || "medium",
      language: language || "english",
      durationMinutes: durationMinutes || 30,
      technology,
      aiVoiceEnabled: aiVoiceEnabled !== false,
      videoEnabled: videoEnabled !== false,
    };

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const { session, firstQuestion } = await createInterviewSession(
      req.user!.userId, config, p
    );

    const messages = await p.interviewMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true, createdAt: true },
    });

    res.json({ success: true, session, messages, lastQuestion: firstQuestion });
  } catch (error) {
    handleRouteError(res, error, "Interview.start", "Failed to start interview");
  }
});

// ─── Phase 3: Submit configuration options ─────────────────────────────────
interviewRouter.put("/:sessionId/config", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ error: "Interview session not found" });
      return;
    }

    const updated = await p.interviewSession.update({
      where: { id: sessionId },
      data: { configuration: req.body },
    });

    res.json({ success: true, session: updated });
  } catch (error) {
    handleRouteError(res, error, "Interview.updateConfig", "Failed to update configuration");
  }
});

// ─── Phase 4: Identity verification ───────────────────────────────────────
interviewRouter.post("/:sessionId/verify-identity", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { faceDescriptor, faceQuality, capturedImage, deviceInfo } = req.body;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ error: "Interview session not found" });
      return;
    }

    const verification = await verifyIdentity({
      sessionId,
      userId: req.user!.userId,
      faceDescriptor: faceDescriptor || [],
      faceQuality: faceQuality || { brightness: 50, contrast: 50, sharpness: 50 },
      deviceInfo: deviceInfo || {},
      capturedImage: capturedImage || "",
    }, p);

    await p.interviewSession.update({
      where: { id: sessionId },
      data: {
        identityVerification: verification as any,
        deviceInfo: verification.deviceInfo as any,
      },
    });

    res.json({ success: true, verification });
  } catch (error) {
    handleRouteError(res, error, "Interview.verifyIdentity", "Identity verification failed");
  }
});

// ─── Phase 5: System compatibility check ──────────────────────────────────
interviewRouter.get("/system-check/:sessionId", async (req, res) => {
  try {
    const systemCheck = await performSystemCheck();
    res.json({ success: true, systemCheck });
  } catch (error) {
    handleRouteError(res, error, "Interview.systemCheck", "System check failed");
  }
});

interviewRouter.post("/:sessionId/system-check/result", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { systemCheck, deviceInfo } = req.body;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    await storeDeviceInfo(sessionId, deviceInfo || {}, p);
    await p.interviewSession.update({
      where: { id: sessionId },
      data: { systemCheck: systemCheck as any },
    });

    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, "Interview.storeSystemCheck", "Failed to store system check");
  }
});

// ─── Phase 6: AI environment scan ─────────────────────────────────────────
interviewRouter.post("/:sessionId/environment-scan", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { faceDetection, roomScan, audioCheck } = req.body;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ error: "Interview session not found" });
      return;
    }

    const scanData: EnvironmentScanData = {
      sessionId,
      faceDetection: faceDetection || {},
      roomScan: roomScan || {},
      audioCheck: audioCheck || {},
    };

    const scanResult = await performEnvironmentScan(scanData, p);

    if (!scanResult.passed && roomScan?.mobilePhone) {
      await logProctoringEvent(sessionId, {
        eventType: "mobile_phone_detected",
        category: "object",
        description: "Mobile phone detected during surroundings scan",
        confidence: 0.9,
        severity: "critical",
        actionTaken: "Environment scan failed",
        pointsDeducted: 2,
      }, p);
    }
    if (!scanResult.passed && faceDetection?.faceCount !== 1) {
      const det = faceDetection?.faceCount === 0 ? "no_face" : "multiple_faces";
      await logProctoringEvent(sessionId, {
        eventType: det,
        category: "camera",
        description: det === "no_face" ? "No face detected during scan" : "Multiple faces detected",
        confidence: 0.95,
        severity: "critical",
        actionTaken: "Environment scan failed",
        pointsDeducted: 3,
      }, p);
    }

    res.json({ success: true, scanResult });
  } catch (error) {
    handleRouteError(res, error, "Interview.environmentScan", "Environment scan failed");
  }
});

// ─── Phase 7: Accept rules -------------------------------------------------
interviewRouter.post("/:sessionId/accept-rules", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ error: "Interview session not found" });
      return;
    }

    const updated = await p.interviewSession.update({
      where: { id: sessionId },
      data: {
        startedAt: new Date(),
        status: "in_progress",
      },
    });

    res.json({ success: true, session: updated });
  } catch (error) {
    handleRouteError(res, error, "Interview.acceptRules", "Failed to accept rules");
  }
});

// ─── Phase 8-9: Send answer & receive next question ------------------------
interviewRouter.post("/:sessionId/answer", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    if (!answer) {
      res.status(400).json({ error: "Answer is required" });
      return;
    }

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const processResult = await processAnswer(sessionId, answer, p);

    if (processResult.isComplete) {
      const endResult = await endInterviewSession(sessionId, p);
      res.json({
        success: true,
        isComplete: true,
        session: endResult.session,
        evaluation: endResult.evaluation,
        messages: endResult.session.messages || [],
      });
      return;
    }

    const messages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true, createdAt: true },
    });

    res.json({
      success: true,
      feedback: processResult.feedback,
      nextQuestion: processResult.nextQuestion,
      messages: messages,
    });
  } catch (error) {
    handleRouteError(res, error, "Interview.processAnswer", "Failed to process answer");
  }
});

// ─── Phase 9: Submit voice input / transcription ---------------------------
interviewRouter.post("/:sessionId/voice", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { text, duration } = req.body;

    if (!text) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
    });
    if (!session) {
      res.status(404).json({ error: "Interview session not found" });
      return;
    }

    await p.interviewMessage.create({
      data: { sessionId, role: "user", content: text, audioUrl: req.body.audioUrl || null, duration: duration || null },
    });

    const messages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
    const history = messages.map((m: any) => ({ role: m.role, content: m.content }));
    const nextQuestion = await generateInterviewQuestion(
      session.role, session.company, session.type, session.difficulty, history
    );

    await p.interviewMessage.create({
      data: { sessionId, role: "interviewer", content: nextQuestion },
    });

    const updatedMessages = await p.interviewMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true, createdAt: true },
    });

    res.json({ success: true, nextQuestion, messages: updatedMessages });
  } catch (error) {
    handleRouteError(res, error, "Interview.voiceInput", "Failed to process voice input");
  }
});

// ─── Phase 10: Log proctoring event ----------------------------------------
interviewRouter.post("/:sessionId/proctor", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { eventType, category, description, confidence, severity, pointsDeducted, actionTaken, screenshotData, metadata } = req.body;

    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const analysis = analyzeProctoringEvent(eventType, req.body);
    const results = Array.isArray(analysis) ? analysis : [analysis];

    const logged = [];
    for (const a of results) {
      if (a && a.eventType) {
        const event = await logProctoringEvent(sessionId, {
          eventType: a.eventType,
          category: a.category || category,
          description: a.description || `Proctoring: ${a.eventType}`,
          confidence: a.confidence ?? 0.5,
          severity: a.severity || severity,
          pointsDeducted: a.pointsDeducted || 0,
          actionTaken: actionTaken || a.actionTaken || "logged",
          screenshotData,
          metadata: metadata || a.metadata,
        }, p);
        logged.push(event);
      }
    }

    res.json({ success: true, events: logged });
  } catch (error) {
    handleRouteError(res, error, "Interview.logProctoringEvent", "Failed to log proctoring event");
  }
});

// ─── Phase 10: Get proctoring events ---------------------------------------
interviewRouter.get("/:sessionId/proctor", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const events = await p.proctoringEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
    const session = await p.interviewSession.findFirst({
      where: { id: sessionId },
      select: { violationPoints: true, violationThreshold: true },
    });

    res.json({ success: true, events, totalPoints: session?.violationPoints || 0, threshold: session?.violationThreshold || 10 });
  } catch (error) {
    handleRouteError(res, error, "Interview.getProctoringEvents", "Failed to get proctoring events");
  }
});

// ─── Phase 11: Generate violation report ------------------------------------
interviewRouter.get("/:sessionId/violation-report", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const events = await p.proctoringEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
    const session = await p.interviewSession.findFirst({
      where: { id: sessionId },
      select: { violationPoints: true, violationThreshold: true },
    });

    const report = generateViolationReport(
      sessionId,
      events.map((e: any) => ({
        eventType: e.eventType,
        severity: e.severity,
        pointsDeducted: e.pointsDeducted,
        createdAt: e.createdAt.toISOString(),
        description: e.description,
        screenshotData: e.screenshotData,
      })),
      session?.violationThreshold || 10
    );

    res.json({ success: true, report });
  } catch (error) {
    handleRouteError(res, error, "Interview.violationReport", "Failed to generate violation report");
  }
});

// ─── Phase 12-13: End interview & get evaluation ---------------------------
interviewRouter.post("/:sessionId/end", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;
    const result = await endInterviewSession(sessionId, p);
    res.json({ success: true, session: result.session, evaluation: result.evaluation });
  } catch (error) {
    handleRouteError(res, error, "Interview.end", "Failed to end interview");
  }
});

// ─── Phase 14: Interview history --------------------------------------------
interviewRouter.get("/history", async (req, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const sessions = await p.interviewSession.findMany({
      where: { userId: req.user!.userId },
      include: {
        evaluations: { take: 1 },
        violations: { orderBy: { createdAt: "asc" }, select: { createdAt: true, eventType: true, severity: true, description: true } },
        messages: { orderBy: { createdAt: "asc" }, select: { createdAt: true } },
      },
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
        role: s.role,
        targetRole: s.role,
        company: s.company,
        targetCompany: s.company,
        type: s.type,
        interviewType: s.type,
        difficulty: s.difficulty,
        technology: s.technology,
        status: s.status,
        violationPoints: s.violationPoints,
        violationThreshold: s.violationThreshold,
        overallScore: computedScore,
        score: computedScore,
        evaluation: s.evaluations?.[0] || null,
        date: s.createdAt,
        createdAt: s.createdAt,
        endedAt: s.endedAt,
        duration: calcDuration,
        durationMinutes: calcDuration,
        messageCount: s.messages?.length || 0,
        violationCount: s.violations?.length || 0,
      };
    });

    res.json({ success: true, sessions: summaries });
  } catch (error) {
    handleRouteError(res, error, "Interview.history", "Failed to fetch interview history");
  }
});

// ─── Analytics: Summary endpoint (MUST be before /:sessionId) ───────────────
interviewRouter.get("/analytics/summary", async (req, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const sessions = await p.interviewSession.findMany({
      where: { userId: req.user!.userId },
      include: {
        evaluations: { take: 1 },
        violations: { select: { pointsDeducted: true, severity: true } },
        messages: { select: { createdAt: true } },
      },
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

    // Weekly trend (last 8 weeks)
    const now = new Date();
    const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (7 * (7 - i)));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const weekSessions = completed.filter((s: any) => {
        const d = new Date(s.createdAt);
        return d >= weekStart && d < weekEnd;
      });

      const weekAvg = weekSessions.length
        ? Math.round(weekSessions.reduce((a: number, s: any) => a + (s.evaluations?.[0]?.overallScore || 0), 0) / weekSessions.length)
        : null;

      return {
        week: `W${i + 1}`,
        date: weekStart.toISOString().split("T")[0],
        sessions: weekSessions.length,
        avgScore: weekAvg,
      };
    });

    const typeBreakdown = ["technical", "behavioral", "general"].map(type => {
      const typeSessions = completed.filter((s: any) => s.type === type);
      return {
        type,
        count: typeSessions.length,
        avgScore: typeSessions.length
          ? Math.round(typeSessions.reduce((a: number, s: any) => a + (s.evaluations?.[0]?.overallScore || 0), 0) / typeSessions.length)
          : 0,
      };
    });

    res.json({ success: true, summary: { totalSessions, completedSessions, avgScore, bestScore, weeklyTrend, typeBreakdown } });
  } catch (error) {
    handleRouteError(res, error, "Interview.analytics", "Failed to fetch analytics");
  }
});

// ─── Get single session with full details -----------------------------------
interviewRouter.get("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        evaluations: true,
        violations: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!session) {
      res.status(404).json({ error: "Interview session not found" });
      return;
    }

    const state = await getSessionState(sessionId, p);
    const violationReport = generateViolationReport(
      sessionId,
      (session.violations || []).reverse().map((e: any) => ({
        eventType: e.eventType,
        severity: e.severity,
        pointsDeducted: e.pointsDeducted,
        createdAt: e.createdAt.toISOString(),
        description: e.description,
      })),
      session.violationThreshold
    );

    res.json({
      success: true,
      session: { ...session, state, violationReport },
    });
  } catch (error) {
    handleRouteError(res, error, "Interview.getSession", "Failed to fetch session");
  }
});

// ─── Report data: Full session for PDF ────────────────────────────────────────
interviewRouter.get("/:sessionId/report-data", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prisma = await getUserPrismaFromRequest(req);
    const p = prisma as any;

    const session = await p.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
      include: {
        evaluations: { take: 1 },
        violations: { orderBy: { createdAt: "asc" } },
        messages: { orderBy: { createdAt: "asc" }, select: { role: true, content: true } },
      },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const evaluation = session.evaluations?.[0] || null;

    const violationReport = generateViolationReport(
      sessionId,
      (session.violations || []).map((e: any) => ({
        eventType: e.eventType,
        severity: e.severity,
        pointsDeducted: e.pointsDeducted,
        createdAt: e.createdAt.toISOString(),
        description: e.description,
      })),
      session.violationThreshold
    );

    res.json({
      success: true,
      reportData: {
        sessionId: session.id,
        role: session.role,
        company: session.company,
        type: session.type,
        difficulty: session.difficulty,
        language: session.language,
        durationMinutes: session.durationMinutes,
        technology: session.technology,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
        evaluation,
        violationReport,
        messages: session.messages || [],
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Interview.reportData", "Failed to fetch report data");
  }
});

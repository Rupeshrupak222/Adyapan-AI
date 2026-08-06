import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getProfile } from "../services/profile.service";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { requireUserId } from "../utils/request";
import { getAnalytics as getAptitudeAnalytics } from "./aptitude-engine.controller";
import { engineAnalyticsHandler } from "../routes/engine.routes";
import { getDashboard as getStreakDashboard } from "./streak.controller";
import { getPlacementScore } from "./placement-intelligence.controller";
import { getDashboard as getWeakTopicsDashboard } from "./weak-topics.controller";

/**
 * Runs an Express route handler with a mock response object that resolves the
 * JSON payload it sends. This lets the consolidated dashboard endpoints reuse
 * the exact business logic + response shapes of the existing module handlers
 * without duplicating them.
 */
function invokeHandler(handler: (req: Request, res: Response, next: NextFunction) => unknown, req: Request): Promise<any> {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        resolve(body);
        return this;
      },
      send(body: unknown) {
        resolve(body);
        return this;
      },
      end() {
        resolve(undefined);
        return this;
      },
      setHeader() { return this; },
      getHeader() { return undefined; },
      headersSent: false,
    };

    handler(req as Request, res as unknown as Response, (err?: unknown) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve(undefined);
    });
  });
}

async function getUserDsaProgress(userPrisma: any, userId: string) {
  try {
    let progress = await userPrisma.dSAProgress.findFirst({ where: { userId } });
    if (!progress) {
      progress = await userPrisma.dSAProgress.create({ data: { userId } });
    }
    return progress;
  } catch {
    return null;
  }
}

/**
 * Lightweight dashboard statistics. Replaces the browser fan-out of 14
 * separate list/count requests with a single request that runs all queries in
 * parallel server-side. Only counts + averages are transferred, not full rows.
 */
export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const [
      profile,
      resumesCount,
      atsReports,
      linkedinReports,
      coverLettersCount,
      notesCount,
      quizzesCount,
      assignmentsCount,
      pptsCount,
      mindmapsCount,
      studySessionsCount,
      codingSessionsCount,
      dsaProgress,
      challengesCount,
    ] = await Promise.all([
      getProfile(userId).catch(() => null),
      userPrisma.resume.count({ where: { userId } }).catch(() => 0),
      userPrisma.aTSReport.findMany({ where: { userId }, select: { score: true } }).catch(() => []),
      userPrisma.linkedInReport.findMany({ where: { userId }, select: { score: true }, take: 50 }).catch(() => []),
      userPrisma.coverLetter.count({ where: { userId } }).catch(() => 0),
      userPrisma.generatedNote.count({ where: { userId } }).catch(() => 0),
      userPrisma.quiz.count({ where: { userId } }).catch(() => 0),
      userPrisma.assignment.count({ where: { userId } }).catch(() => 0),
      userPrisma.presentation.count({ where: { userId } }).catch(() => 0),
      userPrisma.mindMap.count({ where: { userId } }).catch(() => 0),
      userPrisma.studySession.count({ where: { userId } }).catch(() => 0),
      userPrisma.codingSession.count({ where: { userId } }).catch(() => 0),
      getUserDsaProgress(userPrisma, userId),
      userPrisma.challenge.count({ where: { category: { isActive: true } } }).catch(() => 0),
    ]);

    const avgAtsScore = atsReports.length
      ? Math.round(atsReports.reduce((sum: number, r: { score: number }) => sum + (r.score || 0), 0) / atsReports.length)
      : 0;

    const avgLinkedinScore = linkedinReports.length
      ? Math.round(linkedinReports.reduce((sum: number, r: { score: number }) => sum + (r.score || 0), 0) / linkedinReports.length)
      : 0;

    res.json({
      success: true,
      profile,
      stats: {
        resumesCount,
        avgAtsScore,
        avgLinkedinScore,
        coverLettersCount,
        notesCount,
        quizzesCount,
        assignmentsCount,
        pptsCount,
        mindmapsCount,
        studySessionsCount,
        codingSessionsCount,
        dsaSolved: dsaProgress?.solved || 0,
        dsaAccuracy: dsaProgress?.accuracy || 0,
        dsaStreak: dsaProgress?.streak || 0,
        challengesCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Heavy cross-module analytics for the bottom dashboard widgets. The five
 * underlying handlers are invoked in parallel server-side; failures degrade
 * to `null` per module instead of failing the whole request.
 */
export async function getDashboardAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const [aptitude, interview, streak, placement, weakTopics] = await Promise.allSettled([
      invokeHandler(getAptitudeAnalytics, req),
      invokeHandler(engineAnalyticsHandler, req),
      invokeHandler(getStreakDashboard, req),
      invokeHandler(getPlacementScore, req),
      invokeHandler(getWeakTopicsDashboard, req),
    ]);

    res.json({
      success: true,
      aptitude: aptitude.status === "fulfilled" && aptitude.value?.success !== false ? aptitude.value?.analytics ?? null : null,
      interview: interview.status === "fulfilled" && interview.value && interview.value.success !== false ? interview.value : null,
      streak: streak.status === "fulfilled" && streak.value?.success ? streak.value.data ?? null : null,
      placement: placement.status === "fulfilled" && placement.value?.success ? placement.value : null,
      weakTopics: weakTopics.status === "fulfilled" && weakTopics.value?.success ? weakTopics.value.data ?? null : null,
    });
  } catch (error) {
    next(error);
  }
}

export type DashboardStatsHandler = RequestHandler;

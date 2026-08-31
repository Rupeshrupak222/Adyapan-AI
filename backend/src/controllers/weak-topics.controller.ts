import type { Request, Response } from "express";
import { WeakTopicsService } from "../services/weak-topics.service";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";

export async function analyzeWeakTopics(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);
    const data = await WeakTopicsService.analyzeAndPersist(userId, userPrisma);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("WeakTopics analyzeWeakTopics error:", error);
    handleRouteError(res, error, "WeakTopics.analyze", "Failed to analyze weak topics");
  }
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    // Try existing data first
    let data = await WeakTopicsService.getDashboardData(userId, userPrisma);

    // If no data exists, trigger a fresh analysis
    if (!data) {
      data = await WeakTopicsService.analyzeAndPersist(userId, userPrisma);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("WeakTopics getDashboard error:", error);
    handleRouteError(res, error, "WeakTopics.dashboard", "Failed to get weak topics dashboard");
  }
}

export async function getRevisionQueue(req: Request, res: Response): Promise<void> {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const userId = req.user!.userId;
    const queue = await userPrisma.revisionQueue.findMany({
      where: { userId },
      orderBy: [{ priority: "asc" }, { recommendedDate: "asc" }],
    });
    res.json({ success: true, queue });
  } catch (error: any) {
    console.error("WeakTopics getRevisionQueue error:", error);
    handleRouteError(res, error, "WeakTopics.revisionQueue", "Failed to get revision queue");
  }
}

export async function getWeakConcepts(req: Request, res: Response): Promise<void> {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const userId = req.user!.userId;
    const concepts = await userPrisma.weakConcept.findMany({
      where: { userId },
      orderBy: { masteryScore: "asc" },
    });
    res.json({ success: true, concepts });
  } catch (error: any) {
    console.error("WeakTopics getWeakConcepts error:", error);
    handleRouteError(res, error, "WeakTopics.weakConcepts", "Failed to get weak concepts");
  }
}

export async function getRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);
    let data = await WeakTopicsService.getDashboardData(userId, userPrisma);
    if (!data) {
      data = await WeakTopicsService.analyzeAndPersist(userId, userPrisma);
    }
    res.json({ success: true, recommendations: data.recommendations, coachInsight: data.coachInsight });
  } catch (error: any) {
    console.error("WeakTopics getRecommendations error:", error);
    handleRouteError(res, error, "WeakTopics.recommendations", "Failed to get recommendations");
  }
}

export async function getExamRisk(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);
    let data = await WeakTopicsService.getDashboardData(userId, userPrisma);
    if (!data) {
      data = await WeakTopicsService.analyzeAndPersist(userId, userPrisma);
    }
    res.json({ success: true, examRisk: data.examRisk });
  } catch (error: any) {
    console.error("WeakTopics getExamRisk error:", error);
    handleRouteError(res, error, "WeakTopics.examRisk", "Failed to get exam risk");
  }
}

export async function getInterviewRisk(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);
    let data = await WeakTopicsService.getDashboardData(userId, userPrisma);
    if (!data) {
      data = await WeakTopicsService.analyzeAndPersist(userId, userPrisma);
    }
    res.json({ success: true, interviewRisk: data.interviewRisk });
  } catch (error: any) {
    console.error("WeakTopics getInterviewRisk error:", error);
    handleRouteError(res, error, "WeakTopics.interviewRisk", "Failed to get interview risk");
  }
}

export async function updateRevisionStatus(req: Request, res: Response): Promise<void> {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const userId = req.user!.userId;
    const { id, status } = req.body;
    if (!id || !status) {
      res.status(400).json({ success: false, error: "Missing id or status" });
      return;
    }
    const updated = await userPrisma.revisionQueue.updateMany({
      where: { id, userId },
      data: { status },
    });
    res.json({ success: true, updated });
  } catch (error: any) {
    console.error("WeakTopics updateRevisionStatus error:", error);
    handleRouteError(res, error, "WeakTopics.updateRevision", "Failed to update revision status");
  }
}

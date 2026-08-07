import type { Request, Response } from "express";
import { StreakService } from "../services/streak.service";
import { getUserPrismaFromRequest, masterPrisma } from "../utils/prisma";
import { getTimezone } from "../utils/request";

async function getPrismaClient(req: Request) {
  try {
    return await getUserPrismaFromRequest(req);
  } catch {
    return masterPrisma;
  }
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getPrismaClient(req);
    const tz = getTimezone(req);
    const data = await StreakService.getDashboardData(userId, tz, userPrisma);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Streak getDashboard error:", error);
    // Return fallback dashboard object instead of 500 error
    const userId = req.user?.userId || "guest";
    const tz = getTimezone(req);
    const fallbackData = await StreakService.getDashboardData(userId, tz, masterPrisma).catch(() => null);
    res.json({ success: true, data: fallbackData });
  }
}

export async function updateStreak(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { eventType, eventSource, documentId, activityPoints } = req.body;
    
    if (!eventType || !eventSource) {
      res.status(400).json({ success: false, error: "Missing eventType or eventSource" });
      return;
    }
    
    const userPrisma = await getPrismaClient(req);
    const tz = getTimezone(req);
    const result = await StreakService.trackActivity(
      userId,
      eventType,
      eventSource,
      documentId || null,
      activityPoints ? Number(activityPoints) : 10,
      tz,
      userPrisma
    );
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Streak updateStreak error:", error);
    res.json({ success: true, streakUpdated: false });
  }
}

export async function getAchievements(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getPrismaClient(req);
    const achievements = await StreakService.getAchievementsData(userId, userPrisma);
    res.json({ success: true, achievements });
  } catch (error: any) {
    console.error("Streak getAchievements error:", error);
    const achievements = await StreakService.getAchievementsData(req.user?.userId || "", masterPrisma).catch(() => []);
    res.json({ success: true, achievements });
  }
}

export async function getHeatmap(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const daysRange = req.query.days ? Number(req.query.days) : 365;
    const userPrisma = await getPrismaClient(req);
    const tz = getTimezone(req);
    const heatmap = await StreakService.getHeatmapData(userId, daysRange, tz, userPrisma);
    res.json({ success: true, heatmap });
  } catch (error: any) {
    console.error("Streak getHeatmap error:", error);
    const daysRange = req.query.days ? Number(req.query.days) : 365;
    const tz = getTimezone(req);
    const heatmap = await StreakService.getHeatmapData(req.user?.userId || "", daysRange, tz, masterPrisma).catch(() => []);
    res.json({ success: true, heatmap });
  }
}

export async function getInsights(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getPrismaClient(req);
    const tz = getTimezone(req);
    const insights = await StreakService.getStreakInsights(userId, tz, userPrisma);
    res.json({ success: true, insights });
  } catch (error: any) {
    console.error("Streak getInsights error:", error);
    const tz = getTimezone(req);
    const insights = await StreakService.getStreakInsights(req.user?.userId || "", tz, masterPrisma).catch(() => ({
      habitAnalysis: "Start your daily learning journey to build consistency.",
      suggestions: ["Plan small 10-minute active sessions daily."],
      motivationalMessage: "Keep learning every day!"
    }));
    res.json({ success: true, insights });
  }
}

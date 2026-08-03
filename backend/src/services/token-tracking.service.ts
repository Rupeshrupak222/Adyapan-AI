import { prisma } from "../config/prisma";
import { getSystemSettingsMemory } from "../controllers/admin.controller";

// In-memory cache for fast 0ms token limit checks
const usageCache = new Map<string, number>();

function getTodayKey(userId: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `${userId}:${today}`;
}

export class TokenTrackingService {
  /**
   * Get user's total token usage for today
   */
  static async getTodayTokenUsage(userId: string): Promise<number> {
    if (!userId) return 0;
    const cacheKey = getTodayKey(userId);
    if (usageCache.has(cacheKey)) {
      return usageCache.get(cacheKey)!;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    try {
      const record = await (prisma as any).aiDailyUsage?.findUnique({
        where: { userId_date: { userId, date: todayStr } },
      });
      const count = record?.tokenCount ?? 0;
      usageCache.set(cacheKey, count);
      return count;
    } catch {
      return usageCache.get(cacheKey) ?? 0;
    }
  }

  /**
   * Check if user is allowed to make an AI request based on token limits
   */
  static async checkTokenLimit(
    userId: string,
    userRole: string = "USER",
    userPlan: string = "free",
    estimatedTokens: number = 200
  ): Promise<{
    allowed: boolean;
    used: number;
    limit: number;
    isFree: boolean;
    message?: string;
  }> {
    // Admin users have unlimited tokens
    if (userRole === "ADMIN" || userPlan?.toLowerCase() === "admin") {
      return { allowed: true, used: 0, limit: Infinity, isFree: false };
    }

    const settings = getSystemSettingsMemory();
    const isFree = !userPlan || userPlan.toLowerCase() === "free";
    const limit = isFree
      ? settings.freeTierTokenLimit || 500000
      : settings.premiumTierTokenLimit || 5000000;

    const used = await this.getTodayTokenUsage(userId);

    if (used + estimatedTokens > limit) {
      return {
        allowed: false,
        used,
        limit,
        isFree,
        message: `Daily AI token limit of ${limit.toLocaleString()} tokens reached. ${
          isFree
            ? "Upgrade to Premium for higher daily AI token limits!"
            : "Your daily token limit will reset at midnight."
        }`,
      };
    }

    return { allowed: true, used, limit, isFree };
  }

  /**
   * Record tokens used by a user after an AI request completes
   */
  static async recordTokenUsage(userId: string, tokenCount: number): Promise<number> {
    if (!userId || tokenCount <= 0) return 0;

    const cacheKey = getTodayKey(userId);
    const current = usageCache.get(cacheKey) ?? 0;
    const newTotal = current + tokenCount;
    usageCache.set(cacheKey, newTotal);

    const todayStr = new Date().toISOString().split("T")[0];
    try {
      if ((prisma as any).aiDailyUsage) {
        await (prisma as any).aiDailyUsage.upsert({
          where: { userId_date: { userId, date: todayStr } },
          create: {
            userId,
            date: todayStr,
            tokenCount: newTotal,
            requestCount: 1,
          },
          update: {
            tokenCount: newTotal,
            requestCount: { increment: 1 },
          },
        });
      }
    } catch (err) {
      // Non-blocking best effort for DB persistence
      console.warn("[TokenTrackingService] Failed to persist token usage to DB:", err);
    }

    return newTotal;
  }
}

import { PrismaClient } from "@prisma/user-client";
import { generateJSON, MODELS } from "../lib/ai/openrouter";

export interface StreakDashboardData {
  currentStreak: number;
  longestStreak: number;
  consistencyScore: number;
  activeDaysCount: number;
  monthlyActiveCount: number;
  monthlyTotalDays: number;
  previousStreak: number;
  streakRule: string;
  timeRequirement: number;
  streakFreezes: number;
  freezeActive: boolean;
  points: number;
  globalRank: number | null;
  campusRank: number | null;
  weeklyReport: { day: string; active: boolean; date: string }[];
  monthlyReport: {
    activeDays: number;
    missedDays: number;
    averageSessionDuration: number;
    mostActiveDay: string;
    leastActiveDay: string;
  };
  habitAnalytics: {
    preferredStudyTime: string;
    mostActiveDay: string;
    mostProductiveDay: string;
    averageDailyUsage: number;
  };
  recentAchievements: {
    achievementName: string;
    achievementType: string;
    rarity: string;
    unlockedAt: string;
  }[];
  motivationalMessage: string;
}

export interface HeatmapCell {
  date: string;
  count: number;
  points: number;
  details: string;
}

export class StreakService {
  /**
   * Format a date to YYYY-MM-DD string in the specified timezone
   */
  static getLocalDateString(date: Date, tz: string = "UTC"): string {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(date);
    } catch (e) {
      // Fallback if timezone is invalid
      return date.toISOString().split("T")[0];
    }
  }

  /**
   * Track a learning activity, update streak state, monthly/yearly history, and unlock milestones
   */
  static async trackActivity(
    userId: string,
    eventType: string,
    eventSource: string,
    documentId: string | null = null,
    activityPoints: number = 10, // points map to duration or action intensity
    timezone: string = "UTC",
    prisma: PrismaClient
  ) {
    // 1. Log the new event
    const event = await prisma.streakEvent.create({
      data: {
        userId,
        eventType,
        eventSource,
        documentId,
        activityPoints
      }
    });

    // 2. Fetch or create user's streak
    let streak = await prisma.learningStreak.findUnique({
      where: { userId }
    });

    if (!streak) {
      streak = await prisma.learningStreak.create({
        data: {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          consistencyScore: 0,
          activeDaysCount: 0,
          monthlyActivity: {} as any,
          yearlyActivity: {} as any,
          streakRule: "action",
          timeRequirement: 10,
          streakFreezes: 1,
          points: 0
        }
      });
    }

    const todayStr = this.getLocalDateString(new Date(), timezone);
    
    // Calculate yesterday's date string in user's timezone
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.getLocalDateString(yesterday, timezone);

    // Get previous active day string
    const lastActiveStr = streak.lastActiveDate 
      ? this.getLocalDateString(streak.lastActiveDate, timezone) 
      : null;

    let streakUpdated = false;
    let newCurrentStreak = streak.currentStreak;
    let newLongestStreak = streak.longestStreak;
    let newPreviousStreak = streak.previousStreak;

    // Check if the user qualifies for active day (default: 1 action = active day)
    // If the rule is "time", we sum today's activity points (which represent minutes)
    let qualifies = true;
    if (streak.streakRule === "time") {
      const todayEvents = await prisma.streakEvent.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(todayStr + "T00:00:00Z"),
            lte: new Date(todayStr + "T23:59:59Z")
          }
        }
      });
      const totalTime = todayEvents.reduce((sum, e) => sum + e.activityPoints, 0);
      qualifies = totalTime >= streak.timeRequirement;
    }

    if (qualifies) {
      if (lastActiveStr === todayStr) {
        // Already active today, streak is already secured
        // We just add points/activity details without changing streak length
      } else if (lastActiveStr === yesterdayStr) {
        // Consecutive day study!
        newCurrentStreak = streak.currentStreak + 1;
        streakUpdated = true;
      } else {
        // Streak was broken or this is the first day
        newPreviousStreak = streak.currentStreak > 0 ? streak.currentStreak : streak.previousStreak;
        newCurrentStreak = 1;
        streakUpdated = true;
      }
    }

    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }

    // Update monthly activity tracker
    const [year, month] = todayStr.split("-");
    const monthKey = `${year}-${month}`;
    const monthlyAct: Record<string, number[]> = (streak.monthlyActivity as any) || {};
    const currentMonthDays = monthlyAct[monthKey] || [];
    
    const dayVal = parseInt(todayStr.split("-")[2], 10);
    if (!currentMonthDays.includes(dayVal)) {
      currentMonthDays.push(dayVal);
      currentMonthDays.sort((a, b) => a - b);
    }
    monthlyAct[monthKey] = currentMonthDays;

    // Update yearly activity count
    const yearlyAct: Record<string, number> = (streak.yearlyActivity as any) || {};
    const currentYearCount = yearlyAct[year] || 0;
    const isNewActiveDay = lastActiveStr !== todayStr;
    if (isNewActiveDay) {
      yearlyAct[year] = currentYearCount + 1;
    }

    // Recalculate rolling 30 days consistency score
    // 1. Fetch active days in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Group events in last 30 days by date to find unique active days
    const recentEvents = await prisma.streakEvent.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { createdAt: true }
    });

    const uniqueActiveDaysInLast30 = new Set<string>();
    recentEvents.forEach(e => {
      uniqueActiveDaysInLast30.add(this.getLocalDateString(e.createdAt, timezone));
    });

    const consistencyScore = Math.round((uniqueActiveDaysInLast30.size / 30) * 100);

    // Update the streak model
    const updatedStreak = await prisma.learningStreak.update({
      where: { userId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        previousStreak: newPreviousStreak,
        lastActiveDate: new Date(),
        activeDaysCount: isNewActiveDay ? streak.activeDaysCount + 1 : streak.activeDaysCount,
        monthlyActivity: monthlyAct as any,
        yearlyActivity: yearlyAct as any,
        consistencyScore,
        points: streak.points + activityPoints
      }
    });

    // 3. Achievements check
    if (streakUpdated) {
      await this.checkAndUnlockAchievements(userId, newCurrentStreak, prisma);
    }

    return { event, streak: updatedStreak, streakUpdated };
  }

  /**
   * Check and unlock streak achievements
   */
  private static async checkAndUnlockAchievements(
    userId: string,
    currentStreak: number,
    prisma: PrismaClient
  ) {
    const milestones = [
      { days: 1, name: "First Day", type: "STREAK_1_DAY", rarity: "Common" },
      { days: 3, name: "3 Day Streak", type: "STREAK_3_DAYS", rarity: "Common" },
      { days: 7, name: "7 Day Warrior", type: "STREAK_7_DAYS", rarity: "Rare" },
      { days: 14, name: "14 Day Champion", type: "STREAK_14_DAYS", rarity: "Rare" },
      { days: 30, name: "30 Day Legend", type: "STREAK_30_DAYS", rarity: "Epic" },
      { days: 60, name: "60 Day Demi-God", type: "STREAK_60_DAYS", rarity: "Epic" },
      { days: 100, name: "100 Day Immortal", type: "STREAK_100_DAYS", rarity: "Legendary" },
      { days: 365, name: "365 Day God of Learning", type: "STREAK_365_DAYS", rarity: "Legendary" }
    ];

    for (const mil of milestones) {
      if (currentStreak >= mil.days) {
        // Check if already unlocked
        const existing = await prisma.streakAchievement.findFirst({
          where: {
            userId,
            achievementType: mil.type
          }
        });

        if (!existing) {
          // Unlock!
          await prisma.streakAchievement.create({
            data: {
              userId,
              achievementName: mil.name,
              achievementType: mil.type,
              rarity: mil.rarity,
              unlockedAt: new Date()
            }
          });

          // Send a notification!
          await prisma.notification.create({
            data: {
              userId,
              type: "streak_achievement",
              title: `🏆 Achievement Unlocked: ${mil.name}!`,
              message: `You've achieved a streak of ${mil.days} days! Keep building your daily study habit.`,
              link: "/dashboard/learning-streak"
            }
          });
        }
      }
    }
  }

  /**
   * Get all achievements indicating locked/unlocked status
   */
  static async getAchievementsData(userId: string, prisma: any) {
    const milestones = [
      { name: "First Day", type: "STREAK_1_DAY", description: "Complete your first learning activity on the platform", rarity: "Common", days: 1 },
      { name: "3 Day Streak", type: "STREAK_3_DAYS", description: "Keep the momentum alive for 3 consecutive days", rarity: "Common", days: 3 },
      { name: "7 Day Warrior", type: "STREAK_7_DAYS", description: "Study consistently for a full week (7 consecutive days)", rarity: "Rare", days: 7 },
      { name: "14 Day Champion", type: "STREAK_14_DAYS", description: "Sustain your learning for 2 full weeks (14 consecutive days)", rarity: "Rare", days: 14 },
      { name: "30 Day Legend", type: "STREAK_30_DAYS", description: "Build a solid daily study habit for a month (30 consecutive days)", rarity: "Epic", days: 30 },
      { name: "60 Day Demi-God", type: "STREAK_60_DAYS", description: "Demonstrate deep commitment with a 60-day streak", rarity: "Epic", days: 60 },
      { name: "100 Day Immortal", type: "STREAK_100_DAYS", description: "Reach the ultimate learning milestone: 100 days streak", rarity: "Legendary", days: 100 },
      { name: "365 Day God of Learning", type: "STREAK_365_DAYS", description: "An entire year of consistent daily expansion (365 days)", rarity: "Legendary", days: 365 }
    ];

    const unlocked = await prisma.streakAchievement.findMany({
      where: { userId }
    });

    return milestones.map(m => {
      const match = unlocked.find(u => u.achievementType === m.type);
      return {
        ...m,
        unlocked: !!match,
        unlockedAt: match ? match.unlockedAt.toISOString() : null
      };
    });
  }

  /**
   * Fetch heatmap calendar coordinates (rolling days count)
   */
  static async getHeatmapData(userId: string, days: number = 365, timezone: string = "UTC", prisma: any): Promise<HeatmapCell[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await prisma.streakEvent.findMany({
      where: {
        userId,
        createdAt: { gte: since }
      },
      orderBy: { createdAt: "asc" }
    });

    // Group by local date string
    const groups: Record<string, { events: any[]; points: number }> = {};
    events.forEach(e => {
      const dateStr = this.getLocalDateString(e.createdAt, timezone);
      if (!groups[dateStr]) {
        groups[dateStr] = { events: [], points: 0 };
      }
      groups[dateStr].events.push(e);
      groups[dateStr].points += e.activityPoints;
    });

    const result: HeatmapCell[] = [];

    // Fill all dates in the range
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = this.getLocalDateString(d, timezone);
      const group = groups[dateStr];

      if (group) {
        // Format tooltip details
        const typeCounts: Record<string, number> = {};
        group.events.forEach(ev => {
          const t = ev.eventType.replace(/_/g, " ").toLowerCase();
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });

        const detailsStr = Object.entries(typeCounts)
          .map(([t, count]) => `${count} ${t}`)
          .join(", ");

        result.push({
          date: dateStr,
          count: group.events.length,
          points: group.points,
          details: detailsStr
        });
      } else {
        result.push({
          date: dateStr,
          count: 0,
          points: 0,
          details: "No learning activity"
        });
      }
    }

    return result.reverse();
  }

  /**
   * Get all dashboard metrics, weekly and monthly consistency reports, and habit analytics
   */
  static async getDashboardData(userId: string, timezone: string = "UTC", prisma: any): Promise<StreakDashboardData> {
    try {
      let streak = await prisma.learningStreak.findUnique({
        where: { userId }
      }).catch(() => null);

      if (!streak) {
        streak = await prisma.learningStreak.create({
          data: {
            userId,
            currentStreak: 0,
            longestStreak: 0,
            consistencyScore: 0,
            activeDaysCount: 0,
            monthlyActivity: {} as any,
            yearlyActivity: {} as any,
            streakRule: "action",
            timeRequirement: 10,
            streakFreezes: 1,
            points: 0
          }
        }).catch(() => ({
          userId,
          currentStreak: 0,
          longestStreak: 0,
          consistencyScore: 0,
          activeDaysCount: 0,
          monthlyActivity: {},
          yearlyActivity: {},
          streakRule: "action",
          timeRequirement: 10,
          streakFreezes: 1,
          freezeActive: false,
          points: 0,
          globalRank: null,
          campusRank: null,
          previousStreak: 0
        } as any));
      }

      // Weekly consistency report (Monday to Sunday)
      const today = new Date();
      const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
      const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay; // calculate offset to Monday
      
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayDiff);
      monday.setHours(0, 0, 0, 0);

      const weekDates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d);
      }

      const weekEvents = await prisma.streakEvent.findMany({
        where: {
          userId,
          createdAt: { gte: monday }
        }
      }).catch(() => []);

      const activeDaysOfWeek = new Set<string>();
      weekEvents.forEach(e => {
        activeDaysOfWeek.add(this.getLocalDateString(e.createdAt, timezone));
      });

      const daysName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const weeklyReport = weekDates.map((d, index) => {
        const dateStr = this.getLocalDateString(d, timezone);
        return {
          day: daysName[index],
          active: activeDaysOfWeek.has(dateStr),
          date: dateStr
        };
      });

      // Monthly consistency stats
      const todayStr = this.getLocalDateString(new Date(), timezone);
      const [year, month] = todayStr.split("-");
      const monthKey = `${year}-${month}`;
      const monthlyAct: Record<string, number[]> = (streak.monthlyActivity as any) || {};
      const activeDaysOfMonth = monthlyAct[monthKey] || [];
      
      const currentMonthTotalDaysPassed = today.getDate();
      const activeDaysCountInMonth = activeDaysOfMonth.length;
      const missedDays = Math.max(0, currentMonthTotalDaysPassed - activeDaysCountInMonth);

      // Fetch all events for habit analytics
      const allEvents = await prisma.streakEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      }).catch(() => []);

      const hourCounts = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
      const dayOfWeekCounts = Array(7).fill(0);
      const dayOfWeekPoints = Array(7).fill(0);
      const daysOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      
      let totalPoints = 0;
      
      allEvents.forEach(e => {
        let localHour = e.createdAt.getUTCHours();
        let localDay = e.createdAt.getUTCDay();

        try {
          const localStr = e.createdAt.toLocaleString("en-US", { timeZone: timezone });
          const localDate = new Date(localStr);
          if (!isNaN(localDate.getTime())) {
            localHour = localDate.getHours();
            localDay = localDate.getDay();
          }
        } catch {
          // Safe fallback to UTC
        }

        if (localHour >= 5 && localHour < 12) hourCounts.Morning++;
        else if (localHour >= 12 && localHour < 17) hourCounts.Afternoon++;
        else if (localHour >= 17 && localHour < 21) hourCounts.Evening++;
        else hourCounts.Night++;

        const points = e.activityPoints || 0;
        dayOfWeekCounts[localDay]++;
        dayOfWeekPoints[localDay] += points;
        totalPoints += points;
      });

      let preferredStudyTime = "Morning";
      let maxHourCount = 0;
      Object.entries(hourCounts).forEach(([time, count]) => {
        if (count > maxHourCount) {
          maxHourCount = count;
          preferredStudyTime = time;
        }
      });

      let mostActiveDayIndex = 3;
      let maxDayCount = 0;
      dayOfWeekCounts.forEach((count, i) => {
        if (count > maxDayCount) {
          maxDayCount = count;
          mostActiveDayIndex = i;
        }
      });
      const mostActiveDay = maxDayCount > 0 ? daysOfWeekNames[mostActiveDayIndex] : "Wednesday";

      let mostProductiveDayIndex = 3;
      let maxDayPoints = 0;
      dayOfWeekPoints.forEach((points, i) => {
        if (points > maxDayPoints) {
          maxDayPoints = points;
          mostProductiveDayIndex = i;
        }
      });
      const mostProductiveDay = maxDayPoints > 0 ? daysOfWeekNames[mostProductiveDayIndex] : "Wednesday";

      const activeDaysSet = new Set<string>();
      allEvents.forEach(e => activeDaysSet.add(this.getLocalDateString(e.createdAt, timezone)));
      const averageDailyUsage = activeDaysSet.size > 0 
        ? Math.round((totalPoints / activeDaysSet.size) * 10) / 10 
        : 0;

      const unlockedAchievements = await prisma.streakAchievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: "desc" },
        take: 4
      }).catch(() => []);

      const recentAchievements = unlockedAchievements.map(a => ({
        achievementName: a.achievementName,
        achievementType: a.achievementType,
        rarity: a.rarity,
        unlockedAt: a.unlockedAt.toISOString()
      }));

      let motivationalMessage = "Start learning today! Build your first learning streak and develop a powerful study habit.";
      if (streak.currentStreak > 0) {
        const nextMilestone = streak.currentStreak < 3 ? 3 : streak.currentStreak < 7 ? 7 : streak.currentStreak < 14 ? 14 : streak.currentStreak < 30 ? 30 : Math.ceil((streak.currentStreak + 1)/10)*10;
        motivationalMessage = `🔥 You have maintained your learning streak for ${streak.currentStreak} days. Keep going to reach your next milestone at ${nextMilestone} days!`;
      } else if (streak.previousStreak > 0) {
        motivationalMessage = `Your previous streak was ${streak.previousStreak} days. A quick 15-minute revision session today will restart your learning streak!`;
      }

      return {
        currentStreak: streak.currentStreak || 0,
        longestStreak: streak.longestStreak || 0,
        consistencyScore: streak.consistencyScore || 0,
        activeDaysCount: streak.activeDaysCount || 0,
        monthlyActiveCount: activeDaysCountInMonth,
        monthlyTotalDays: currentMonthTotalDaysPassed,
        previousStreak: streak.previousStreak || 0,
        streakRule: streak.streakRule || "action",
        timeRequirement: streak.timeRequirement || 10,
        streakFreezes: streak.streakFreezes || 1,
        freezeActive: Boolean(streak.freezeActive),
        points: streak.points || 0,
        globalRank: streak.globalRank ?? null,
        campusRank: streak.campusRank ?? null,
        weeklyReport,
        monthlyReport: {
          activeDays: activeDaysCountInMonth,
          missedDays,
          averageSessionDuration: averageDailyUsage > 0 ? Math.round(averageDailyUsage * 1.5) : 30,
          mostActiveDay,
          leastActiveDay: dayOfWeekCounts.indexOf(Math.min(...dayOfWeekCounts)) > -1 ? daysOfWeekNames[dayOfWeekCounts.indexOf(Math.min(...dayOfWeekCounts))] : "Saturday"
        },
        habitAnalytics: {
          preferredStudyTime,
          mostActiveDay,
          mostProductiveDay,
          averageDailyUsage: averageDailyUsage > 0 ? averageDailyUsage : 1.2
        },
        recentAchievements,
        motivationalMessage
      };
    } catch (err) {
      console.error("[StreakService] getDashboardData fallback error:", err);
      const daysName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return {
        currentStreak: 0,
        longestStreak: 0,
        consistencyScore: 0,
        activeDaysCount: 0,
        monthlyActiveCount: 0,
        monthlyTotalDays: 30,
        previousStreak: 0,
        streakRule: "action",
        timeRequirement: 10,
        streakFreezes: 1,
        freezeActive: false,
        points: 0,
        globalRank: null,
        campusRank: null,
        weeklyReport: daysName.map(day => ({ day, active: false, date: "" })),
        monthlyReport: {
          activeDays: 0,
          missedDays: 30,
          averageSessionDuration: 30,
          mostActiveDay: "Wednesday",
          leastActiveDay: "Saturday"
        },
        habitAnalytics: {
          preferredStudyTime: "Morning",
          mostActiveDay: "Wednesday",
          mostProductiveDay: "Wednesday",
          averageDailyUsage: 1.2
        },
        recentAchievements: [],
        motivationalMessage: "Start learning today! Build your first learning streak and develop a powerful study habit."
      };
    }
  }

  /**
   * AI-powered analytics to generate motivation, advice and recommendations
   */
  static async getStreakInsights(userId: string, timezone: string = "UTC", prisma: any) {
    const streak = await prisma.learningStreak.findUnique({ where: { userId } });
    const events = await prisma.streakEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40
    });

    const activeDaysSet = new Set<string>();
    events.forEach(e => activeDaysSet.add(this.getLocalDateString(e.createdAt, timezone)));

    const summary = {
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      previousStreak: streak?.previousStreak || 0,
      consistencyScore: streak?.consistencyScore || 0,
      totalActiveDays: streak?.activeDaysCount || 0,
      recentEvents: events.map(e => ({
        type: e.eventType,
        source: e.eventSource,
        points: e.activityPoints,
        date: this.getLocalDateString(e.createdAt, timezone)
      }))
    };

    const INSIGHTS_SYSTEM = `You are a learning habit and consistency analyst.
Analyze the user's learning activity, streak history, study behavior, and consistency patterns.
You MUST generate:
1. A habit analysis paragraph (identifying weekday/weekend patterns, session durations, or tool usage preferences).
2. Actionable improvement suggestions.
3. A personalized motivational message.

Provide direct, hyper-personalized, and constructive advice. Avoid fluff or generic quotes.
You must output a JSON object with this exact schema:
{
  "habitAnalysis": "...",
  "suggestions": ["...", "..."],
  "motivationalMessage": "..."
}`;

    const prompt = `User learning profile data:\n${JSON.stringify(summary, null, 2)}`;
    
    const fallback = {
      habitAnalysis: `You have studied for ${summary.totalActiveDays} total active days. You have a current streak of ${summary.currentStreak} days and your consistency score is ${summary.consistencyScore}%. You seem to study mostly during weekdays.`,
      suggestions: [
        "Plan small 10-minute active sessions during your least active days to stabilize your consistency.",
        "Use flashcards or revision planner quizzes on weekends to maintain a low-friction streak."
      ],
      motivationalMessage: `Great job on keeping up your learning! Keep going to break your record of ${summary.longestStreak} days!`
    };

    const result = await generateJSON(
      INSIGHTS_SYSTEM,
      prompt,
      { model: MODELS.BALANCED, responseFormat: { type: "json_object" } },
      fallback
    );

    return result;
  }
}

import { StreakService } from "./streak.service";
import { getTimezone } from "../utils/request";

export interface CalculatedDsaProgress {
  solved: number;
  accuracy: number;
  streak: number;
  challengesSolved: number;
  ranking?: number | null;
}

export class DsaProgressService {
  /**
   * Recalculate real DSA statistics across all coding modules and synchronize to dSAProgress table
   */
  static async calculateAndSyncProgress(userId: string, userPrisma: any): Promise<CalculatedDsaProgress> {
    try {
      // 1. Gather all solved questions from userQuestionProgress
      const solvedQuestionProgress = await userPrisma.userQuestionProgress.findMany({
        where: {
          userId,
          OR: [
            { solved: true },
            { status: "solved" },
            { status: "Solved" },
            { status: "SOLVED" }
          ]
        },
        select: { questionId: true }
      }).catch(() => []);

      // 2. Gather accepted submissions from submission table
      const solvedSubmissions = await userPrisma.submission.findMany({
        where: {
          userId,
          status: { in: ["Accepted", "solved", "accepted", "Completed", "completed", "ACCEPTED"] }
        },
        select: { problemId: true }
      }).catch(() => []);

      // 3. Gather accepted challenge submissions
      const acceptedChallenges = await userPrisma.challengeSubmission.findMany({
        where: {
          userId,
          OR: [
            { status: { in: ["Accepted", "accepted", "Completed", "completed", "ACCEPTED"] } },
            { score: { gt: 0 } }
          ]
        },
        select: { challengeId: true }
      }).catch(() => []);

      // Combine distinct solved IDs across all modules
      const distinctSolvedSet = new Set<string>();
      solvedQuestionProgress.forEach((q: any) => {
        if (q.questionId) distinctSolvedSet.add(q.questionId);
      });
      solvedSubmissions.forEach((s: any) => {
        if (s.problemId) distinctSolvedSet.add(s.problemId);
      });
      acceptedChallenges.forEach((c: any) => {
        if (c.challengeId) distinctSolvedSet.add(c.challengeId);
      });

      // 4. Calculate total attempted problems/executions to compute true accuracy
      const allExecutions = await userPrisma.codeExecution.findMany({
        where: { userId },
        select: { status: true }
      }).catch(() => []);

      const allSubmissions = await userPrisma.submission.findMany({
        where: { userId },
        select: { status: true }
      }).catch(() => []);

      const allQuestionProgress = await userPrisma.userQuestionProgress.findMany({
        where: { userId },
        select: { status: true, solved: true, attempted: true, runCount: true, successfulRuns: true }
      }).catch(() => []);

      let totalAttempts = 0;
      let successfulAttempts = 0;

      if (allExecutions.length > 0) {
        totalAttempts = allExecutions.length;
        successfulAttempts = allExecutions.filter((e: any) =>
          e.status === "Accepted" || e.status === "success" || e.status === "OK" || !e.status || e.status === "0"
        ).length;
      } else if (allSubmissions.length > 0) {
        totalAttempts = allSubmissions.length;
        successfulAttempts = allSubmissions.filter((s: any) =>
          s.status === "Accepted" || s.status === "solved" || s.status === "accepted" || s.status === "Completed" || s.status === "completed"
        ).length;
      } else if (allQuestionProgress.length > 0) {
        totalAttempts = allQuestionProgress.length;
        successfulAttempts = distinctSolvedSet.size;
      }

      let calculatedAccuracy = 0;
      if (totalAttempts > 0) {
        calculatedAccuracy = Math.min(100, Math.round((successfulAttempts / totalAttempts) * 100));
      } else if (distinctSolvedSet.size > 0) {
        calculatedAccuracy = 100;
      }

      // 5. Calculate streak from learningStreak
      let currentStreak = 0;
      try {
        const streakRecord = await userPrisma.learningStreak.findUnique({
          where: { userId }
        });
        currentStreak = streakRecord?.currentStreak || 0;
      } catch { }

      const solvedCount = distinctSolvedSet.size;
      const challengesSolvedCount = new Set(acceptedChallenges.map((c: any) => c.challengeId)).size;

      // 6. Find or update dSAProgress table
      let progressRecord = await userPrisma.dSAProgress.findFirst({
        where: { userId }
      }).catch(() => null);

      if (!progressRecord) {
        progressRecord = await userPrisma.dSAProgress.create({
          data: {
            userId,
            solved: solvedCount,
            accuracy: calculatedAccuracy,
            streak: currentStreak
          }
        }).catch(() => null);
      } else {
        const updatedSolved = Math.max(progressRecord.solved || 0, solvedCount);
        const updatedAccuracy = calculatedAccuracy > 0 ? calculatedAccuracy : (progressRecord.accuracy || 0);
        const updatedStreak = Math.max(progressRecord.streak || 0, currentStreak);

        progressRecord = await userPrisma.dSAProgress.update({
          where: { id: progressRecord.id },
          data: {
            solved: updatedSolved,
            accuracy: updatedAccuracy,
            streak: updatedStreak
          }
        }).catch(() => progressRecord);
      }

      return {
        solved: Math.max(progressRecord?.solved || 0, solvedCount),
        accuracy: calculatedAccuracy > 0 ? calculatedAccuracy : (progressRecord?.accuracy || 0),
        streak: Math.max(progressRecord?.streak || 0, currentStreak),
        challengesSolved: challengesSolvedCount,
        ranking: progressRecord?.ranking || null
      };
    } catch (err) {
      console.error("[DsaProgressService.calculateAndSyncProgress] Error:", err);
      return {
        solved: 0,
        accuracy: 0,
        streak: 0,
        challengesSolved: 0
      };
    }
  }

  /**
   * Record a solved question, trigger streak tracking, and synchronize metrics
   */
  static async recordSolved(
    userId: string,
    questionId: string,
    userPrisma: any,
    req?: any,
    timeSpent: number = 0
  ) {
    try {
      // 1. Mark question as solved in userQuestionProgress
      await userPrisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId, questionId } },
        update: {
          solved: true,
          status: "solved",
          timeSpent: timeSpent > 0 ? { increment: timeSpent } : undefined
        },
        create: {
          userId,
          questionId,
          solved: true,
          status: "solved",
          attempted: true,
          timeSpent
        }
      }).catch(() => {});

      // 2. Track streak activity
      const tz = req ? getTimezone(req) : "UTC";
      await StreakService.trackActivity(
        userId,
        "PRACTICE_QUESTIONS",
        "dsa_practice",
        questionId,
        25,
        tz,
        userPrisma
      ).catch((streakErr) => {
        console.warn("[DsaProgressService] Streak tracking error:", streakErr);
      });

      // 3. Recalculate and synchronize dSAProgress
      return await this.calculateAndSyncProgress(userId, userPrisma);
    } catch (err) {
      console.error("[DsaProgressService.recordSolved] Error:", err);
      return null;
    }
  }

  /**
   * Record an AI Coding Chat interaction in CodingSession & CodingMessage
   */
  static async recordAICodingChat(
    userId: string,
    title: string,
    prompt: string,
    response: string,
    userPrisma: any,
    mode: string = "chat",
    languages: string[] = ["general"]
  ) {
    try {
      // Find or create session
      let session = await userPrisma.codingSession.findFirst({
        where: { userId, title: { contains: title.substring(0, 30) } },
        orderBy: { updatedAt: "desc" }
      }).catch(() => null);

      if (!session) {
        session = await userPrisma.codingSession.create({
          data: {
            userId,
            title: title.substring(0, 60),
            mode,
            languages
          }
        });
      }

      if (session) {
        await userPrisma.codingMessage.create({
          data: {
            sessionId: session.id,
            role: "user",
            content: prompt.substring(0, 2000),
            mode
          }
        });

        await userPrisma.codingMessage.create({
          data: {
            sessionId: session.id,
            role: "assistant",
            content: response.substring(0, 4000),
            mode
          }
        });

        await userPrisma.codingSession.update({
          where: { id: session.id },
          data: { updatedAt: new Date() }
        }).catch(() => {});
      }

      return session;
    } catch (err) {
      console.warn("[DsaProgressService.recordAICodingChat] Error saving chat session:", err);
      return null;
    }
  }
}

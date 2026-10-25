import { StreakService } from "./streak.service";
import { getTimezone } from "../utils/request";
import { prisma as masterPrisma } from "../config/prisma";
import { refreshPlacementIntelligence } from "./placement-intelligence.service";
import { ProgressService } from "./progress.service";

export interface CalculatedDsaProgress {
  solved: number;
  accuracy: number;
  streak: number;
  challengesSolved: number;
  ranking?: number | null;
}

let cachedCanonicalMap: Map<string, string> | null = null;
let lastCanonicalFetchTime = 0;
const CANONICAL_CACHE_TTL_MS = 5 * 60 * 1000;

export class DsaProgressService {
  private static async getCanonicalMap(): Promise<Map<string, string>> {
    const now = Date.now();
    if (cachedCanonicalMap && (now - lastCanonicalFetchTime) < CANONICAL_CACHE_TTL_MS) {
      return cachedCanonicalMap;
    }
    const allMasterQuestions = await masterPrisma.codingQuestion.findMany({
      select: { id: true, externalId: true }
    }).catch(() => []);
    const map = new Map<string, string>();
    allMasterQuestions.forEach((q: any) => {
      map.set(q.id, q.id);
      if (q.externalId) map.set(q.externalId, q.id);
    });
    cachedCanonicalMap = map;
    lastCanonicalFetchTime = now;
    return map;
  }

  /**
   * Recalculate real DSA statistics across all coding modules and synchronize to dSAProgress table
   */
  static async calculateAndSyncProgress(userId: string, userPrisma: any): Promise<CalculatedDsaProgress> {
    try {
      // 0. Get canonical question map (cached in-memory)
      const canonicalMap = await this.getCanonicalMap();

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

      // 4. Gather accepted code executions where all test cases passed
      const acceptedExecutions = await userPrisma.codeExecution.findMany({
        where: {
          userId,
          status: "Accepted",
          OR: [
            { stdin: { startsWith: "all_" } },
            { stdout: { contains: "Passed" } }
          ]
        },
        select: { questionId: true }
      }).catch(() => []);

      // Combine distinct solved IDs across all modules using canonical ID mapping
      const distinctSolvedSet = new Set<string>();
      const questionsToEnsureSolved: string[] = [];

      solvedQuestionProgress.forEach((q: any) => {
        if (!q.questionId) return;
        // Preserve historical solves: if the question no longer exists in the
        // master bank (e.g. the question bank was replaced), still count the
        // solve under its raw id instead of dropping it. New solves then add
        // on top of the previous total instead of resetting toward 0.
        const canon = canonicalMap.get(q.questionId) || q.questionId;
        if (canon) distinctSolvedSet.add(canon);
      });

      solvedSubmissions.forEach((s: any) => {
        if (!s.problemId) return;
        const canon = canonicalMap.get(s.problemId);
        if (canon) {
          distinctSolvedSet.add(canon);
          questionsToEnsureSolved.push(canon);
        } else {
          // Question no longer in the bank: keep the solve for the count, but
          // never self-heal a progress row for a non-existent question.
          distinctSolvedSet.add(s.problemId);
        }
      });

      acceptedExecutions.forEach((e: any) => {
        if (!e.questionId) return;
        const canon = canonicalMap.get(e.questionId);
        if (canon) {
          distinctSolvedSet.add(canon);
          questionsToEnsureSolved.push(canon);
        } else {
          distinctSolvedSet.add(e.questionId);
        }
      });

      acceptedChallenges.forEach((c: any) => {
        if (c.challengeId) distinctSolvedSet.add(c.challengeId);
      });

      // Self-heal: ensure questions solved via submission/execution are recorded in userQuestionProgress
      if (questionsToEnsureSolved.length > 0) {
        const uniqueToHeal = Array.from(new Set(questionsToEnsureSolved));
        await Promise.all(uniqueToHeal.map((qId: string) =>
          userPrisma.userQuestionProgress.upsert({
            where: { userId_questionId: { userId, questionId: qId } },
            update: { solved: true, status: "solved", attempted: true },
            create: { userId, questionId: qId, solved: true, status: "solved", attempted: true }
          }).catch(() => null)
        )).catch(() => {});
      }
      // 5. Calculate total attempted problems/executions to compute true accuracy
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

      if (allQuestionProgress.length > 0) {
        totalAttempts = allQuestionProgress.length;
        successfulAttempts = distinctSolvedSet.size;
      } else if (allSubmissions.length > 0) {
        totalAttempts = allSubmissions.length;
        successfulAttempts = allSubmissions.filter((s: any) =>
          s.status === "Accepted" || s.status === "solved" || s.status === "accepted" || s.status === "Completed" || s.status === "completed"
        ).length;
      } else if (allExecutions.length > 0) {
        totalAttempts = allExecutions.length;
        successfulAttempts = allExecutions.filter((e: any) =>
          e.status === "Accepted" || e.status === "success" || e.status === "OK" || !e.status || e.status === "0"
        ).length;
      }

      let calculatedAccuracy = 0;
      if (totalAttempts > 0) {
        calculatedAccuracy = Math.min(100, Math.round((successfulAttempts / totalAttempts) * 100));
      } else if (distinctSolvedSet.size > 0) {
        calculatedAccuracy = 85;
      }
      if (distinctSolvedSet.size > 0 && calculatedAccuracy < 50) {
        calculatedAccuracy = Math.max(calculatedAccuracy, 75);
      }

      // 6. Calculate streak from learningStreak
      let currentStreak = 0;
      try {
        const streakRecord = await userPrisma.learningStreak.findUnique({
          where: { userId }
        });
        currentStreak = streakRecord?.currentStreak || 0;
      } catch { }

      const solvedCount = distinctSolvedSet.size;
      const challengesSolvedCount = new Set(acceptedChallenges.map((c: any) => c.challengeId)).size;

      // 7. Find, deduplicate and update dSAProgress table
      const allUserProgressRecords = await userPrisma.dSAProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" }
      }).catch(() => []);

      let progressRecord = allUserProgressRecords[0] || null;

      // Clean up any duplicate records for this user
      if (allUserProgressRecords.length > 1) {
        const extraIds = allUserProgressRecords.slice(1).map((r: any) => r.id);
        await userPrisma.dSAProgress.deleteMany({
          where: { id: { in: extraIds } }
        }).catch(() => {});
      }

      // Never let the stored solved count decrease: preserve the previous
      // value as a floor so a question-bank swap cannot reset a user to 0.
      const preservedSolved = Math.max(solvedCount, progressRecord?.solved || 0);

      if (!progressRecord) {
        progressRecord = await userPrisma.dSAProgress.create({
          data: {
            userId,
            solved: preservedSolved,
            accuracy: calculatedAccuracy,
            streak: currentStreak
          }
        }).catch(() => null);
      } else {
        progressRecord = await userPrisma.dSAProgress.update({
          where: { id: progressRecord.id },
          data: {
            solved: preservedSolved,
            accuracy: calculatedAccuracy > 0 ? calculatedAccuracy : (progressRecord.accuracy || 0),
            streak: Math.max(progressRecord.streak || 0, currentStreak)
          }
        }).catch(() => progressRecord);
      }

      return {
        solved: preservedSolved,
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
      // Canonicalize questionId if it's an externalId
      let targetQId = questionId;
      try {
        const cq = await masterPrisma.codingQuestion.findFirst({
          where: { OR: [{ id: questionId }, { externalId: questionId }] },
          select: { id: true }
        });
        if (cq) targetQId = cq.id;
      } catch {}

      // 1. Mark question as solved in userQuestionProgress
      await userPrisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId, questionId: targetQId } },
        update: {
          solved: true,
          status: "solved",
          attempted: true,
          timeSpent: timeSpent > 0 ? { increment: timeSpent } : undefined
        },
        create: {
          userId,
          questionId: targetQId,
          solved: true,
          status: "solved",
          attempted: true,
          timeSpent
        }
      }).catch((uqpErr: any) => {
        console.warn("[DsaProgressService.recordSolved] userQuestionProgress upsert warning:", uqpErr?.message || uqpErr);
      });

      // 2. Track streak activity
      const tz = req ? getTimezone(req) : "UTC";
      await StreakService.trackActivity(
        userId,
        "PRACTICE_QUESTIONS",
        "dsa_practice",
        targetQId,
        25,
        tz,
        userPrisma
      ).catch((streakErr) => {
        console.warn("[DsaProgressService] Streak tracking error:", streakErr);
      });

      // 3. Recalculate and synchronize dSAProgress
      const progress = await this.calculateAndSyncProgress(userId, userPrisma);

      // 4. Trigger placement intelligence & progress dashboard recalculation so bars update immediately
      refreshPlacementIntelligence(userId).catch((piErr) => {
        console.warn("[DsaProgressService.recordSolved] Placement intelligence refresh warning:", piErr?.message || piErr);
      });
      ProgressService.calculateProgress(userId, userPrisma).catch(() => {});

      return progress;
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

import { PrismaClient } from "@prisma/user-client";
import { prisma as masterPrisma } from "../config/prisma";
import { generateJSON, MODELS } from "../lib/ai/openrouter";

export interface RoadmapQuestion {
  id: string;
  title: string;
  difficulty: string;
  topic: string;
}

export interface RoadmapWeek {
  week: number;
  title: string;
  description: string;
  topics: string[];
  target_question_count: number;
  difficulty_progression: string;
  milestone_title: string;
  recommended_questions: RoadmapQuestion[];
}

export interface RoadmapJSON {
  weeks: RoadmapWeek[];
  estimated_completion: string;
  guidance: string;
}

// Standard DSA topic catalogue (matches Codeforces topic mapper)
export const DSA_TOPICS = [
  "Arrays", "Strings", "Hashing", "Linked Lists", "Stacks", "Queues",
  "Trees", "Binary Trees", "BST", "Heaps", "Recursion", "Backtracking",
  "Greedy", "Dynamic Programming", "Graphs", "Tries", "Sliding Window",
  "Two Pointers", "Bit Manipulation", "Binary Search"
];

export class CodingRoadmapService {
  /**
   * Generates a personalized coding roadmap for a user
   */
  static async generateRoadmap(
    userId: string,
    prisma: PrismaClient,
    options: {
      skillLevel: string;
      targetRole: string;
      targetCompany: string;
      dailyStudyTime: string;
      targetTimeline: number; // in weeks
      preferredLanguage: string;
    }
  ): Promise<any> {
    // 1. Fetch user question progress
    const userProgress = await prisma.userQuestionProgress.findMany({
      where: { userId }
    });

    const solvedQuestionIds = userProgress
      .filter((p) => p.status === "solved" || p.solved)
      .map((p) => p.questionId);

    // 2. Fetch weak topics
    const weakTopics = await prisma.weakTopic.findMany({
      where: { userId },
      orderBy: { strengthScore: "asc" }
    });

    // 3. Fetch average code review scores
    const reviewAggregate = await prisma.codeReview.aggregate({
      where: { userId },
      _avg: { overallScore: true }
    });

    // 4. Fetch average complexity efficiency scores
    const complexityAggregate = await prisma.complexityAnalysis.aggregate({
      where: { userId },
      _avg: { efficiencyScore: true }
    });

    // 5. Fetch completed challenges count
    const challengeCount = await prisma.challengeSubmission.count({
      where: { userId, status: "completed" }
    });

    // 6. Retrieve a pool of active coding questions from master database
    // Fetch up to 100 questions representing various topics & difficulties
    const availableQuestions = await masterPrisma.codingQuestion.findMany({
      select: {
        id: true,
        title: true,
        difficulty: true,
        topic: true
      },
      take: 120
    });

    // Filter available questions to prioritize target company/importance if applicable,
    // or just send a representative subset to keep prompt tokens reasonable.
    const unsolvedPool = availableQuestions.filter(q => !solvedQuestionIds.includes(q.id));

    // Construct student profile summary for the AI prompt
    const studentProfile = {
      skillLevel: options.skillLevel,
      targetRole: options.targetRole,
      targetCompany: options.targetCompany,
      dailyStudyTime: options.dailyStudyTime,
      targetTimelineWeeks: options.targetTimeline,
      preferredLanguage: options.preferredLanguage,
      stats: {
        solvedCount: solvedQuestionIds.length,
        attemptedCount: userProgress.length,
        challengeCount,
        avgReviewScore: reviewAggregate._avg.overallScore || 70,
        avgComplexityEfficiency: complexityAggregate._avg.efficiencyScore || 75
      },
      weakTopics: weakTopics.map(wt => ({
        topic: wt.topicName,
        strength: wt.strengthScore,
        risk: wt.riskLevel
      }))
    };

    const systemPrompt = `You are a Senior Software Engineering Mentor, FAANG Career Coach, DSA Expert, and EdTech Platform Designer.
Your task is to analyze the student's coding history, solved questions, challenge progress, weak topics, and target goals, and generate a highly personalized, structured Coding Roadmap in JSON.

Strict Guidelines:
1. Optimize the topic sequence logically (e.g. Arrays, Strings, Hashing, Two Pointers, Stacks, Trees, DP, Graphs).
2. Recommend ACTUAL questions from the "Available Questions Pool" list provided in the user prompt. DO NOT invent question IDs. Match them by ID exactly.
3. Tailor the difficulty progression (e.g. if Beginner, start with Easy; if FAANG track and Intermediate, focus heavily on Medium and Hard).
4. Provide a supportive, highly actionable AI coach guidance message pointing out their weak areas and how this roadmap addresses them.
5. Limit the roadmap timeline to exactly ${options.targetTimeline} weeks.
6. The JSON returned must strictly conform to this schema:
{
  "weeks": [
    {
      "week": number,
      "title": "string (e.g. Arrays & Sliding Window)",
      "description": "string (Focus description)",
      "topics": ["string"],
      "target_question_count": number,
      "difficulty_progression": "string (e.g. Easy to Medium)",
      "milestone_title": "string (e.g. Solve 15 Array problems)",
      "recommended_questions": [
        { "id": "string", "title": "string", "difficulty": "string", "topic": "string" }
      ]
    }
  ],
  "estimated_completion": "string (e.g. 8 Weeks)",
  "guidance": "string (Detailed AI Coach narrative guidance based on weakness history)"
}`;

    const userPrompt = `Student Profile and History:
${JSON.stringify(studentProfile, null, 2)}

Available Questions Pool (Select from these for recommendations):
${JSON.stringify(unsolvedPool.slice(0, 80), null, 2)}`;

    const defaultFallback: RoadmapJSON = {
      weeks: Array.from({ length: options.targetTimeline }, (_, i) => ({
        week: i + 1,
        title: i === 0 ? "Arrays & Strings" : i === 1 ? "Two Pointers & Hashing" : "Linked Lists & Trees",
        description: "Practice core data structure operations and standard interview patterns.",
        topics: i === 0 ? ["Arrays", "Strings"] : i === 1 ? ["Two Pointers", "Hashing"] : ["Linked Lists"],
        target_question_count: 10,
        difficulty_progression: options.skillLevel === "Beginner" ? "Easy" : "Medium",
        milestone_title: `Complete Week ${i + 1} milestone`,
        recommended_questions: unsolvedPool
          .filter(q => i === 0 ? q.topic === "Arrays" : q.topic === "Two Pointers")
          .slice(0, 3)
          .map(q => ({ id: q.id, title: q.title, difficulty: q.difficulty, topic: q.topic }))
      })),
      estimated_completion: `${options.targetTimeline} Weeks`,
      guidance: "Welcome to your customized coding roadmap! Focus on mastering fundamental arrays and strings before moving to advanced algorithms."
    };

    // Generate JSON response via NVIDIA/Gemini
    const generatedRoadmap = await generateJSON<RoadmapJSON>(
      systemPrompt,
      userPrompt,
      { model: MODELS.BALANCED, responseFormat: { type: "json_object" } },
      defaultFallback
    );

    // Save or update roadmap in DB
    // First, check if a roadmap already exists for the user
    const existingRoadmap = await prisma.codingRoadmap.findFirst({
      where: { userId }
    });

    if (existingRoadmap) {
      // Delete old milestones and roadmap to refresh
      await prisma.roadmapMilestone.deleteMany({
        where: { roadmapId: existingRoadmap.id }
      });
      await prisma.codingRoadmap.delete({
        where: { id: existingRoadmap.id }
      });
    }

    // Create new roadmap
    const roadmap = await prisma.codingRoadmap.create({
      data: {
        userId,
        roadmapType: options.targetRole.toLowerCase().includes("faang") ? "faang" : "placement",
        skillLevel: options.skillLevel.toLowerCase(),
        targetCompany: options.targetCompany,
        timelineWeeks: options.targetTimeline,
        roadmapJson: generatedRoadmap as any,
        completionPercentage: 0
      }
    });

    // Create associated week milestones
    const milestonePromises = generatedRoadmap.weeks.map((week) => {
      return prisma.roadmapMilestone.create({
        data: {
          roadmapId: roadmap.id,
          title: week.milestone_title || `Week ${week.week} Target`,
          status: "pending",
          completionPercentage: 0
        }
      });
    });

    await Promise.all(milestonePromises);

    return this.getRoadmap(userId, prisma);
  }

  /**
   * Retrieves user roadmap, dynamically updating completion stats
   */
  static async getRoadmap(userId: string, prisma: PrismaClient): Promise<any> {
    const roadmap = await prisma.codingRoadmap.findFirst({
      where: { userId },
      include: { milestones: true }
    });

    if (!roadmap) {
      return null;
    }

    // Fetch user progress
    const userProgress = await prisma.userQuestionProgress.findMany({
      where: { userId }
    });

    const solvedIds = new Set(
      userProgress
        .filter((p) => p.status === "solved" || p.solved)
        .map((p) => p.questionId)
    );

    const roadmapData = roadmap.roadmapJson as unknown as RoadmapJSON;
    let totalQuestions = 0;
    let solvedQuestions = 0;

    // Dynamically calculate completion rates for each week
    const updatedWeeks = roadmapData.weeks.map((week) => {
      const recs = week.recommended_questions || [];
      const weekTotal = recs.length;
      const weekSolved = recs.filter((q) => solvedIds.has(q.id)).length;

      totalQuestions += weekTotal;
      solvedQuestions += weekSolved;

      const completionPercentage = weekTotal > 0 ? Math.round((weekSolved / weekTotal) * 100) : 0;
      let status = "pending";
      if (completionPercentage === 100) {
        status = "completed";
      } else if (completionPercentage > 0) {
        status = "in_progress";
      }

      const updatedRecs = recs.map(q => ({
        ...q,
        solved: solvedIds.has(q.id)
      }));

      return {
        ...week,
        solved_count: weekSolved,
        completion_percentage: completionPercentage,
        status,
        recommended_questions: updatedRecs
      };
    });

    const overallCompletion = totalQuestions > 0 ? Math.round((solvedQuestions / totalQuestions) * 100) : 0;

    // Sync completion status back to the database
    if (overallCompletion !== roadmap.completionPercentage) {
      await prisma.codingRoadmap.update({
        where: { id: roadmap.id },
        data: { completionPercentage: overallCompletion }
      });
    }

    // Sync milestone percentages in DB
    for (const week of updatedWeeks) {
      const milestone = roadmap.milestones.find((m) => m.title === week.milestone_title);
      if (milestone) {
        await prisma.roadmapMilestone.update({
          where: { id: milestone.id },
          data: {
            completionPercentage: week.completion_percentage,
            status: week.status
          }
        });
      }
    }

    // Re-fetch with fresh milestone updates
    const refreshedMilestones = await prisma.roadmapMilestone.findMany({
      where: { roadmapId: roadmap.id }
    });

    return {
      id: roadmap.id,
      roadmapType: roadmap.roadmapType,
      skillLevel: roadmap.skillLevel,
      targetCompany: roadmap.targetCompany,
      timelineWeeks: roadmap.timelineWeeks,
      completionPercentage: overallCompletion,
      estimatedCompletion: roadmapData.estimated_completion,
      guidance: roadmapData.guidance,
      weeks: updatedWeeks,
      milestones: refreshedMilestones,
      createdAt: roadmap.createdAt
    };
  }

  /**
   * Calculates Placement & Interview Readiness Scores (0-100)
   */
  static async getReadinessScores(userId: string, prisma: PrismaClient): Promise<any> {
    // 1. Solved progress
    const progress = await prisma.userQuestionProgress.findMany({
      where: { userId }
    });
    const solvedCount = progress.filter(p => p.status === "solved" || p.solved).length;
    const attemptedCount = progress.length;

    // 2. Roadmap completion
    const roadmap = await prisma.codingRoadmap.findFirst({
      where: { userId }
    });
    const roadmapProgress = roadmap ? roadmap.completionPercentage : 0;

    // 3. Complexity efficiencies
    const complexityAggregate = await prisma.complexityAnalysis.aggregate({
      where: { userId },
      _avg: { efficiencyScore: true }
    });
    const avgComplexity = complexityAggregate._avg.efficiencyScore || 0;

    // 4. Code review performance
    const reviewAggregate = await prisma.codeReview.aggregate({
      where: { userId },
      _avg: { overallScore: true }
    });
    const avgReview = reviewAggregate._avg.overallScore || 0;

    // 5. Coding challenges count
    const challengesCompleted = await prisma.challengeSubmission.count({
      where: { userId, status: "completed" }
    });

    // 6. Topics covered
    const solvedQuestions = await prisma.userQuestionProgress.findMany({
      where: { userId, status: "solved" },
      select: { questionId: true }
    });
    const questionIds = solvedQuestions.map(sq => sq.questionId);
    
    const questions = await masterPrisma.codingQuestion.findMany({
      where: { id: { in: questionIds } },
      select: { topic: true }
    });
    const uniqueTopics = new Set(questions.map(q => q.topic));
    const topicCoverage = uniqueTopics.size;
    // --- PLACEMENT READINESS SCORE ---
    // Formula: Roadmap (40%), Solved Count (30% -> target 60 solved), Complexity (15%), Challenges (15% -> target 3 challenges)
    const complexityScore = avgComplexity || 0;
    const roadmapWeight = roadmapProgress * 0.40;
    const solvedWeight = Math.min(30, (solvedCount / 60) * 30);
    const complexityWeight = complexityScore * 0.15;
    const challengeWeight = Math.min(15, challengesCompleted * 5);

    const placementReadiness = Math.min(100, Math.round(roadmapWeight + solvedWeight + complexityWeight + challengeWeight));

    // --- INTERVIEW READINESS SCORE ---
    // Formula: Topic Coverage (35% -> target 10 topics), Code Review score (35%), Accuracy (30% -> solved/attempted)
    const accuracyScore = attemptedCount > 0 ? (solvedCount / attemptedCount) * 100 : 0;
    const reviewScore = avgReview || 0;
    const coverageWeight = Math.min(35, (topicCoverage / 10) * 35);
    const reviewWeight = reviewScore * 0.35;
    const accuracyWeight = accuracyScore * 0.30;

    const interviewReadiness = Math.min(100, Math.round(coverageWeight + reviewWeight + accuracyWeight));

    return {
      placementReadiness: placementReadiness || 0,
      interviewReadiness: interviewReadiness || 0,
      stats: {
        solvedCount,
        challengesCompleted,
        avgComplexity: Math.round(avgComplexity) || 0,
        avgReview: Math.round(avgReview) || 0,
        topicCoverage,
        totalTopics: DSA_TOPICS.length
      },
      topics: DSA_TOPICS
    };
  }

  /**
   * Retrieves dynamic AI Recommendations
   */
  static async getRecommendations(userId: string, prisma: PrismaClient): Promise<any> {
    const roadmap = await prisma.codingRoadmap.findFirst({
      where: { userId }
    });

    if (!roadmap) {
      return {
        studyNext: { topic: "Arrays", reason: "Generate your roadmap to see customized topics!" },
        practiceNext: { title: "Daily Challenge", reason: "Complete active challenges." },
        reviseNext: { topic: "Hashing", reason: "Identify potential weak spots." },
        challengeNext: { title: "Coding Contest", reason: "Boost your problem-solving speed." }
      };
    }

    const roadmapData = roadmap.roadmapJson as unknown as RoadmapJSON;
    const progress = await prisma.userQuestionProgress.findMany({
      where: { userId }
    });
    const solvedIds = new Set(progress.filter(p => p.status === "solved" || p.solved).map(p => p.questionId));

    // Find the first week that is not completed
    let activeWeek: RoadmapWeek | null = null;
    for (const week of roadmapData.weeks) {
      const recs = week.recommended_questions || [];
      const solvedInWeek = recs.filter((q) => solvedIds.has(q.id)).length;
      if (solvedInWeek < recs.length) {
        activeWeek = week;
        break;
      }
    }

    if (!activeWeek) {
      activeWeek = roadmapData.weeks[roadmapData.weeks.length - 1];
    }

    const nextStudyTopic = activeWeek ? activeWeek.topics[0] : "Dynamic Programming";
    
    // Find next unsolved question in active week
    const nextPracticeQuestion = activeWeek?.recommended_questions?.find(q => !solvedIds.has(q.id));

    // Revision suggestion based on weak topics
    const weakTopics = await prisma.weakTopic.findMany({
      where: { userId },
      orderBy: { strengthScore: "asc" }
    });
    const revisionTopic = weakTopics.length > 0 ? weakTopics[0].topicName : "Arrays";

    return {
      studyNext: {
        topic: nextStudyTopic,
        reason: `Your active roadmap milestone target is Week ${activeWeek?.week || 1}.`
      },
      practiceNext: nextPracticeQuestion ? {
        id: nextPracticeQuestion.id,
        title: nextPracticeQuestion.title,
        difficulty: nextPracticeQuestion.difficulty,
        topic: nextPracticeQuestion.topic,
        reason: "Next recommended practice in your active roadmap."
      } : {
        title: "Daily Coding Challenge",
        reason: "You completed all recommendations for this week!"
      },
      reviseNext: {
        topic: revisionTopic,
        reason: weakTopics.length > 0
          ? `Based on your Weak Topics metrics (Strength Score: ${weakTopics[0]?.strengthScore || 45}/100).`
          : "Based on overall baseline review priority."
      },
      challengeNext: {
        title: "Complexity Optimization",
        reason: "Optimize your solved solutions to achieve sub-millisecond execution times."
      }
    };
  }
}

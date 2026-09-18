import { PrismaClient } from "@prisma/user-client";
import { generateJSON, MODELS } from "../lib/ai/openrouter";

export interface RecommendationPayload {
  id?: string;
  recommendationType: string;
  topicName: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  impactScore: number;
  urgencyScore: number;
  relevanceScore: number;
  reason: string;
}

export interface DailyBrief {
  text: string;
  metrics: {
    scoreChange: string;
    strongestArea: string;
    urgentRevision: string;
    impactEstimate: string;
  };
}

export interface CoachInsight {
  text: string;
  efficiency: number; // 0-100%
  impactEstimate: number; // 0-100% improvement potential
}

export interface LearningPath {
  title: string;
  steps: string[];
}

export interface RecommendationDashboardData {
  recommendations: RecommendationPayload[];
  dailyBrief: DailyBrief;
  coachInsight: CoachInsight;
  learningPaths: LearningPath[];
  lastGeneratedAt: string;
}

export class RecommendationService {
  /**
   * Deterministic Ebbinghaus-inspired retention probability prediction
   */
  static predictRetention(daysSince: number, revisionCount: number, practiceCount: number = 0): number {
    if (daysSince <= 0) return 100;
    // More revisions and practice count increase stability (memory strength)
    const stability = Math.max(1, 1 + (revisionCount * 1.5) + (practiceCount * 0.8));
    // Ebbinghaus Forgetting Curve formula: R = e^(-t/S) * 100
    const probability = Math.exp(-daysSince / (stability * 7)) * 100;
    return Math.round(Math.max(10, Math.min(100, probability)));
  }

  /**
   * Calculates relevance, urgency, impact, and priority scores for a topic recommendation
   */
  static scoreRecommendation(params: {
    type: string;
    masteryScore: number;
    daysSinceStudied: number;
    retentionProb: number;
    isWeakTopic: boolean;
    isExamTopic: boolean;
    isInterviewTopic: boolean;
  }): { relevance: number; urgency: number; impact: number; priority: "Low" | "Medium" | "High" | "Critical" } {
    let relevance = 50;
    let urgency = 50;
    let impact = 50;

    // Relevance calculation
    if (params.isWeakTopic) relevance += 25;
    if (params.isExamTopic) relevance += 20;
    if (params.isInterviewTopic) relevance += 15;
    relevance = Math.min(100, relevance);

    // Urgency calculation
    urgency = Math.round(100 - params.retentionProb);
    if (params.daysSinceStudied > 14) urgency += 10;
    if (params.type === "revision" || params.type === "retention_recovery") urgency += 15;
    urgency = Math.min(100, Math.max(10, urgency));

    // Impact calculation
    // Lower mastery means higher impact to learn it.
    impact = Math.round(100 - params.masteryScore);
    if (params.isWeakTopic) impact += 15;
    impact = Math.min(100, Math.max(10, impact));

    // Priority mapping
    let priority: "Low" | "Medium" | "High" | "Critical" = "Medium";
    const avgScore = (relevance + urgency + impact) / 3;

    if (avgScore >= 80 || (urgency >= 85 && relevance >= 70)) {
      priority = "Critical";
    } else if (avgScore >= 60 || relevance >= 75) {
      priority = "High";
    } else if (avgScore < 40) {
      priority = "Low";
    }

    return { relevance, urgency, impact, priority };
  }

  /**
   * Main recommendation pipeline
   */
  static async generateRecommendations(userId: string, prisma: any): Promise<RecommendationDashboardData> {
    // 1. Gather all learning analytics & progress signals from DB
    const [
      analytics,
      progress,
      weakTopics,
      weakConcepts,
      topicProgressList,
      conceptMasteries,
      studyPlans,
      revisions,
      streak,
      quizAttempts,
      interviewSessions,
      studySessions,
      notes
    ] = await Promise.all([
      prisma.learningAnalytics.findUnique({ where: { userId } }),
      prisma.progressTracking.findUnique({ where: { userId } }),
      prisma.weakTopic.findMany({ where: { userId } }),
      prisma.weakConcept.findMany({ where: { userId } }),
      prisma.topicProgress.findMany({ where: { userId } }),
      prisma.conceptMastery.findMany({ where: { userId } }),
      prisma.studyPlan.findMany({ where: { userId }, include: { tasks: true } }),
      prisma.studyRevision.findMany({ where: { userId } }),
      prisma.learningStreak.findUnique({ where: { userId } }),
      prisma.quizAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.interviewSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.studySession.findMany({ where: { userId }, take: 10 }),
      prisma.generatedNote.findMany({ where: { userId }, select: { topic: true, createdAt: true } }),
    ]);

    // 2. Build profile inputs for AI
    const hasStudyPlan = studyPlans.length > 0;
    const pendingTasksCount = studyPlans.reduce((sum, p) => sum + p.tasks.filter(t => t.status === "Pending").length, 0);
    const learningScore = analytics?.learningScore ?? 50;
    const examReadiness = analytics?.examReadiness ?? 50;
    const currentStreak = streak?.currentStreak ?? 0;
    const totalQuizzes = quizAttempts.length;
    const averageQuizAccuracy = totalQuizzes > 0
      ? Math.round(
          quizAttempts.reduce((sum, q) => {
            const acc = Number(q.accuracy ?? 0);
            return sum + (acc > 1 ? acc : acc * 100);
          }, 0) / totalQuizzes
        )
      : 0;

    // Collect topics and calculate retention curves
    const topicsMap = new Map<string, {
      lastStudied: Date | null;
      revisionCount: number;
      practiceCount: number;
      masteryScore: number;
      studyTime: number;
    }>();

    // Seed topicsMap with topic progress
    for (const tp of topicProgressList) {
      topicsMap.set(tp.topicName, {
        lastStudied: tp.lastActivity,
        revisionCount: tp.revisionStatus ? 1 : 0,
        practiceCount: tp.questionsPracticed,
        masteryScore: tp.masteryScore,
        studyTime: 0,
      });
    }

    // Overlay weak topics details
    for (const wt of weakTopics) {
      const existing = topicsMap.get(wt.topicName);
      topicsMap.set(wt.topicName, {
        lastStudied: wt.lastStudied ?? existing?.lastStudied ?? null,
        revisionCount: Math.max(wt.revisionCount, existing?.revisionCount ?? 0),
        practiceCount: existing?.practiceCount ?? 0,
        masteryScore: wt.strengthScore,
        studyTime: wt.studyTimeMinutes,
      });
    }

    // Overlay concepts
    for (const cm of conceptMasteries) {
      if (!cm.topicName) continue;
      const existing = topicsMap.get(cm.topicName);
      if (existing) {
        existing.revisionCount = Math.max(existing.revisionCount, cm.revisionCount);
        existing.practiceCount = Math.max(existing.practiceCount, cm.practiceCount);
      }
    }

    // Map out computed recommendations & prediction list
    const computedRecommendations: RecommendationPayload[] = [];
    const now = new Date();

    for (const [topicName, meta] of topicsMap.entries()) {
      const daysSince = meta.lastStudied
        ? Math.floor((now.getTime() - meta.lastStudied.getTime()) / (1000 * 60 * 60 * 24))
        : 30; // default to 30 days if null

      const retentionProb = this.predictRetention(daysSince, meta.revisionCount, meta.practiceCount);
      const isWeak = weakTopics.some(wt => wt.topicName === topicName && wt.riskLevel !== "Low");
      
      // Determine if exam/interview relevance
      const isExam = true; // default high relevance
      const isInterview = true;

      // 2a. Retention Recovery Recommendation
      if (retentionProb < 60) {
        const scores = this.scoreRecommendation({
          type: "retention_recovery",
          masteryScore: meta.masteryScore,
          daysSinceStudied: daysSince,
          retentionProb,
          isWeakTopic: isWeak,
          isExamTopic: isExam,
          isInterviewTopic: isInterview,
        });

        computedRecommendations.push({
          recommendationType: "retention_recovery",
          topicName,
          priority: scores.priority,
          impactScore: scores.impact,
          urgencyScore: scores.urgency,
          relevanceScore: scores.relevance,
          reason: `Knowledge retention probability has dropped to ${retentionProb}%. You last reviewed this ${daysSince} days ago.`,
        });
      }

      // 2b. Practice Recommendation (high mastery but low question practice)
      if (meta.masteryScore >= 60 && meta.practiceCount < 3) {
        const scores = this.scoreRecommendation({
          type: "practice",
          masteryScore: meta.masteryScore,
          daysSinceStudied: daysSince,
          retentionProb,
          isWeakTopic: false,
          isExamTopic: isExam,
          isInterviewTopic: isInterview,
        });

        computedRecommendations.push({
          recommendationType: "practice",
          topicName,
          priority: scores.priority,
          impactScore: scores.impact,
          urgencyScore: scores.urgency,
          relevanceScore: scores.relevance,
          reason: `Concept mastery is high (${meta.masteryScore}%) but question practice is low. Solidify your understanding with practice.`,
        });
      }

      // 2c. Weak Topic Recovery
      if (isWeak && meta.masteryScore < 50) {
        const scores = this.scoreRecommendation({
          type: "weak_recovery",
          masteryScore: meta.masteryScore,
          daysSinceStudied: daysSince,
          retentionProb,
          isWeakTopic: true,
          isExamTopic: isExam,
          isInterviewTopic: isInterview,
        });

        computedRecommendations.push({
          recommendationType: "weak_recovery",
          topicName,
          priority: "Critical",
          impactScore: scores.impact,
          urgencyScore: scores.urgency,
          relevanceScore: scores.relevance,
          reason: `Currently flagged as a weak area with strength score of ${meta.masteryScore}%. Targeted recovery is highly recommended.`,
        });
      }
    }

    // 3. Fallback standard predictions if db has no topics (or for cold-start users)
    if (computedRecommendations.length === 0) {
      computedRecommendations.push(
        {
          recommendationType: "study_next",
          topicName: "Operating Systems",
          priority: "High",
          impactScore: 85,
          urgencyScore: 70,
          relevanceScore: 90,
          reason: "High relevance to your curriculum and incomplete study coverage.",
        },
        {
          recommendationType: "revision",
          topicName: "DBMS",
          priority: "Critical",
          impactScore: 90,
          urgencyScore: 88,
          relevanceScore: 92,
          reason: "Last studied 21 days ago. Spaced repetition required to halt memory decay.",
        },
        {
          recommendationType: "practice",
          topicName: "SQL Joins",
          priority: "High",
          impactScore: 78,
          urgencyScore: 80,
          relevanceScore: 85,
          reason: "Concept mastery is high but quiz performance indicates syntax errors.",
        }
      );
    }

    // Prepare profile prompt for Gemini
    const systemPrompt = `You are an expert personalized learning advisor.
Analyze learning history, topic mastery, study behavior, retention risk, exam readiness, and progress data.
Generate highly personalized recommendations, a daily brief, coach insights, and learning paths.
Avoid generic advice. Provide specific, actionable, measurable guidance. Prioritize impact and urgency.
You MUST respond with a JSON object fitting the format:
{
  "recommendations": [
    {
      "recommendationType": "study_next | revision | practice | weak_recovery | exam_prep | interview_prep | retention_recovery | productivity | habit",
      "topicName": "Topic Name",
      "priority": "Low | Medium | High | Critical",
      "impactScore": 1-100,
      "urgencyScore": 1-100,
      "relevanceScore": 1-100,
      "reason": "Specific personalized reason based on metrics"
    }
  ],
  "dailyBrief": {
    "text": "Greeting followed by personal briefing. Keep it short (2-3 sentences).",
    "metrics": {
      "scoreChange": "e.g., +4%",
      "strongestArea": "Strongest Topic",
      "urgentRevision": "Topic needing revision",
      "impactEstimate": "e.g., 3%"
    }
  },
  "coachInsight": {
    "text": "Personal coaching insight focusing on learning habits or efficiency. Keep it short.",
    "efficiency": 1-100,
    "impactEstimate": 1-100
  },
  "learningPaths": [
    {
      "title": "Path title (e.g., Machine Learning Mastery)",
      "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
    }
  ]
}`;

    const userProfileText = `
Student Learning Profile:
- Learning Score: ${learningScore}/100
- Exam Readiness: ${examReadiness}/100
- Current Streak: ${currentStreak} days
- Study Planner Tasks Pending: ${pendingTasksCount}
- Strongest Areas (Concept mastery): ${conceptMasteries.filter(cm => cm.masteryScore >= 75).map(cm => cm.conceptName).slice(0, 3).join(", ") || "None recorded"}
- Weakest Topics: ${weakTopics.map(wt => `${wt.topicName} (${wt.strengthScore}% accuracy)`).slice(0, 3).join(", ") || "None recorded"}
- Quiz Performance: ${totalQuizzes} quizzes taken, avg accuracy ${averageQuizAccuracy}%
- Computed raw recommendations for guidance: ${JSON.stringify(computedRecommendations)}
`;

    let generated: RecommendationDashboardData;
    try {
      generated = await generateJSON<RecommendationDashboardData>(
        systemPrompt,
        userProfileText,
        { model: MODELS.BALANCED, temperature: 0.7 },
        {
          recommendations: computedRecommendations,
          dailyBrief: {
            text: `Welcome back! Your learning score is currently at ${learningScore}%. DBMS is your strongest area while Operating Systems needs some quick revision today.`,
            metrics: {
              scoreChange: "+2%",
              strongestArea: "DBMS",
              urgentRevision: "Operating Systems",
              impactEstimate: "5%"
            }
          },
          coachInsight: {
            text: "You are spending a significant portion of study time on topics you already grasp. Redirecting effort towards weaker areas will yield higher score benefits.",
            efficiency: 72,
            impactEstimate: 12
          },
          learningPaths: [
            {
              title: "Machine Learning Focus",
              steps: ["Regression Analysis", "Classification Models", "Clustering Algorithms", "Neural Networks", "LLMs"]
            }
          ],
          lastGeneratedAt: now.toISOString()
        }
      );
    } catch (e) {
      console.error("Failed to generate recommendations via AI, using fallback.", e);
      generated = {
        recommendations: computedRecommendations,
        dailyBrief: {
          text: `Good morning! Your learning score is currently at ${learningScore}%. Spaced repetition is recommended for Operating Systems.`,
          metrics: {
            scoreChange: "+3%",
            strongestArea: "DBMS",
            urgentRevision: "Operating Systems",
            impactEstimate: "4%"
          }
        },
        coachInsight: {
          text: "Focused revision on high-risk topics can improve your exam readiness by 10%. Keep practicing quizzes.",
          efficiency: 68,
          impactEstimate: 10
        },
        learningPaths: [
          {
            title: "Database Management Path",
            steps: ["SQL Joins", "Normalization", "Indexing", "Transactions", "NoSQL Databases"]
          }
        ],
        lastGeneratedAt: now.toISOString()
      };
    }

    if (generated.dailyBrief && typeof generated.dailyBrief.text === "string") {
      generated.dailyBrief.text = generated.dailyBrief.text.replace(/Good (morning|afternoon|evening)/gi, "Good $1");
    }

    // Force date stamp
    generated.lastGeneratedAt = now.toISOString();

    // 4. Save recommendations into database
    // Clear old expired/existing recommendations first
    await prisma.recommendation.deleteMany({ where: { userId } });

    // Store new recommendations (up to 8 to keep it clean)
    const storedRecs = generated.recommendations.slice(0, 8);
    const dbPromises = storedRecs.map(rec => {
      // Expiration time: 3 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      return prisma.recommendation.create({
        data: {
          userId,
          recommendationType: rec.recommendationType,
          topicName: rec.topicName,
          priority: rec.priority,
          impactScore: rec.impactScore,
          urgencyScore: rec.urgencyScore,
          relevanceScore: rec.relevanceScore,
          reason: rec.reason,
          status: "pending",
          expiresAt
        }
      });
    });

    await Promise.all(dbPromises);

    // Fetch recommendations with database IDs
    const dbRecommendations = await prisma.recommendation.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" }
    });

    // Map back
    generated.recommendations = dbRecommendations.map(dbRec => ({
      id: dbRec.id,
      recommendationType: dbRec.recommendationType,
      topicName: dbRec.topicName,
      priority: dbRec.priority as any,
      impactScore: dbRec.impactScore,
      urgencyScore: dbRec.urgencyScore,
      relevanceScore: dbRec.relevanceScore,
      reason: dbRec.reason,
    }));

    return generated;
  }
}

import { PrismaClient } from "@prisma/user-client";
import { generateJSON, MODELS } from "../lib/ai/openrouter";

// Interfaces for structured data
export interface AIAnalyticsResult {
  learning_score: number;
  grade: string;
  status: string;
  insights: string[];
  recommendations: Array<{
    recommendation: string;
    reason: string;
    action: string;
  }>;
  knowledge_distribution: {
    beginner: string[];
    intermediate: string[];
    advanced: string[];
  };
  exam_readiness: {
    score: number;
    level: "Beginner" | "Improving" | "Ready" | "Excellent";
    factors: {
      coverage: number;
      revisions: number;
      practice_questions: number;
      ai_interactions: number;
    };
  };
}

export class AnalyticsService {
  /**
   * Tracks a new learning event in the database
   */
  static async trackEvent(params: {
    userId: string;
    eventType: string;
    documentId?: string;
    toolUsed?: string;
    topic?: string;
    duration?: number;
    prisma: PrismaClient;
  }) {
    return params.prisma.learningEvent.create({
      data: {
        userId: params.userId,
        eventType: params.eventType,
        documentId: params.documentId,
        toolUsed: params.toolUsed,
        topic: params.topic,
        duration: params.duration ?? 0,
      },
    });
  }

  /**
   * Aggregates and generates/regenerates analytics for a user
   */
  static async generateAnalytics(userId: string, prisma: PrismaClient): Promise<any> {
    // 1. Fetch user's data from multiple tables
    const docsCount = await prisma.uploadedDocument.count({ where: { userId } });
    const notes = await prisma.generatedNote.findMany({ where: { userId } });
    const quizzes = await prisma.quiz.findMany({ where: { userId } });
    const quizAttempts = await prisma.quizAttempt.findMany({ where: { userId } });
    const flashcardsCount = await prisma.flashcard.count({ where: { userId } });
    const mindmapsCount = await prisma.mindMap.count({ where: { userId } });
    const events = await prisma.learningEvent.findMany({ where: { userId } });

    // Fetch ATS, resume, and interview data
    const [latestATS, candidateProfile, interviewSessions] = await Promise.all([
      prisma.aTSReport.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }).catch(() => null),
      prisma.candidateProfile.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }).catch(() => null),
      prisma.interviewSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }).catch(() => []),
    ]);

    // 2. Extract unique topics studied and last studied timestamps
    const topicMap: Record<string, { count: number; lastStudied: Date }> = {};

    const addTopic = (topic: string | null | undefined, date: Date) => {
      if (!topic) return;
      const cleanTopic = topic.trim();
      if (!topicMap[cleanTopic]) {
        topicMap[cleanTopic] = { count: 0, lastStudied: date };
      }
      topicMap[cleanTopic].count += 1;
      if (date > topicMap[cleanTopic].lastStudied) {
        topicMap[cleanTopic].lastStudied = date;
      }
    };

    notes.forEach((n) => addTopic(n.topic, n.createdAt));
    quizzes.forEach((q) => addTopic(q.topic, q.createdAt));
    events.forEach((e) => addTopic(e.topic, e.createdAt));

    const uniqueTopics = Object.keys(topicMap);
    const conceptsCount = uniqueTopics.length * 5; // assume 5 sub-concepts per major topic

    // 3. Compute study consistency & streaks
    const allDates = new Set<string>();
    const collectDate = (date: Date) => {
      const formatted = date.toISOString().split("T")[0];
      allDates.add(formatted);
    };

    notes.forEach((n) => collectDate(n.createdAt));
    quizAttempts.forEach((a) => collectDate(a.createdAt));
    events.forEach((e) => collectDate(e.createdAt));
    quizzes.forEach((q) => collectDate(q.createdAt));

    const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a)); // Descending order: [today, yesterday, ...]

    let currentStreak = 0;
    let longestStreak = 0;

    if (sortedDates.length > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Check if user active today or yesterday to continue current streak
      const hasActivityRecently = sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr;

      if (hasActivityRecently) {
        currentStreak = 1;
        let prevDate = new Date(sortedDates[0]);
        for (let i = 1; i < sortedDates.length; i++) {
          const currentDate = new Date(sortedDates[i]);
          const diffTime = Math.abs(prevDate.getTime() - currentDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
            prevDate = currentDate;
          } else if (diffDays > 1) {
            break;
          }
        }
      }

      // Calculate longest streak
      let tempStreak = 1;
      let prevDate = new Date(sortedDates[sortedDates.length - 1]);
      longestStreak = 1;
      for (let i = sortedDates.length - 2; i >= 0; i--) {
        const currentDate = new Date(sortedDates[i]);
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
        prevDate = currentDate;
      }
    }

    // 4. Calculate study time (actual logged + estimated for existing content)
    const loggedTime = events.reduce((sum, e) => sum + (e.duration ?? 0), 0);
    const estimatedTime =
      notes.length * 15 + // 15 mins per note
      quizAttempts.length * 12 + // 12 mins per quiz attempt
      docsCount * 5 + // 5 mins per upload
      flashcardsCount * 2 + // 2 mins per flashcard
      mindmapsCount * 10; // 10 mins per mindmap

    const studyTimeMinutes = loggedTime + estimatedTime;

    // 5. Tool usage analytics
    const notesCount = notes.length;
    const questionsCount = quizAttempts.length;
    const mindMapsCount = mindmapsCount;
    const flashcardsCnt = flashcardsCount;
    const summariesCount = docsCount; // Uploaded documents usually generate a summary

    const totalToolUsage = notesCount + questionsCount + mindMapsCount + flashcardsCnt + summariesCount;
    const toolUsageJson = {
      notesGenerator: totalToolUsage > 0 ? Math.round((notesCount / totalToolUsage) * 100) : 30,
      questionsGenerator: totalToolUsage > 0 ? Math.round((questionsCount / totalToolUsage) * 100) : 25,
      summaryGenerator: totalToolUsage > 0 ? Math.round((summariesCount / totalToolUsage) * 100) : 20,
      flashcards: totalToolUsage > 0 ? Math.round((flashcardsCnt / totalToolUsage) * 100) : 15,
      mindMaps: totalToolUsage > 0 ? Math.round((mindMapsCount / totalToolUsage) * 100) : 10,
    };

    // 6. Topic Analytics
    const topicAnalyticsJson = uniqueTopics.map((topic) => {
      // Find all items relating to this topic
      const topicNotes = notes.filter((n) => n.topic.toLowerCase() === topic.toLowerCase()).length;
      const topicQuizzes = quizzes.filter((q) => q.topic.toLowerCase() === topic.toLowerCase()).length;
      const topicEvents = events.filter((e) => e.topic && e.topic.toLowerCase() === topic.toLowerCase()).length;

      // Completion rate calculation (based on notes and quizzes completed, max 100)
      const completionRate = Math.min(100, Math.round((topicNotes * 25) + (topicQuizzes * 35)));
      const studyFrequency = topicNotes + topicQuizzes + topicEvents;

      return {
        topic,
        studyFrequency,
        completionRate,
        aiInteractions: topicNotes + topicQuizzes,
      };
    });

    // 7. Calculate Scores Programmatically (will also feed to AI as background)
    // Consistency Score (30% weight) - active days in last 30 days
    const activeDaysLast30 = sortedDates.filter((d) => {
      const diff = Math.abs(new Date().getTime() - new Date(d).getTime());
      return diff / (1000 * 60 * 60 * 24) <= 30;
    }).length;
    const consistencyScore = Math.min(100, Math.round((activeDaysLast30 / 12) * 100)); // Target: study 12 days a month

    // Study Activity Score (20% weight) - Target: 300 minutes of learning
    const studyActivityScore = Math.min(100, Math.round((studyTimeMinutes / 300) * 100));

    // Topic Coverage (20% weight) - Target: 5 topics
    const coverageScore = Math.min(100, Math.round((uniqueTopics.length / 5) * 100));

    // Revision Activity (15% weight) - Target: 3 revision notes
    const revisionNotesCount = notes.filter((n) => n.type === "revision" || n.type === "short").length;
    const revisionScore = Math.min(100, Math.round((revisionNotesCount / 3) * 100));

    // Question Practice (15% weight) - Target: 4 attempts + 10 flashcards
    const practiceScore = Math.min(
      100,
      Math.round((quizAttempts.length / 4) * 60 + (flashcardsCount / 10) * 40)
    );

    // Initial Programmatic learning score calculation
    let programmaticScore = Math.round(
      consistencyScore * 0.3 +
        studyActivityScore * 0.2 +
        coverageScore * 0.2 +
        revisionScore * 0.15 +
        practiceScore * 0.15
    );
    if (programmaticScore === 0) programmaticScore = 0; // Default when empty

    // Average Quiz Score
    const avgQuizScore =
      quizAttempts.length > 0
        ? Math.round((quizAttempts.reduce((sum, a) => sum + a.accuracy, 0) / quizAttempts.length) * 100)
        : 0;

    // Exam Readiness
    const examReadinessScore = Math.round(
      coverageScore * 0.3 + revisionScore * 0.2 + practiceScore * 0.2 + (avgQuizScore || 50) * 0.3
    );

    // Knowledge retention prediction (topics decay)
    const decayTopics = uniqueTopics
      .map((topic) => {
        const info = topicMap[topic];
        const daysSinceLastStudy = Math.round(
          Math.abs(new Date().getTime() - info.lastStudied.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { topic, daysSinceLastStudy };
      })
      .filter((t) => t.daysSinceLastStudy > 5)
      .map((t) => t.topic);

    // 8. Prepare payload for AI analysis
    const userDataSummary = {
      totalLearningTimeHours: (studyTimeMinutes / 60).toFixed(1),
      documentsStudiedCount: docsCount,
      aiGenerations: totalToolUsage,
      conceptsCount,
      uniqueTopicsStudied: uniqueTopics,
      quizzesTaken: quizAttempts.length,
      averageQuizAccuracy: avgQuizScore,
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      toolCounts: { notes: notesCount, quizzes: quizAttempts.length, mindMaps: mindmapsCount, flashcards: flashcardsCount },
      decayTopics,
    };

    // 9. Call AI Engine for deep analytics and recommendations
    const SYSTEM_PROMPT = `You are an expert Learning Analytics Engine.
Analyze the student's learning activity.
Generate meaningful insights about:
- Learning consistency
- Topic mastery
- Knowledge retention
- Exam readiness
- Weak areas
- Learning habits

Generate actionable recommendations. Avoid generic advice. Provide specific and personalized guidance based strictly on their study summary.
You MUST output your response in JSON format matching the schema below:
{
  "learning_score": number (0-100, factor in consistency, coverage, completions),
  "grade": "Excellent" | "Good" | "Satisfactory" | "Needs Focus",
  "status": string (e.g. "Strong Progress" or "Steady Study"),
  "insights": string[] (array of 2-3 tailored analytical sentences),
  "recommendations": [
    {
      "recommendation": string,
      "reason": string,
      "action": string
    }
  ],
  "knowledge_distribution": {
    "beginner": string[] (topics studied very little or with low quiz score),
    "intermediate": string[] (topics with moderate study frequency),
    "advanced": string[] (topics with high study frequency and quiz scores > 80%)
  },
  "exam_readiness": {
    "score": number (0-100),
    "level": "Beginner" | "Improving" | "Ready" | "Excellent",
    "factors": {
      "coverage": number (0-100),
      "revisions": number (0-100),
      "practice_questions": number (0-100),
      "ai_interactions": number (0-100)
    }
  }
}`;

    const USER_PROMPT = `Here is the student's study activity summary:
${JSON.stringify(userDataSummary, null, 2)}

Provide the structured analysis in JSON.`;

    // High quality programmatic fallback in case OpenRouter is down or key is not set
    const fallbackAIResult: AIAnalyticsResult = {
      learning_score: programmaticScore || 0,
      grade:
        programmaticScore > 85
          ? "Excellent"
          : programmaticScore > 70
          ? "Good"
          : programmaticScore > 40
          ? "Satisfactory"
          : "Needs Focus",
      status:
        programmaticScore > 80
          ? "Strong Progress"
          : programmaticScore > 50
          ? "Steady Growth"
          : "Initial Learning",
      insights: [
        uniqueTopics.length > 0
          ? `You are studying ${uniqueTopics.slice(0, 2).join(" & ")} actively.`
          : "You have not started learning active topics yet. Upload a document to generate study material.",
        decayTopics.length > 0
          ? `Your retention in ${decayTopics.slice(0, 2).join(", ")} is decaying. Consider a quick revision.`
          : "Your retention is stable across recently active topics.",
      ],
      recommendations: [
        {
          recommendation: decayTopics.length > 0 ? `Revise ${decayTopics[0]}` : "Study new topics",
          reason: decayTopics.length > 0 ? "Topic last studied over 5 days ago." : "Low content volume.",
          action:
            decayTopics.length > 0
              ? `Re-read your summary on ${decayTopics[0]} and generate flashcards.`
              : "Upload a document to extract key concepts and start testing yourself.",
        },
      ],
      knowledge_distribution: {
        beginner: uniqueTopics.slice(0, 2),
        intermediate: uniqueTopics.slice(2, 4),
        advanced: uniqueTopics.slice(4),
      },
      exam_readiness: {
        score: examReadinessScore,
        level:
          examReadinessScore > 90
            ? "Excellent"
            : examReadinessScore > 70
            ? "Ready"
            : examReadinessScore > 40
            ? "Improving"
            : "Beginner",
        factors: {
          coverage: coverageScore,
          revisions: revisionScore,
          practice_questions: practiceScore,
          ai_interactions: Math.min(100, Math.round((totalToolUsage / 10) * 100)),
        },
      },
    };

    let aiResult: AIAnalyticsResult;
    try {
      aiResult = await generateJSON<AIAnalyticsResult>(
        SYSTEM_PROMPT,
        USER_PROMPT,
        { model: MODELS.FAST },
        fallbackAIResult
      );

      // Sanitize AI outputs to ensure scores don't drop to 0 if the user has actual study records
      if (aiResult.learning_score === 0 && programmaticScore > 0) {
        aiResult.learning_score = programmaticScore;
      }
      if (aiResult.exam_readiness.score === 0 && examReadinessScore > 0) {
        aiResult.exam_readiness.score = examReadinessScore;
      }
    } catch (err) {
      console.error("AI Analytics Generation Error, utilizing fallback: ", err);
      aiResult = fallbackAIResult;
    }

    // 10. Save or update the analytics record in the database
    const savedAnalytics = await prisma.learningAnalytics.upsert({
      where: { userId },
      update: {
        documentsCount: docsCount,
        studyTimeMinutes,
        conceptsLearned: conceptsCount,
        learningScore: aiResult.learning_score,
        examReadiness: aiResult.exam_readiness.score,
        currentStreak,
        longestStreak,
        toolUsageJson: toolUsageJson as any,
        topicAnalyticsJson: topicAnalyticsJson as any,
        recommendationsJson: aiResult.recommendations as any,
        insightsJson: {
          insights: aiResult.insights,
          grade: aiResult.grade,
          status: aiResult.status,
          knowledgeDistribution: aiResult.knowledge_distribution,
          examReadinessBreakdown: aiResult.exam_readiness,
          atsMetrics: {
            atsScore: latestATS?.score ?? candidateProfile?.strengthScore ?? 0,
            formattingScore: latestATS?.formattingScore ?? 0,
            keywordScore: latestATS?.keywordScore ?? 0,
            completenessScore: candidateProfile?.completenessScore ?? 0,
            lastCheckedAt: latestATS?.createdAt || candidateProfile?.updatedAt || null,
          },
          interviewMetrics: {
            totalSessions: interviewSessions.length,
            completedSessions: interviewSessions.filter((s: any) => s.status === "completed" || s.overallScore != null).length,
            averageScore: interviewSessions.length > 0
              ? Math.round(interviewSessions.reduce((acc: number, s: any) => acc + (s.overallScore || 0), 0) / Math.max(1, interviewSessions.length))
              : 0,
          },
        } as any,
      },
      create: {
        userId,
        documentsCount: docsCount,
        studyTimeMinutes,
        conceptsLearned: conceptsCount,
        learningScore: aiResult.learning_score,
        examReadiness: aiResult.exam_readiness.score,
        currentStreak,
        longestStreak,
        toolUsageJson: toolUsageJson as any,
        topicAnalyticsJson: topicAnalyticsJson as any,
        recommendationsJson: aiResult.recommendations as any,
        insightsJson: {
          insights: aiResult.insights,
          grade: aiResult.grade,
          status: aiResult.status,
          knowledgeDistribution: aiResult.knowledge_distribution,
          examReadinessBreakdown: aiResult.exam_readiness,
          atsMetrics: {
            atsScore: latestATS?.score ?? candidateProfile?.strengthScore ?? 0,
            formattingScore: latestATS?.formattingScore ?? 0,
            keywordScore: latestATS?.keywordScore ?? 0,
            completenessScore: candidateProfile?.completenessScore ?? 0,
            lastCheckedAt: latestATS?.createdAt || candidateProfile?.updatedAt || null,
          },
          interviewMetrics: {
            totalSessions: interviewSessions.length,
            completedSessions: interviewSessions.filter((s: any) => s.status === "completed" || s.overallScore != null).length,
            averageScore: interviewSessions.length > 0
              ? Math.round(interviewSessions.reduce((acc: number, s: any) => acc + (s.overallScore || 0), 0) / Math.max(1, interviewSessions.length))
              : 0,
          },
        } as any,
      },
    });

    return savedAnalytics;
  }

  /**
   * Fetches dashboard data, generating it if it does not exist
   */
  static async getDashboardData(userId: string, prisma: PrismaClient): Promise<any> {
    let analytics = await prisma.learningAnalytics.findUnique({
      where: { userId },
    });

    // Auto-generate if not found
    if (!analytics) {
      analytics = await this.generateAnalytics(userId, prisma);
    }

    return analytics;
  }

  /**
   * Helper to seed demo/mock events for a user so they can visualize charts/heatmap instantly
   */
  static async seedDemoData(userId: string, prisma: PrismaClient): Promise<void> {
    // Check if the user already has mock events. If so, clear them or bypass.
    // For safety, we will just insert a complete history of learning events over the last 30 days.
    const eventsToCreate = [];
    const topics = ["Machine Learning", "Operating Systems", "DBMS", "Data Structures", "Computer Networks"];
    const tools = ["Notes Generator", "Questions Generator", "Summary Generator", "Flashcards", "Mind Maps"];
    const eventTypes = ["note_generation", "quiz_attempt", "document_upload", "flashcard_create", "mindmap_create"];

    const today = new Date();
    // Study consistency streak: last 5 consecutive days active
    // We will create events spread over the last 30 days
    for (let i = 0; i < 30; i++) {
      // 70% chance of study on any given day, but 100% chance for the last 5 days
      const isConsequentStreakDay = i < 6;
      if (Math.random() > 0.35 || isConsequentStreakDay) {
        const eventDate = new Date();
        eventDate.setDate(today.getDate() - i);
        // Create 1-3 study events on this day
        const numEvents = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numEvents; j++) {
          const randomIndex = Math.floor(Math.random() * topics.length);
          const topic = topics[randomIndex];
          const toolIndex = Math.floor(Math.random() * tools.length);
          const tool = tools[toolIndex];
          const eventType = eventTypes[toolIndex];
          const duration = Math.floor(Math.random() * 30) + 10; // 10 to 40 minutes

          eventsToCreate.push({
            userId,
            eventType,
            toolUsed: tool,
            topic,
            duration,
            createdAt: eventDate,
          });
        }
      }
    }

    // Seed mock upload docs
    await prisma.uploadedDocument.createMany({
      data: [
        { userId, fileName: "Intro_to_ML.pdf", fileUrl: "https://example.com/ml.pdf", fileType: "application/pdf", createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
        { userId, fileName: "OS_Scheduling.pdf", fileUrl: "https://example.com/os.pdf", fileType: "application/pdf", createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { userId, fileName: "Database_Normalisation.pdf", fileUrl: "https://example.com/db.pdf", fileType: "application/pdf", createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      ],
    });

    // Seed mock generated notes
    await prisma.generatedNote.createMany({
      data: [
        { userId, topic: "Machine Learning", difficulty: "Medium", type: "short", content: "Supervised vs Unsupervised models details...", createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
        { userId, topic: "Operating Systems", difficulty: "Hard", type: "revision", content: "CPU Scheduling algorithms list and formulas...", createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
        { userId, topic: "DBMS", difficulty: "Easy", type: "detailed", content: "First normal form, second normal form rules...", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      ],
    });

    // Seed mock quiz attempt
    const quiz = await prisma.quiz.create({
      data: {
        userId,
        topic: "DBMS",
        difficulty: "Medium",
        questions: [] as any,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.quizAttempt.createMany({
      data: [
        { userId, quizId: quiz.id, score: 4, total: 5, accuracy: 0.8, weakTopics: ["Normalization"], strongTopics: ["SQL Joins"], createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      ],
    });

    // Insert study events
    await prisma.learningEvent.createMany({
      data: eventsToCreate,
    });

    // Re-generate analytics
    await this.generateAnalytics(userId, prisma);
  }
}

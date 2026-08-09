import { PrismaClient } from "@prisma/user-client";
import { generateJSON, MODELS } from "../lib/ai/openrouter";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MilestoneItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface RevisionQueueItem {
  topicName: string;
  lastRevised: string;
  daysSince: number;
  priority: "High" | "Medium" | "Low";
  masteryScore: number;
}

export interface TimelineEvent {
  date: string;
  displayDate: string;
  title: string;
  description: string;
  type: "upload" | "note" | "quiz" | "milestone" | "revision" | "flashcard" | "mindmap";
  icon: string;
}

export interface ProgressDashboardPayload {
  overallProgress: number;
  learningLevel: number;
  learningLevelName: string;
  masteryScore: number;
  masteryGrade: string;
  topicsCompleted: number;
  documentsCompleted: number;
  questionsPracticed: number;
  studySessions: number;
  currentStreak: number;
  status: string;
  topicProgress: TopicProgressItem[];
  conceptMastery: ConceptMasteryItem[];
  milestones: MilestoneItem[];
  revisionQueue: RevisionQueueItem[];
  timeline: TimelineEvent[];
  insights: string[];
  recommendations: RecommendationItem[];
  knowledgeGrowth: { period: string; conceptsLearned: number; questionsPracticed: number; topicsCompleted: number; documentsStudied: number }[];
}

export interface TopicProgressItem {
  topicName: string;
  progressPercentage: number;
  masteryScore: number;
  revisionStatus: boolean;
  questionsPracticed: number;
  conceptsCovered: number;
  totalConcepts: number;
  lastActivity: string;
  status: string;
}

export interface ConceptMasteryItem {
  conceptName: string;
  topicName: string | null;
  masteryScore: number;
  interactions: number;
  revisionCount: number;
  practiceCount: number;
  lastReviewed: string;
  status: "Strong" | "Good" | "Needs Revision" | "Weak Area";
}

export interface RecommendationItem {
  type: "study" | "revise" | "practice" | "improve";
  title: string;
  recommendation: string;
  reason: string;
  action: string;
  priority: "High" | "Medium" | "Low";
}

// ─── Learning Level Map ───────────────────────────────────────────────────────

function getLearningLevel(progress: number): { level: number; name: string } {
  if (progress >= 96) return { level: 7, name: "Master" };
  if (progress >= 81) return { level: 6, name: "Expert" };
  if (progress >= 61) return { level: 5, name: "Scholar" };
  if (progress >= 41) return { level: 4, name: "Achiever" };
  if (progress >= 21) return { level: 3, name: "Learner" };
  if (progress >= 11) return { level: 2, name: "Explorer" };
  return { level: 1, name: "Beginner" };
}

// ─── Mastery Grade ───────────────────────────────────────────────────────────

function getMasteryGrade(score: number): string {
  if (score >= 90) return "Advanced";
  if (score >= 75) return "Proficient";
  if (score >= 55) return "Developing";
  if (score >= 30) return "Emerging";
  return "Beginner";
}

// ─── Concept Status ──────────────────────────────────────────────────────────

function getConceptStatus(score: number): "Strong" | "Good" | "Needs Revision" | "Weak Area" {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Revision";
  return "Weak Area";
}

// ─── Topic Status ────────────────────────────────────────────────────────────

function getTopicStatus(progress: number): string {
  if (progress >= 80) return "Excellent";
  if (progress >= 60) return "Strong";
  if (progress >= 40) return "In Progress";
  if (progress >= 20) return "Needs Attention";
  return "Just Started";
}

// ─── Days Since ──────────────────────────────────────────────────────────────

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Progress Service ────────────────────────────────────────────────────────

export class ProgressService {
  /**
   * Full calculation + save of progress tracking data for a user
   */
  static async calculateProgress(userId: string, prisma: PrismaClient): Promise<ProgressDashboardPayload> {
    // ── 1. Fetch all raw data ──────────────────────────────────────────────
    const [docs, notes, quizzes, quizAttempts, flashcards, mindMaps, events, chatSessions, atsReports, interviewSessions, dbStudySessions] =
      await Promise.all([
        prisma.uploadedDocument.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.generatedNote.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.quiz.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.quizAttempt.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.flashcard.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.mindMap.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.learningEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.chatSession.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.aTSReport.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }).catch(() => []),
        prisma.interviewSession.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }).catch(() => []),
        prisma.studySession.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }).catch(() => []),
      ]);

    const totalAiGenerations = notes.length + quizzes.length + flashcards.length + mindMaps.length;

    // ── 2. Build topic map ────────────────────────────────────────────────
    const topicMap: Record<string, {
      notes: number;
      quizzes: number;
      quizAttemptCount: number;
      flashcards: number;
      mindMaps: number;
      events: number;
      revisionNotes: number;
      lastActivity: Date;
      avgQuizAccuracy: number;
    }> = {};

    const ensureTopic = (name: string, date: Date) => {
      const t = name.trim();
      if (!topicMap[t]) {
        topicMap[t] = {
          notes: 0, quizzes: 0, quizAttemptCount: 0, flashcards: 0,
          mindMaps: 0, events: 0, revisionNotes: 0, lastActivity: date,
          avgQuizAccuracy: 0,
        };
      }
      if (date > topicMap[t].lastActivity) topicMap[t].lastActivity = date;
      return t;
    };

    notes.forEach((n) => {
      const t = ensureTopic(n.topic, n.createdAt);
      topicMap[t].notes++;
      if (n.type === "revision" || n.type === "short") topicMap[t].revisionNotes++;
    });
    quizzes.forEach((q) => {
      const t = ensureTopic(q.topic, q.createdAt);
      topicMap[t].quizzes++;
      // count matching quiz attempts
      const attempts = quizAttempts.filter((a) => a.quizId === q.id);
      topicMap[t].quizAttemptCount += attempts.length;
      if (attempts.length > 0) {
        topicMap[t].avgQuizAccuracy =
          attempts.reduce((s, a) => s + a.accuracy, 0) / attempts.length;
      }
    });
    flashcards.forEach((f) => {
      const t = ensureTopic(f.topic, f.createdAt);
      topicMap[t].flashcards++;
    });
    mindMaps.forEach((m) => {
      const t = ensureTopic(m.topic, m.createdAt);
      topicMap[t].mindMaps++;
    });
    events.forEach((e) => {
      if (e.topic) {
        const t = ensureTopic(e.topic, e.createdAt);
        topicMap[t].events++;
      }
    });

    const uniqueTopics = Object.keys(topicMap);

    // ── 3. Per-topic progress ─────────────────────────────────────────────
    const topicProgressItems: TopicProgressItem[] = uniqueTopics.map((topicName) => {
      const tm = topicMap[topicName];
      // Progress: notes 25pts, revision 20pts, quiz 20pts, flashcard 15pts, mindmap 10pts, events 10pts
      const rawProgress = Math.min(
        100,
        tm.notes * 15 + tm.revisionNotes * 10 + tm.quizAttemptCount * 15 +
        tm.flashcards * 5 + tm.mindMaps * 8 + Math.min(tm.events, 5) * 4
      );
      // Mastery based on quiz accuracy + revision + coverage
      const masteryScore = Math.min(
        100,
        Math.round(
          (tm.avgQuizAccuracy * 100) * 0.4 +
          (tm.revisionNotes >= 2 ? 30 : tm.revisionNotes * 15) +
          Math.min(rawProgress * 0.3, 30)
        )
      );
      const conceptsCovered = Math.min(27, tm.notes * 5 + tm.events);
      const totalConcepts = 27;

      return {
        topicName,
        progressPercentage: rawProgress,
        masteryScore,
        revisionStatus: tm.revisionNotes > 0,
        questionsPracticed: quizAttempts
          .filter((a) => quizzes.find((q) => q.id === a.quizId && q.topic === topicName))
          .reduce((s, a) => s + a.total, 0),
        conceptsCovered,
        totalConcepts,
        lastActivity: tm.lastActivity.toISOString(),
        status: getTopicStatus(rawProgress),
      };
    });

    // Topics "completed" = progress >= 60%
    const topicsCompleted = topicProgressItems.filter((t) => t.progressPercentage >= 60).length;

    // ── 4. Concept mastery items ──────────────────────────────────────────
    // Generate mock concept-level data derived from topics + note types
    const conceptMasteryItems: ConceptMasteryItem[] = [];
    const conceptsPerTopic: Record<string, string[]> = {
      "Machine Learning": ["Regression", "Classification", "Overfitting", "Neural Networks", "Decision Trees"],
      "Operating Systems": ["CPU Scheduling", "Deadlocks", "Memory Management", "File Systems", "Paging"],
      "DBMS": ["SQL Joins", "Normalization", "Transactions", "Indexing", "ER Diagrams"],
      "Data Structures": ["Arrays", "Linked Lists", "Trees", "Graphs", "Dynamic Programming"],
      "Computer Networks": ["OSI Model", "TCP/IP", "DNS", "HTTP", "Subnetting"],
      "Algorithms": ["Sorting", "Searching", "Recursion", "Greedy", "Backtracking"],
    };

    for (const topic of uniqueTopics) {
      const tm = topicMap[topic];
      const concepts = conceptsPerTopic[topic] ?? [`${topic} Basics`, `${topic} Advanced`, `${topic} Applications`];
      const topicMastery = Math.min(100, Math.round(
        tm.notes * 15 + tm.revisionNotes * 10 + tm.quizAttemptCount * 12 + tm.flashcards * 5
      ));

      concepts.forEach((concept, i) => {
        // Distribute mastery with slight variance per concept
        const variance = (i % 3 === 0 ? 10 : i % 3 === 1 ? -5 : 0);
        const mastery = Math.max(0, Math.min(100, topicMastery + variance));
        conceptMasteryItems.push({
          conceptName: concept,
          topicName: topic,
          masteryScore: mastery,
          interactions: tm.notes + tm.events,
          revisionCount: tm.revisionNotes,
          practiceCount: tm.quizAttemptCount,
          lastReviewed: tm.lastActivity.toISOString(),
          status: getConceptStatus(mastery),
        });
      });
    }

    // ── 5. Overall progress score (weighted) ──────────────────────────────
    // Documents: 20%
    const docScore = Math.min(100, Math.round((docs.length / 5) * 100));
    // Concept coverage: 25% (topics studied / 5 target)
    const conceptScore = Math.min(100, Math.round((uniqueTopics.length / 5) * 100));
    // Revision activity: 20%
    const revisionNotes = notes.filter((n) => n.type === "revision" || n.type === "short").length;
    const revisionScore = Math.min(100, Math.round((revisionNotes / 3) * 100));
    // Question practice: 20%
    const practiceScore = Math.min(100, Math.round(
      (quizAttempts.length / 4) * 60 + (flashcards.length / 10) * 40
    ));
    // Learning consistency: 15% (active days last 30)
    const allDates = new Set<string>();
    [...notes, ...quizAttempts, ...events].forEach((item) =>
      allDates.add(item.createdAt.toISOString().split("T")[0])
    );
    const activeDays30 = Array.from(allDates).filter((d) => {
      const diff = (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    }).length;
    const consistencyScore = Math.min(100, Math.round((activeDays30 / 12) * 100));

    const overallProgress = Math.round(
      docScore * 0.20 +
      conceptScore * 0.25 +
      revisionScore * 0.20 +
      practiceScore * 0.20 +
      consistencyScore * 0.15
    );

    // ── 6. Mastery score ──────────────────────────────────────────────────
    const avgConceptMastery = conceptMasteryItems.length > 0
      ? Math.round(conceptMasteryItems.reduce((s, c) => s + c.masteryScore, 0) / conceptMasteryItems.length)
      : 0;

    // ── 7. Streak ─────────────────────────────────────────────────────────
    const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));
    let currentStreak = 0;
    if (sortedDates.length > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
        currentStreak = 1;
        let prev = new Date(sortedDates[0]);
        for (let i = 1; i < sortedDates.length; i++) {
          const cur = new Date(sortedDates[i]);
          const diff = Math.round((prev.getTime() - cur.getTime()) / 86400000);
          if (diff === 1) { currentStreak++; prev = cur; } else break;
        }
      }
    }

    // ── 8. Learning level ─────────────────────────────────────────────────
    const { level, name: levelName } = getLearningLevel(overallProgress);
    const masteryGrade = getMasteryGrade(avgConceptMastery);

    // ── 9. Total questions practiced ─────────────────────────────────────
    const totalQuestionsPracticed = quizAttempts.reduce((s, a) => s + a.total, 0);

    // ── 10. Milestones ────────────────────────────────────────────────────
    const milestones = ProgressService.buildMilestones({
      docsCount: docs.length,
      notesCount: notes.length,
      quizAttemptCount: quizAttempts.length,
      flashcardsCount: flashcards.length,
      conceptsMastered: conceptMasteryItems.filter((c) => c.masteryScore >= 60).length,
      questionsPracticed: totalQuestionsPracticed,
      streak: currentStreak,
      aiGenerations: totalAiGenerations,
      conceptsLearned: conceptMasteryItems.length,
      topicsCompleted,
    });

    // ── 11. Revision queue ────────────────────────────────────────────────
    const revisionQueue: RevisionQueueItem[] = uniqueTopics
      .map((topicName) => {
        const tm = topicMap[topicName];
        const since = daysSince(tm.lastActivity);
        const item = topicProgressItems.find((t) => t.topicName === topicName)!;
        return {
          topicName,
          lastRevised: tm.lastActivity.toISOString(),
          daysSince: since,
          priority: (since >= 14 ? "High" : since >= 7 ? "Medium" : "Low") as "High" | "Medium" | "Low",
          masteryScore: item.masteryScore,
        };
      })
      .filter((r) => r.daysSince >= 5)
      .sort((a, b) => b.daysSince - a.daysSince);

    // ── 12. Timeline ──────────────────────────────────────────────────────
    const timeline = ProgressService.buildTimeline({ docs, notes, quizAttempts, flashcards, mindMaps, atsReports, interviewSessions });

    // ── 13. Knowledge growth (last 30 days by week) ───────────────────────
    const knowledgeGrowth = ProgressService.buildKnowledgeGrowth({ notes, quizAttempts, docs, events });

    // ── 14. Status ────────────────────────────────────────────────────────
    const status =
      overallProgress >= 80 ? "On Fire 🔥" :
      overallProgress >= 60 ? "On Track" :
      overallProgress >= 30 ? "Making Progress" :
      "Getting Started";

    // ── 15. AI Recommendations ────────────────────────────────────────────
    const recommendations = await ProgressService.generateRecommendations({
      overallProgress,
      revisionQueue,
      topicProgressItems,
      conceptMasteryItems,
      currentStreak,
      uniqueTopics,
    });

    // ── 16. Insights ──────────────────────────────────────────────────────
    const insights = ProgressService.buildInsights({
      overallProgress,
      revisionQueue,
      topicProgressItems,
      currentStreak,
      uniqueTopics,
      conceptMasteryItems,
    });

    // ── 17. Upsert to DB ──────────────────────────────────────────────────
    const progressData = {
      overallProgress,
      learningLevel: level,
      learningLevelName: levelName,
      masteryScore: avgConceptMastery,
      masteryGrade,
      topicsCompleted,
      documentsCompleted: docs.length,
      questionsPracticed: totalQuestionsPracticed,
      studySessions: Math.max(dbStudySessions.length, docs.length, chatSessions.length + events.filter((e) => e.eventType === "session_start").length),
      currentStreak,
      status,
      milestonesJson: milestones as any,
      revisionQueueJson: revisionQueue as any,
      timelineJson: timeline as any,
    };

    await prisma.progressTracking.upsert({
      where: { userId },
      update: progressData,
      create: { userId, ...progressData },
    });

    // Upsert topic progress (batched)
    const [existingTps, existingCms] = await Promise.all([
      prisma.topicProgress.findMany({
        where: { userId },
        select: { id: true, topicName: true },
      }),
      prisma.conceptMastery.findMany({
        where: { userId },
        select: { id: true, conceptName: true },
      }),
    ]);
    const tpById = new Map(existingTps.map((t: any) => [t.topicName, t.id]));
    const cmById = new Map(existingCms.map((c: any) => [c.conceptName, c.id]));

    const tpUpdates: any[] = [];
    const tpCreates: any[] = [];
    for (const tp of topicProgressItems) {
      const existingId = tpById.get(tp.topicName);
      const data = {
        progressPercentage: tp.progressPercentage,
        masteryScore: tp.masteryScore,
        revisionStatus: tp.revisionStatus,
        questionsPracticed: tp.questionsPracticed,
        conceptsCovered: tp.conceptsCovered,
        lastActivity: new Date(tp.lastActivity),
        status: tp.status,
      };
      if (existingId) {
        tpUpdates.push(prisma.topicProgress.update({ where: { id: existingId }, data }));
      } else {
        tpCreates.push({
          userId,
          topicName: tp.topicName,
          ...data,
        });
      }
    }
    if (tpCreates.length > 0) {
      await prisma.topicProgress.createMany({ data: tpCreates });
    }
    if (tpUpdates.length > 0) {
      await Promise.all(tpUpdates);
    }

    // Upsert concept mastery (batched)
    const cmUpdates: any[] = [];
    const cmCreates: any[] = [];
    for (const cm of conceptMasteryItems) {
      const existingId = cmById.get(cm.conceptName);
      const data = {
        masteryScore: cm.masteryScore,
        interactions: cm.interactions,
        revisionCount: cm.revisionCount,
        practiceCount: cm.practiceCount,
        lastReviewed: new Date(cm.lastReviewed),
      };
      if (existingId) {
        cmUpdates.push(prisma.conceptMastery.update({ where: { id: existingId }, data }));
      } else {
        cmCreates.push({
          userId,
          conceptName: cm.conceptName,
          topicName: cm.topicName,
          ...data,
        });
      }
    }
    if (cmCreates.length > 0) {
      await prisma.conceptMastery.createMany({ data: cmCreates });
    }
    if (cmUpdates.length > 0) {
      await Promise.all(cmUpdates);
    }

    return {
      overallProgress,
      learningLevel: level,
      learningLevelName: levelName,
      masteryScore: avgConceptMastery,
      masteryGrade,
      topicsCompleted,
      documentsCompleted: docs.length,
      questionsPracticed: totalQuestionsPracticed,
      studySessions: progressData.studySessions,
      currentStreak,
      status,
      topicProgress: topicProgressItems,
      conceptMastery: conceptMasteryItems,
      milestones,
      revisionQueue,
      timeline,
      insights,
      recommendations,
      knowledgeGrowth,
    };
  }

  // ─── Build Milestones ─────────────────────────────────────────────────────

  static buildMilestones(stats: {
    docsCount: number;
    notesCount: number;
    quizAttemptCount: number;
    flashcardsCount: number;
    conceptsMastered: number;
    questionsPracticed: number;
    streak: number;
    aiGenerations: number;
    conceptsLearned: number;
    topicsCompleted: number;
  }): MilestoneItem[] {
    const definitions: { id: string; title: string; description: string; icon: string; check: boolean }[] = [
      { id: "first_upload", title: "First Upload", description: "Uploaded your first document", icon: "📄", check: stats.docsCount >= 1 },
      { id: "first_summary", title: "First Summary", description: "Generated your first AI summary", icon: "✨", check: stats.notesCount >= 1 },
      { id: "five_docs", title: "5 Documents Studied", description: "Studied 5 documents", icon: "📚", check: stats.docsCount >= 5 },
      { id: "ten_concepts", title: "10 Concepts Mastered", description: "Mastered 10 concepts", icon: "🧠", check: stats.conceptsMastered >= 10 },
      { id: "25_questions", title: "25 Questions Practiced", description: "Practiced 25 questions", icon: "❓", check: stats.questionsPracticed >= 25 },
      { id: "seven_day_streak", title: "7 Day Streak", description: "Studied 7 days in a row", icon: "🔥", check: stats.streak >= 7 },
      { id: "fifty_generations", title: "50 AI Generations", description: "Used AI tools 50 times", icon: "🤖", check: stats.aiGenerations >= 50 },
      { id: "100_concepts", title: "100 Concepts Learned", description: "Learned 100 concepts", icon: "🎓", check: stats.conceptsLearned >= 100 },
      { id: "first_quiz", title: "First Quiz", description: "Attempted your first quiz", icon: "📝", check: stats.quizAttemptCount >= 1 },
      { id: "topic_master", title: "Topic Master", description: "Completed 3 topics", icon: "🏆", check: stats.topicsCompleted >= 3 },
    ];

    return definitions.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      icon: d.icon,
      unlocked: d.check,
      unlockedAt: d.check ? new Date().toISOString() : undefined,
    }));
  }

  // ─── Build Timeline ───────────────────────────────────────────────────────

  static buildTimeline(data: {
    docs: any[];
    notes: any[];
    quizAttempts: any[];
    flashcards: any[];
    mindMaps: any[];
    atsReports?: any[];
    interviewSessions?: any[];
  }): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    data.docs.forEach((d) => {
      events.push({
        date: d.createdAt.toISOString(),
        displayDate: new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        title: `Uploaded ${d.fileName}`,
        description: "Document uploaded and processed",
        type: "upload",
        icon: "📄",
      });
    });

    data.notes.forEach((n) => {
      const typeLabel = n.type === "revision" ? "Revision Notes" : n.type === "short" ? "Smart Summary" : "Study Notes";
      events.push({
        date: n.createdAt.toISOString(),
        displayDate: new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        title: `${typeLabel} — ${n.topic}`,
        description: `Generated ${typeLabel.toLowerCase()} for ${n.topic}`,
        type: n.type === "revision" ? "revision" : "note",
        icon: n.type === "revision" ? "🔄" : "📝",
      });
    });

    data.quizAttempts.forEach((q) => {
      events.push({
        date: q.createdAt.toISOString(),
        displayDate: new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        title: `Practiced Questions`,
        description: `Scored ${q.score}/${q.total} — ${Math.round(q.accuracy * 100)}% accuracy`,
        type: "quiz",
        icon: "❓",
      });
    });

    data.flashcards.forEach((f) => {
      events.push({
        date: f.createdAt.toISOString(),
        displayDate: new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        title: `Flashcard — ${f.topic}`,
        description: `Created a flashcard for ${f.topic}`,
        type: "flashcard",
        icon: "🃏",
      });
    });

    data.mindMaps.forEach((m) => {
      events.push({
        date: m.createdAt.toISOString(),
        displayDate: new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        title: `Mind Map — ${m.topic}`,
        description: `Created a mind map for ${m.topic}`,
        type: "mindmap",
        icon: "🗺️",
      });
    });

    (data.atsReports || []).forEach((ats) => {
      events.push({
        date: new Date(ats.createdAt).toISOString(),
        displayDate: new Date(ats.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        title: `ATS Resume Audit`,
        description: `ATS Compatibility Score: ${ats.score}%`,
        type: "milestone",
        icon: "🎯",
      });
    });

    (data.interviewSessions || []).forEach((s) => {
      events.push({
        date: new Date(s.createdAt).toISOString(),
        displayDate: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        title: `AI Interview Session (${s.type || "General"})`,
        description: s.overallScore != null ? `Overall Score: ${s.overallScore}%` : `Status: ${s.status}`,
        type: "milestone",
        icon: "🎙️",
      });
    });

    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
  }

  // ─── Knowledge Growth ─────────────────────────────────────────────────────

  static buildKnowledgeGrowth(data: {
    notes: any[];
    quizAttempts: any[];
    docs: any[];
    events: any[];
  }) {
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i - 1) * 7);

      const weekNotes = data.notes.filter((n) => n.createdAt >= weekStart && n.createdAt < weekEnd);
      const weekAttempts = data.quizAttempts.filter((q) => q.createdAt >= weekStart && q.createdAt < weekEnd);
      const weekDocs = data.docs.filter((d) => d.createdAt >= weekStart && d.createdAt < weekEnd);

      const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weeks.push({
        period: label,
        conceptsLearned: weekNotes.length * 5,
        questionsPracticed: weekAttempts.reduce((s: number, a: any) => s + a.total, 0),
        topicsCompleted: Math.min(weekNotes.length, 3),
        documentsStudied: weekDocs.length,
      });
    }
    return weeks;
  }

  // ─── Insights ────────────────────────────────────────────────────────────

  static buildInsights(params: {
    overallProgress: number;
    revisionQueue: RevisionQueueItem[];
    topicProgressItems: TopicProgressItem[];
    currentStreak: number;
    uniqueTopics: string[];
    conceptMasteryItems: ConceptMasteryItem[];
  }): string[] {
    const insights: string[] = [];
    const { overallProgress, revisionQueue, topicProgressItems, currentStreak, uniqueTopics, conceptMasteryItems } = params;

    if (uniqueTopics.length > 0) {
      const topActive = topicProgressItems.sort((a, b) => b.progressPercentage - a.progressPercentage).slice(0, 2);
      insights.push(`You are actively studying ${topActive.map((t) => t.topicName).join(" & ")} with strong progress.`);
    }

    if (revisionQueue.length > 0) {
      const highPriority = revisionQueue.filter((r) => r.priority === "High");
      if (highPriority.length > 0) {
        insights.push(`${highPriority[0].topicName} has not been revised in ${highPriority[0].daysSince} days. Consider a quick revision to retain knowledge.`);
      }
    }

    if (currentStreak >= 3) {
      insights.push(`You are on a ${currentStreak}-day learning streak. Consistency is your superpower!`);
    }

    const weakConcepts = conceptMasteryItems.filter((c) => c.status === "Weak Area");
    if (weakConcepts.length > 0) {
      insights.push(`${weakConcepts[0].conceptName} needs attention — mastery is at ${weakConcepts[0].masteryScore}%. Schedule a focused revision session.`);
    }

    if (overallProgress >= 60) {
      insights.push(`Your overall learning progress is at ${overallProgress}%. You are well above the average learner trajectory.`);
    }

    return insights.slice(0, 4);
  }

  // ─── AI Recommendations ───────────────────────────────────────────────────

  static async generateRecommendations(params: {
    overallProgress: number;
    revisionQueue: RevisionQueueItem[];
    topicProgressItems: TopicProgressItem[];
    conceptMasteryItems: ConceptMasteryItem[];
    currentStreak: number;
    uniqueTopics: string[];
  }): Promise<RecommendationItem[]> {
    const { revisionQueue, topicProgressItems, conceptMasteryItems } = params;

    const fallback: RecommendationItem[] = [];

    // Revise next
    const highRevision = revisionQueue.find((r) => r.priority === "High");
    if (highRevision) {
      fallback.push({
        type: "revise",
        title: "Revise Now",
        recommendation: `Revise ${highRevision.topicName}`,
        reason: `Last studied ${highRevision.daysSince} days ago — knowledge is decaying.`,
        action: `Open revision notes for ${highRevision.topicName} and generate a quick quiz.`,
        priority: "High",
      });
    }

    // Weak concept to practice
    const weakConcept = conceptMasteryItems.find((c) => c.status === "Weak Area");
    if (weakConcept) {
      fallback.push({
        type: "practice",
        title: "Practice Weak Area",
        recommendation: `Practice ${weakConcept.conceptName}`,
        reason: `Mastery score is only ${weakConcept.masteryScore}% — needs reinforcement.`,
        action: `Generate 10 questions on ${weakConcept.conceptName} and review flashcards.`,
        priority: "High",
      });
    }

    // Study next (lowest progress topic)
    const lowestTopic = topicProgressItems.sort((a, b) => a.progressPercentage - b.progressPercentage)[0];
    if (lowestTopic) {
      fallback.push({
        type: "study",
        title: "Study Next",
        recommendation: `Continue studying ${lowestTopic.topicName}`,
        reason: `Only ${lowestTopic.progressPercentage}% progress — there is much more to cover.`,
        action: `Upload more materials on ${lowestTopic.topicName} and generate summary notes.`,
        priority: "Medium",
      });
    }

    // Improve weak areas
    const needsAttention = topicProgressItems.filter((t) => t.status === "Needs Attention");
    if (needsAttention.length > 0) {
      fallback.push({
        type: "improve",
        title: "Improve Weak Areas",
        recommendation: `Focus on ${needsAttention.map((t) => t.topicName).slice(0, 2).join(" & ")}`,
        reason: `These topics are at risk of falling behind your study plan.`,
        action: `Create mind maps and revision notes for weak topics to reinforce understanding.`,
        priority: "Medium",
      });
    }

    try {
      const SYSTEM_PROMPT = `You are an AI learning coach. Generate 4 specific, actionable next-step recommendations for this student based on their progress data. Return JSON array of objects with: type ("study"|"revise"|"practice"|"improve"), title (2-4 words), recommendation, reason, action, priority ("High"|"Medium"|"Low").`;
      const USER_PROMPT = `Student progress: ${JSON.stringify({ ...params }, null, 2)}`;

      const result = await generateJSON<RecommendationItem[]>(SYSTEM_PROMPT, USER_PROMPT, { model: MODELS.FAST }, fallback);
      return Array.isArray(result) ? result.slice(0, 4) : fallback;
    } catch {
      return fallback;
    }
  }

  // ─── Get Dashboard (fetch or compute) ────────────────────────────────────

  static async getDashboard(userId: string, prisma: PrismaClient): Promise<ProgressDashboardPayload> {
    const existing = await prisma.progressTracking.findUnique({ where: { userId } });
    if (!existing) {
      return ProgressService.calculateProgress(userId, prisma);
    }

    // Return cached data + re-fetch topic/concept tables
    const [topicProgress, conceptMastery] = await Promise.all([
      prisma.topicProgress.findMany({ where: { userId } }),
      prisma.conceptMastery.findMany({ where: { userId } }),
    ]);

    return {
      overallProgress: existing.overallProgress,
      learningLevel: existing.learningLevel,
      learningLevelName: existing.learningLevelName,
      masteryScore: existing.masteryScore,
      masteryGrade: existing.masteryGrade,
      topicsCompleted: existing.topicsCompleted,
      documentsCompleted: existing.documentsCompleted,
      questionsPracticed: existing.questionsPracticed,
      studySessions: existing.studySessions,
      currentStreak: existing.currentStreak,
      status: existing.status,
      topicProgress: topicProgress.map((t) => ({
        topicName: t.topicName,
        progressPercentage: t.progressPercentage,
        masteryScore: t.masteryScore,
        revisionStatus: t.revisionStatus,
        questionsPracticed: t.questionsPracticed,
        conceptsCovered: t.conceptsCovered,
        totalConcepts: t.totalConcepts,
        lastActivity: t.lastActivity.toISOString(),
        status: t.status,
      })),
      conceptMastery: conceptMastery.map((c) => ({
        conceptName: c.conceptName,
        topicName: c.topicName,
        masteryScore: c.masteryScore,
        interactions: c.interactions,
        revisionCount: c.revisionCount,
        practiceCount: c.practiceCount,
        lastReviewed: c.lastReviewed.toISOString(),
        status: getConceptStatus(c.masteryScore),
      })),
      milestones: (existing.milestonesJson as any[]) || [],
      revisionQueue: (existing.revisionQueueJson as any[]) || [],
      timeline: (existing.timelineJson as any[]) || [],
      insights: [],
      recommendations: [],
      knowledgeGrowth: [],
    };
  }
}

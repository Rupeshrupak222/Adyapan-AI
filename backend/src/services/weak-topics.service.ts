import { PrismaClient } from "@prisma/client";
import { generateJSON, generateText, MODELS } from "../lib/ai/openrouter";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface WeakTopicItem {
  topicName: string;
  strengthScore: number;
  status: "Excellent" | "Strong" | "Average" | "Weak" | "Critical";
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  revisionPriority: "Immediate" | "This Week" | "This Month" | "Optional";
  retentionProbability: number;
  lastStudied: string | null;
  daysSinceStudied: number;
  questionAccuracy: number;
  revisionCount: number;
  recommendedAction: string;
}

export interface WeakConceptItem {
  topicName: string;
  conceptName: string;
  masteryScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  recommendedAction: string;
}

export interface RevisionQueueItem {
  topicName: string;
  priority: "Immediate" | "This Week" | "This Month" | "Optional";
  recommendedDate: string;
  reason: string;
  status: string;
}

export interface WeakTopicsDashboard {
  overview: {
    weakTopicsCount: number;
    criticalTopicsCount: number;
    needRevisionCount: number;
    learningHealthScore: number;
    atRiskTopicsCount: number;
  };
  weakTopics: WeakTopicItem[];
  criticalTopics: WeakTopicItem[];
  revisionQueue: {
    immediate: RevisionQueueItem[];
    thisWeek: RevisionQueueItem[];
    thisMonth: RevisionQueueItem[];
    optional: RevisionQueueItem[];
  };
  weakConcepts: WeakConceptItem[];
  examRisk: {
    riskLevel: "Low" | "Medium" | "High" | "Critical";
    riskScore: number;
    affectedTopics: string[];
    topRisks: string[];
  };
  interviewRisk: {
    riskLevel: "Low" | "Medium" | "High" | "Critical";
    riskScore: number;
    affectedTopics: string[];
    topRisks: string[];
  };
  recommendations: {
    studyNext: { topic: string; reason: string }[];
    reviseNext: { topic: string; reason: string }[];
    practiceNext: { topic: string; reason: string }[];
    improveNext: { topic: string; reason: string }[];
  };
  coachInsight: string;
  lastAnalyzedAt: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function classifyStatus(score: number): WeakTopicItem["status"] {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Average";
  if (score >= 40) return "Weak";
  return "Critical";
}

function classifyRisk(score: number): WeakTopicItem["riskLevel"] {
  if (score >= 75) return "Low";
  if (score >= 55) return "Medium";
  if (score >= 35) return "High";
  return "Critical";
}

function classifyPriority(score: number, daysSince: number): WeakTopicItem["revisionPriority"] {
  if (score < 40 || daysSince > 14) return "Immediate";
  if (score < 60 || daysSince > 7) return "This Week";
  if (score < 75 || daysSince > 3) return "This Month";
  return "Optional";
}

/**
 * Ebbinghaus-inspired knowledge retention probability
 * R = e^(-t/S) * 100
 * t = days since last study, S = stability factor based on revision count
 */
function calcRetentionProbability(daysSince: number, revisionCount: number): number {
  if (daysSince <= 0) return 100;
  const stability = Math.max(1, 1 + revisionCount * 1.8); // More revisions → higher stability
  const retention = Math.exp(-daysSince / (stability * 8)) * 100;
  return Math.round(Math.max(5, Math.min(100, retention)));
}

function recommendedAction(status: WeakTopicItem["status"], topicName: string): string {
  switch (status) {
    case "Critical": return `Urgent: Start a focused study session on ${topicName} today`;
    case "Weak": return `Schedule a 2-hour deep dive revision session for ${topicName}`;
    case "Average": return `Practice 10 MCQs and review key concepts in ${topicName}`;
    case "Strong": return `Solve 5 advanced problems to solidify ${topicName}`;
    case "Excellent": return `Maintain mastery with periodic review of ${topicName}`;
  }
}

function getDaysSince(date: Date | null): number {
  if (!date) return 999;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getRecommendedDate(priority: string): Date {
  const now = new Date();
  switch (priority) {
    case "Immediate": return now;
    case "This Week": { const d = new Date(now); d.setDate(d.getDate() + 3); return d; }
    case "This Month": { const d = new Date(now); d.setDate(d.getDate() + 14); return d; }
    default: { const d = new Date(now); d.setDate(d.getDate() + 30); return d; }
  }
}

// ─── Main Service ─────────────────────────────────────────────────────────────

export class WeakTopicsService {
  /**
   * Full analysis pipeline: gather multi-signal data, compute scores, persist results
   */
  static async analyzeAndPersist(userId: string, prisma: PrismaClient): Promise<WeakTopicsDashboard> {
    // 1. Gather all learning signals
    const [
      notes,
      quizzes,
      quizAttempts,
      events,
      revisions,
      streakEvents,
      plannerTasks,
      existingWeakTopics,
    ] = await Promise.all([
      prisma.generatedNote.findMany({ where: { userId }, select: { topic: true, createdAt: true } }),
      prisma.quiz.findMany({ where: { userId }, select: { topic: true, createdAt: true } }),
      prisma.quizAttempt.findMany({ where: { userId }, select: { score: true, total: true, createdAt: true } }),
      prisma.learningEvent.findMany({ where: { userId }, select: { topic: true, eventType: true, duration: true, toolUsed: true, createdAt: true } }),
      prisma.studyRevision.findMany({ where: { userId }, select: { topicName: true, status: true, revisionDate: true } }),
      prisma.streakEvent.findMany({ where: { userId }, select: { eventSource: true, eventType: true, activityPoints: true, createdAt: true } }),
      prisma.studyTask.findMany({
        where: { studyPlan: { userId } },
        select: { topicName: true, status: true, estimatedTime: true, completedAt: true, scheduledDate: true },
      }),
      prisma.weakTopic.findMany({ where: { userId } }),
    ]);

    // 2. Build per-topic signal map
    const topicMap = new Map<string, {
      notesCount: number;
      quizCount: number;
      accuracyScores: number[];
      studyTimeMinutes: number;
      revisionCount: number;
      aiInteractionCount: number;
      lastStudied: Date | null;
      events: typeof events;
    }>();

    const ensureTopic = (name: string) => {
      if (!topicMap.has(name)) {
        topicMap.set(name, {
          notesCount: 0,
          quizCount: 0,
          accuracyScores: [],
          studyTimeMinutes: 0,
          revisionCount: 0,
          aiInteractionCount: 0,
          lastStudied: null,
          events: [],
        });
      }
      return topicMap.get(name)!;
    };

    const touchLastStudied = (t: ReturnType<typeof ensureTopic>, date: Date) => {
      if (!t.lastStudied || date > t.lastStudied) t.lastStudied = date;
    };

    // Notes
    for (const n of notes) {
      if (!n.topic) continue;
      const t = ensureTopic(n.topic);
      t.notesCount++;
      touchLastStudied(t, n.createdAt);
    }

    // Quizzes
    for (const q of quizzes) {
      if (!q.topic) continue;
      const t = ensureTopic(q.topic);
      t.quizCount++;
      touchLastStudied(t, q.createdAt);
    }

    // Quiz accuracy (map to topic via quiz topic field)
    // We map attempts to their parent quiz — approximate using topic from quizzes list
    // For simplicity, compute overall accuracy and apply as baseline
    const totalAttempts = quizAttempts.length;
    const overallAccuracy = totalAttempts > 0
      ? Math.round(quizAttempts.reduce((s: number, a: { score: number; total: number; createdAt: Date }) => s + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) / totalAttempts)
      : 50;

    // Learning events
    for (const ev of events) {
      if (!ev.topic) continue;
      const t = ensureTopic(ev.topic);
      t.studyTimeMinutes += ev.duration ?? 0;
      touchLastStudied(t, ev.createdAt);
      if (ev.toolUsed === "ady-chat" || ev.eventType === "ai_chat") {
        t.aiInteractionCount++;
      }
      t.events.push(ev);
    }

    // Revisions
    for (const r of revisions) {
      const t = ensureTopic(r.topicName);
      if (r.status === "Completed") t.revisionCount++;
      touchLastStudied(t, r.revisionDate);
    }

    // Planner tasks
    for (const task of plannerTasks) {
      const t = ensureTopic(task.topicName);
      t.studyTimeMinutes += task.estimatedTime ?? 0;
      if (task.completedAt) touchLastStudied(t, task.completedAt);
      else if (task.scheduledDate) touchLastStudied(t, task.scheduledDate);
    }

    // 3. Compute strength score for each topic
    const scored: WeakTopicItem[] = [];

    for (const [topicName, signals] of topicMap.entries()) {
      const daysSince = getDaysSince(signals.lastStudied);

      // Weighted scoring formula
      const accuracy = overallAccuracy; // 30%
      const revisionScore = Math.min(100, signals.revisionCount * 20); // 20%
      const studyTimeScore = Math.min(100, (signals.studyTimeMinutes / 60) * 10); // 15%
      const conceptScore = Math.min(100, (signals.notesCount + signals.quizCount) * 10); // 15%
      const recencyScore = Math.max(0, 100 - daysSince * 3.5); // 10%
      const aiScore = Math.min(100, signals.aiInteractionCount * 15); // 10%

      const strengthScore = Math.round(
        accuracy * 0.30 +
        revisionScore * 0.20 +
        studyTimeScore * 0.15 +
        conceptScore * 0.15 +
        recencyScore * 0.10 +
        aiScore * 0.10
      );

      const status = classifyStatus(strengthScore);
      const riskLevel = classifyRisk(strengthScore);
      const revisionPriority = classifyPriority(strengthScore, daysSince);
      const retentionProbability = calcRetentionProbability(daysSince, signals.revisionCount);

      scored.push({
        topicName,
        strengthScore,
        status,
        riskLevel,
        revisionPriority,
        retentionProbability,
        lastStudied: signals.lastStudied?.toISOString() ?? null,
        daysSinceStudied: daysSince,
        questionAccuracy: accuracy,
        revisionCount: signals.revisionCount,
        recommendedAction: recommendedAction(status, topicName),
      });
    }

    // Sort by strength score ascending (weakest first)
    scored.sort((a, b) => a.strengthScore - b.strengthScore);

    // 4. Persist WeakTopic records
    await Promise.all(
      scored.map((item) =>
        prisma.weakTopic.upsert({
          where: { userId_topicName: { userId, topicName: item.topicName } },
          create: {
            userId,
            topicName: item.topicName,
            strengthScore: item.strengthScore,
            riskLevel: item.riskLevel,
            revisionPriority: item.revisionPriority,
            retentionProbability: item.retentionProbability,
            lastStudied: item.lastStudied ? new Date(item.lastStudied) : null,
            status: item.status,
            questionAccuracy: item.questionAccuracy,
            revisionCount: item.revisionCount,
          },
          update: {
            strengthScore: item.strengthScore,
            riskLevel: item.riskLevel,
            revisionPriority: item.revisionPriority,
            retentionProbability: item.retentionProbability,
            lastStudied: item.lastStudied ? new Date(item.lastStudied) : null,
            status: item.status,
            questionAccuracy: item.questionAccuracy,
            revisionCount: item.revisionCount,
          },
        })
      )
    );

    // 5. Build revision queue and persist
    const revisionQueueItems: RevisionQueueItem[] = scored
      .filter((t) => t.revisionPriority !== "Optional" || t.strengthScore < 75)
      .map((t) => ({
        topicName: t.topicName,
        priority: t.revisionPriority,
        recommendedDate: getRecommendedDate(t.revisionPriority).toISOString(),
        reason: `Strength score ${t.strengthScore}%, last studied ${t.daysSinceStudied === 999 ? "never" : `${t.daysSinceStudied} days ago`}`,
        status: "Pending",
      }));

    // Clear old queue and re-insert
    await prisma.revisionQueue.deleteMany({ where: { userId } });
    if (revisionQueueItems.length > 0) {
      await prisma.revisionQueue.createMany({
        data: revisionQueueItems.map((r) => ({
          userId,
          topicName: r.topicName,
          priority: r.priority,
          recommendedDate: new Date(r.recommendedDate),
          reason: r.reason,
          status: "Pending",
        })),
      });
    }

    // 6. AI-powered weak concept detection (for weakest 5 topics)
    const weakestTopics = scored.filter((t) => t.strengthScore < 60).slice(0, 5);
    let weakConcepts: WeakConceptItem[] = [];

    if (weakestTopics.length > 0) {
      const conceptPayload = await generateJSON<{
        concepts: Array<{
          topicName: string;
          conceptName: string;
          masteryScore: number;
          riskLevel: string;
          recommendedAction: string;
        }>;
      }>(
        `You are an expert educational diagnostician specializing in identifying learning gaps at the concept level. 
         Analyze the provided weak topics and generate realistic concept-level weakness breakdowns. 
         For each topic, identify 2-3 specific sub-concepts that are typically challenging.
         Return valid JSON only.`,
        `The student has these weak topics (strength score out of 100):
${weakestTopics.map((t) => `- ${t.topicName}: score ${t.strengthScore}%, last studied ${t.daysSinceStudied === 999 ? "never" : `${t.daysSinceStudied} days ago`}`).join("\n")}

Generate a JSON object with a "concepts" array. Each item must have:
- topicName (string)
- conceptName (string, specific sub-concept)
- masteryScore (number 0-100, should be low for weak topics)
- riskLevel (string: "Low" | "Medium" | "High" | "Critical")
- recommendedAction (string, specific actionable advice)`,
        { model: MODELS.FAST, temperature: 0.4, maxTokens: 2000, responseFormat: { type: "json_object" } },
        { concepts: [] }
      );

      weakConcepts = (conceptPayload.concepts || []).map((c) => ({
        topicName: c.topicName,
        conceptName: c.conceptName,
        masteryScore: Math.max(0, Math.min(100, c.masteryScore)),
        riskLevel: (["Low", "Medium", "High", "Critical"].includes(c.riskLevel) ? c.riskLevel : "Medium") as WeakConceptItem["riskLevel"],
        recommendedAction: c.recommendedAction,
      }));

      // Persist weak concepts
      await prisma.weakConcept.deleteMany({ where: { userId } });
      if (weakConcepts.length > 0) {
        await prisma.weakConcept.createMany({
          data: weakConcepts.map((c) => ({
            userId,
            topicName: c.topicName,
            conceptName: c.conceptName,
            masteryScore: c.masteryScore,
            riskLevel: c.riskLevel,
            recommendedAction: c.recommendedAction,
          })),
          skipDuplicates: true,
        });
      }
    }

    // 7. Exam & Interview Risk Analysis
    const criticalTopics = scored.filter((t) => t.status === "Critical" || t.status === "Weak");
    const examRiskScore = criticalTopics.length > 0
      ? Math.round(100 - (criticalTopics.reduce((s, t) => s + t.strengthScore, 0) / criticalTopics.length))
      : 20;

    const examRisk = {
      riskLevel: classifyRisk(100 - examRiskScore),
      riskScore: examRiskScore,
      affectedTopics: criticalTopics.map((t) => t.topicName),
      topRisks: criticalTopics.slice(0, 3).map((t) => `${t.topicName} (${t.strengthScore}%)`),
    };

    const interviewRiskTopics = criticalTopics.filter((t) =>
      ["dbms", "sql", "os", "operating system", "networking", "data structures", "algorithms",
       "oops", "system design", "database"].some((kw) => t.topicName.toLowerCase().includes(kw))
    );
    const interviewRiskScore = interviewRiskTopics.length > 0
      ? Math.round(100 - (interviewRiskTopics.reduce((s, t) => s + t.strengthScore, 0) / interviewRiskTopics.length))
      : 15;

    const interviewRisk = {
      riskLevel: classifyRisk(100 - interviewRiskScore),
      riskScore: interviewRiskScore,
      affectedTopics: interviewRiskTopics.map((t) => t.topicName),
      topRisks: interviewRiskTopics.slice(0, 3).map((t) => `${t.topicName} (${t.strengthScore}%)`),
    };

    // 8. AI Recommendations
    const topTopics = scored.slice(0, 8);
    const recPayload = await generateJSON<{
      studyNext: Array<{ topic: string; reason: string }>;
      reviseNext: Array<{ topic: string; reason: string }>;
      practiceNext: Array<{ topic: string; reason: string }>;
      improveNext: Array<{ topic: string; reason: string }>;
    }>(
      `You are an AI learning coach. Generate personalized study recommendations based on topic strength scores.
       Be specific and actionable. Return valid JSON only.`,
      `Student topic analysis:
${topTopics.map((t) => `- ${t.topicName}: strength ${t.strengthScore}%, status ${t.status}, last studied ${t.daysSinceStudied === 999 ? "never" : `${t.daysSinceStudied} days ago`}`).join("\n")}

Return JSON with arrays: studyNext, reviseNext, practiceNext, improveNext.
Each array item: { topic: string, reason: string }. Limit to 3 items per category.`,
      { model: MODELS.FAST, temperature: 0.5, maxTokens: 1500, responseFormat: { type: "json_object" } },
      {
        studyNext: topTopics.slice(0, 2).map((t) => ({ topic: t.topicName, reason: `Strength at ${t.strengthScore}% — needs attention` })),
        reviseNext: topTopics.slice(0, 2).map((t) => ({ topic: t.topicName, reason: `${t.daysSinceStudied} days since last revision` })),
        practiceNext: topTopics.slice(0, 2).map((t) => ({ topic: t.topicName, reason: `Question accuracy is below target` })),
        improveNext: topTopics.slice(0, 2).map((t) => ({ topic: t.topicName, reason: `Concept mastery needs improvement` })),
      }
    );

    // 9. AI Coaching Insight
    const wellKnownTopics = scored.filter((t) => t.strengthScore >= 75);
    const timeOnStrong = wellKnownTopics.length > 0
      ? Math.round((wellKnownTopics.length / scored.length) * 100)
      : 0;

    const coachInsight = await generateText(
      `You are an expert AI learning coach for students preparing for exams and interviews. 
       Provide ONE powerful, specific insight about the student's learning behavior. 
       Be direct, data-driven, and motivating. Maximum 2 sentences.`,
      `Student stats:
- Total topics studied: ${scored.length}
- Strong topics (75%+): ${wellKnownTopics.length} (${timeOnStrong}% of effort)
- Weak topics (<60%): ${scored.filter((t) => t.strengthScore < 60).length}
- Critical topics (<40%): ${scored.filter((t) => t.strengthScore < 40).length}
- Weakest topic: ${scored[0]?.topicName ?? "N/A"} at ${scored[0]?.strengthScore ?? 0}%
- Most days without study: ${Math.max(...scored.map((t) => t.daysSinceStudied)).toString().replace("999", "unknown")}`,
      { model: MODELS.FAST, temperature: 0.6, maxTokens: 200 }
    ).catch(() => `You are spending ${timeOnStrong}% of your study time on topics you already understand well. Shift focus to your ${scored.filter(t => t.strengthScore < 60).length} weak areas for faster improvement.`);

    // 10. Assemble dashboard payload
    const bucketize = (items: RevisionQueueItem[], priority: string) =>
      items.filter((i) => i.priority === priority);

    const learningHealthScore = scored.length > 0
      ? Math.round(scored.reduce((s, t) => s + t.strengthScore, 0) / scored.length)
      : 100;

    return {
      overview: {
        weakTopicsCount: scored.filter((t) => t.strengthScore < 60).length,
        criticalTopicsCount: scored.filter((t) => t.strengthScore < 40).length,
        needRevisionCount: revisionQueueItems.filter((r) => r.priority === "Immediate" || r.priority === "This Week").length,
        learningHealthScore,
        atRiskTopicsCount: scored.filter((t) => t.retentionProbability < 50).length,
      },
      weakTopics: scored.filter((t) => t.strengthScore < 75),
      criticalTopics: scored.filter((t) => t.strengthScore < 40),
      revisionQueue: {
        immediate: bucketize(revisionQueueItems, "Immediate"),
        thisWeek: bucketize(revisionQueueItems, "This Week"),
        thisMonth: bucketize(revisionQueueItems, "This Month"),
        optional: bucketize(revisionQueueItems, "Optional"),
      },
      weakConcepts,
      examRisk,
      interviewRisk,
      recommendations: recPayload,
      coachInsight: coachInsight.trim(),
      lastAnalyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Get existing dashboard data from DB (no re-analysis)
   */
  static async getDashboardData(userId: string, prisma: PrismaClient): Promise<WeakTopicsDashboard | null> {
    const [weakTopicsDb, weakConceptsDb, revisionQueueDb] = await Promise.all([
      prisma.weakTopic.findMany({ where: { userId }, orderBy: { strengthScore: "asc" } }),
      prisma.weakConcept.findMany({ where: { userId } }),
      prisma.revisionQueue.findMany({ where: { userId }, orderBy: { priority: "asc" } }),
    ]);

    if (weakTopicsDb.length === 0) return null;

    const toItem = (db: typeof weakTopicsDb[0]): WeakTopicItem => {
      const daysSince = getDaysSince(db.lastStudied);
      return {
        topicName: db.topicName,
        strengthScore: db.strengthScore,
        status: db.status as WeakTopicItem["status"],
        riskLevel: db.riskLevel as WeakTopicItem["riskLevel"],
        revisionPriority: db.revisionPriority as WeakTopicItem["revisionPriority"],
        retentionProbability: db.retentionProbability,
        lastStudied: db.lastStudied?.toISOString() ?? null,
        daysSinceStudied: daysSince,
        questionAccuracy: db.questionAccuracy,
        revisionCount: db.revisionCount,
        recommendedAction: recommendedAction(db.status as WeakTopicItem["status"], db.topicName),
      };
    };

    const allTopics = weakTopicsDb.map(toItem);
    const learningHealthScore = allTopics.length > 0
      ? Math.round(allTopics.reduce((s: number, t: WeakTopicItem) => s + t.strengthScore, 0) / allTopics.length)
      : 100;

    const toRevisionItem = (db: typeof revisionQueueDb[0]): RevisionQueueItem => ({
      topicName: db.topicName,
      priority: db.priority as RevisionQueueItem["priority"],
      recommendedDate: db.recommendedDate?.toISOString() ?? new Date().toISOString(),
      reason: db.reason,
      status: db.status,
    });

    const queueItems = revisionQueueDb.map(toRevisionItem);

    const weakTopicItems = allTopics.filter((t) => t.strengthScore < 75);
    const criticalItems = allTopics.filter((t) => t.strengthScore < 40);

    return {
      overview: {
        weakTopicsCount: allTopics.filter((t) => t.strengthScore < 60).length,
        criticalTopicsCount: criticalItems.length,
        needRevisionCount: queueItems.filter((r) => r.priority === "Immediate" || r.priority === "This Week").length,
        learningHealthScore,
        atRiskTopicsCount: allTopics.filter((t) => t.retentionProbability < 50).length,
      },
      weakTopics: weakTopicItems,
      criticalTopics: criticalItems,
      revisionQueue: {
        immediate: queueItems.filter((i) => i.priority === "Immediate"),
        thisWeek: queueItems.filter((i) => i.priority === "This Week"),
        thisMonth: queueItems.filter((i) => i.priority === "This Month"),
        optional: queueItems.filter((i) => i.priority === "Optional"),
      },
      weakConcepts: weakConceptsDb.map((c) => ({
        topicName: c.topicName,
        conceptName: c.conceptName,
        masteryScore: c.masteryScore,
        riskLevel: c.riskLevel as WeakConceptItem["riskLevel"],
        recommendedAction: c.recommendedAction,
      })),
      examRisk: {
        riskLevel: classifyRisk(learningHealthScore),
        riskScore: Math.max(0, 100 - learningHealthScore),
        affectedTopics: criticalItems.map((t) => t.topicName),
        topRisks: criticalItems.slice(0, 3).map((t) => `${t.topicName} (${t.strengthScore}%)`),
      },
      interviewRisk: {
        riskLevel: "Medium",
        riskScore: 30,
        affectedTopics: criticalItems.slice(0, 3).map((t) => t.topicName),
        topRisks: criticalItems.slice(0, 2).map((t) => `${t.topicName} needs review`),
      },
      recommendations: {
        studyNext: weakTopicItems.slice(0, 3).map((t) => ({ topic: t.topicName, reason: `Score: ${t.strengthScore}% — focus needed` })),
        reviseNext: weakTopicItems.filter((t) => t.daysSinceStudied > 7).slice(0, 3).map((t) => ({ topic: t.topicName, reason: `${t.daysSinceStudied} days since last study` })),
        practiceNext: weakTopicItems.slice(0, 3).map((t) => ({ topic: t.topicName, reason: `Practice questions to boost accuracy` })),
        improveNext: weakTopicItems.filter((t) => t.retentionProbability < 60).slice(0, 3).map((t) => ({ topic: t.topicName, reason: `Retention at ${t.retentionProbability}%` })),
      },
      coachInsight: allTopics.length > 0
        ? `You have ${criticalItems.length} critical topics needing immediate attention. Focusing on ${criticalItems[0]?.topicName ?? "your weakest areas"} first will have the highest impact on your learning outcomes.`
        : "Great work — no critical topics detected. Keep maintaining your current study patterns.",
      lastAnalyzedAt: weakTopicsDb[0]?.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}

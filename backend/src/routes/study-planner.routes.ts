import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { generateJSON, MODELS } from "../lib/ai/openrouter";
import { StreakService } from "../services/streak.service";
import { handleRouteError } from "../utils/routeError";
import { getTimezone } from "../utils/request";

export const studyPlannerRouter = Router();

studyPlannerRouter.use(requireAuth);

const STUDY_PLANNER_SYSTEM = `You are an expert Study Planner and Learning Strategist.
Analyze educational content, learning progress, mastery scores, weak areas, exam timelines, and available study time.
Generate optimized study schedules that maximize learning outcomes.
Use spaced repetition, prioritization, and cognitive learning principles.
Avoid generic plans. Create personalized learning roadmaps.`;

// POST /api/study-planner/generate
studyPlannerRouter.post("/generate", requireFeatureQuota("STUDY_PLANNER"), async (req: any, res: any) => {
  try {
    const userId = req.user!.userId;
    const { title, examDate, dailyHours, targetScore, studyMode, documentText, customTopics } = req.body;

    if (!title || !dailyHours || !targetScore || !studyMode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);

    // 1. Calculate available days & validate exam date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let validExamDate: Date | null = null;
    let daysAvailable = 30; // default

    if (examDate) {
      const parsedExam = new Date(examDate);
      if (!isNaN(parsedExam.getTime())) {
        validExamDate = parsedExam;
        validExamDate.setHours(0, 0, 0, 0);
        const diffTime = validExamDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          daysAvailable = Math.min(180, diffDays); // cap at 6 months
        }
      }
    }

    const dailyHoursNum = parseFloat(String(dailyHours)) || 2;

    // 2. Query user weak topics for optimization
    let weakTopics: string[] = [];
    try {
      const progresses = await userPrisma.topicProgress.findMany({
        where: { userId, progressPercentage: { lt: 50 } },
        take: 5
      });
      weakTopics = progresses.map(p => p.topicName);
    } catch (e) {
      console.error("Failed to query topic progresses for planner:", e);
    }

    // 3. Construct AI Prompt
    const safeDocContext = documentText ? String(documentText).slice(0, 10000) : "";
    const userPrompt = `Create a detailed day-by-day study plan.
Subject/Goal: "${title}"
Exam Date: ${validExamDate ? validExamDate.toISOString().split("T")[0] : "No target date"}
Days Available: ${daysAvailable} days
Daily Study Hours: ${dailyHoursNum} hours
Target Score: ${targetScore}
Study Mode: "${studyMode}"
${weakTopics.length > 0 ? `Weak areas to focus on: ${weakTopics.join(", ")}` : ""}
${customTopics ? `Specific topics that must be covered: ${customTopics}` : ""}
${safeDocContext ? `Learning content context:\n"""\n${safeDocContext}\n"""` : ""}

Provide a complete day-by-day JSON schedule where "total_days" fits within the days available (minimum 3 days, maximum ${daysAvailable} days).
Ensure topics are logically structured (fundamentals first, followed by applications and practice).
Return a JSON object with this exact structure (no markdown wrapper, no other text):
{
  "total_days": ${daysAvailable},
  "daily_hours": ${dailyHoursNum},
  "estimated_completion": "90%",
  "schedule": [
    {
      "day": 1,
      "topics": ["Topic A", "Topic B"],
      "study_hours": ${dailyHoursNum},
      "priority": "High"
    }
  ]
}`;

    const fallbackPlan = {
      total_days: daysAvailable,
      daily_hours: dailyHoursNum,
      estimated_completion: "85%",
      schedule: Array.from({ length: Math.min(daysAvailable, 10) }, (_, i) => ({
        day: i + 1,
        topics: [`Introduction to ${title} Part ${i + 1}`, `Review & Practice Part ${i + 1}`],
        study_hours: dailyHoursNum,
        priority: i % 2 === 0 ? "High" : "Important"
      }))
    };

    let planData: any = null;
    try {
      planData = await generateJSON<typeof fallbackPlan>(
        STUDY_PLANNER_SYSTEM,
        userPrompt,
        { model: MODELS.BALANCED },
        fallbackPlan
      );
    } catch (aiErr) {
      console.warn("[StudyPlanner] AI JSON generation failed, using fallback plan:", aiErr);
      planData = fallbackPlan;
    }

    // Normalize schedule list
    const rawSchedule = planData?.schedule || planData?.daily_schedule || planData?.plan || fallbackPlan.schedule;
    const scheduleItems = Array.isArray(rawSchedule) && rawSchedule.length > 0 ? rawSchedule : fallbackPlan.schedule;

    // 4. Save to Database
    // Archive previous plans by deleting their tasks
    const existingPlans = await userPrisma.studyPlan.findMany({ where: { userId }, select: { id: true } });
    if (existingPlans.length > 0) {
      await userPrisma.studyTask.deleteMany({
        where: { studyPlanId: { in: existingPlans.map((p: any) => p.id) } },
      });
    }
    await userPrisma.studyPlan.deleteMany({ where: { userId } });
    // Keep study revisions clean
    await userPrisma.studyRevision.deleteMany({ where: { userId } });

    const newPlan = await userPrisma.studyPlan.create({
      data: {
        userId,
        title,
        examDate: validExamDate,
        studyMode,
        dailyHours: dailyHoursNum,
        targetScore: String(targetScore),
        completionPercentage: 0,
        planJson: { ...fallbackPlan, ...planData, schedule: scheduleItems } as any
      }
    });

    // Generate Tasks and Revisions
    const revisionIntervals = [
      { type: "1 Day Revision", days: 1 },
      { type: "3 Day Revision", days: 3 },
      { type: "7 Day Revision", days: 7 },
      { type: "14 Day Revision", days: 14 },
      { type: "30 Day Revision", days: 30 }
    ];

    const taskData: any[] = [];
    const revisionData: any[] = [];

    for (const item of scheduleItems) {
      const dayNum = typeof item.day === "number" ? item.day : (parseInt(String(item.day)) || 1);
      const taskDate = new Date(today);
      taskDate.setDate(today.getDate() + (dayNum - 1));

      const itemTopics = Array.isArray(item.topics)
        ? item.topics
        : (typeof item.topics === "string" ? [item.topics] : [`Study Topic Day ${dayNum}`]);

      const itemHours = parseFloat(String(item.study_hours || dailyHoursNum)) || dailyHoursNum;
      const estTimePerTopic = Math.max(15, Math.round((itemHours * 60) / Math.max(1, itemTopics.length)));

      for (const topic of itemTopics) {
        if (!topic || typeof topic !== "string") continue;

        taskData.push({
          studyPlanId: newPlan.id,
          topicName: topic,
          scheduledDate: taskDate,
          priority: item.priority || "Important",
          status: "Pending",
          estimatedTime: estTimePerTopic,
        });

        // Schedule spaced repetition revisions
        for (const interval of revisionIntervals) {
          const revDate = new Date(taskDate);
          revDate.setDate(taskDate.getDate() + interval.days);

          // Cap revision creation inside exam bounds if needed
          if (!validExamDate || revDate <= validExamDate) {
            revisionData.push({
              userId,
              topicName: topic,
              revisionDate: revDate,
              revisionType: interval.type,
              status: "Pending",
            });
          }
        }
      }
    }

    if (taskData.length > 0) {
      await userPrisma.studyTask.createMany({ data: taskData });
    }
    if (revisionData.length > 0) {
      await userPrisma.studyRevision.createMany({ data: revisionData });
    }

    // Track Streak Activity
    StreakService.trackActivity(
      userId,
      "GENERATE_STUDY_PLAN",
      "study_planner",
      newPlan.id,
      30, // 30 points
      getTimezone(req),
      userPrisma
    ).catch(err => console.error("Streak tracking error:", err));

    res.json({ success: true, plan: newPlan });
  } catch (error) {
    handleRouteError(res, error, "StudyPlanner.generate", "Failed to generate study plan");
  }
});

// GET /api/study-planner
studyPlannerRouter.get("/", async (req: any, res: any) => {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    const plan = await userPrisma.studyPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    if (!plan) {
      return res.json({ success: true, plan: null });
    }

    const tasks = await userPrisma.studyTask.findMany({
      where: { studyPlanId: plan.id },
      orderBy: { scheduledDate: "asc" }
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "Completed").length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update study plan completion percentage in database
    if (completionPercentage !== plan.completionPercentage) {
      await userPrisma.studyPlan.update({
        where: { id: plan.id },
        data: { completionPercentage }
      });
      plan.completionPercentage = completionPercentage;
    }

    // Days Remaining
    let daysRemaining = 0;
    if (plan.examDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = new Date(plan.examDate).getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Workload Analysis
    const todayStr = new Date().toISOString().split("T")[0];
    const todayTasks = tasks.filter(t => t.scheduledDate.toISOString().split("T")[0] === todayStr);
    const totalTodayHours = todayTasks.reduce((acc, t) => acc + t.estimatedTime, 0) / 60;
    
    let workload = "Low";
    if (totalTodayHours > 4) workload = "High";
    else if (totalTodayHours > 2) workload = "Moderate";

    let burnoutRisk = "Low";
    if (totalTodayHours > 5) burnoutRisk = "High";
    else if (totalTodayHours > 3.5) burnoutRisk = "Moderate";

    // Streaks
    const progress = await userPrisma.progressTracking.findUnique({ where: { userId } });
    const streak = progress?.currentStreak || 0;

    res.json({
      success: true,
      plan: {
        ...plan,
        daysRemaining,
        streak,
        completionPercentage,
        successProbability: `${Math.min(98, 70 + Math.round(completionPercentage * 0.28))}%`,
        workloadAnalysis: {
          dailyWorkload: workload,
          burnoutRisk,
          totalTodayHours: Math.round(totalTodayHours * 10) / 10,
          learningCapacity: `${plan.dailyHours} hrs/day`
        }
      },
      tasks
    });
  } catch (error) {
    handleRouteError(res, error, "StudyPlanner.fetchPlan", "Failed to fetch study plan");
  }
});

// GET /api/study-planner/today
studyPlannerRouter.get("/today", async (req: any, res: any) => {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    const plan = await userPrisma.studyPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    if (!plan) {
      return res.json({ success: true, tasks: [], revisions: [] });
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Query tasks for today
    const tasks = await userPrisma.studyTask.findMany({
      where: {
        studyPlanId: plan.id,
        scheduledDate: {
          gte: new Date(todayStr),
          lt: new Date(new Date(todayStr).setDate(new Date(todayStr).getDate() + 1))
        }
      }
    });

    // Query revisions for today
    const revisions = await userPrisma.studyRevision.findMany({
      where: {
        userId,
        revisionDate: {
          gte: new Date(todayStr),
          lt: new Date(new Date(todayStr).setDate(new Date(todayStr).getDate() + 1))
        }
      }
    });

    res.json({ success: true, tasks, revisions });
  } catch (error) {
    handleRouteError(res, error, "StudyPlanner.today", "Failed to fetch today's tasks");
  }
});

// GET /api/study-planner/calendar
studyPlannerRouter.get("/calendar", async (req: any, res: any) => {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    const plan = await userPrisma.studyPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    if (!plan) {
      return res.json({ success: true, events: [] });
    }

    const tasks = await userPrisma.studyTask.findMany({
      where: { studyPlanId: plan.id }
    });

    const revisions = await userPrisma.studyRevision.findMany({
      where: { userId }
    });

    // Format for full calendar events
    const taskEvents = tasks.map(t => ({
      id: `task-${t.id}`,
      title: `Study: ${t.topicName}`,
      date: t.scheduledDate.toISOString().split("T")[0],
      type: "study",
      priority: t.priority,
      status: t.status,
      time: `${t.estimatedTime}m`
    }));

    const revisionEvents = revisions.map(r => ({
      id: `rev-${r.id}`,
      title: `Revise: ${r.topicName} (${r.revisionType.replace(" Revision", "")})`,
      date: r.revisionDate.toISOString().split("T")[0],
      type: "revision",
      priority: "Medium",
      status: r.status,
      time: "30m"
    }));

    res.json({ success: true, events: [...taskEvents, ...revisionEvents] });
  } catch (error) {
    handleRouteError(res, error, "StudyPlanner.calendar", "Failed to fetch calendar events");
  }
});

// POST /api/study-planner/task/complete
studyPlannerRouter.post("/task/complete", async (req: any, res: any) => {
  try {
    const userId = req.user!.userId;
    const { taskId, status } = req.body;

    if (!taskId || !status) {
      return res.status(400).json({ error: "Missing task ID or status" });
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const isCompleted = status === "Completed";

    const task = await userPrisma.studyTask.findFirst({
      where: { id: taskId, studyPlan: { userId } }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found or access denied" });
    }

    await userPrisma.studyTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: isCompleted ? new Date() : null
      }
    });

    // Gamification & Analytics Hook: Add Learning Event
    if (isCompleted) {
      await userPrisma.learningEvent.create({
        data: {
          userId,
          eventType: "study_task_completed",
          toolUsed: "study_planner",
          topic: task.topicName,
          duration: task.estimatedTime
        }
      });

      // Track Streak Activity
      StreakService.trackActivity(
        userId,
        "STUDY_TASK_COMPLETED",
        "study_planner",
        task.id,
        task.estimatedTime || 15,
        getTimezone(req),
        userPrisma
      ).catch(err => console.error("Streak tracking error:", err));

      // Update Topic Progress
      const existingProgress = await userPrisma.topicProgress.findFirst({
        where: { userId, topicName: task.topicName }
      });

      if (existingProgress) {
        await userPrisma.topicProgress.update({
          where: { id: existingProgress.id },
          data: {
            progressPercentage: Math.min(100, existingProgress.progressPercentage + 20),
            masteryScore: Math.min(100, existingProgress.masteryScore + 10),
            lastActivity: new Date(),
            status: "In Progress"
          }
        });
      } else {
        await userPrisma.topicProgress.create({
          data: {
            userId,
            topicName: task.topicName,
            progressPercentage: 20,
            masteryScore: 10,
            lastActivity: new Date(),
            status: "In Progress"
          }
        });
      }

      // Add Concept Mastery Record
      const concept = await userPrisma.conceptMastery.findFirst({
        where: { userId, conceptName: task.topicName }
      });
      if (concept) {
        await userPrisma.conceptMastery.update({
          where: { id: concept.id },
          data: {
            masteryScore: Math.min(100, concept.masteryScore + 15),
            interactions: concept.interactions + 1,
            lastReviewed: new Date()
          }
        });
      } else {
        await userPrisma.conceptMastery.create({
          data: {
            userId,
            conceptName: task.topicName,
            topicName: task.topicName,
            masteryScore: 15,
            interactions: 1,
            lastReviewed: new Date()
          }
        });
      }

      // Update Progress XP (Gamification Level Ups)
      const progress = await userPrisma.progressTracking.findUnique({ where: { userId } });
      if (progress) {
        let nextXP = progress.overallProgress + 8;
        let nextLevel = progress.learningLevel;
        let nextLevelName = progress.learningLevelName;

        if (nextXP >= 100) {
          nextXP = nextXP - 100;
          nextLevel += 1;
          const levels = ["Beginner", "Explorer", "Learner", "Achiever", "Scholar", "Expert", "Master"];
          nextLevelName = levels[Math.min(levels.length - 1, nextLevel - 1)];
        }

        await userPrisma.progressTracking.update({
          where: { userId },
          data: {
            overallProgress: nextXP,
            learningLevel: nextLevel,
            learningLevelName: nextLevelName,
            studySessions: progress.studySessions + 1
          }
        });
      }
    }

    res.json({ success: true, task });
  } catch (error) {
    handleRouteError(res, error, "StudyPlanner.completeTask", "Failed to update study task status");
  }
});

// POST /api/study-planner/reschedule
studyPlannerRouter.post("/reschedule", async (req: any, res: any) => {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    const plan = await userPrisma.studyPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    if (!plan) {
      return res.status(404).json({ error: "No active study plan found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all pending overdue tasks
    const overdueTasks = await userPrisma.studyTask.findMany({
      where: {
        studyPlanId: plan.id,
        status: "Pending",
        scheduledDate: { lt: today }
      },
      orderBy: { scheduledDate: "asc" }
    });

    if (overdueTasks.length === 0) {
      return res.json({ success: true, message: "No tasks to reschedule", plan });
    }

    // Shift overdue tasks to start from today onwards
    let datePointer = new Date(today);
    let tasksRescheduledCount = 0;

    for (let i = 0; i < overdueTasks.length; i++) {
      if (i > 0 && i % 2 === 0) {
        datePointer.setDate(datePointer.getDate() + 1);
      }
      
      const targetTask = overdueTasks[i];
      const targetDate = new Date(datePointer);

      await userPrisma.studyTask.update({
        where: { id: targetTask.id },
        data: { scheduledDate: targetDate }
      });

      // Shift corresponding revisions
      const revisions = await userPrisma.studyRevision.findMany({
        where: { userId, topicName: targetTask.topicName, status: "Pending" }
      });

      const revisionIntervals = [1, 3, 7, 14, 30];
      for (let rIdx = 0; rIdx < revisions.length; rIdx++) {
        const intervalDays = revisionIntervals[Math.min(rIdx, revisionIntervals.length - 1)];
        const newRevDate = new Date(targetDate);
        newRevDate.setDate(targetDate.getDate() + intervalDays);

        await userPrisma.studyRevision.update({
          where: { id: revisions[rIdx].id },
          data: { revisionDate: newRevDate }
        });
      }

      tasksRescheduledCount++;
    }

    res.json({
      success: true,
      message: `Successfully rescheduled ${tasksRescheduledCount} missed tasks starting from today.`,
      plan
    });
  } catch (error) {
    handleRouteError(res, error, "StudyPlanner.reschedule", "Failed to reschedule tasks");
  }
});

// GET /api/study-planner/recommendations
studyPlannerRouter.get("/recommendations", async (req: any, res: any) => {
  try {
    const userId = req.user!.userId;
    const userPrisma = await getUserPrismaFromRequest(req);

    const plan = await userPrisma.studyPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    if (!plan) {
      return res.json({ success: true, recommendations: [] });
    }

    const tasks = await userPrisma.studyTask.findMany({
      where: { studyPlanId: plan.id, status: "Pending" },
      orderBy: { scheduledDate: "asc" },
      take: 3
    });

    const revisions = await userPrisma.studyRevision.findMany({
      where: { userId, status: "Pending", revisionDate: { lte: new Date() } },
      orderBy: { revisionDate: "asc" },
      take: 2
    });

    const recommendations = [];

    // Prioritize pending tasks
    if (tasks.length > 0) {
      recommendations.push({
        type: "study",
        title: `Study: ${tasks[0].topicName}`,
        reason: "This is scheduled next in your planner. Exam relevance is high.",
        priority: "High",
        action: "Study Now"
      });
    }

    // Add revision recommendations
    for (const rev of revisions) {
      recommendations.push({
        type: "revise",
        title: `Revise: ${rev.topicName}`,
        reason: `Your spaced repetition (${rev.revisionType.replace(" Revision", "")}) is due today to combat the forgetting curve.`,
        priority: "High",
        action: "Review Notes"
      });
    }

    // Default recommendations if list is short
    if (recommendations.length < 3) {
      recommendations.push({
        type: "practice",
        title: `DSA Practice on ${plan.title}`,
        reason: "Active recall via practice retention boost.",
        priority: "Medium",
        action: "Start Quiz"
      });
    }

    res.json({ success: true, recommendations });
  } catch (error) {
    handleRouteError(res, error, "StudyPlanner.recommendations", "Failed to fetch study recommendations");
  }
});

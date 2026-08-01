import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { adminDbService } from "../services/admin-db.service";
import { httpError } from "../utils/httpError";
import bcrypt from "bcrypt";
import { autoResolveCompanyLogo } from "../utils/companyLogoResolver";
import { JobDiscoveryService } from "../services/job-discovery.service";

// Memory store for global admin settings
let systemSettingsMemory = {
  platformName: "Adyapan AI",
  supportEmail: "support@adyapan.ai",
  defaultLanguage: "en",
  maintenanceMode: false,
  announcementBanner: "",
  registrationOpen: true,
  defaultAiModel: "gemini",
  aiTemperature: 0.7,
  freeTierTokenLimit: 10000,
  premiumTierTokenLimit: 100000,
  logoUrl: "/assets/logo.png",
  primaryBrandColor: "#f59e0b",
  faviconUrl: "/favicon.ico",
  minPasswordLength: 6,
  mfaRequired: false,
  sessionTimeout: 60,
};

export function getSystemSettingsMemory() {
  return systemSettingsMemory;
}

// ─── 1. Dashboard Overview ───────────────────────────────────────

export async function getDashboardStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Master DB queries (users, payments)
    const [
      totalUsers,
      adminUsers,
      premiumUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      payments,
      totalRevenue,
      monthRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { plan: { not: "free" }, subscriptionStatus: "active" } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.payment.findMany({ select: { amount: true, status: true, createdAt: true } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "paid" } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "paid", createdAt: { gte: monthAgo } } }),
    ]);

    // Cross-DB queries for user-hub tables
    const userHubTables = [
      "resume", "aTSReport", "coverLetter", "linkedInReport",
      "studySession", "generatedNote", "quiz", "assignment",
      "presentation", "mindMap", "codingSession", "submission",
      "challengeSubmission", "interviewSession", "chatSession",
    ];

    const hubCounts = await adminDbService.countAllAcrossAllUserDbs(userHubTables);

    const [
      resumeCount, atsCount, coverLetterCount, linkedinCount,
      studySessions, notesCount, quizzesCount, assignmentsCount,
      pptsCount, mindmapsCount, codingSessions, submissionsCount,
      challengesCount, interviewSessions, chatSessions,
    ] = userHubTables.map((t) => hubCounts[t] ?? 0);

    const revenueTotal = totalRevenue._sum.amount ?? 0;
    const revenueMonth = monthRevenue._sum.amount ?? 0;
    const successfulPayments = payments.filter(p => p.status === "paid").length;
    const failedPayments = payments.filter(p => p.status === "failed").length;

    const freeUsers = totalUsers - premiumUsers - adminUsers;

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          admin: adminUsers,
          premium: premiumUsers,
          free: Math.max(0, freeUsers),
          newToday: newUsersToday,
          newWeek: newUsersWeek,
          newMonth: newUsersMonth,
        },
        revenue: {
          total: revenueTotal,
          month: revenueMonth,
          successfulPayments,
          failedPayments,
          totalPayments: payments.length,
        },
        modules: {
          resume: { resumes: resumeCount, atsReports: atsCount, coverLetters: coverLetterCount, linkedinReports: linkedinCount },
          learning: { studySessions, notes: notesCount, quizzes: quizzesCount, assignments: assignmentsCount, ppts: pptsCount, mindmaps: mindmapsCount },
          coding: { sessions: codingSessions, submissions: submissionsCount, challenges: challengesCount },
          interview: { sessions: interviewSessions },
          chat: { sessions: chatSessions },
        },
        totalAiRequests: resumeCount + atsCount + coverLetterCount + linkedinCount + studySessions + notesCount + quizzesCount + assignmentsCount + pptsCount + mindmapsCount + codingSessions + submissionsCount + interviewSessions + chatSessions,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 2. Activity Feed ────────────────────────────────────────────

export async function getActivityFeed(_req: Request, res: Response, next: NextFunction) {
  try {
    // Master DB: recent users + payments
    const [recentUsers, recentPayments] = await Promise.all([
      prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, createdAt: true } }),
      prisma.payment.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }),
    ]);

    // Cross-DB: recent items from user-hub tables
    const hubTables = [
      { table: "resume", action: "Generated Resume", module: "Resume Hub" },
      { table: "coverLetter", action: "Created Cover Letter", module: "Resume Hub" },
      { table: "aTSReport", action: "Ran ATS Check", module: "Resume Hub" },
      { table: "studySession", action: "Started Study Session", module: "Learning Hub" },
      { table: "generatedNote", action: "Generated Notes", module: "Learning Hub" },
      { table: "quiz", action: "Created Quiz", module: "Learning Hub" },
      { table: "assignment", action: "Generated Assignment", module: "Learning Hub" },
      { table: "presentation", action: "Created PPT", module: "Learning Hub" },
      { table: "mindMap", action: "Built Mind Map", module: "Learning Hub" },
      { table: "codingSession", action: "Started Coding Session", module: "Coding Hub" },
      { table: "submission", action: "Submitted Code", module: "Coding Hub" },
      { table: "interviewSession", action: "Completed Interview", module: "Interview Hub" },
      { table: "chatSession", action: "AI Chat Session", module: "Ady Chat" },
    ];

    const hubResults = await Promise.all(
      hubTables.map(({ table }) =>
        adminDbService.findRecentAcrossAllUserDbs(table, { take: 5, orderBy: { createdAt: "desc" } })
      )
    );

    const userIds = new Set<string>();
    hubResults.forEach(items => items.forEach((item: any) => { if (item.userId) userIds.add(item.userId); }));
    const users = userIds.size > 0
      ? await prisma.user.findMany({ where: { id: { in: Array.from(userIds) } }, select: { id: true, name: true } })
      : [];
    const userNameMap = new Map<string, string>(users.map(u => [u.id, u.name]));

    const activities: { time: Date; user: string; action: string; module: string; id: string }[] = [];

    recentUsers.forEach(u => activities.push({ time: u.createdAt, user: u.name, action: "Registered", module: "Platform", id: u.id }));
    recentPayments.forEach(p => activities.push({ time: p.createdAt, user: p.user?.name || "User", action: `Payment ${p.status}`, module: "Billing", id: p.id }));

    hubResults.forEach((items, idx) => {
      const { action, module } = hubTables[idx];
      items.forEach((item: any) => {
        const userName = userNameMap.get(item.userId) || "Unknown User";
        activities.push({ time: item.createdAt, user: userName, action, module, id: item.id });
      });
    });

    activities.sort((a, b) => b.time.getTime() - a.time.getTime());

    res.json({ success: true, activities: activities.slice(0, 50) });
  } catch (error) {
    next(error);
  }
}

// ─── 3. User Management ──────────────────────────────────────────

export async function getAdminUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const role = typeof req.query.role === "string" ? req.query.role.toUpperCase() : "";
    const plan = typeof req.query.plan === "string" ? req.query.plan.toLowerCase() : "";
    const status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role) where.role = role;
    if (plan) where.plan = plan;
    if (status === "active") where.subscriptionStatus = "active";
    else if (status === "suspended" || status === "cancelled") where.subscriptionStatus = "cancelled";

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, email: true, role: true, plan: true,
          subscriptionStatus: true, subscriptionEnd: true,
          createdAt: true, updatedAt: true,
          profile: { select: { college: true, branch: true, location: true, phone: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const hubCountTables = ["resume", "chatSession", "interviewSession", "codingSession", "studySession"];
    const perUserCounts = await adminDbService.getPerUserCounts(hubCountTables);

    const enrichedUsers = users.map(user => {
      const counts = perUserCounts.get(user.id) || {};
      return {
        ...user,
        _count: {
          resumes: counts["resume"] || 0,
          chatSessions: counts["chatSession"] || 0,
          interviewSessions: counts["interviewSession"] || 0,
          codingSessions: counts["codingSession"] || 0,
          studySessions: counts["studySession"] || 0,
        },
      };
    });

    res.json({ success: true, users: enrichedUsers, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
}

// ─── 4. User Actions ─────────────────────────────────────────────

export async function updateUserPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.id as string;
    const { plan, action, role, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw httpError(404, "User not found");

    if (action === "block" || action === "suspend" || action === "suspend_user") {
      await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: "cancelled" } });
      return res.json({ success: true, message: "User suspended" });
    }
    if (action === "unblock" || action === "activate" || action === "activate_user") {
      await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: "active" } });
      return res.json({ success: true, message: "User activated" });
    }
    if (action === "change-role" || action === "change_role") {
      const targetRole = role || req.body.role || (user.role === "ADMIN" ? "USER" : "ADMIN");
      await prisma.user.update({ where: { id: userId }, data: { role: targetRole } });
      return res.json({ success: true, message: `Role changed to ${targetRole}` });
    }
    if (action === "delete" || action === "delete_user") {
      await prisma.user.delete({ where: { id: userId } });
      return res.json({ success: true, message: "User deleted" });
    }
    if (action === "reset-password" || action === "reset_password") {
      const pwd = newPassword || req.body.newPassword || "Adyapan@123";
      const hashed = await bcrypt.hash(pwd, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
      return res.json({ success: true, message: `Password reset to ${pwd}` });
    }
    if (action === "upgrade" || action === "upgrade_plan") {
      const targetPlan = (plan || req.body.plan || "premium").toLowerCase();
      await prisma.user.update({
        where: { id: userId },
        data: { plan: targetPlan, subscriptionStatus: "active", subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      });
      return res.json({ success: true, message: `User upgraded to ${targetPlan}` });
    }
    if (action === "downgrade" || action === "downgrade_plan") {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: "free", subscriptionStatus: "inactive", subscriptionEnd: null },
      });
      return res.json({ success: true, message: "User downgraded to Free" });
    }

    throw httpError(400, "Invalid action");
  } catch (error) {
    next(error);
  }
}

// ─── 5. AI Usage Analytics ───────────────────────────────────────

export async function getAiAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const hubTables = [
      "resume", "aTSReport", "coverLetter", "linkedInReport",
      "studySession", "generatedNote", "quiz", "assignment",
      "presentation", "mindMap", "codingSession", "submission",
      "interviewSession", "chatSession",
    ];

    const counts = await adminDbService.countAllAcrossAllUserDbs(hubTables);

    const [
      totalResume, totalAts, totalCover, totalLinkedin,
      totalStudy, totalNotes, totalQuiz, totalAssign, totalPpt, totalMindmap,
      totalCoding, totalSubmit, totalInterview, totalChat,
    ] = hubTables.map((t) => counts[t] ?? 0);

    const totalRequests = totalResume + totalAts + totalCover + totalLinkedin + totalStudy + totalNotes + totalQuiz + totalAssign + totalPpt + totalMindmap + totalCoding + totalSubmit + totalInterview + totalChat;

    res.json({
      success: true,
      analytics: {
        totalRequests,
        modules: {
          resumeHub: totalResume + totalAts + totalCover + totalLinkedin,
          learningHub: totalStudy + totalNotes + totalQuiz + totalAssign + totalPpt + totalMindmap,
          codingHub: totalCoding + totalSubmit,
          interviewHub: totalInterview,
          chat: totalChat,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 6. Revenue Analytics ────────────────────────────────────────

export async function getRevenueAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [payments, monthPayments, premiumUsers, totalAgg, planCounts, recentPayments] = await Promise.all([
      prisma.payment.findMany({ where: { status: "paid" }, select: { amount: true, createdAt: true, plan: true } }),
      prisma.payment.findMany({ where: { status: "paid", createdAt: { gte: monthAgo } }, select: { amount: true, createdAt: true } }),
      prisma.user.count({ where: { subscriptionStatus: "active" } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "paid" } }),
      prisma.user.groupBy({ by: ["plan"], _count: true }),
      prisma.payment.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }),
    ]);

    const totalRevenue = totalAgg._sum.amount ?? 0;
    const monthRevenue = monthPayments.reduce((s, p) => s + p.amount, 0);

    const planDist = planCounts.map(p => ({
      name: p.plan ? p.plan.charAt(0).toUpperCase() + p.plan.slice(1) : "Free",
      value: p._count,
    }));

    const transactions = recentPayments.map(p => ({
      id: p.id,
      user: p.user?.name || p.user?.email || "User",
      amount: p.amount,
      plan: p.plan ? p.plan.charAt(0).toUpperCase() + p.plan.slice(1) : "Pro",
      status: p.status === "paid" ? "paid" : "failed",
      date: p.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      revenue: {
        total: totalRevenue,
        month: monthRevenue,
        today: payments.filter(p => new Date(p.createdAt) >= todayStart).reduce((s, p) => s + p.amount, 0),
        premiumUsers,
        totalTransactions: payments.length,
        monthTransactions: monthPayments.length,
        averageOrderValue: payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0,
        planDist,
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 7. System Health ────────────────────────────────────────────

export async function getSystemHealth(_req: Request, res: Response) {
  const usage = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    success: true,
    health: {
      status: "healthy",
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(usage.heapUsed / 1024 / 1024),
        total: Math.round(usage.heapTotal / 1024 / 1024),
        rss: Math.round(usage.rss / 1024 / 1024),
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    },
  });
}

// ─── 8. Module Analytics ─────────────────────────────────────────

export async function getModuleAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    // Resume Hub counts
    const [resumeCount, atsCount, coverCount, linkedinCount] = await Promise.all([
      adminDbService.countAcrossAllUserDbs("resume"),
      adminDbService.countAcrossAllUserDbs("aTSReport"),
      adminDbService.countAcrossAllUserDbs("coverLetter"),
      adminDbService.countAcrossAllUserDbs("linkedInReport"),
    ]);
    const resumeTemplates = await adminDbService.groupByAcrossAllUserDbs("resume", "template");

    // Learning Hub counts
    const [studyCount, notesCount, quizCount, assignCount, pptCount, mindmapCount, flashcardCount] = await Promise.all([
      adminDbService.countAcrossAllUserDbs("studySession"),
      adminDbService.countAcrossAllUserDbs("generatedNote"),
      adminDbService.countAcrossAllUserDbs("quiz"),
      adminDbService.countAcrossAllUserDbs("assignment"),
      adminDbService.countAcrossAllUserDbs("presentation"),
      adminDbService.countAcrossAllUserDbs("mindMap"),
      adminDbService.countAcrossAllUserDbs("flashcard"),
    ]);

    // Coding Hub counts
    const [codingCount, submissionCount, challengeCount] = await Promise.all([
      adminDbService.countAcrossAllUserDbs("codingSession"),
      adminDbService.countAcrossAllUserDbs("submission"),
      adminDbService.countAcrossAllUserDbs("challengeSubmission"),
    ]);

    // Interview Hub counts
    const [interviewTotal, interviewCompleted] = await Promise.all([
      adminDbService.countAcrossAllUserDbs("interviewSession"),
      adminDbService.countAcrossAllUserDbs("interviewSession", { status: "completed" }),
    ]);
    const interviewByType = await adminDbService.groupByAcrossAllUserDbs("interviewSession", "type");

    res.json({
      success: true,
      modules: {
        resumeHub: {
          total: resumeCount + atsCount + coverCount + linkedinCount,
          resumes: resumeCount,
          atsReports: atsCount,
          coverLetters: coverCount,
          linkedinReports: linkedinCount,
          templates: Object.entries(resumeTemplates).map(([template, count]) => ({ template, _count: { template: count } })),
        },
        learningHub: {
          total: studyCount + notesCount + quizCount + assignCount + pptCount + mindmapCount + flashcardCount,
          studySessions: studyCount,
          notes: notesCount,
          quizzes: quizCount,
          assignments: assignCount,
          ppts: pptCount,
          mindmaps: mindmapCount,
          flashcards: flashcardCount,
        },
        codingHub: {
          total: codingCount + submissionCount + challengeCount,
          sessions: codingCount,
          submissions: submissionCount,
          challenges: challengeCount,
        },
        interviewHub: {
          total: interviewTotal,
          completed: interviewCompleted,
          completionRate: interviewTotal > 0 ? Math.round((interviewCompleted / interviewTotal) * 100) : 0,
          byType: Object.entries(interviewByType).map(([type, count]) => ({ type, _count: { type: count } })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 9. Security Logs ────────────────────────────────────────────

export async function getSecurityLogs(_req: Request, res: Response, next: NextFunction) {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [adminCount, activeAdminCount, logins, admins, alerts, failed24h] = await Promise.all([
      prisma.user.count({ where: { role: "ADMIN" } }),
      (prisma as any).adminUser.count({ where: { status: "ACTIVE" } }),
      (prisma as any).adminLoginHistory.findMany({
        take: 14,
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).adminUser.findMany({
        take: 10,
        orderBy: { lastLoginAt: "desc" },
        include: { role: true },
      }),
      (prisma as any).adminNotification.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).adminLoginHistory.count({
        where: { status: "FAILED", createdAt: { gte: last24h } },
      }),
    ]);

    const failedLogins = failed24h;
    const status = failedLogins > 10 ? "critical" : failedLogins > 0 ? "warning" : "secure";

    res.json({
      success: true,
      security: {
        totalAdmins: adminCount,
        activeSessions: activeAdminCount,
        failedLogins,
        blockedIps: 0,
        status,
        logins: logins.map((l: any) => ({
          id: l.id,
          email: l.email,
          ipAddress: l.ipAddress || "—",
          userAgent: l.userAgent || "",
          status: l.status === "SUCCESS" ? "success" : "failed",
          timestamp: l.createdAt.toISOString(),
        })),
        admins: admins.map((a: any) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role?.name || "Admin",
          lastActive: (a.lastLoginAt || a.createdAt).toISOString(),
          permissions: a.role?.name === "Super Admin" ? ["all"] : [],
        })),
        alerts: alerts.map((n: any) => ({
          id: n.id,
          title: n.title,
          description: n.message,
          severity: n.type === "critical" || n.type === "warning" ? n.type : "info",
          source: "Admin System",
          timestamp: n.createdAt.toISOString(),
          acknowledged: n.isRead,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    await (prisma as any).adminNotification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
}

// ─── 10. Job Management & Placement Telemetry ────────────────────

export async function getAdminJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const p = prisma as any;
    const [jobs, total, activeJobs, featuredJobs, companiesGroup] = await Promise.all([
      p.discoveryJob.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      p.discoveryJob.count({ where }),
      p.discoveryJob.count({ where: { isActive: true } }),
      p.discoveryJob.count({ where: { isFeatured: true } }),
      p.discoveryJob.groupBy({ by: ["company"] }),
    ]);

    const stats = {
      totalJobs: total,
      activeJobs,
      featuredJobs,
      companies: companiesGroup.length,
    };

    res.json({ success: true, jobs, pagination: { total, page, limit, pages: Math.ceil(total / limit) }, stats });
  } catch (error) {
    next(error);
  }
}

export async function createAdminJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, company, location, salaryMin, salaryMax, employmentType, workMode, applyUrl, description, skills } = req.body;
    if (!title || !company) throw httpError(400, "Title and company are required");

    const fingerprint = `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}-${title.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`;
    const logoUrl = autoResolveCompanyLogo(company, req.body.logoUrl);

    const job = await (prisma as any).discoveryJob.create({
      data: {
        fingerprint,
        title,
        company,
        logoUrl,
        location: location || "Remote",
        description: description || "No description provided",
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        employmentType: employmentType || "Full-Time",
        workMode: workMode || "Remote",
        skills: Array.isArray(skills) ? skills : [],
        applyUrl: applyUrl || "https://adyapan.ai",
        source: "Admin Manual",
        isActive: true,
        isFeatured: true,
      },
    });

    res.json({ success: true, message: "Job created successfully", job });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminJob(req: Request, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id as string;
    const { isActive, isFeatured, title, company, location, salaryMin, salaryMax } = req.body;

    const job = await (prisma as any).discoveryJob.findUnique({ where: { id: jobId } });
    if (!job) throw httpError(404, "Job not found");

    const updateData: any = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (typeof isFeatured === "boolean") updateData.isFeatured = isFeatured;
    if (title) updateData.title = title;
    if (company) {
      updateData.company = company;
      updateData.logoUrl = autoResolveCompanyLogo(company, job.logoUrl);
    }
    if (location) updateData.location = location;
    if (salaryMin !== undefined) updateData.salaryMin = Number(salaryMin);
    if (salaryMax !== undefined) updateData.salaryMax = Number(salaryMax);

    const updated = await (prisma as any).discoveryJob.update({
      where: { id: jobId },
      data: updateData,
    });

    res.json({ success: true, message: "Job updated successfully", job: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminJob(req: Request, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id as string;
    await (prisma as any).discoveryJob.delete({ where: { id: jobId } });
    res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function triggerJobIngestion(_req: Request, res: Response, next: NextFunction) {
  try {
    JobDiscoveryService.syncSources().catch(err => console.error("Ingestion background error:", err));
    res.json({ success: true, message: "Job ingestion process launched in background" });
  } catch (error) {
    next(error);
  }
}

// ─── 11. System Settings ─────────────────────────────────────────

export async function getAdminSettings(_req: Request, res: Response) {
  res.json({ success: true, settings: systemSettingsMemory });
}

export async function updateAdminSettings(req: Request, res: Response) {
  systemSettingsMemory = { ...systemSettingsMemory, ...req.body };
  res.json({ success: true, message: "System settings updated successfully", settings: systemSettingsMemory });
}

export async function getAnalyticsBI(_req: Request, res: Response, next: NextFunction) {
  try {
    const p = prisma as any;
    const [totalUsers, activePremium, totalJobs, totalCoding] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { subscriptionStatus: "active" } }),
      p.discoveryJob ? p.discoveryJob.count() : Promise.resolve(0),
      p.codingQuestion ? p.codingQuestion.count() : Promise.resolve(0),
    ]);

    const premiumConversionRate = totalUsers > 0 ? Math.round((activePremium / totalUsers) * 100) : 0;

    res.json({
      success: true,
      analytics: {
        totalUsers,
        activePremium,
        premiumConversionRate,
        totalJobs,
        totalCoding,
      },
    });
  } catch (error) {
    next(error);
  }
}


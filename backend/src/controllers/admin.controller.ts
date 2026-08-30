import type { NextFunction, Request, Response } from "express";
import type { AdminAuthRequest } from "../middleware/adminAuth";
import { prisma } from "../config/prisma";
import { adminDbService } from "../services/admin-db.service";
import { databaseService } from "../services/database.service";
import { createPrismaClient } from "../config/dynamicPrisma";
import { httpError } from "../utils/httpError";
import { env } from "../config/env";
import bcrypt from "bcrypt";
import { autoResolveCompanyLogo } from "../utils/companyLogoResolver";
import { JobDiscoveryService } from "../services/job-discovery.service";
import { emitBroadcastNotification } from "../lib/notificationEmitter";
import { AdminAuditService } from "../services/admin-audit.service";
import { registerUser } from "../services/auth.service";
import { calculateProfileCompletion } from "../utils/profileCompletion";
import {
  generateAllTopicTestsForAdmin,
  getAptitudeAdminOverview,
  getAllAptitudeTestsForAdmin,
  deleteAptitudeTestById,
  generateWeeklyTopicTest,
} from "../services/aptitude-test-bank.service";
import { getUserPrismaFromRequest } from "../utils/prisma";

// ─── Global admin settings (DB-backed via AdminSetting) ──────────

const DEFAULT_SYSTEM_SETTINGS = {
  platformName: "Adyapan AI",
  supportEmail: "support@adyapan.ai",
  defaultLanguage: "en",
  maintenanceMode: false,
  announcementBanner: "",
  registrationOpen: true,
  defaultAiModel: "gemini",
  aiTemperature: 0.7,
  freeTierTokenLimit: 500000,
  premiumTierTokenLimit: 5000000,
  freeTierDailyRequests: 50,
  premiumTierDailyRequests: 200,
  enterpriseTierDailyTokens: 20000000,
  enterpriseTierDailyRequests: 1000,
  logoUrl: "/assets/logo.png",
  primaryBrandColor: "#f59e0b",
  faviconUrl: "/favicon.ico",
  minPasswordLength: 6,
  mfaRequired: false,
  sessionTimeout: 60,
} as const;

type SystemSettings = typeof DEFAULT_SYSTEM_SETTINGS;

// Fast in-memory cache consumed synchronously by config routes & token tracking.
let systemSettingsMemory: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
let settingsLoadPromise: Promise<void> | null = null;

export function getSystemSettingsMemory() {
  return systemSettingsMemory;
}

function coerceSettingValue(key: string, value: unknown): unknown {
  const current = (DEFAULT_SYSTEM_SETTINGS as any)[key];
  if (typeof current === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : current;
  }
  if (typeof current === "boolean") {
    return value === true || value === "true" || value === 1 || value === "1";
  }
  return value == null ? current : String(value);
}

async function loadSystemSettingsFromDb(): Promise<void> {
  try {
    const rows = await (prisma as any).adminSetting.findMany();
    if (!Array.isArray(rows) || rows.length === 0) return;
    const merged: any = { ...DEFAULT_SYSTEM_SETTINGS };
    for (const row of rows) {
      if (row.key in DEFAULT_SYSTEM_SETTINGS) {
        merged[row.key] = coerceSettingValue(row.key, row.value);
      }
    }
    systemSettingsMemory = merged;
  } catch (err) {
    console.warn("[loadSystemSettingsFromDb] Failed to load admin settings:", err);
  }
}

function ensureSettingsLoaded(): Promise<void> {
  if (!settingsLoadPromise) {
    settingsLoadPromise = loadSystemSettingsFromDb();
  }
  return settingsLoadPromise;
}

// ─── 1. Dashboard Overview ───────────────────────────────────────

export async function getDashboardStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalUsers = 0;
    let adminUsers = 0;
    let premiumUsers = 0;
    let newUsersToday = 0;
    let newUsersWeek = 0;
    let newUsersMonth = 0;
    let payments: any[] = [];
    let revenueTotal = 0;
    let revenueMonth = 0;

    try {
      const [tUsers, aUsers, pUsers, nToday, nWeek, nMonth, pymts, totalRev, monthRev] = await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.user.count({ where: { role: "ADMIN" } }).catch(() => 0),
        prisma.user.count({ where: { OR: [{ plan: { not: "free" } }, { subscriptionStatus: "active" }] } }).catch(() => 0),
        prisma.user.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
        prisma.user.count({ where: { createdAt: { gte: weekAgo } } }).catch(() => 0),
        prisma.user.count({ where: { createdAt: { gte: monthAgo } } }).catch(() => 0),
        prisma.payment.findMany({ select: { amount: true, status: true, createdAt: true } }).catch(() => []),
        prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "paid" } }).catch(() => ({ _sum: { amount: 0 } })),
        prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "paid", createdAt: { gte: monthAgo } } }).catch(() => ({ _sum: { amount: 0 } })),
      ]);

      totalUsers = tUsers;
      adminUsers = aUsers;
      premiumUsers = pUsers;
      newUsersToday = nToday;
      newUsersWeek = nWeek;
      newUsersMonth = nMonth;
      payments = pymts || [];
      revenueTotal = Math.round(((totalRev?._sum?.amount ?? 0) / 100) * 100) / 100;
      revenueMonth = Math.round(((monthRev?._sum?.amount ?? 0) / 100) * 100) / 100;
    } catch (dbErr) {
      console.error("[getDashboardStats] Master DB query error:", dbErr);
    }

    // Cross-DB queries for user-hub tables
    const userHubTables = [
      "resume", "aTSReport", "coverLetter", "linkedInReport",
      "studySession", "generatedNote", "quiz", "assignment",
      "presentation", "mindMap", "codingSession", "submission",
      "challengeSubmission", "interviewSession", "chatSession",
    ];

    let hubCounts: Record<string, number> = {};
    try {
      hubCounts = await adminDbService.countAllAcrossAllUserDbs(userHubTables);
    } catch (hubErr) {
      console.error("[getDashboardStats] Hub counts error:", hubErr);
    }

    const [
      resumeCount, atsCount, coverLetterCount, linkedinCount,
      studySessions, notesCount, quizzesCount, assignmentsCount,
      pptsCount, mindmapsCount, codingSessions, submissionsCount,
      challengesCount, interviewSessions, chatSessions,
    ] = userHubTables.map((t) => hubCounts[t] ?? 0);

    const successfulPayments = payments.filter(p => p.status === "paid").length;
    const failedPayments = payments.filter(p => p.status === "failed").length;

    const freeUsers = Math.max(0, totalUsers - premiumUsers - adminUsers);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          admin: adminUsers,
          premium: premiumUsers,
          free: freeUsers,
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

// ─── Registration Analytics (RegistrationDailyMetric + Organization counters) ─

export async function getRegistrationAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Math.min(Math.max(Number(req.query?.days ?? 30) || 30, 1), 90);
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const [daily, orgAgg, deptAgg, courseAgg, branchAgg] = await Promise.all([
      prisma.registrationDailyMetric
        .findMany({
          where: { date: { gte: since } },
          orderBy: { date: "asc" },
        })
        .catch(() => []),
      prisma.organization
        .aggregate({
          _count: { _all: true },
          _sum: { studentCount: true, activeStudents: true, registrationCount: true },
          where: { type: "UNIVERSITY" },
        })
        .catch(() => ({ _count: { _all: 0 }, _sum: { studentCount: 0, activeStudents: 0, registrationCount: 0 } })),
      prisma.universityDepartment.aggregate({ _count: { _all: true } }).catch(() => ({ _count: { _all: 0 } })),
      prisma.universityCourse.aggregate({ _count: { _all: true } }).catch(() => ({ _count: { _all: 0 } })),
      prisma.universityBranch.aggregate({ _count: { _all: true } }).catch(() => ({ _count: { _all: 0 } })),
    ]);

    // Top universities by registration count (drives leaderboards / growth).
    const topUniversities = await prisma.organization
      .findMany({
        where: { type: "UNIVERSITY", registrationCount: { gt: 0 } },
        orderBy: { registrationCount: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          country: true,
          studentCount: true,
          activeStudents: true,
          courseCount: true,
          departmentCount: true,
          branchCount: true,
          registrationCount: true,
          latestRegistrationAt: true,
        },
      })
      .catch(() => []);

    res.json({
      success: true,
      analytics: {
        totals: {
          universities: orgAgg._count._all,
          students: orgAgg._sum.studentCount ?? 0,
          activeStudents: orgAgg._sum.activeStudents ?? 0,
          registrations: orgAgg._sum.registrationCount ?? 0,
          departments: deptAgg._count._all,
          courses: courseAgg._count._all,
          branches: branchAgg._count._all,
        },
        daily,
        topUniversities,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 2. Activity Feed ────────────────────────────────────────────

export async function getActivityFeed(_req: Request, res: Response, next: NextFunction) {  try {
    let recentUsers: any[] = [];
    let recentPayments: any[] = [];

    try {
      [recentUsers, recentPayments] = await Promise.all([
        prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, createdAt: true } }).catch(() => []),
        prisma.payment.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }).catch(() => []),
      ]);
    } catch {}

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

    let hubResults: any[][] = [];
    try {
      hubResults = await Promise.all(
        hubTables.map(({ table }) =>
          adminDbService.findRecentAcrossAllUserDbs(table, { take: 5, orderBy: { createdAt: "desc" } }).catch(() => [])
        )
      );
    } catch {
      hubResults = hubTables.map(() => []);
    }

    const userIds = new Set<string>();
    hubResults.forEach(items => items.forEach((item: any) => { if (item?.userId) userIds.add(item.userId); }));
    const users = userIds.size > 0
      ? await prisma.user.findMany({ where: { id: { in: Array.from(userIds) } }, select: { id: true, name: true } }).catch(() => [])
      : [];
    const userNameMap = new Map<string, string>(users.map(u => [u.id, u.name]));

    let settingsAudit: any[] = [];
    try {
      if ((prisma as any).adminAuditLog) {
        settingsAudit = await (prisma as any).adminAuditLog.findMany({
          take: 30,
          orderBy: { createdAt: "desc" },
        }).catch(() => []);
      }
    } catch {
      settingsAudit = [];
    }

    const adminActorIds = Array.from(new Set(settingsAudit.map((log: any) => log.adminId).filter(Boolean)));
    const adminNameMap = new Map<string, string>();
    if (adminActorIds.length > 0) {
      try {
        const admins = await (prisma as any).adminUser.findMany({
          where: { id: { in: adminActorIds } },
          select: { id: true, name: true },
        });
        admins.forEach((a: any) => adminNameMap.set(a.id, a.name));
      } catch {}
    }

    const moduleLabels: Record<string, string> = {
      Settings: "System Settings",
      "User Management": "User Management",
      Billing: "Billing & Finance",
      Coupons: "Billing & Finance",
      Plans: "Billing & Finance",
      Organization: "Organization Management",
      Jobs: "Placement Ecosystem",
      Support: "Support",
      Security: "Security Center",
      Notifications: "Notifications",
    };

    const activities: { time: Date; user: string; action: string; module: string; id: string }[] = [];

    (recentUsers || []).forEach(u => activities.push({ time: u.createdAt, user: u.name, action: "Registered", module: "Platform", id: u.id }));
    (recentPayments || []).forEach(p => activities.push({ time: p.createdAt, user: p.user?.name || "User", action: `Payment ${p.status}`, module: "Billing", id: p.id }));

    settingsAudit.forEach((log: any) => {
      const isUserAction = log.details?.actorRole === "user" || (!log.adminId && !log.adminName);
      const actor = isUserAction
        ? userNameMap.get(log.targetId) || log.details?.userEmail || "User"
        : log.adminName || adminNameMap.get(log.adminId) || "Admin";
      activities.push({
        time: log.createdAt,
        user: actor,
        action: log.action,
        module: moduleLabels[log.module] || log.module || "Admin",
        id: log.id,
      });
    });

    hubResults.forEach((items, idx) => {
      const { action, module } = hubTables[idx];
      (items || []).forEach((item: any) => {
        const userName = userNameMap.get(item.userId) || "Unknown User";
        activities.push({ time: item.createdAt || new Date(), user: userName, action, module, id: item.id || String(Math.random()) });
      });
    });

    activities.sort((a, b) => (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0));

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

    const perUserCounts = await adminDbService.getPerUserCounts(users.map(u => u.id));

    const enrichedUsers = users.map(user => {
      const planLower = (user.plan || "").toLowerCase();
      const isPremium = planLower !== "" && planLower !== "free";
      const storageLimitMb = isPremium ? 200 : 50;

      const counts = perUserCounts.get(user.id) || {};
      const resumes = counts["resume"] || 0;
      const chats = counts["chatSession"] || 0;
      const interviewSessions = counts["interviewSession"] || 0;
      const codingSessions = counts["codingSession"] || 0;
      const studySessions = counts["studySession"] || 0;

      const storageUsedMb = parseFloat((resumes * 0.5 + interviewSessions * 0.1 + codingSessions * 0.1 + studySessions * 0.05 + chats * 0.02).toFixed(2));
      const storagePercent = Math.min(100, Math.round((storageUsedMb / storageLimitMb) * 100));

      return {
        ...user,
        storage: {
          limitMb: storageLimitMb,
          usedMb: storageUsedMb,
          percentUsed: storagePercent,
        },
        _count: {
          resumes,
          chatSessions: chats,
          interviewSessions,
          codingSessions,
          studySessions,
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

    const adminId = (req as any).adminUser?.id;
    const adminName = (req as any).adminUser?.name || "Admin";
    const auditDetails = () => ({ userId, email: user.email });

    if (action === "block" || action === "suspend" || action === "suspend_user") {
      await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: "cancelled" } });
      await AdminAuditService.log({
        adminId, adminName,
        action: "User Suspended",
        module: "User Management",
        targetId: userId,
        details: auditDetails(),
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: "User suspended" });
    }
    if (action === "unblock" || action === "activate" || action === "activate_user") {
      await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: "active" } });
      await AdminAuditService.log({
        adminId, adminName,
        action: "User Activated",
        module: "User Management",
        targetId: userId,
        details: auditDetails(),
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: "User activated" });
    }
    if (action === "delete" || action === "delete_user") {
      await prisma.user.delete({ where: { id: userId } });
      await AdminAuditService.log({
        adminId, adminName,
        action: "User Deleted",
        module: "User Management",
        targetId: userId,
        details: auditDetails(),
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: "User deleted" });
    }
    if (action === "reset-password" || action === "reset_password") {
      const pwd = newPassword || req.body.newPassword || "Adyapan@123";
      const hashed = await bcrypt.hash(pwd, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
      await AdminAuditService.log({
        adminId, adminName,
        action: "Password Reset",
        module: "User Management",
        targetId: userId,
        details: auditDetails(),
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: `Password reset to ${pwd}` });
    }
    if (action === "upgrade" || action === "upgrade_plan") {
      const targetPlan = (plan || req.body.plan || "premium").toLowerCase();
      await prisma.user.update({
        where: { id: userId },
        data: { plan: targetPlan, subscriptionStatus: "active", subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      });
      await AdminAuditService.log({
        adminId, adminName,
        action: "User Upgraded",
        module: "User Management",
        targetId: userId,
        details: { ...auditDetails(), from: user.plan, to: targetPlan },
        ipAddress: req.ip,
      });
      const isUpgradePremium = targetPlan !== "" && targetPlan !== "free";
      return res.json({
        success: true,
        message: `User upgraded to ${targetPlan} (Storage limit assigned: 200 MB)`,
        storageLimitMb: isUpgradePremium ? 200 : 50,
      });
    }
    if (action === "downgrade" || action === "downgrade_plan") {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: "free", subscriptionStatus: "inactive", subscriptionEnd: null },
      });
      await AdminAuditService.log({
        adminId, adminName,
        action: "User Downgraded",
        module: "User Management",
        targetId: userId,
        details: { ...auditDetails(), from: user.plan, to: "free" },
        ipAddress: req.ip,
      });
      return res.json({
        success: true,
        message: "User downgraded to Free (Storage limit assigned: 50 MB)",
        storageLimitMb: 50,
      });
    }

    throw httpError(400, "Invalid action");
  } catch (error) {
    next(error);
  }
}

// ─── 4b. Create User (Admin) ─────────────────────────────────────

export async function createAdminUser(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      name, email, password, role,
      firstName, lastName, phone,
      college, branch, year, degree,
      country, state, city,
      department, course, semester, studentId,
      plan, // optional plan code to assign (e.g. "pro_monthly", "premium", "free")
    } = req.body;

    if (!name || !email || !password) {
      throw httpError(400, "Name, email, and password are required");
    }

    const targetRole = role === "ADMIN" ? "ADMIN" : "USER";

    // Only designated super-admins may create ADMIN accounts. Any other admin
    // can still create regular USER accounts, but minting new admins is
    // restricted to the allowlist (env.superAdminEmails).
    if (targetRole === "ADMIN") {
      const requesterEmail = (req as AdminAuthRequest).adminUser?.email?.toLowerCase();
      if (!requesterEmail || !env.superAdminEmails.includes(requesterEmail)) {
        throw httpError(403, "You are not authorized to create admin accounts. Contact a super administrator.");
      }
    }

    // Use the same registration flow as normal signup
    const result = await registerUser({
      name,
      email,
      password,
      role: targetRole,
      firstName,
      lastName,
      phone,
      college,
      branch,
      year,
      degree,
      country,
      state,
      city,
      department,
      course,
      semester,
      studentId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const userId = result.user.id;

    // If a plan was specified (other than free), upgrade the user
    const planCode = (plan || "").toLowerCase().trim();
    if (planCode && planCode !== "free") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: planCode,
          subscriptionStatus: "active",
          subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      // Update or create the subscription record
      await prisma.subscription.updateMany({
        where: { userId },
        data: {
          planCode,
          status: "active",
          provider: "admin",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const adminId = (req as any).adminUser?.id;
    const adminName = (req as any).adminUser?.name || "Admin";
    await AdminAuditService.log({
      adminId,
      adminName,
      action: "User Created",
      module: "User Management",
      targetId: userId,
      details: { email, plan: planCode || "free", role: role || "USER" },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `User "${name}" created successfully${planCode && planCode !== "free" ? ` with ${planCode} plan` : ""}`,
      userId,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 4c. Edit User (Admin) ───────────────────────────────────────

export async function editAdminUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.id as string;
    const {
      name, email, role, password,
      firstName, lastName, phone,
      college, branch, year, degree,
      country, state, city,
      department, course, semester, studentId,
      plan, subscriptionStatus,
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw httpError(404, "User not found");

    // Promoting an account to ADMIN (or demoting an existing ADMIN) is
    // restricted to super-admins — the same allowlist that gates admin creation.
    // This closes the edit-user path as a privilege-escalation route.
    if (role !== undefined) {
      const changesAdminRole =
        (role === "ADMIN" && user.role !== "ADMIN") ||
        (role !== "ADMIN" && user.role === "ADMIN");
      if (changesAdminRole) {
        const requesterEmail = (req as AdminAuthRequest).adminUser?.email?.toLowerCase();
        if (!requesterEmail || !env.superAdminEmails.includes(requesterEmail)) {
          throw httpError(403, "You are not authorized to change admin privileges. Contact a super administrator.");
        }
      }
    }

    // Build user update data
    const userData: any = {};
    if (name !== undefined) userData.name = name.trim();
    if (email !== undefined) userData.email = email.toLowerCase().trim();
    if (role !== undefined) userData.role = role === "ADMIN" ? "ADMIN" : "USER";
    if (firstName !== undefined) userData.firstName = firstName?.trim() || null;
    if (lastName !== undefined) userData.lastName = lastName?.trim() || null;
    if (password) {
      userData.password = await bcrypt.hash(password, 12);
    }

    // Handle plan change
    const planCode = plan !== undefined ? (plan || "").toLowerCase().trim() : undefined;
    if (planCode !== undefined && planCode !== (user.plan || "").toLowerCase()) {
      userData.plan = planCode || "free";
      if (planCode && planCode !== "free") {
        userData.subscriptionStatus = "active";
        userData.subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      } else {
        userData.subscriptionStatus = "free";
        userData.subscriptionEnd = null;
      }
      // Update subscription record
      const existingSub = await prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            planCode: planCode || "free",
            status: planCode && planCode !== "free" ? "active" : "free",
            provider: "admin",
            currentPeriodEnd: planCode && planCode !== "free"
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    } else if (subscriptionStatus !== undefined) {
      userData.subscriptionStatus = subscriptionStatus;
    }

    // Update user record
    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userData });
    }

    // Build profile update data
    const profileData: any = {};
    if (phone !== undefined) profileData.phone = phone?.trim() || null;
    if (college !== undefined) profileData.college = college?.trim() || null;
    if (branch !== undefined) profileData.branch = branch?.trim() || null;
    if (year !== undefined) profileData.year = year?.trim() || null;
    if (degree !== undefined) profileData.degree = degree?.trim() || null;
    if (country !== undefined) profileData.country = country?.trim() || null;
    if (state !== undefined) profileData.state = state?.trim() || null;
    if (city !== undefined) profileData.city = city?.trim() || null;
    if (department !== undefined) profileData.department = department?.trim() || null;
    if (course !== undefined) profileData.course = course?.trim() || null;
    if (semester !== undefined) profileData.semester = semester?.trim() || null;
    if (studentId !== undefined) profileData.studentId = studentId?.trim() || null;

    if (Object.keys(profileData).length > 0) {
      // Recalculate profile completion
      const mergedProfile = { ...user.profile, ...profileData };
      profileData.profileCompletion = calculateProfileCompletion(mergedProfile);

      if (user.profile) {
        await prisma.profile.update({ where: { userId }, data: profileData });
      } else {
        await prisma.profile.create({
          data: {
            userId,
            username: (email || user.email).split("@")[0],
            ...profileData,
          },
        });
      }
    }

    const adminId = (req as any).adminUser?.id;
    const adminName = (req as any).adminUser?.name || "Admin";
    await AdminAuditService.log({
      adminId,
      adminName,
      action: "User Edited",
      module: "User Management",
      targetId: userId,
      details: { email: email || user.email, fieldsChanged: Object.keys({ ...userData, ...profileData }) },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: "User updated successfully",
    });
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

    let payments: any[] = [];
    let monthPayments: any[] = [];
    let premiumUsers = 0;
    let totalRevenue = 0;
    let monthRevenue = 0;
    let planCounts: any[] = [];
    let recentPayments: any[] = [];
    let coupons: any[] = [];
    let totalDiscount = 0;
    let couponPaymentsCount = 0;

    try {
      payments = await prisma.payment.findMany({ where: { status: "paid" }, select: { amount: true, createdAt: true, plan: true } }).catch(() => []);
      monthPayments = payments.filter(p => new Date(p.createdAt) >= monthAgo);
      totalRevenue = Math.round((payments.reduce((s, p) => s + (p.amount || 0), 0) / 100) * 100) / 100;
      monthRevenue = Math.round((monthPayments.reduce((s, p) => s + (p.amount || 0), 0) / 100) * 100) / 100;
      premiumUsers = await prisma.user.count({ where: { OR: [{ plan: { not: "free" } }, { subscriptionStatus: "active" }] } }).catch(() => 0);
      planCounts = await prisma.user.groupBy({ by: ["plan"], _count: true }).catch(() => []);
      recentPayments = await prisma.payment.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }).catch(() => []);
      
      if ((prisma as any).coupon) {
        coupons = await (prisma as any).coupon.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []);
      }
      const discountAgg = await prisma.payment.aggregate({ _sum: { discountAmount: true }, where: { status: "paid" } }).catch(() => ({ _sum: { discountAmount: 0 } }));
      totalDiscount = Math.round(((discountAgg._sum.discountAmount ?? 0) / 100) * 100) / 100;
      couponPaymentsCount = await prisma.payment.count({ where: { status: "paid", couponCode: { not: null } } }).catch(() => 0);
    } catch (err) {
      console.error("[getRevenueAnalytics] Query error:", err);
    }

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
      couponCode: p.couponCode,
      discountAmount: p.discountAmount ?? 0,
      date: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
    }));

    const couponStats = {
      totalDiscount,
      totalRedemptions: couponPaymentsCount,
      coupons: coupons.map(c => ({
        id: c.id,
        code: c.code,
        discountPct: c.discountPct,
        validUntil: c.validUntil,
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        isActive: c.isActive,
      })),
    };

    const todayRevenue = Math.round((payments.filter(p => new Date(p.createdAt) >= todayStart).reduce((s, p) => s + (p.amount || 0), 0) / 100) * 100) / 100;

    res.json({
      success: true,
      revenue: {
        total: totalRevenue,
        month: monthRevenue,
        today: todayRevenue,
        premiumUsers,
        totalTransactions: payments.length,
        monthTransactions: monthPayments.length,
        averageOrderValue: payments.length > 0 ? Math.round((totalRevenue / payments.length) * 100) / 100 : 0,
        planDist,
        transactions,
        couponStats,
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
    const {
      title, company, location, salaryMin, salaryMax, employmentType, workMode,
      applyUrl, description, skills, experienceMin, experienceMax, education, passingYear
    } = req.body;
    if (!title || !company) throw httpError(400, "Title and company are required");

    const fingerprint = `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}-${title.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`;
    const logoUrl = autoResolveCompanyLogo(company, req.body.logoUrl, applyUrl);

    let educationStr = education || "";
    if (passingYear) {
      educationStr = `Batch ${passingYear}`;
    }

    let finalSkills = Array.isArray(skills) && skills.length > 0 ? skills : [];
    if (finalSkills.length === 0) {
      finalSkills = JobDiscoveryService.extractSkills(`${title} ${company} ${description || ""}`);
    }
    if (finalSkills.length === 0) {
      const lower = `${title} ${company} ${description || ""}`.toLowerCase();
      if (/analyst|risk|finance|audit|compliance|monitoring/i.test(lower)) {
        finalSkills = ["Risk Management", "Data Analysis", "Compliance", "Financial Modeling", "Excel"];
      } else if (/manager|lead|director|head|project/i.test(lower)) {
        finalSkills = ["Project Management", "Agile", "Team Leadership", "Strategic Planning", "Communication"];
      } else {
        finalSkills = ["Problem Solving", "Technical Execution", "Communication", "Data Analysis"];
      }
    }

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
        salaryCurrency: "INR",
        experienceMin: experienceMin !== undefined && experienceMin !== null && experienceMin !== "" ? Number(experienceMin) : null,
        experienceMax: experienceMax !== undefined && experienceMax !== null && experienceMax !== "" ? Number(experienceMax) : null,
        education: educationStr,
        employmentType: employmentType || "Full-Time",
        workMode: workMode || "Remote",
        skills: finalSkills,
        applyUrl: applyUrl ? String(applyUrl).trim() : "https://adyapan.ai",
        sourceUrl: applyUrl ? String(applyUrl).trim() : null,
        source: "Admin Manual",
        postedAt: new Date(),
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
    const {
      isActive, isFeatured, title, company, location, salaryMin, salaryMax,
      applyUrl, experienceMin, experienceMax, education, passingYear
    } = req.body;

    const job = await (prisma as any).discoveryJob.findUnique({ where: { id: jobId } });
    if (!job) throw httpError(404, "Job not found");

    const updateData: any = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (typeof isFeatured === "boolean") updateData.isFeatured = isFeatured;
    if (title) updateData.title = title;
    if (applyUrl !== undefined) {
      updateData.applyUrl = applyUrl ? applyUrl.trim() : null;
    }
    if (company || applyUrl) {
      updateData.company = company || job.company;
      updateData.logoUrl = autoResolveCompanyLogo(company || job.company, job.logoUrl, applyUrl || job.applyUrl);
    }
    if (location) updateData.location = location;
    if (salaryMin !== undefined) updateData.salaryMin = Number(salaryMin);
    if (salaryMax !== undefined) updateData.salaryMax = Number(salaryMax);
    if (experienceMin !== undefined) updateData.experienceMin = experienceMin ? Number(experienceMin) : null;
    if (experienceMax !== undefined) updateData.experienceMax = experienceMax ? Number(experienceMax) : null;
    if (passingYear !== undefined || education !== undefined) {
      updateData.education = passingYear ? `Batch ${passingYear}` : (education || "");
    }

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

export async function getAdminSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    await ensureSettingsLoaded();
    res.json({ success: true, settings: systemSettingsMemory });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const updates = req.body && typeof req.body === "object" ? req.body : {};
    const changedKeys = Object.keys(updates).filter((key) =>
      Object.prototype.hasOwnProperty.call(DEFAULT_SYSTEM_SETTINGS, key)
    );

    if (changedKeys.length === 0) {
      throw httpError(400, "No valid system settings keys provided");
    }

    await ensureSettingsLoaded();

    const updated: any = { ...systemSettingsMemory };
    const persisted: Record<string, any> = {};
    for (const key of changedKeys) {
      const coerced = coerceSettingValue(key, updates[key]);
      updated[key] = coerced;
      persisted[key] = coerced;
    }

    try {
      await (prisma as any).$transaction(
        changedKeys.map((key) =>
          (prisma as any).adminSetting.upsert({
            where: { key },
            create: { key, value: updated[key], category: "general" },
            update: { value: updated[key] },
          })
        )
      );
    } catch (dbErr) {
      console.warn("[updateAdminSettings] Failed to persist settings to DB:", dbErr);
    }

    systemSettingsMemory = updated;

    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name || "Admin",
      action: "System Settings Updated",
      module: "Settings",
      details: { keys: changedKeys, values: persisted },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "System settings updated successfully", settings: systemSettingsMemory });
  } catch (error) {
    next(error);
  }
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

// ─── 11a. Premium Conversion & AI Usage Analytics ────────────────

export async function getPremiumAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const p = prisma as any;
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days14Ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [users, subCount, subsMonth, subsByPlan, billingEvents, revAgg, requestLogs, reqAgg, blockedAgg, usageRows] =
      await Promise.all([
        prisma.user
          .findMany({ select: { id: true, plan: true, subscriptionStatus: true, createdAt: true } })
          .catch(() => []),
        p.subscription ? p.subscription.count().catch(() => 0) : Promise.resolve(0),
        p.subscription ? p.subscription.count({ where: { createdAt: { gte: monthAgo } } }).catch(() => 0) : Promise.resolve(0),
        p.subscription ? p.subscription.groupBy({ by: ["planCode"], _count: true }).catch(() => []) : Promise.resolve([]),
        p.billing ? p.billing.findMany({ select: { event: true, amount: true, status: true, createdAt: true } }).catch(() => []) : Promise.resolve([]),
        p.billing
          ? p.billing.aggregate({ _sum: { amount: true }, where: { status: "completed" } }).catch(() => ({ _sum: { amount: 0 } }))
          : Promise.resolve({ _sum: { amount: 0 } }),
        p.aiRequestLog ? p.aiRequestLog.findMany({ where: { createdAt: { gte: days14Ago } }, select: { createdAt: true, totalTokens: true, blocked: true, plan: true } }).catch(() => []) : Promise.resolve([]),
        p.aiRequestLog ? p.aiRequestLog.aggregate({ _sum: { totalTokens: true }, _count: true }).catch(() => ({ _sum: { totalTokens: 0 }, _count: 0 })) : Promise.resolve({ _sum: { totalTokens: 0 }, _count: 0 }),
        p.aiRequestLog ? p.aiRequestLog.count({ where: { blocked: true } }).catch(() => 0) : Promise.resolve(0),
        p.aiUsage ? p.aiUsage.findMany({ select: { plan: true, dailyTokensUsed: true, monthlyTokensUsed: true } }).catch(() => []) : Promise.resolve([]),
      ]);

    const totalUsers = users.length;
    const freeUsers = users.filter((u: any) => !u.plan || u.plan === "free").length;
    const premiumUsers = users.filter((u: any) => u.plan && u.plan !== "free" && !String(u.plan).includes("enterprise")).length;
    const enterpriseUsers = users.filter((u: any) => String(u.plan || "").includes("enterprise")).length;
    const conversionRate = totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 1000) / 10 : 0;

    const signupsLast30d = users.filter((u: any) => new Date(u.createdAt) >= monthAgo).length;
    const upgradedLast30d = subsMonth;
    const revenueTotal = revAgg._sum.amount ?? 0;
    const billingEventsArr = billingEvents || [];
    const revenueLast30d = billingEventsArr
      .filter((b: any) => b.status === "completed" && new Date(b.createdAt) >= monthAgo)
      .reduce((s: number, b: any) => s + (b.amount || 0), 0);
    const upgradesByPlan = Array.isArray(subsByPlan)
      ? subsByPlan.map((r: any) => ({ plan: r.planCode, value: r._count }))
      : [];

    // 14-day usage trend across all users
    const byDay = new Map<string, { tokens: number; requests: number; blocked: number }>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(days14Ago.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      byDay.set(key, { tokens: 0, requests: 0, blocked: 0 });
    }
    for (const log of requestLogs || []) {
      const d = new Date(log.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const bucket = byDay.get(key);
      if (!bucket) continue;
      bucket.tokens += log.totalTokens || 0;
      bucket.requests += 1;
      if (log.blocked) bucket.blocked += 1;
    }
    const usageTrend = Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));

    const totalRequests = reqAgg._count ?? 0;
    const totalTokens = reqAgg._sum?.totalTokens ?? 0;
    const blockedRequests = blockedAgg ?? 0;

    const planDist = (users as any[]).reduce((acc: Record<string, number>, u) => {
      const key = u.plan && u.plan !== "free" ? u.plan : "free";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const usageByPlan = (usageRows || []).reduce((acc: Record<string, { tokens: number; users: number }>, r: any) => {
      const key = r.plan && r.plan !== "free" ? r.plan : "free";
      if (!acc[key]) acc[key] = { tokens: 0, users: 0 };
      acc[key].tokens += r.monthlyTokensUsed || 0;
      acc[key].users += 1;
      return acc;
    }, {});

    res.json({
      success: true,
      analytics: {
        conversion: {
          totalUsers,
          freeUsers,
          premiumUsers,
          enterpriseUsers,
          conversionRate,
          signupsLast30d,
          upgradedLast30d,
          revenueTotal,
          revenueLast30d,
          upgradesByPlan,
        },
        usage: {
          totalRequests,
          totalTokens,
          blockedRequests,
          planDist,
          usageByPlan,
          trend: usageTrend,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 11b. System Integrations Status ─────────────────────────────

const INTEGRATION_KEYS = ["gemini", "openai", "claude", "groq", "openrouter"] as const;

export async function getAdminIntegrations(_req: Request, res: Response, next: NextFunction) {
  try {
    const providerKeyMap: Record<string, string> = {
      gemini: env.geminiApiKey,
      groq: env.groqApiKey,
      openrouter: env.openrouterApiKey,
      openai: "",
      claude: "",
    };

    const apiKeys: Record<string, { key: string; active: boolean }> = {};
    for (const id of INTEGRATION_KEYS) {
      const configured = Boolean(providerKeyMap[id]);
      apiKeys[id] = { key: configured ? "••••••••configured" : "", active: configured };
    }

    res.json({
      success: true,
      settings: {
        apiKeys,
        connectedAccounts: {
          google: false,
          github: Boolean(env.github.clientId && env.github.clientSecret),
          microsoft: false,
          linkedin: false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 12. System Broadcast Notifications ──────────────────────────

export async function getAdminNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const targetAudience = (req.query.targetAudience as string)?.toUpperCase();
    const type = req.query.type as string;
    const search = (req.query.search as string)?.trim();

    const where: any = {};
    if (targetAudience && targetAudience !== "ALL_FILTER") {
      where.targetAudience = targetAudience;
    }
    if (type) {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    let notifications: any[] = [];
    let total = 0;
    let activeCount = 0;
    let totalAllUsers = 0;
    let freeUsersCount = 0;
    let premiumUsersCount = 0;

    try {
      [notifications, total, totalAllUsers, freeUsersCount, premiumUsersCount] = await Promise.all([
        (prisma as any).systemNotification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
        (prisma as any).systemNotification.count({ where }),
        prisma.user.count(),
        prisma.user.count({ where: { OR: [{ plan: "free" }, { plan: "FREE" }, { plan: "" }] } }),
        prisma.user.count({ where: { OR: [{ plan: { in: ["pro", "premium", "enterprise", "pro_monthly", "pro_yearly", "PRO", "PREMIUM"] } }, { subscriptionStatus: "active" }] } }),
      ]);
      activeCount = await (prisma as any).systemNotification.count({ where: { isRevoked: false } });
    } catch (dbErr: any) {
      console.warn("[getAdminNotifications] Initial query failed, verifying tables:", dbErr?.message || dbErr);
      await ensureSystemNotificationTableExists();
      try {
        [notifications, total, totalAllUsers, freeUsersCount, premiumUsersCount] = await Promise.all([
          (prisma as any).systemNotification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }).catch(() => []),
          (prisma as any).systemNotification.count({ where }).catch(() => 0),
          prisma.user.count().catch(() => 0),
          prisma.user.count({ where: { OR: [{ plan: "free" }, { plan: "FREE" }, { plan: "" }] } }).catch(() => 0),
          prisma.user.count({ where: { OR: [{ plan: { in: ["pro", "premium", "enterprise", "pro_monthly", "pro_yearly", "PRO", "PREMIUM"] } }, { subscriptionStatus: "active" }] } }).catch(() => 0),
        ]);
        activeCount = await (prisma as any).systemNotification.count({ where: { isRevoked: false } }).catch(() => 0);
      } catch (retryErr) {
        console.error("[getAdminNotifications] Retry failed:", retryErr);
      }
    }

    res.json({
      success: true,
      notifications,
      stats: {
        totalBroadcasts: total,
        activeBroadcasts: activeCount,
        reachStats: {
          all: totalAllUsers,
          free: freeUsersCount,
          premium: premiumUsersCount,
        },
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}


async function ensureSystemNotificationTableExists() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "system_notifications" (
        "id" TEXT NOT NULL,
        "admin_id" TEXT,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'info',
        "target_audience" TEXT NOT NULL DEFAULT 'ALL',
        "action_url" TEXT,
        "priority" TEXT NOT NULL DEFAULT 'normal',
        "delivery_channel" TEXT NOT NULL DEFAULT 'in_app',
        "send_email" BOOLEAN NOT NULL DEFAULT false,
        "is_revoked" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "system_notifications_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "system_notifications_target_audience_idx" ON "system_notifications"("target_audience")`,
    `CREATE INDEX IF NOT EXISTS "system_notifications_created_at_idx" ON "system_notifications"("created_at")`,
    `CREATE TABLE IF NOT EXISTS "system_notification_reads" (
        "id" TEXT NOT NULL,
        "notification_id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "system_notification_reads_pkey" PRIMARY KEY ("id")
    )`,
  ];
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err) {
      console.warn("[ensureSystemNotificationTableExists] DDL warn:", err);
    }
  }
}

export async function createAdminBroadcastNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, message, type, targetAudience, actionUrl, priority, sendEmail } = req.body;
    if (!title || !message) throw httpError(400, "Title and message are required");

    const validAudience = ["ALL", "FREE", "PREMIUM", "ADMIN"].includes((targetAudience || "").toUpperCase())
      ? targetAudience.toUpperCase()
      : "ALL";

    let notification: any;
    try {
      notification = await (prisma as any).systemNotification.create({
        data: {
          title: title.trim(),
          message: message.trim(),
          type: type || "info",
          targetAudience: validAudience,
          actionUrl: actionUrl ? actionUrl.trim() : null,
          priority: priority || "normal",
          sendEmail: Boolean(sendEmail),
          deliveryChannel: sendEmail ? "email_in_app" : "in_app",
        },
      });
    } catch (err: any) {
      if (err?.code === "P2021" || (typeof err?.message === "string" && err.message.includes("does not exist"))) {
        console.warn("[createAdminBroadcastNotification] Table system_notifications missing, auto-creating...");
        await ensureSystemNotificationTableExists();
        notification = await (prisma as any).systemNotification.create({
          data: {
            title: title.trim(),
            message: message.trim(),
            type: type || "info",
            targetAudience: validAudience,
            actionUrl: actionUrl ? actionUrl.trim() : null,
            priority: priority || "normal",
            sendEmail: Boolean(sendEmail),
            deliveryChannel: sendEmail ? "email_in_app" : "in_app",
          },
        });
      } else {
        throw err;
      }
    }


    // Calculate reach for confirmation message
    let targetCount = 0;
    if (validAudience === "ALL") {
      targetCount = await prisma.user.count();
    } else if (validAudience === "FREE") {
      targetCount = await prisma.user.count({ where: { OR: [{ plan: "free" }, { plan: "FREE" }, { plan: "" }] } });
    } else if (validAudience === "PREMIUM") {
      targetCount = await prisma.user.count({ where: { OR: [{ plan: { in: ["pro", "premium", "enterprise", "pro_monthly", "pro_yearly", "PRO", "PREMIUM"] } }, { subscriptionStatus: "active" }] } });
    } else if (validAudience === "ADMIN") {
      targetCount = await (prisma as any).adminUser.count();
    }

    // Real-time emit notification event via Socket.io
    try {
      emitBroadcastNotification({
        id: `sys_${notification.id}`,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        targetAudience: notification.targetAudience,
        link: notification.actionUrl,
        createdAt: notification.createdAt,
      });
    } catch (e) {
      console.warn("Broadcast socket emit warning:", e);
    }

    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Notification Broadcast Created",
      module: "Notifications",
      targetId: notification.id,
      details: { title: notification.title, targetAudience: validAudience, reach: targetCount },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Notification broadcasted to ${targetCount} ${validAudience.toLowerCase()} users`,
      notification,
      targetCount,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleRevokeAdminNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const existing = await (prisma as any).systemNotification.findUnique({ where: { id } });
    if (!existing) throw httpError(404, "Notification not found");

    const updated = await (prisma as any).systemNotification.update({
      where: { id },
      data: { isRevoked: !existing.isRevoked },
    });

    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: updated.isRevoked ? "Notification Broadcast Revoked" : "Notification Broadcast Reactivated",
      module: "Notifications",
      targetId: id,
      details: { title: existing.title },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: updated.isRevoked ? "Notification broadcast revoked" : "Notification broadcast re-activated",
      notification: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const existing = await (prisma as any).systemNotification.findUnique({ where: { id } });
    await (prisma as any).systemNotification.delete({ where: { id } });

    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Notification Broadcast Deleted",
      module: "Notifications",
      targetId: id,
      details: { title: existing?.title || "" },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    next(error);
  }
}

// ─── 13. User Settings & Support Ticket Management ────────────────

const SUPPORT_STATUSES = ["open", "in_progress", "resolved", "closed"];

export async function getAdminSupportTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const tickets = await adminDbService.findRecentAcrossAllUserDbs("supportTicket", { take: 100 });

    let filtered = tickets;
    if (status && status !== "all") {
      filtered = filtered.filter((t: any) => String(t.status).toLowerCase() === status);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((t: any) =>
        String(t.subject || "").toLowerCase().includes(q) ||
        String(t.ticketId || "").toLowerCase().includes(q) ||
        String(t.message || "").toLowerCase().includes(q)
      );
    }

    const targetUserIds = Array.from(new Set(filtered.map((t: any) => t.userId || t._dbUserId).filter(Boolean)));
    const users = targetUserIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: targetUserIds } }, select: { id: true, name: true, email: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const openCount = tickets.filter((t: any) => String(t.status).toLowerCase() === "open").length;
    const inProgressCount = tickets.filter((t: any) => String(t.status).toLowerCase() === "in_progress").length;
    const resolvedCount = tickets.filter((t: any) => String(t.status).toLowerCase() === "resolved").length;
    const bugCount = tickets.filter((t: any) => String(t.category).toLowerCase() === "bug").length;

    res.json({
      success: true,
      tickets: filtered.map((t: any) => ({
        id: t.id,
        ticketId: t.ticketId,
        subject: t.subject,
        category: t.category,
        severity: t.severity,
        status: t.status,
        message: t.message,
        userId: t.userId || t._dbUserId,
        userName: userMap.get(t.userId || t._dbUserId)?.name || "Unknown User",
        userEmail: userMap.get(t.userId || t._dbUserId)?.email || "",
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      stats: {
        total: tickets.length,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        bugs: bugCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSupportTicketStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const ticketId = req.params.ticketId as string;
    const { status, note } = req.body;
    const newStatus = String(status || "").toLowerCase();
    if (!SUPPORT_STATUSES.includes(newStatus)) {
      throw httpError(400, "Status must be one of: " + SUPPORT_STATUSES.join(", "));
    }

    const tickets = await adminDbService.findRecentAcrossAllUserDbs("supportTicket", { take: 500 });
    const ticket = tickets.find((t: any) => String(t.ticketId) === ticketId || t.id === ticketId);
    if (!ticket) throw httpError(404, "Support ticket not found");

    const ownerUserId = ticket.userId || ticket._dbUserId;
    if (!ownerUserId) throw httpError(404, "Ticket owner not found");

    const dbUrl = await databaseService.getDatabaseUrlForUser(ownerUserId);
    const client = createPrismaClient(dbUrl);
    let updated: any;
    try {
      updated = await client.supportTicket.update({
        where: { id: ticket.id },
        data: { status: newStatus },
      });
    } finally {
      await client.$disconnect();
    }

    await (prisma as any).adminAuditLog.create({
      data: {
        adminId: (req as any).adminUser?.id || null,
        adminName: (req as any).adminUser?.name || "Admin",
        action: "Support Ticket Status Updated",
        module: "Support",
        targetId: ownerUserId,
        details: { ticketId, from: ticket.status, to: newStatus, note: note || null },
        ipAddress: req.ip,
      },
    });

    res.json({ success: true, message: `Ticket ${ticketId} marked as ${newStatus}`, ticket: updated });
  } catch (error) {
    next(error);
  }
}

export async function getAdminUserSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, plan: true, createdAt: true } });
    if (!user) throw httpError(404, "User not found");

    const dbUrl = await databaseService.getDatabaseUrlForUser(userId);
    const client = createPrismaClient(dbUrl);
    let data: any = {};
    try {
      const [profile, settings, storageUsage, ticketCount] = await Promise.all([
        client.profile.findUnique({ where: { userId } }),
        client.userSettings.findUnique({ where: { userId } }).catch(() => null),
        client.storageUsage.findUnique({ where: { userId } }).catch(() => null),
        client.supportTicket.count({ where: { userId } }).catch(() => 0),
      ]);
      data = { profile, settings, storageUsage, ticketCount };
    } finally {
      await client.$disconnect();
    }

    res.json({ success: true, user, ...data });
  } catch (error) {
    next(error);
  }
}

// ─── Blog Management ─────────────────────────────────────────────
export async function getAdminBlogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, category, status, page = "1", limit = "20" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: String(q), mode: "insensitive" } },
        { content: { contains: String(q), mode: "insensitive" } },
        { tags: { has: String(q) } },
      ];
    }
    if (category && category !== "All") where.category = String(category);
    if (status === "published") where.published = true;
    if (status === "draft") where.published = false;

    const p = prisma as any;

    const [blogs, total, totalPublished, totalDrafts, aggregateViews] = await Promise.all([
      p.blog.findMany({
        where,
        include: { _count: { select: { comments: true, likes: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }).catch(() => []),
      p.blog.count({ where }).catch(() => 0),
      p.blog.count({ where: { published: true } }).catch(() => 0),
      p.blog.count({ where: { published: false } }).catch(() => 0),
      p.blog.aggregate({ _sum: { views: true } }).catch(() => ({ _sum: { views: 0 } })),
    ]);

    const userIds = Array.from(new Set(blogs.map((b: any) => b.userId)));
    const authors = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, name: true, email: true },
    }).catch(() => []) : [];
    const authorMap = new Map(authors.map((u: any) => [u.id, u]));

    const enrichedBlogs = blogs.map((b: any) => ({
      ...b,
      author: authorMap.get(b.userId) || { name: "Unknown User", email: "N/A" },
    }));

    res.json({
      success: true,
      blogs: enrichedBlogs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      stats: {
        totalBlogs: total,
        totalPublished,
        totalDrafts,
        totalViews: aggregateViews?._sum?.views || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminBlogStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { published } = req.body;
    const p = prisma as any;
    const updated = await p.blog.update({
      where: { id },
      data: { published: Boolean(published) },
    });
    res.json({ success: true, blog: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminBlog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const p = prisma as any;
    await p.blog.delete({ where: { id } });
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function generateAllTopicTestsAdminCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const result = await generateAllTopicTestsForAdmin(userPrisma);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getAptitudeOverviewAdminCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const overview = await getAptitudeAdminOverview(userPrisma);
    res.json({ success: true, overview });
  } catch (error) {
    next(error);
  }
}

export async function getAptitudeTestsAdminCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const tests = await getAllAptitudeTestsForAdmin(userPrisma);
    res.json({ success: true, count: tests.length, tests });
  } catch (error) {
    next(error);
  }
}

export async function generateAptitudeTestAdminCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { topic, category } = req.body;
    if (!topic) {
      throw httpError(400, "topic is required");
    }
    const userPrisma = await getUserPrismaFromRequest(req);
    const newTest = await generateWeeklyTopicTest(String(topic), String(category || "quantitative"), userPrisma);
    res.json({ success: true, test: newTest });
  } catch (error) {
    next(error);
  }
}

export async function deleteAptitudeTestAdminCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id || "");
    const userPrisma = await getUserPrismaFromRequest(req);
    await deleteAptitudeTestById(id, userPrisma);
    res.json({ success: true, message: "Aptitude test deleted successfully" });
  } catch (error) {
    next(error);
  }
}



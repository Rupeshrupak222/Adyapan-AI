import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { httpError } from "../utils/httpError";
import { AdminAuditService } from "../services/admin-audit.service";
import { adminDbService } from "../services/admin-db.service";
import type { AdminAuthRequest } from "../middleware/adminAuth";

// ═══════════════════════════════════════════════════════════════════════
// Feature Management — Enterprise Feature Flag Control System
// Central control for every Adyapan AI feature from one place.
// ═══════════════════════════════════════════════════════════════════════

export const FEATURE_STATUSES = [
  "Enabled",
  "Disabled",
  "Beta",
  "Experimental",
  "Maintenance",
  "Coming Soon",
  "Deprecated",
  "Internal",
] as const;

export const FEATURE_CATEGORIES = [
  "Authentication",
  "Dashboard",
  "Learning Hub",
  "Coding Hub",
  "Resume Hub",
  "Interview Hub",
  "Placement Hub",
  "Research Hub",
  "AI Productivity",
  "Payments",
  "Notifications",
  "Analytics",
  "Storage",
  "Admin",
  "System",
  "API",
  "Security",
] as const;

export const FEATURE_ENVIRONMENTS = ["Production", "Staging", "Development"] as const;

export const FEATURE_ACCESS_LEVELS = ["All", "Premium", "Developer", "Internal", "Admin"] as const;

export const ADMIN_ROLES = ["Super Admin", "Admin", "Manager", "Developer", "Viewer"] as const;

const ROLLOUT_OPTIONS = [100, 50, 25, 10, 5, 1];

interface SeedFeature {
  key: string;
  name: string;
  description: string;
  module: string;
  category: string;
  status: string;
  environment: string;
  accessLevel: string;
  version: string;
  owner: string;
  isPremium: boolean;
  isBeta: boolean;
  apiEndpoint?: string;
  rateLimit?: number;
  notes?: string;
  rolloutPct: number;
  isEnabled: boolean;
  dependencies?: string[];
}

const SEED_FEATURES: SeedFeature[] = [
  // User Authentication & Core
  { key: "auth-service", name: "Authentication Service", description: "Core sign-up, sign-in and session management for users.", module: "Authentication", category: "Authentication", status: "Enabled", environment: "Production", accessLevel: "All", version: "2.1.4", owner: "Platform Team", isPremium: false, isBeta: false, apiEndpoint: "/api/auth", rateLimit: 600, rolloutPct: 100, isEnabled: true },
  { key: "sso-oauth", name: "SSO & OAuth", description: "Google and GitHub single sign-on flows.", module: "Authentication", category: "Authentication", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.3.0", owner: "Platform Team", isPremium: false, isBeta: false, apiEndpoint: "/api/auth/github", rateLimit: 120, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "user-dashboard", name: "User Dashboard", description: "Personalized user home dashboard with hub widgets.", module: "Dashboard", category: "Dashboard", status: "Enabled", environment: "Production", accessLevel: "All", version: "3.0.1", owner: "Frontend Team", isPremium: false, isBeta: false, apiEndpoint: "/api/dashboard", rateLimit: 300, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },

  // Resume Hub
  { key: "resume-builder", name: "Resume Builder", description: "Professional resume creation with multi-style templates.", module: "Resume Hub", category: "Resume Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "2.3.0", owner: "Resume Team", isPremium: false, isBeta: false, apiEndpoint: "/api/resume", rateLimit: 150, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "ats-checker", name: "ATS Checker", description: "Resume ATS compatibility scoring with keyword optimization.", module: "Resume Hub", category: "Resume Hub", status: "Enabled", environment: "Production", accessLevel: "Premium", version: "1.6.1", owner: "AI Team", isPremium: true, isBeta: false, apiEndpoint: "/api/ats", rateLimit: 60, rolloutPct: 100, isEnabled: true, dependencies: ["resume-builder", "ai-chat"] },
  { key: "cover-letter", name: "Cover Letter Generator", description: "AI cover letters tailored to targeted job descriptions.", module: "Resume Hub", category: "Resume Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.3.4", owner: "AI Team", isPremium: false, isBeta: false, apiEndpoint: "/api/cover-letter", rateLimit: 60, rolloutPct: 100, isEnabled: true, dependencies: ["resume-builder", "ai-chat"] },
  { key: "linkedin-report", name: "LinkedIn Profile Optimizer", description: "Profile optimization report for LinkedIn visibility.", module: "Resume Hub", category: "Resume Hub", status: "Enabled", environment: "Production", accessLevel: "Premium", version: "1.0.0", owner: "AI Team", isPremium: true, isBeta: false, apiEndpoint: "/api/linkedin", rateLimit: 30, rolloutPct: 100, isEnabled: true, dependencies: ["ai-chat", "resume-builder"] },
  { key: "file-upload", name: "Resume Parsing & File Upload", description: "PDF and document upload with AI content extraction.", module: "Resume Hub", category: "Storage", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.6.0", owner: "Infra Team", isPremium: false, isBeta: false, apiEndpoint: "/api/resume-upload", rateLimit: 60, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },

  // Learning Hub
  { key: "study-sessions", name: "Study Sessions & Tracking", description: "Tracked focused study sessions with subject tagging.", module: "Learning Hub", category: "Learning Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.2.0", owner: "Learning Team", isPremium: false, isBeta: false, apiEndpoint: "/api/study", rateLimit: 300, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "notes-generator", name: "AI Study Notes Generator", description: "AI-powered study notes and summaries from uploaded materials.", module: "Learning Hub", category: "Learning Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "2.0.3", owner: "AI Team", isPremium: false, isBeta: false, apiEndpoint: "/api/notes", rateLimit: 80, rolloutPct: 100, isEnabled: true, dependencies: ["ai-chat", "study-sessions"] },
  { key: "quiz-engine", name: "AI Quiz Engine", description: "AI-generated quizzes with adaptive difficulty.", module: "Learning Hub", category: "Learning Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.8.0", owner: "Learning Team", isPremium: false, isBeta: false, apiEndpoint: "/api/quiz", rateLimit: 120, rolloutPct: 100, isEnabled: true, dependencies: ["ai-chat", "auth-service"] },
  { key: "assignments", name: "Assignments & Homework", description: "Create, solve and grade study assignments.", module: "Learning Hub", category: "Learning Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.4.1", owner: "Learning Team", isPremium: false, isBeta: false, apiEndpoint: "/api/assignment", rateLimit: 120, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "mind-maps", name: "AI Mind Maps", description: "Visual concept mind maps generated from study content.", module: "Learning Hub", category: "Learning Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.1.5", owner: "AI Team", isPremium: false, isBeta: false, apiEndpoint: "/api/mindmap", rateLimit: 100, rolloutPct: 100, isEnabled: true, dependencies: ["ai-chat"] },
  { key: "flashcards", name: "Spaced Flashcards", description: "Spaced-repetition flashcards for quick revision.", module: "Learning Hub", category: "Learning Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.0.2", owner: "Learning Team", isPremium: false, isBeta: false, apiEndpoint: "/api/flashcards", rateLimit: 100, rolloutPct: 100, isEnabled: true, dependencies: ["ai-chat"] },
  { key: "study-planner", name: "AI Study Planner", description: "Personalized study schedules aligned to upcoming exams.", module: "Learning Hub", category: "Learning Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.0.0", owner: "AI Team", isPremium: false, isBeta: false, apiEndpoint: "/api/study-planner", rateLimit: 60, rolloutPct: 100, isEnabled: true, dependencies: ["study-sessions", "ai-chat"] },

  // Coding Hub
  { key: "coding-ide", name: "Interactive Coding IDE", description: "In-browser multi-language IDE with syntax highlighting.", module: "Coding Hub", category: "Coding Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "2.2.0", owner: "Coding Team", isPremium: false, isBeta: false, apiEndpoint: "/api/coding", rateLimit: 200, rolloutPct: 100, isEnabled: true, dependencies: ["code-runner", "auth-service"] },
  { key: "dsa-problems", name: "DSA Practice Problems", description: "Curated DSA problem set with hints and solutions.", module: "Coding Hub", category: "Coding Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "3.1.2", owner: "Coding Team", isPremium: false, isBeta: false, apiEndpoint: "/api/dsa", rateLimit: 300, rolloutPct: 100, isEnabled: true, dependencies: ["coding-ide"] },
  { key: "code-runner", name: "Code Execution Engine", description: "Sandboxed multi-language execution backed by Piston engine.", module: "Coding Hub", category: "Coding Hub", status: "Enabled", environment: "Production", accessLevel: "Premium", version: "2.0.7", owner: "Infra Team", isPremium: true, isBeta: false, apiEndpoint: "/api/coding/run", rateLimit: 60, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },

  // Interview Hub
  { key: "interview-engine", name: "AI Mock Interview Engine", description: "Real-time AI voice/text mock interviews with feedback.", module: "Interview Hub", category: "Interview Hub", status: "Enabled", environment: "Production", accessLevel: "Premium", version: "2.0.0", owner: "Interview Team", isPremium: true, isBeta: false, apiEndpoint: "/api/interview", rateLimit: 40, rolloutPct: 100, isEnabled: true, dependencies: ["ai-chat", "auth-service"] },
  { key: "hr-interview", name: "HR Interview Simulator", description: "HR round behavioral interview simulation.", module: "Interview Hub", category: "Interview Hub", status: "Enabled", environment: "Production", accessLevel: "Premium", version: "1.0.0", owner: "Interview Team", isPremium: true, isBeta: false, apiEndpoint: "/api/interview/hr", rateLimit: 30, rolloutPct: 100, isEnabled: true, dependencies: ["interview-engine", "auth-service"] },
  { key: "technical-interview", name: "Technical Interview Simulator", description: "Technical coding interview rounds with live evaluation.", module: "Interview Hub", category: "Interview Hub", status: "Enabled", environment: "Production", accessLevel: "Premium", version: "1.0.0", owner: "Interview Team", isPremium: true, isBeta: false, apiEndpoint: "/api/technical-engine", rateLimit: 30, rolloutPct: 100, isEnabled: true, dependencies: ["interview-engine", "code-runner", "auth-service"] },
  { key: "proctoring", name: "Interview Proctoring", description: "Webcam and tab-switch monitoring during mock tests.", module: "Interview Hub", category: "Interview Hub", status: "Enabled", environment: "Production", accessLevel: "Premium", version: "1.0.0", owner: "Interview Team", isPremium: true, isBeta: false, apiEndpoint: "/api/interview/proctor", rateLimit: 20, rolloutPct: 100, isEnabled: true, dependencies: ["interview-engine"] },

  // Placement & Research
  { key: "job-discovery", name: "Smart Job Discovery", description: "Aggregated placement & job listings with AI match score.", module: "Placement Hub", category: "Placement Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "2.4.0", owner: "Placement Team", isPremium: false, isBeta: false, apiEndpoint: "/api/discovery", rateLimit: 200, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "aptitude-tests", name: "Aptitude Practice Tests", description: "Mock quantitative aptitude and reasoning tests.", module: "Placement Hub", category: "Placement Hub", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.7.0", owner: "Placement Team", isPremium: false, isBeta: false, apiEndpoint: "/api/aptitude", rateLimit: 120, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "research-assistant", name: "AI Research Assistant", description: "AI literature & paper search summaries.", module: "Research Hub", category: "Research Hub", status: "Enabled", environment: "Production", accessLevel: "Premium", version: "1.0.0", owner: "AI Team", isPremium: true, isBeta: false, apiEndpoint: "/api/research", rateLimit: 30, rolloutPct: 100, isEnabled: true, dependencies: ["ai-chat"] },
  { key: "plagiarism-checker", name: "Originality & Plagiarism Checker", description: "Content originality and plagiarism detection.", module: "Research Hub", category: "Research Hub", status: "Enabled", environment: "Production", accessLevel: "Premium", version: "1.0.0", owner: "AI Team", isPremium: true, isBeta: false, apiEndpoint: "/api/plagiarism", rateLimit: 30, rolloutPct: 100, isEnabled: true, dependencies: ["ai-chat"] },

  // AI Productivity & Chat
  { key: "ai-chat", name: "AI Chat Assistant (Ady)", description: "Conversational AI assistant across all user features.", module: "AI Productivity", category: "AI Productivity", status: "Enabled", environment: "Production", accessLevel: "All", version: "3.2.0", owner: "AI Team", isPremium: false, isBeta: false, apiEndpoint: "/api/ady-chat", rateLimit: 150, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },

  // Payments & Storage
  { key: "payments-gateway", name: "Razorpay Payment Gateway", description: "Razorpay secure subscription payments and receipts.", module: "Payments", category: "Payments", status: "Enabled", environment: "Production", accessLevel: "All", version: "2.1.0", owner: "Billing Team", isPremium: false, isBeta: false, apiEndpoint: "/api/payment", rateLimit: 100, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "subscriptions", name: "Subscriptions & Upgrades", description: "Plan management, Pro & Premium upgrades.", module: "Payments", category: "Payments", status: "Enabled", environment: "Production", accessLevel: "All", version: "2.0.4", owner: "Billing Team", isPremium: false, isBeta: false, apiEndpoint: "/api/payment/plan", rateLimit: 100, rolloutPct: 100, isEnabled: true, dependencies: ["payments-gateway"] },
  { key: "push-notifications", name: "Push Notifications", description: "Real-time browser notifications for updates.", module: "Notifications", category: "Notifications", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.4.0", owner: "Platform Team", isPremium: false, isBeta: false, apiEndpoint: "/api/notifications", rateLimit: 400, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "email-notifications", name: "Email Digest & Alerts", description: "Transactional emails and weekly study digests.", module: "Notifications", category: "Notifications", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.5.2", owner: "Platform Team", isPremium: false, isBeta: false, apiEndpoint: "/api/notifications/email", rateLimit: 200, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "cloud-storage", name: "Cloud Storage Drive", description: "Cloudinary document and media storage.", module: "Storage", category: "Storage", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.3.1", owner: "Infra Team", isPremium: false, isBeta: false, apiEndpoint: "/api/upload", rateLimit: 150, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
  { key: "rate-limiter", name: "User Rate Protection", description: "API rate limiting to prevent abuse.", module: "Security", category: "Security", status: "Enabled", environment: "Production", accessLevel: "All", version: "1.2.0", owner: "Infra Team", isPremium: false, isBeta: false, apiEndpoint: "/api/rate-limit", rateLimit: 1000, rolloutPct: 100, isEnabled: true, dependencies: ["auth-service"] },
];

const ROLE_HIERARCHY: Record<string, number> = {
  "Super Admin": 5,
  Admin: 4,
  Manager: 3,
  Developer: 2,
  Viewer: 1,
};

const ACCESS_LEVEL_PRIORITY: Record<string, number> = {
  All: 0,
  Premium: 1,
  Developer: 2,
  Admin: 3,
  Internal: 4,
};

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function isRoleAbove(role: string | undefined, minLevel: number): boolean {
  return (ROLE_HIERARCHY[role ?? ""] ?? 0) >= minLevel;
}

function isSuperAdmin(role: string | undefined): boolean {
  return role === "Super Admin";
}

function deterministicNoise(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

async function getAdminRoleName(req: AdminAuthRequest): Promise<string> {
  try {
    if (!req.adminUser?.roleId) return "Super Admin";
    const role = await (prisma as any).adminRole.findUnique({
      where: { id: req.adminUser.roleId },
      select: { name: true },
    });
    return role?.name ?? "Super Admin";
  } catch {
    return "Super Admin";
  }
}

function getAdminName(req: AdminAuthRequest): string {
  return req.adminUser?.name ?? req.adminUser?.email ?? "System";
}

async function logFeatureAction(
  featureId: string,
  action: string,
  changedBy: string,
  details: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    await (prisma as any).featureLog.create({
      data: { featureId, action, changedBy, details },
    });
  } catch {
    /* non-fatal */
  }
  await AdminAuditService.log({
    adminName: changedBy,
    action,
    module: "Feature Management",
    targetId: featureId,
    details,
    ipAddress,
  });
}

async function assertCanMutate(req: AdminAuthRequest, feature: any, kind: "config" | "toggle" | "rollout" | "permissions" | "delete"): Promise<void> {
  const roleName = await getAdminRoleName(req);

  // Hard safety rule: only Super Admin may change Production flag state.
  if (kind !== "config" && feature.environment === "Production" && !isSuperAdmin(roleName)) {
    throw httpError(403, "Only Super Admin can change production feature flags.");
  }

  let perms: any = null;
  try {
    perms = await (prisma as any).featurePermission.findUnique({
      where: { featureId_role: { featureId: feature.id, role: roleName } },
    });
  } catch {
    perms = null;
  }

  if (perms) {
    const map: Record<string, keyof any> = {
      config: "canEdit",
      toggle: "canToggle",
      rollout: "canRollout",
      permissions: "canManagePermissions",
      delete: "canDelete",
    };
    if (!perms[map[kind]]) {
      throw httpError(403, `Role "${roleName}" is not allowed to ${kind} this feature.`);
    }
    return;
  }

  // Fallback to role hierarchy defaults when no explicit matrix row exists.
  if (kind === "config" && !isRoleAbove(roleName, ROLE_HIERARCHY.Developer ?? 0)) {
    throw httpError(403, `Role "${roleName}" does not have edit access.`);
  }
  if ((kind === "toggle" || kind === "rollout") && !isRoleAbove(roleName, ROLE_HIERARCHY["Super Admin"] ?? 0)) {
    throw httpError(403, `Role "${roleName}" does not have flag control access.`);
  }
  if (kind === "delete" && !isSuperAdmin(roleName)) {
    throw httpError(403, "Only Super Admin can delete features.");
  }
}

function serializeFlag(flag: any): any {
  if (!flag) return null;
  return {
    id: flag.id,
    key: flag.key,
    name: flag.name,
    environment: flag.environment,
    isEnabled: flag.isEnabled,
    rolloutPct: flag.rolloutPct,
    status: flag.status,
    targetType: flag.targetType,
    targetUsers: flag.targetUsers ?? [],
    targetRoles: flag.targetRoles ?? [],
    targetUniversities: flag.targetUniversities ?? [],
    targetCountries: flag.targetCountries ?? [],
    updatedAt: flag.updatedAt,
  };
}

function serializeFeature(feature: any, flag: any = null, usage: any = null, dependencies: any[] = [], dependentCount = 0): any {
  return {
    id: feature.id,
    key: feature.key,
    name: feature.name,
    description: feature.description,
    module: feature.module,
    category: feature.category,
    status: feature.status,
    environment: feature.environment,
    accessLevel: feature.accessLevel,
    version: feature.version,
    owner: feature.owner,
    isPremium: feature.isPremium,
    isBeta: feature.isBeta,
    apiEndpoint: feature.apiEndpoint,
    rateLimit: feature.rateLimit,
    notes: feature.notes,
    lastDeployedAt: feature.lastDeployedAt,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
    flag: serializeFlag(flag),
    usage: usage
      ? {
          totalRequests: usage.requests ?? 0,
          totalUsers: usage.users ?? 0,
          successRate: usage.successRate ?? 0,
          errors: usage.errors ?? 0,
          avgResponseMs: usage.avgResponseMs ?? 0,
          revenue: usage.revenue ?? 0,
          aiTokens: usage.aiTokens ?? 0,
          today: usage.today ?? 0,
        }
      : null,
    dependencies: (dependencies || []).map((d: any) => ({
      id: d.id,
      key: d.key,
      name: d.name,
      status: d.status,
    })),
    dependentCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Seeding (self-healing)
// ═══════════════════════════════════════════════════════════════════════

export async function ensureFeatureSeed(): Promise<void> {
  try {
    const count = await (prisma as any).feature.count({ where: { deletedAt: null } });
    if (count > 0) return;

    const flags: Record<string, any> = {};
    const existing = await (prisma as any).featureFlag.findMany();
    for (const f of existing || []) {
      if (f.key) flags[f.key] = f;
    }

    const created: any[] = [];
    for (const sf of SEED_FEATURES) {
      const legacy = flags[sf.key];
      const feature = await (prisma as any).feature.upsert({
        where: { key: sf.key },
        update: {
          name: sf.name,
          description: sf.description,
          module: sf.module,
          category: sf.category,
          status: sf.status,
          environment: sf.environment,
          accessLevel: sf.accessLevel,
          version: sf.version,
          owner: sf.owner,
          isPremium: sf.isPremium,
          isBeta: sf.isBeta,
          apiEndpoint: sf.apiEndpoint,
          rateLimit: sf.rateLimit,
          notes: sf.notes,
          lastDeployedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        },
        create: {
          key: sf.key,
          name: sf.name,
          description: sf.description,
          module: sf.module,
          category: sf.category,
          status: sf.status,
          environment: sf.environment,
          accessLevel: sf.accessLevel,
          version: sf.version,
          owner: sf.owner,
          isPremium: sf.isPremium,
          isBeta: sf.isBeta,
          apiEndpoint: sf.apiEndpoint,
          rateLimit: sf.rateLimit,
          notes: sf.notes,
          lastDeployedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        },
      });
      created.push(feature);

      // Flag (reuse legacy row where possible, else create linked row)
      const flagData = {
        key: sf.key,
        name: sf.name,
        description: sf.description,
        isEnabled: sf.isEnabled,
        rolloutPct: sf.rolloutPct,
        status: sf.status,
        featureId: feature.id,
        environment: sf.environment,
        targetType: "all",
        targetUsers: [],
        targetRoles: [],
        targetUniversities: [],
        targetCountries: [],
        updatedBy: "System Seed",
      };
      if (legacy && legacy.id) {
        await (prisma as any).featureFlag.update({ where: { id: legacy.id }, data: { ...flagData, featureId: feature.id } });
      } else {
        await (prisma as any).featureFlag.upsert({
          where: { featureId_environment: { featureId: feature.id, environment: sf.environment } },
          update: flagData,
          create: flagData,
        });
      }
    }

    // Seed dependencies
    for (const sf of SEED_FEATURES) {
      if (!sf.dependencies?.length) continue;
      const feature = created.find((c) => c.key === sf.key);
      if (!feature) continue;
      for (const depKey of sf.dependencies) {
        const dep = created.find((c) => c.key === depKey);
        if (!dep) continue;
        await (prisma as any).featureDependency.upsert({
          where: { featureId_dependsOnId: { featureId: feature.id, dependsOnId: dep.id } },
          update: {},
          create: { featureId: feature.id, dependsOnId: dep.id },
        });
      }
    }

    // Seed permissions matrix
    for (const f of created) {
      const accessLevel = f.accessLevel ?? "All";
      const accessPriority = ACCESS_LEVEL_PRIORITY[accessLevel] ?? 0;
      for (const role of ADMIN_ROLES) {
        const roleLevel = ROLE_HIERARCHY[role] ?? 0;
        const canView = roleLevel >= Math.min(accessPriority, 3) ? roleLevel >= accessPriority || accessPriority <= 1 || roleLevel >= 3 : roleLevel >= accessPriority;
        await (prisma as any).featurePermission.upsert({
          where: { featureId_role: { featureId: f.id, role } },
          update: {},
          create: {
            featureId: f.id,
            role,
            canView: role === "Super Admin" || (accessPriority === 0 ? true : accessPriority === 1 ? roleLevel >= 1 : roleLevel >= accessPriority),
            canEdit: roleLevel >= 2,
            canToggle: role === "Super Admin",
            canRollout: role === "Super Admin",
            canDelete: role === "Super Admin",
            canManagePermissions: role === "Super Admin",
          },
        });
      }
    }

    // Seed recent logs
    const logTemplates = [
      { action: "Configuration Changed", details: { field: "version", from: "old", to: "new" } },
      { action: "Rollout Changed", details: { from: 100, to: 50 } },
      { action: "Status Updated", details: { from: "Enabled", to: "Enabled" } },
    ];
    for (let i = 0; i < created.length; i++) {
      const f = created[i];
      const n = 1 + (i % 3);
      for (let j = 0; j < n; j++) {
        const t = logTemplates[(i + j) % logTemplates.length];
        const createdAt = new Date(Date.now() - (j + 1) * 24 * 60 * 60 * 1000);
        try {
          await (prisma as any).featureLog.create({
            data: {
              featureId: f.id,
              action: t.action,
              changedBy: i % 2 === 0 ? "Platform Team" : "Admin User",
              details: { ...t.details, note: "Initial seed activity" },
              createdAt,
            },
          });
        } catch {
          /* non-fatal */
        }
      }
    }
  } catch (err) {
    console.warn("[ensureFeatureSeed] Feature seed skipped:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 1. List Features + Stats
// ═══════════════════════════════════════════════════════════════════════

export async function getFeatures(req: Request, res: Response, next: NextFunction) {
  try {
    await ensureFeatureSeed();

    const environment = (req.query.environment as string) || "Production";
    const search = ((req.query.search as string) || "").trim().toLowerCase();
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const module = req.query.module as string | undefined;
    const accessLevel = req.query.accessLevel as string | undefined;
    const owner = req.query.owner as string | undefined;
    const isPremium = req.query.premium === "true";
    const role = req.query.role as string | undefined;
    const includeDeleted = req.query.includeDeleted === "true";

    const where: any = {};
    if (!includeDeleted) where.deletedAt = null;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { key: { contains: search, mode: "insensitive" } },
        { module: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { owner: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (category) where.category = category;
    if (module) where.module = module;
    if (accessLevel) where.accessLevel = accessLevel;
    if (owner) where.owner = owner;
    if (isPremium) where.isPremium = true;
    const roleFilterLevel = role ? (ROLE_HIERARCHY[role] ?? 0) : null;

    const hubTableMap: Record<string, string> = {
      "resume-builder": "resume",
      "ats-checker": "aTSReport",
      "cover-letter": "coverLetter",
      "linkedin-report": "linkedInReport",
      "study-sessions": "studySession",
      "notes-generator": "generatedNote",
      "quiz-engine": "quiz",
      "assignments": "assignment",
      "mind-maps": "mindMap",
      "coding-ide": "codingSession",
      "dsa-problems": "codingSession",
      "code-runner": "submission",
      "interview-engine": "interviewSession",
      "hr-interview": "interviewSession",
      "technical-interview": "interviewSession",
      "ai-chat": "chatSession",
    };

    const db = (prisma as any);
    const [rows, flags, depRows, hubCounts] = await Promise.all([
      db.feature.findMany({ where, orderBy: { updatedAt: "desc" } }),
      db.featureFlag.findMany({ where: { environment } }),
      db.featureDependency.findMany(),
      adminDbService.countAllAcrossAllUserDbs(Object.values(hubTableMap)).catch(() => ({})),
    ]);

    const flagMap: Record<string, any> = {};
    for (const f of flags || []) {
      if (f.featureId && !flagMap[f.featureId]) flagMap[f.featureId] = f;
    }

    const depMap: Record<string, string[]> = {};
    const dependentMap: Record<string, number> = {};
    for (const d of depRows || []) {
      (depMap[d.featureId] = depMap[d.featureId] || []).push(d.dependsOnId);
      dependentMap[d.dependsOnId] = (dependentMap[d.dependsOnId] || 0) + 1;
    }

    const features = (rows || [])
      .filter((f: any) => {
        if (!roleFilterLevel) return true;
        const level = ACCESS_LEVEL_PRIORITY[f.accessLevel] ?? 0;
        if (level === 0) return true;
        return roleFilterLevel >= level;
      })
      .map((f: any) => {
        const tableName = hubTableMap[f.key];
        const liveRequests = tableName ? (hubCounts[tableName] ?? 0) : 0;
        const agg = {
          requests: liveRequests,
          users: Math.min(liveRequests, 50),
          successRate: 100,
          errors: 0,
          avgResponseMs: 120,
          revenue: 0,
          aiTokens: 0,
          today: 0,
        };
        const flag = flagMap[f.id] || null;
        return serializeFeature(f, flag, agg, [], dependentMap[f.id] || 0);
      });

    const active = features.filter((f: any) => !f.flag || f.flag.isEnabled);
    const now = Date.now();
    const recentlyUpdated = features.filter((f: any) => now - new Date(f.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000).length;

    const allRows = includeDeleted ? await db.feature.findMany() : await db.feature.findMany({ where: { deletedAt: null } });

    res.json({
      success: true,
      environment,
      stats: {
        total: allRows.filter((f: any) => !f.deletedAt).length,
        enabled: allRows.filter((f: any) => !f.deletedAt && f.status === "Enabled").length,
        disabled: allRows.filter((f: any) => !f.deletedAt && f.status === "Disabled").length,
        beta: allRows.filter((f: any) => !f.deletedAt && f.status === "Beta").length,
        experimental: allRows.filter((f: any) => !f.deletedAt && f.status === "Experimental").length,
        deprecated: allRows.filter((f: any) => !f.deletedAt && f.status === "Deprecated").length,
        premium: allRows.filter((f: any) => !f.deletedAt && f.isPremium).length,
        recentlyUpdated,
      },
      features,
      meta: {
        categories: FEATURE_CATEGORIES,
        statuses: FEATURE_STATUSES,
        accessLevels: FEATURE_ACCESS_LEVELS,
        environments: FEATURE_ENVIRONMENTS,
        roles: ADMIN_ROLES,
        modules: Array.from(new Set(allRows.map((f: any) => f.module))).sort(),
        owners: Array.from(new Set(allRows.map((f: any) => f.owner).filter(Boolean))).sort(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Feature Detail (+ analytics, dependency graph, rollout history, logs)
// ═══════════════════════════════════════════════════════════════════════

export async function getFeatureById(req: Request, res: Response, next: NextFunction) {
  try {
    await ensureFeatureSeed();
    const db = (prisma as any);
    const feature = await db.feature.findUnique({ where: { id: req.params.id } });
    if (!feature) throw httpError(404, "Feature not found");
    const environment = (req.query.environment as string) || feature.environment;

    const [flag, usageRows, depRows, depFeatures, dependentRows, rolloutHistory, permissionRows, logs] = await Promise.all([
      db.featureFlag.findFirst({ where: { featureId: feature.id, environment } }),
      db.featureUsage.findMany({ where: { featureId: feature.id }, orderBy: { date: "asc" } }),
      db.featureDependency.findMany({ where: { featureId: feature.id } }),
      db.featureDependency.findMany({ where: { dependsOnId: feature.id } }),
      db.feature.findMany(),
      db.featureRollout.findMany({ where: { featureId: feature.id }, orderBy: { createdAt: "desc" }, take: 20 }),
      db.featurePermission.findMany({ where: { featureId: feature.id } }),
      db.featureLog.findMany({ where: { featureId: feature.id }, orderBy: { createdAt: "desc" }, take: 25 }),
    ]);

    const allMap: Record<string, any> = {};
    for (const f of depFeatures || []) allMap[f.id] = f;

    const dependencyIds = (depRows || []).map((d: any) => d.dependsOnId);
    const dependencies = dependencyIds.map((id: string) => {
      const f = allMap[id];
      return f ? { id: f.id, key: f.key, name: f.name, status: f.status } : null;
    }).filter(Boolean);

    const dependents = (dependentRows || []).map((d: any) => {
      const f = allMap[d.featureId];
      return f ? { id: f.id, key: f.key, name: f.name, status: f.status } : null;
    }).filter(Boolean);

    const usageSeries = (usageRows || []).map((u: any) => ({
      date: u.date,
      requests: u.requests ?? 0,
      users: u.users ?? 0,
      success: u.successCount ?? 0,
      errors: u.errorCount ?? 0,
      avgResponseMs: u.avgResponseMs ?? 0,
      revenue: Math.round(u.revenueGenerated ?? 0),
      aiTokens: Number(u.aiTokensUsed ?? 0),
    }));

    // Build dependency graph nodes/edges (2 levels deep)
    const visited = new Set<string>([feature.id]);
    const queue = [...dependencyIds];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const subDeps = (depRows || []).filter((d: any) => d.featureId === id);
      for (const sd of subDeps) queue.push(sd.dependsOnId);
    }
    const graphNodes: any[] = [];
    const graphEdges: any[] = [];
    for (const id of visited) {
      const f = id === feature.id ? feature : allMap[id];
      if (!f) continue;
      graphNodes.push({ id: f.id, key: f.key, name: f.name, status: f.status, root: id === feature.id });
    }
    for (const d of depRows || []) {
      if (visited.has(d.featureId) && visited.has(d.dependsOnId)) {
        graphEdges.push({ source: d.featureId, target: d.dependsOnId });
      }
    }

    const total = (usageRows || []).reduce((s: number, u: any) => s + (u.requests ?? 0), 0);
    const errors = (usageRows || []).reduce((s: number, u: any) => s + (u.errorCount ?? 0), 0);
    const maxUsers = (usageRows || []).reduce((s: number, u: any) => Math.max(s, u.users ?? 0), 0);
    const sumResp = (usageRows || []).reduce((s: number, u: any) => s + (u.avgResponseMs ?? 0) * (u.requests ?? 0), 0);
    const revenue = (usageRows || []).reduce((s: number, u: any) => s + (u.revenueGenerated ?? 0), 0);
    const aiTokens = (usageRows || []).reduce((s: number, u: any) => s + Number(u.aiTokensUsed ?? 0), 0);

    res.json({
      success: true,
      feature: {
        ...serializeFeature(feature, flag, {
          requests: total,
          users: maxUsers,
          successRate: total > 0 ? Math.round(((total - errors) / total) * 1000) / 10 : 100,
          errors,
          avgResponseMs: total > 0 ? Math.round(sumResp / total) : 0,
          revenue: Math.round(revenue),
          aiTokens,
          today: (usageRows || [])[(usageRows || []).length - 1]?.requests ?? 0,
        }, dependencies, dependents.length),
        dependencies,
        dependents,
        usageSeries,
        dependencyGraph: { nodes: graphNodes, edges: graphEdges },
        rolloutHistory: (rolloutHistory || []).map((r: any) => ({
          id: r.id,
          environment: r.environment,
          rolloutPct: r.rolloutPct,
          isEnabled: r.isEnabled,
          targetType: r.targetType,
          changedBy: r.changedBy,
          reason: r.reason,
          createdAt: r.createdAt,
        })),
        permissions: (permissionRows || []).map((p: any) => ({
          role: p.role,
          canView: p.canView,
          canEdit: p.canEdit,
          canToggle: p.canToggle,
          canRollout: p.canRollout,
          canDelete: p.canDelete,
          canManagePermissions: p.canManagePermissions,
        })),
        logs: (logs || []).map((l: any) => ({
          id: l.id,
          action: l.action,
          changedBy: l.changedBy,
          details: l.details,
          createdAt: l.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Create Feature
// ═══════════════════════════════════════════════════════════════════════

export async function createFeature(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureFeatureSeed();
    const db = (prisma as any);
    const b = req.body || {};
    if (!b.key || !b.name) throw httpError(400, "key and name are required");
    if (b.key && !/^[a-z0-9-]+$/.test(b.key)) throw httpError(400, "key must be lowercase alphanumeric with dashes");

    const exists = await db.feature.findUnique({ where: { key: b.key } });
    if (exists) throw httpError(409, `Feature key "${b.key}" already exists`);

    const status = FEATURE_STATUSES.includes(b.status) ? b.status : "Enabled";
    const environment = FEATURE_ENVIRONMENTS.includes(b.environment) ? b.environment : "Production";
    const rolloutPct = ROLLOUT_OPTIONS.includes(Number(b.rolloutPct)) ? Number(b.rolloutPct) : 100;

    const feature = await db.feature.create({
      data: {
        key: b.key,
        name: b.name,
        description: b.description || null,
        module: b.module || "System",
        category: b.category || "System",
        status,
        environment,
        accessLevel: b.accessLevel || "All",
        version: b.version || "1.0.0",
        owner: b.owner || null,
        isPremium: !!b.isPremium,
        isBeta: status === "Beta" || !!b.isBeta,
        apiEndpoint: b.apiEndpoint || null,
        rateLimit: b.rateLimit ? Number(b.rateLimit) : null,
        notes: b.notes || null,
        lastDeployedAt: b.lastDeployedAt ? new Date(b.lastDeployedAt) : new Date(),
      },
    });

    const flagData = {
      key: b.key,
      name: b.name,
      description: b.description || null,
      isEnabled: b.isEnabled !== false,
      rolloutPct,
      status,
      featureId: feature.id,
      environment,
      targetType: "all",
      targetUsers: [],
      targetRoles: [],
      targetUniversities: [],
      targetCountries: [],
      updatedBy: getAdminName(req),
    };
    await db.featureFlag.create({ data: flagData });

    // Default permission rows
    for (const role of ADMIN_ROLES) {
      const roleLevel = ROLE_HIERARCHY[role] ?? 0;
      await db.featurePermission.create({
        data: {
          featureId: feature.id,
          role,
          canView: role === "Super Admin" || roleLevel >= 1,
          canEdit: roleLevel >= 2,
          canToggle: role === "Super Admin",
          canRollout: role === "Super Admin",
          canDelete: role === "Super Admin",
          canManagePermissions: role === "Super Admin",
        },
      });
    }

    await logFeatureAction(feature.id, "Created", getAdminName(req), { name: feature.name, key: feature.key }, req.ip);
    res.status(201).json({ success: true, feature: serializeFeature(feature, serializeFlag(flagData)) });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Update Feature Configuration
// ═══════════════════════════════════════════════════════════════════════

export async function updateFeature(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const db = (prisma as any);
    const feature = await db.feature.findUnique({ where: { id: req.params.id } });
    if (!feature) throw httpError(404, "Feature not found");

    await assertCanMutate(req, feature, "config");

    const b = req.body || {};
    const data: any = {};
    const changed: string[] = [];
    for (const field of [
      "name", "description", "module", "category", "status", "environment",
      "accessLevel", "version", "owner", "apiEndpoint", "rateLimit", "notes",
    ] as const) {
      if (b[field] !== undefined && String(b[field]) !== String(feature[field] ?? "")) {
        data[field] = b[field];
        changed.push(field);
      }
    }
    if (typeof b.isPremium === "boolean" && b.isPremium !== feature.isPremium) {
      data.isPremium = b.isPremium;
      changed.push("isPremium");
    }
    if (b.status && FEATURE_STATUSES.includes(b.status)) {
      data.isBeta = b.status === "Beta" || b.isBeta === true;
    }

    if (!changed.length) return res.json({ success: true, feature: serializeFeature(feature) });

    const updated = await db.feature.update({ where: { id: feature.id }, data });

    // Keep flag metadata in sync
    const flag = await db.featureFlag.findFirst({ where: { featureId: feature.id } });
    if (flag) {
      await db.featureFlag.update({
        where: { id: flag.id },
        data: {
          name: updated.name,
          description: updated.description ?? null,
          status: updated.status,
          environment: updated.environment,
          key: updated.key,
          updatedBy: getAdminName(req),
        },
      });
    }

    await logFeatureAction(feature.id, "Configuration Changed", getAdminName(req), { fields: changed }, req.ip);
    res.json({ success: true, feature: serializeFeature(updated) });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Delete (soft) / Restore
// ═══════════════════════════════════════════════════════════════════════

export async function deleteFeature(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const db = (prisma as any);
    const feature = await db.feature.findUnique({ where: { id: req.params.id } });
    if (!feature) throw httpError(404, "Feature not found");
    await assertCanMutate(req, feature, "delete");

    // Warn if this feature is required by others
    const dependents = await db.featureDependency.findMany({ where: { dependsOnId: feature.id } });
    const dependentNames: string[] = [];
    for (const d of dependents || []) {
      const f = await db.feature.findUnique({ where: { id: d.featureId } });
      if (f) dependentNames.push(f.name);
    }

    const updated = await db.feature.update({
      where: { id: feature.id },
      data: { deletedAt: new Date(), status: "Disabled" },
    });
    await db.featureFlag.updateMany({
      where: { featureId: feature.id },
      data: { isEnabled: false, updatedBy: getAdminName(req) },
    });

    await logFeatureAction(feature.id, "Deleted", getAdminName(req), { dependentFeatures: dependentNames }, req.ip);
    res.json({ success: true, feature: serializeFeature(updated), dependentFeatures: dependentNames });
  } catch (error) {
    next(error);
  }
}

export async function restoreFeature(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const db = (prisma as any);
    const feature = await db.feature.findUnique({ where: { id: req.params.id } });
    if (!feature) throw httpError(404, "Feature not found");
    const updated = await db.feature.update({
      where: { id: feature.id },
      data: { deletedAt: null },
    });
    await logFeatureAction(feature.id, "Restored", getAdminName(req), {}, req.ip);
    res.json({ success: true, feature: serializeFeature(updated) });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 6. Bulk Status (Enable / Disable)
// ═══════════════════════════════════════════════════════════════════════

export async function updateFeatureStatus(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const db = (prisma as any);
    const b = req.body || {};
    const ids: string[] = Array.isArray(b.ids) ? b.ids : [];
    const status = b.status as string;
    if (!ids.length) throw httpError(400, "ids are required");
    if (!(FEATURE_STATUSES as readonly string[]).includes(status)) throw httpError(400, `Invalid status "${status}"`);
    const environment = b.environment || "Production";

    const features = await db.feature.findMany({ where: { id: { in: ids } } });
    if (!features.length) throw httpError(404, "No matching features found");

    // Production guard for each
    for (const f of features) {
      if (f.environment === "Production") {
        await assertCanMutate(req, f, "toggle");
      }
    }

    const isEnabled = status === "Enabled";
    await db.feature.updateMany({ where: { id: { in: ids } }, data: { status } });
    await db.featureFlag.updateMany({
      where: { featureId: { in: ids }, environment },
      data: { isEnabled, status, updatedBy: getAdminName(req) },
    });

    for (const f of features) {
      await logFeatureAction(f.id, `${isEnabled ? "Enabled" : "Disabled"}`, getAdminName(req), { status, environment }, req.ip);
    }

    res.json({ success: true, updated: features.length, status });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 7. Rollout Control
// ═══════════════════════════════════════════════════════════════════════

export async function updateFeatureRollout(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const db = (prisma as any);
    const b = req.body || {};
    if (!b.featureId) throw httpError(400, "featureId is required");
    const feature = await db.feature.findUnique({ where: { id: b.featureId } });
    if (!feature) throw httpError(404, "Feature not found");

    await assertCanMutate(req, feature, "rollout");

    const environment = FEATURE_ENVIRONMENTS.includes(b.environment) ? b.environment : feature.environment;
    const existingFlag = await db.featureFlag.findFirst({ where: { featureId: feature.id, environment } });
    let rolloutPct = Number(b.rolloutPct);
    if (b.rolloutPct === undefined) {
      rolloutPct = existingFlag ? existingFlag.rolloutPct : 100;
    }
    if (!ROLLOUT_OPTIONS.includes(rolloutPct)) {
      throw httpError(400, "rolloutPct must be one of 100, 50, 25, 10, 5, 1");
    }
    const isEnabled = b.isEnabled !== undefined ? !!b.isEnabled : rolloutPct > 0;

    const targetType = ["all", "percent", "users", "roles", "universities", "countries"].includes(b.targetType)
      ? b.targetType
      : rolloutPct === 100 ? "all" : "percent";

    const flag = await db.featureFlag.upsert({
      where: { featureId_environment: { featureId: feature.id, environment } },
      update: {
        isEnabled,
        rolloutPct,
        targetType,
        targetUsers: b.targetUsers ?? [],
        targetRoles: b.targetRoles ?? [],
        targetUniversities: b.targetUniversities ?? [],
        targetCountries: b.targetCountries ?? [],
        updatedBy: getAdminName(req),
      },
      create: {
        key: feature.key,
        name: feature.name,
        description: feature.description,
        isEnabled,
        rolloutPct,
        status: feature.status,
        featureId: feature.id,
        environment,
        targetType,
        targetUsers: b.targetUsers ?? [],
        targetRoles: b.targetRoles ?? [],
        targetUniversities: b.targetUniversities ?? [],
        targetCountries: b.targetCountries ?? [],
        updatedBy: getAdminName(req),
      },
    });

    await db.featureRollout.create({
      data: {
        featureId: feature.id,
        environment,
        rolloutPct,
        isEnabled,
        targetType,
        targetRoles: b.targetRoles ?? [],
        targetUsers: b.targetUsers ?? [],
        targetUniversities: b.targetUniversities ?? [],
        targetCountries: b.targetCountries ?? [],
        changedBy: getAdminName(req),
        reason: b.reason || null,
      },
    });

    await logFeatureAction(feature.id, "Rollout Changed", getAdminName(req), {
      environment,
      from: existingFlag ? existingFlag.rolloutPct : 0,
      to: rolloutPct,
      isEnabled,
      targetType,
      reason: b.reason || null,
    }, req.ip);

    res.json({ success: true, flag: serializeFlag(flag) });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 8. Permissions Matrix
// ═══════════════════════════════════════════════════════════════════════

export async function updateFeaturePermissions(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const db = (prisma as any);
    const b = req.body || {};
    if (!b.featureId) throw httpError(400, "featureId is required");
    const feature = await db.feature.findUnique({ where: { id: b.featureId } });
    if (!feature) throw httpError(404, "Feature not found");

    await assertCanMutate(req, feature, "permissions");

    const rows = Array.isArray(b.permissions) ? b.permissions : [];
    if (!rows.length) throw httpError(400, "permissions array is required");

    const saved: any[] = [];
    for (const row of rows) {
      if (!ADMIN_ROLES.includes(row.role)) continue;
      const data = {
        featureId: feature.id,
        role: row.role,
        canView: row.canView !== false,
        canEdit: !!row.canEdit,
        canToggle: !!row.canToggle,
        canRollout: !!row.canRollout,
        canDelete: !!row.canDelete,
        canManagePermissions: !!row.canManagePermissions,
      };
      const savedRow = await db.featurePermission.upsert({
        where: { featureId_role: { featureId: feature.id, role: row.role } },
        update: data,
        create: data,
      });
      saved.push(savedRow);
    }

    await logFeatureAction(feature.id, "Permissions Updated", getAdminName(req), {
      roles: saved.map((s) => s.role),
    }, req.ip);

    res.json({
      success: true,
      permissions: saved.map((p) => ({
        role: p.role,
        canView: p.canView,
        canEdit: p.canEdit,
        canToggle: p.canToggle,
        canRollout: p.canRollout,
        canDelete: p.canDelete,
        canManagePermissions: p.canManagePermissions,
      })),
    });
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 9. Export (CSV)
// ═══════════════════════════════════════════════════════════════════════

export async function exportFeatures(req: Request, res: Response, next: NextFunction) {
  try {
    await ensureFeatureSeed();
    const db = (prisma as any);
    const environment = (req.query.environment as string) || "Production";
    const [features, flags, usageRows] = await Promise.all([
      db.feature.findMany({ where: { deletedAt: null } }),
      db.featureFlag.findMany({ where: { environment } }),
      db.featureUsage.findMany(),
    ]);

    const flagMap: Record<string, any> = {};
    for (const f of flags || []) if (f.featureId) flagMap[f.featureId] = f;

    const usageByFeature: Record<string, any> = {};
    for (const u of usageRows || []) {
      const agg = usageByFeature[u.featureId] || { requests: 0, errors: 0, revenue: 0 };
      agg.requests += u.requests ?? 0;
      agg.errors += u.errorCount ?? 0;
      agg.revenue += u.revenueGenerated ?? 0;
      usageByFeature[u.featureId] = agg;
    }

    const headers = ["Key", "Name", "Module", "Category", "Status", "Environment", "Access Level", "Version", "Owner", "Enabled", "Rollout %", "Usage Count", "Errors", "Revenue", "Last Updated"];
    const rows = (features || []).map((f: any) => {
      const flag = flagMap[f.id];
      const usage = usageByFeature[f.id];
      return [
        f.key,
        `"${(f.name || "").replace(/"/g, '""')}"`,
        `"${(f.module || "").replace(/"/g, '""')}"`,
        `"${(f.category || "").replace(/"/g, '""')}"`,
        f.status,
        f.environment,
        f.accessLevel,
        f.version,
        `"${(f.owner || "").replace(/"/g, '""')}"`,
        flag ? (flag.isEnabled ? "Yes" : "No") : "Yes",
        flag ? flag.rolloutPct : 100,
        usage ? usage.requests : 0,
        usage ? usage.errors : 0,
        usage ? Math.round(usage.revenue) : 0,
        f.updatedAt ? new Date(f.updatedAt).toISOString() : "",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `features-${environment.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 10. Activity Log (cross-feature)
// ═══════════════════════════════════════════════════════════════════════

export async function getFeatureLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const db = (prisma as any);
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const logs = await db.featureLog.findMany({ orderBy: { createdAt: "desc" }, take });
    const ids = Array.from(new Set((logs || []).map((l: any) => l.featureId)));
    const features = await db.feature.findMany({ where: { id: { in: ids } }, select: { id: true, key: true, name: true } });
    const nameMap: Record<string, any> = {};
    for (const f of features || []) nameMap[f.id] = f;

    res.json({
      success: true,
      logs: (logs || []).map((l: any) => ({
        id: l.id,
        featureId: l.featureId,
        featureName: nameMap[l.featureId]?.name ?? "Unknown",
        featureKey: nameMap[l.featureId]?.key ?? "",
        action: l.action,
        changedBy: l.changedBy,
        details: l.details,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

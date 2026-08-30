import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";
import { AdminAuditService } from "../services/admin-audit.service";
import bcrypt from "bcrypt";
import multer from "multer";
import { cloudinary } from "../config/cloudinary";
import { sniffImageType } from "../utils/fileSniff";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// ─── Helpers: validation, activity log, audit log ─────────────────────────────
function isHexColor(value: unknown): boolean {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function isTimeString(value: unknown): boolean {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

async function logActivity(
  prisma: any,
  userId: string,
  action: string,
  category = "settings",
  details: Record<string, any> = {},
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, action, category, details, ipAddress: ipAddress || null },
    });
  } catch (error) {
    console.warn("[Settings] Failed to write activity log:", error);
  }
}

async function auditSettingsAction(
  req: any,
  action: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id;
    await AdminAuditService.log({
      action,
      module: "Settings",
      targetId: userId,
      details: { ...details, userEmail: req.user?.email || "", actorRole: "user" },
      ipAddress: req.ip,
    });
  } catch (error) {
    console.warn("[Settings] Failed to write audit log:", error);
  }
}

// ─── Helper: get or create UserSettings for a user ───────────────────────────
async function getOrCreateSettings(prisma: any, userId: string) {
  const [profileRes, settingsRes, aiPrefRes, notifPrefRes] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }).catch(() => null),
    prisma.userSettings.findUnique({ where: { userId } }).catch(() => null),
    prisma.aiPreference.findUnique({ where: { userId } }).catch(() => null),
    prisma.notificationPreference.findUnique({ where: { userId } }).catch(() => null),
  ]);

  let profile = profileRes;
  let settings = settingsRes;
  let aiPref = aiPrefRes;
  let notifPref = notifPrefRes;

  if (!profile) {
    profile = await prisma.profile.create({ data: { userId } }).catch(() => null);
  }
  if (!settings) {
    settings = await prisma.userSettings.create({ data: { userId } }).catch(() => null);
  }
  if (!aiPref) {
    aiPref = await prisma.aiPreference.create({ data: { userId } }).catch(() => null);
  }
  if (!notifPref) {
    notifPref = await prisma.notificationPreference.create({ data: { userId } }).catch(() => null);
  }

  return {
    settings: settings || {},
    profile: profile || {},
    aiPref: aiPref || {},
    notifPref: notifPref || {},
  };
}

// ─── Mask an API key for safe display ────────────────────────────────────────
function maskKey(key: string | null | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

// ─── GET /settings ── Fetch all settings ──────────────────────────────────────
settingsRouter.get("/", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    const [settingsData, user, notificationCount] = await Promise.all([
      getOrCreateSettings(prisma, userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, createdAt: true, plan: true },
      }).catch(() => null),
      prisma.notification.count({
        where: { userId },
      }).catch(() => 0),
    ]);

    const { settings, profile, aiPref, notifPref } = settingsData;

    res.json({
      success: true,
      settings: {
        // Appearance
        themeMode: settings.themeMode || "dark",
        accentColor: settings.accentColor || "#f59e0b",
        compactMode: settings.compactMode ?? false,
        glassEffect: settings.glassEffect ?? true,
        animationsEnabled: settings.animationsEnabled ?? true,
        sidebarCollapse: settings.sidebarCollapse ?? true,
        fontSize: settings.fontSize || 14,

        // AI Preferences
        aiModel: aiPref.aiModel || "gemini",
        responseLength: aiPref.responseLength || "balanced",
        creativity: aiPref.creativity ?? 70,
        aiMemory: aiPref.aiMemory ?? true,
        markdownOutput: aiPref.markdownOutput ?? true,
        codeHighlighting: aiPref.codeHighlighting ?? true,
        autoCitation: aiPref.autoCitation ?? false,
        autoSaveConversations: aiPref.autoSaveConversations ?? true,

        // Learning
        language: settings.language || "english",
        learningStyle: settings.learningStyle || "visual",
        dailyGoal: settings.dailyGoal || 30,
        reminderTime: settings.reminderTime || "09:00",
        difficulty: settings.difficulty || "medium",
        noteFormat: settings.noteFormat || "markdown",
        quizDifficulty: settings.quizDifficulty || "medium",
        tutorPersonality: settings.tutorPersonality || "encouraging",

        // Notifications
        notifEmail: notifPref.email ?? true,
        notifPush: notifPref.push ?? true,
        notifAssignment: notifPref.assignment ?? true,
        notifInterview: notifPref.interview ?? true,
        notifCoding: notifPref.coding ?? false,
        notifResearch: notifPref.research ?? false,
        notifWeekly: notifPref.weekly ?? true,
        notifDaily: notifPref.daily ?? true,

        // Privacy
        publicProfile: settings.publicProfile ?? true,
        dataCollection: settings.dataCollection ?? true,
        personalizedAI: settings.personalizedAi ?? true,

        // Security
        twoFactorEnabled: settings.twoFactorEnabled ?? false,
        loginAlerts: settings.loginAlerts ?? true,

        // API Keys (masked)
        apiKeys: {
          gemini: { key: maskKey(settings.geminiApiKey), active: !!settings.geminiApiKey },
          openai: { key: maskKey(settings.openaiApiKey), active: !!settings.openaiApiKey },
          claude: { key: maskKey(settings.claudeApiKey), active: !!settings.claudeApiKey },
          groq: { key: maskKey(settings.groqApiKey), active: !!settings.groqApiKey },
          openrouter: { key: maskKey(settings.openrouterApiKey), active: !!settings.openrouterApiKey },
        },

        // Connected Accounts
        connectedAccounts: {
          google: settings.googleConnected ?? false,
          github: settings.githubConnected ?? false,
          microsoft: settings.microsoftConnected ?? false,
          linkedin: settings.linkedinConnected ?? false,
        },
      },
      profile: {
        fullName: user?.name || req.user?.name || "",
        email: user?.email || req.user?.email || "",
        phone: profile.phone || "",
        college: profile.college || "",
        degree: profile.degree || "",
        branch: profile.branch || "",
        graduationYear: profile.graduationYear || "",
        bio: profile.aboutMe || "",
        username: profile.username || "",
        location: profile.location || "",
        github: profile.github || "",
        linkedin: profile.linkedin || "",
        plan: user?.plan || "free",
        memberSince: user?.createdAt || new Date(),
        photoUrl: profile.photoUrl || "",
      },
      meta: {
        notificationCount: notificationCount || 0,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Settings.get", "Failed to fetch settings");
  }
});

// ─── PUT /settings/account ── Update account/profile details ──────────────────
settingsRouter.put("/account", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    const {
      fullName, phone, college, degree, branch, graduationYear,
      bio, username, location, github, linkedin,
    } = req.body;

    const userUpdate: any = {};
    if (fullName !== undefined) {
      const name = String(fullName).trim();
      if (!name) return res.status(400).json({ success: false, error: "Full name cannot be empty" });
      userUpdate.name = name;
    }

    const profileUpdate: any = {};
    if (phone !== undefined) profileUpdate.phone = String(phone).trim();
    if (college !== undefined) profileUpdate.college = String(college).trim();
    if (degree !== undefined) profileUpdate.degree = String(degree).trim();
    if (branch !== undefined) profileUpdate.branch = String(branch).trim();
    if (graduationYear !== undefined) profileUpdate.graduationYear = String(graduationYear).trim();
    if (bio !== undefined) profileUpdate.aboutMe = String(bio).trim();
    if (username !== undefined) profileUpdate.username = String(username).trim();
    if (location !== undefined) profileUpdate.location = String(location).trim();
    if (github !== undefined) profileUpdate.github = String(github).trim();
    if (linkedin !== undefined) profileUpdate.linkedin = String(linkedin).trim();

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userUpdate });
    }

    if (Object.keys(profileUpdate).length > 0) {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (profile) {
        await prisma.profile.update({ where: { userId }, data: profileUpdate });
      } else {
        await prisma.profile.create({ data: { userId, ...profileUpdate } });
      }
    }

    const changedFields = Object.keys(req.body).filter((k) =>
      ["fullName", "phone", "college", "degree", "branch", "graduationYear", "bio", "username", "location", "github", "linkedin"].includes(k)
    );

    await logActivity(prisma, userId, "Profile updated", "account", { changedFields });
    await auditSettingsAction(req, "Profile Updated", { changedFields });

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    handleRouteError(res, error, "Settings.account", "Failed to update profile");
  }
});

// ─── PUT /settings/appearance ── Save appearance preferences ─────────────────
settingsRouter.put("/appearance", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { settings, profile } = await getOrCreateSettings(prisma, userId);

    const {
      themeMode, accentColor, compactMode, glassEffect,
      animationsEnabled, sidebarCollapse, fontSize,
    } = req.body;

    if (accentColor !== undefined && !isHexColor(accentColor)) {
      return res.status(400).json({ success: false, error: "Accent color must be a valid hex value (e.g. #f59e0b)" });
    }
    if (themeMode !== undefined && !["dark", "light", "system"].includes(themeMode)) {
      return res.status(400).json({ success: false, error: "Theme mode must be one of: dark, light, system" });
    }

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(themeMode !== undefined && { themeMode }),
        ...(accentColor !== undefined && { accentColor: accentColor.trim() }),
        ...(compactMode !== undefined && { compactMode }),
        ...(glassEffect !== undefined && { glassEffect }),
        ...(animationsEnabled !== undefined && { animationsEnabled }),
        ...(sidebarCollapse !== undefined && { sidebarCollapse }),
        ...(fontSize !== undefined && { fontSize: clampInt(fontSize, 12, 20, 14) }),
      },
    });

    res.json({ success: true, message: "Appearance settings saved", settings: updated });
  } catch (error) {
    handleRouteError(res, error, "Settings.appearance", "Failed to save appearance settings");
  }
});

// ─── PUT /settings/ai ── Save AI preferences ─────────────────────────────────
settingsRouter.put("/ai", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    const {
      aiModel, responseLength, creativity, aiMemory,
      markdownOutput, codeHighlighting, autoCitation, autoSaveConversations,
    } = req.body;

    const updated = await prisma.aiPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...(aiModel !== undefined && { aiModel }),
        ...(responseLength !== undefined && { responseLength }),
        ...(creativity !== undefined && { creativity: clampInt(creativity, 0, 100, 70) }),
        ...(aiMemory !== undefined && { aiMemory }),
        ...(markdownOutput !== undefined && { markdownOutput }),
        ...(codeHighlighting !== undefined && { codeHighlighting }),
        ...(autoCitation !== undefined && { autoCitation }),
        ...(autoSaveConversations !== undefined && { autoSaveConversations }),
      },
      update: {
        ...(aiModel !== undefined && { aiModel }),
        ...(responseLength !== undefined && { responseLength }),
        ...(creativity !== undefined && { creativity: clampInt(creativity, 0, 100, 70) }),
        ...(aiMemory !== undefined && { aiMemory }),
        ...(markdownOutput !== undefined && { markdownOutput }),
        ...(codeHighlighting !== undefined && { codeHighlighting }),
        ...(autoCitation !== undefined && { autoCitation }),
        ...(autoSaveConversations !== undefined && { autoSaveConversations }),
      },
    });

    await logActivity(prisma, userId, "AI preferences updated", "ai", {
      aiModel: updated.aiModel,
      creativity: updated.creativity,
    });
    await auditSettingsAction(req, "AI Preferences Updated", { aiModel: updated.aiModel });

    res.json({ success: true, message: "AI preferences saved", settings: updated });
  } catch (error) {
    handleRouteError(res, error, "Settings.ai", "Failed to save AI preferences");
  }
});

// ─── PUT /settings/notifications ── Save notification preferences ────────────
settingsRouter.put("/notifications", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    const {
      notifEmail, notifPush, notifAssignment, notifInterview,
      notifCoding, notifResearch, notifWeekly, notifDaily,
    } = req.body;

    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...(notifEmail !== undefined && { email: notifEmail }),
        ...(notifPush !== undefined && { push: notifPush }),
        ...(notifAssignment !== undefined && { assignment: notifAssignment }),
        ...(notifInterview !== undefined && { interview: notifInterview }),
        ...(notifCoding !== undefined && { coding: notifCoding }),
        ...(notifResearch !== undefined && { research: notifResearch }),
        ...(notifWeekly !== undefined && { weekly: notifWeekly }),
        ...(notifDaily !== undefined && { daily: notifDaily }),
      },
      update: {
        ...(notifEmail !== undefined && { email: notifEmail }),
        ...(notifPush !== undefined && { push: notifPush }),
        ...(notifAssignment !== undefined && { assignment: notifAssignment }),
        ...(notifInterview !== undefined && { interview: notifInterview }),
        ...(notifCoding !== undefined && { coding: notifCoding }),
        ...(notifResearch !== undefined && { research: notifResearch }),
        ...(notifWeekly !== undefined && { weekly: notifWeekly }),
        ...(notifDaily !== undefined && { daily: notifDaily }),
      },
    });

    await auditSettingsAction(req, "Notification Preferences Updated");

    res.json({ success: true, message: "Notification preferences saved", settings: updated });
  } catch (error) {
    handleRouteError(res, error, "Settings.notifications", "Failed to save notification preferences");
  }
});

// ─── PUT /settings/learning ── Save learning preferences ─────────────────────
settingsRouter.put("/learning", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { settings } = await getOrCreateSettings(prisma, userId);

    const {
      language, learningStyle, dailyGoal, reminderTime,
      difficulty, noteFormat, quizDifficulty, tutorPersonality,
    } = req.body;

    if (reminderTime !== undefined && !isTimeString(reminderTime)) {
      return res.status(400).json({ success: false, error: "Reminder time must be in HH:MM 24-hour format" });
    }
    if (learningStyle !== undefined && !["visual", "auditory", "reading", "kinesthetic"].includes(learningStyle)) {
      return res.status(400).json({ success: false, error: "Invalid learning style" });
    }

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(language !== undefined && { language }),
        ...(learningStyle !== undefined && { learningStyle }),
        ...(dailyGoal !== undefined && { dailyGoal: clampInt(dailyGoal, 1, 24, 3) }),
        ...(reminderTime !== undefined && { reminderTime }),
        ...(difficulty !== undefined && { difficulty }),
        ...(noteFormat !== undefined && { noteFormat }),
        ...(quizDifficulty !== undefined && { quizDifficulty }),
        ...(tutorPersonality !== undefined && { tutorPersonality }),
      },
    });

    await logActivity(prisma, userId, "Learning preferences updated", "learning", {
      learningStyle: updated.learningStyle,
      dailyGoal: updated.dailyGoal,
    });

    res.json({ success: true, message: "Learning preferences saved", settings: updated });
  } catch (error) {
    handleRouteError(res, error, "Settings.learning", "Failed to save learning preferences");
  }
});

// ─── PUT /settings/privacy ── Save privacy settings ──────────────────────────
settingsRouter.put("/privacy", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { settings } = await getOrCreateSettings(prisma, userId);

    const { publicProfile, dataCollection, personalizedAI } = req.body;

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(publicProfile !== undefined && { publicProfile }),
        ...(dataCollection !== undefined && { dataCollection }),
        ...(personalizedAI !== undefined && { personalizedAI }),
      },
    });

    await auditSettingsAction(req, "Privacy Settings Updated", {
      publicProfile: updated.publicProfile,
      dataCollection: updated.dataCollection,
    });

    res.json({ success: true, message: "Privacy settings saved", settings: updated });
  } catch (error) {
    handleRouteError(res, error, "Settings.privacy", "Failed to save privacy settings");
  }
});

// ─── PUT /settings/security ── Save security settings ────────────────────────
settingsRouter.put("/security", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { settings } = await getOrCreateSettings(prisma, userId);

    const { twoFactorEnabled, loginAlerts } = req.body;

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(twoFactorEnabled !== undefined && { twoFactorEnabled }),
        ...(loginAlerts !== undefined && { loginAlerts }),
      },
    });

    await logActivity(prisma, userId, "Security settings updated", "security", {
      twoFactorEnabled: updated.twoFactorEnabled,
      loginAlerts: updated.loginAlerts,
    });
    await auditSettingsAction(req, "Security Settings Updated", {
      twoFactorEnabled: updated.twoFactorEnabled,
      loginAlerts: updated.loginAlerts,
    });

    res.json({ success: true, message: "Security settings saved", settings: updated });
  } catch (error) {
    handleRouteError(res, error, "Settings.security", "Failed to save security settings");
  }
});

// ─── PUT /settings/api-keys ── Save API keys ─────────────────────────────────
settingsRouter.put("/api-keys", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { settings } = await getOrCreateSettings(prisma, userId);

    const { geminiApiKey, openaiApiKey, claudeApiKey, groqApiKey, openrouterApiKey } = req.body;

    const providers = ["gemini", "openai", "claude", "groq", "openrouter"].filter(
      (p) => (req.body as any)[`${p}ApiKey`] !== undefined
    );
    if (providers.length === 0) {
      return res.status(400).json({ success: false, error: "No API key provider provided" });
    }
    for (const provider of providers) {
      const key = (req.body as any)[`${provider}ApiKey`];
      if (key && String(key).trim().length < 10) {
        return res.status(400).json({ success: false, error: `${provider} API key is too short` });
      }
    }

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        // Only update if explicitly provided (non-empty string = set, empty string = clear)
        ...(geminiApiKey !== undefined && { geminiApiKey: geminiApiKey || null }),
        ...(openaiApiKey !== undefined && { openaiApiKey: openaiApiKey || null }),
        ...(claudeApiKey !== undefined && { claudeApiKey: claudeApiKey || null }),
        ...(groqApiKey !== undefined && { groqApiKey: groqApiKey || null }),
        ...(openrouterApiKey !== undefined && { openrouterApiKey: openrouterApiKey || null }),
      },
    });

    res.json({
      success: true,
      message: "API keys saved",
      apiKeys: {
        gemini: { key: maskKey(updated.geminiApiKey), active: !!updated.geminiApiKey },
        openai: { key: maskKey(updated.openaiApiKey), active: !!updated.openaiApiKey },
        claude: { key: maskKey(updated.claudeApiKey), active: !!updated.claudeApiKey },
        groq: { key: maskKey(updated.groqApiKey), active: !!updated.groqApiKey },
        openrouter: { key: maskKey(updated.openrouterApiKey), active: !!updated.openrouterApiKey },
      },
    });

    const affected = providers.filter((p) => (req.body as any)[`${p}ApiKey`] !== "");
    await logActivity(prisma, userId, "API keys updated", "api", {
      providers: affected,
      cleared: providers.filter((p) => (req.body as any)[`${p}ApiKey`] === ""),
    });
    await auditSettingsAction(req, "API Keys Updated", { providers: affected });
  } catch (error) {
    handleRouteError(res, error, "Settings.apiKeys", "Failed to save API keys");
  }
});

// ─── POST /settings/change-password ── Change user password ──────────────────
settingsRouter.post("/change-password", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "Current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: "New password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ success: false, error: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    await logActivity(prisma, userId, "Password changed", "security");
    await auditSettingsAction(req, "Password Changed");

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    handleRouteError(res, error, "Settings.changePassword", "Failed to change password");
  }
});

// ─── DELETE /settings/account ── Delete account ───────────────────────────────
settingsRouter.delete("/account", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: "Password confirmation is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, error: "Password is incorrect" });

    await auditSettingsAction(req, "Account Deleted", { email: user.email });

    // Delete user (cascades to profile, settings, all related data via DB constraints)
    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    handleRouteError(res, error, "Settings.deleteAccount", "Failed to delete account");
  }
});

// ─── GET /settings/activity ── Get activity log ──────────────────────────────
settingsRouter.get("/activity", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    const [notifications, activityLogs] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, title: true, message: true, type: true, createdAt: true, read: true },
      }),
      prisma.activityLog
        .findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
        .catch(() => [] as any[]),
    ]);

    const activity = [
      ...notifications.map((n: any) => ({
        id: n.id,
        type: "notification",
        title: n.title,
        message: n.message,
        category: n.type,
        createdAt: n.createdAt,
      })),
      ...activityLogs.map((a: any) => ({
        id: a.id,
        type: "action",
        title: a.action,
        message: "",
        category: a.category,
        details: a.details,
        createdAt: a.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30);

    res.json({ success: true, activity });
  } catch (error) {
    handleRouteError(res, error, "Settings.activity", "Failed to fetch activity");
  }
});

// ─── GET /settings/storage ── Get storage usage ──────────────────────────────
settingsRouter.get("/storage", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    // Get user plan to assign limit (Free: 50MB, Premium: 200MB)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, subscriptionStatus: true },
    });

    const planLower = (user?.plan || "").toLowerCase();
    const isPremium = planLower !== "" && planLower !== "free";
    const limitMb = isPremium ? 200 : 50;

    // Count each storage category
    const [notes, resumes, assignments, sessions] = await Promise.all([
      prisma.generatedNote.count({ where: { userId } }),
      prisma.uploadedResume.count({ where: { userId } }),
      prisma.assignment.count({ where: { userId } }),
      prisma.interviewSession.count({ where: { userId } }),
    ]);

    const totalMb = notes * 0.05 + resumes * 0.5 + assignments * 0.08 + sessions * 0.1;
    const usedMb = parseFloat(totalMb.toFixed(2));
    const percentUsed = Math.min(100, Math.round((usedMb / limitMb) * 100));

    const storageData = {
      plan: isPremium ? "premium" : "free",
      limitMb,
      usedMb,
      percentUsed,
      notes: { count: notes, estimatedMb: parseFloat((notes * 0.05).toFixed(2)) },
      resumes: { count: resumes, estimatedMb: parseFloat((resumes * 0.5).toFixed(2)) },
      assignments: { count: assignments, estimatedMb: parseFloat((assignments * 0.08).toFixed(2)) },
      sessions: { count: sessions, estimatedMb: parseFloat((sessions * 0.1).toFixed(2)) },
      totalMb: usedMb,
    };

    // Persist a snapshot so the Storage page has durable usage data
    await prisma.storageUsage
      .upsert({
        where: { userId },
        create: {
          userId,
          limitMb,
          usedMb,
          notes,
          resumes,
          assignments,
          sessions,
        },
        update: {
          limitMb,
          usedMb,
          notes,
          resumes,
          assignments,
          sessions,
        },
      })
      .catch(() => {});

    res.json({ success: true, storage: storageData });
  } catch (error) {
    handleRouteError(res, error, "Settings.storage", "Failed to fetch storage info");
  }
});

// ─── POST /settings/profile-photo ── Upload profile photo ────────────────────
const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only JPG, PNG, GIF, and WEBP files are allowed"));
  },
});

function uploadPhotoToCloudinary(file: Express.Multer.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "adyapan-avatars", resource_type: "image", transformation: [{ width: 512, height: 512, crop: "limit" }] },
      (error: any, result: any) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(file.buffer);
  });
}

settingsRouter.post("/profile-photo", uploadPhoto.single("photo"), async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    if (!req.file) {
      res.status(400).json({ success: false, error: "No photo uploaded" });
      return;
    }
    if (!sniffImageType(req.file.buffer)) {
      res.status(400).json({ success: false, error: "File content is not a valid image." });
      return;
    }
    const photoUrl = await uploadPhotoToCloudinary(req.file);
    await prisma.profile.update({ where: { userId }, data: { photoUrl } });
    await logActivity(prisma, userId, "Profile photo updated", "account");
    await auditSettingsAction(req, "Profile Photo Updated");
    res.json({ success: true, photoUrl, message: "Profile photo updated" });
  } catch (error) {
    handleRouteError(res, error, "Settings.profilePhoto", "Failed to upload profile photo");
  }
});

// ─── DELETE /settings/profile-photo ── Remove profile photo ──────────────────
settingsRouter.delete("/profile-photo", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const profile = await prisma.profile.findUnique({ where: { userId }, select: { photoUrl: true } });
    if (profile?.photoUrl && profile.photoUrl.includes("cloudinary.com")) {
      const urlParts = profile.photoUrl.split("/");
      const folderIdx = urlParts.indexOf("adyapan-avatars");
      if (folderIdx !== -1) {
        const publicId = `adyapan-avatars/${urlParts.slice(folderIdx + 1).join("/").split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" }).catch(() => {});
      }
    }
    await prisma.profile.update({ where: { userId }, data: { photoUrl: null } });
    await logActivity(prisma, userId, "Profile photo removed", "account");
    await auditSettingsAction(req, "Profile Photo Removed");
    res.json({ success: true, message: "Profile photo removed" });
  } catch (error) {
    handleRouteError(res, error, "Settings.removePhoto", "Failed to remove profile photo");
  }
});

// ─── PUT /settings/connected-accounts ── Save connected account status ───────
settingsRouter.put("/connected-accounts", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { settings } = await getOrCreateSettings(prisma, userId);

    const { googleConnected, githubConnected, microsoftConnected, linkedinConnected } = req.body;

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(googleConnected !== undefined && { googleConnected }),
        ...(githubConnected !== undefined && { githubConnected }),
        ...(microsoftConnected !== undefined && { microsoftConnected }),
        ...(linkedinConnected !== undefined && { linkedinConnected }),
      },
    });

    res.json({
      success: true,
      message: "Connected accounts updated",
      connectedAccounts: {
        google: updated.googleConnected,
        github: updated.githubConnected,
        microsoft: updated.microsoftConnected,
        linkedin: updated.linkedinConnected,
      },
    });

    const connected = {
      google: updated.googleConnected,
      github: updated.githubConnected,
      microsoft: updated.microsoftConnected,
      linkedin: updated.linkedinConnected,
    };
    await logActivity(prisma, userId, "Connected accounts updated", "account", { connected });
    await auditSettingsAction(req, "Connected Accounts Updated", { connected });
  } catch (error) {
    handleRouteError(res, error, "Settings.connectedAccounts", "Failed to update connected accounts");
  }
});

// ─── POST /settings/logout-devices ── Invalidate all other sessions ──────────
settingsRouter.post("/logout-devices", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    // The current JWT remains valid until it expires.
    // Future implementations should use a token-version field on User
    // to fully invalidate older sessions.
    // Housekeeping: prune only EXPIRED blacklist entries. Wiping the whole
    // table would resurrect blacklisted (potentially stolen) tokens for
    // every user on the platform.
    try {
      await prisma.blacklistedToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    } catch { /* model may not exist, ignore */ }

    await logActivity(prisma, userId, "All other devices logged out", "security");
    await auditSettingsAction(req, "Logged Out All Devices");

    res.json({ success: true, message: "All other devices logged out. Note: current session remains valid until token expires." });
  } catch (error) {
    handleRouteError(res, error, "Settings.logoutDevices", "Failed to logout devices");
  }
});

// ─── GET /settings/export-data ── Export all user data as JSON ───────────────
settingsRouter.get("/export-data", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    const [user, profile, settings, chatSessions, notifications, interviewSessions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, createdAt: true, plan: true },
      }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.userSettings.findFirst({ where: { userId } }),
      prisma.chatSession.findMany({
        where: { userId },
        include: { messages: { select: { role: true, content: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.interviewSession.findMany({
        where: { userId },
        include: { evaluations: { take: 1 } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: { name: user?.name, email: user?.email, plan: user?.plan, memberSince: user?.createdAt },
      profile,
      settings,
      chatSessions: chatSessions.map((s: any) => ({
        title: s.title,
        model: s.model,
        createdAt: s.createdAt,
        messages: s.messages,
      })),
      notifications: notifications.map((n: any) => ({
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt,
      })),
      interviewSessions: interviewSessions.map((s: any) => ({
        role: s.role,
        company: s.company,
        type: s.type,
        difficulty: s.difficulty,
        status: s.status,
        overallScore: s.evaluations?.[0]?.overallScore ?? null,
        createdAt: s.createdAt,
      })),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="adyapan-export-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    handleRouteError(res, error, "Settings.exportData", "Failed to export data");
  }
});

// ─── DELETE /settings/chat-history ── Delete all chat sessions for user ──────
settingsRouter.delete("/chat-history", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    // Delete all chat messages first, then sessions
    const sessions = await prisma.chatSession.findMany({ where: { userId }, select: { id: true } });
    const sessionIds = sessions.map((s: any) => s.id);

    if (sessionIds.length > 0) {
      await prisma.chatMessage.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.chatSession.deleteMany({ where: { userId } });
    }

    await logActivity(prisma, userId, "Chat history cleared", "privacy", { deletedSessions: sessionIds.length });
    await auditSettingsAction(req, "Chat History Cleared", { deletedSessions: sessionIds.length });

    res.json({ success: true, message: "All chat history deleted", deletedSessions: sessionIds.length });
  } catch (error) {
    handleRouteError(res, error, "Settings.deleteChatHistory", "Failed to delete chat history");
  }
});

// ─── DELETE /settings/storage/cache ── Clear user cache / generated content ───
settingsRouter.delete("/storage/cache", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    // Delete generated notes, mindmaps, flashcards as cache-clearing
    const [deletedNotes, deletedMindmaps] = await Promise.all([
      prisma.generatedNote.deleteMany({ where: { userId } }).catch(() => ({ count: 0 })),
      prisma.mindMap.deleteMany({ where: { userId } }).catch(() => ({ count: 0 })),
    ]);

    await logActivity(prisma, userId, "Cache cleared", "storage", {
      notes: (deletedNotes as any).count ?? 0,
      mindmaps: (deletedMindmaps as any).count ?? 0,
    });
    await auditSettingsAction(req, "Cache Cleared");

    res.json({
      success: true,
      message: "Cache cleared",
      deleted: {
        notes: (deletedNotes as any).count ?? 0,
        mindmaps: (deletedMindmaps as any).count ?? 0,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Settings.clearCache", "Failed to clear cache");
  }
});

// ─── POST /settings/support-ticket ── Submit support request ────────────────
settingsRouter.post("/support-ticket", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { subject, category, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, error: "Subject and message are required" });
    }

    const ticketId = `TK-${Math.floor(100000 + Math.random() * 900000)}`;

    await prisma.supportTicket
      .create({
        data: {
          userId,
          ticketId,
          subject: String(subject).trim().slice(0, 200),
          category: String(category || "general").trim() || "general",
          message: String(message).trim(),
          severity: "medium",
          status: "open",
        },
      })
      .catch(() => {});

    await prisma.notification.create({
      data: {
        userId,
        title: `Support Ticket Created (#${ticketId})`,
        message: `Your ticket "${subject}" has been received. Our team will respond shortly.`,
        type: "system",
      },
    }).catch(() => {});

    await logActivity(prisma, userId, "Support ticket submitted", "support", { ticketId, category: category || "general" });
    await auditSettingsAction(req, "Support Ticket Submitted", { ticketId, category: category || "general" });

    res.json({
      success: true,
      ticketId,
      message: `Support ticket #${ticketId} submitted successfully! Our team will get back to you shortly.`,
    });
  } catch (error) {
    handleRouteError(res, error, "Settings.supportTicket", "Failed to submit support ticket");
  }
});

// ─── POST /settings/report-bug ── Submit bug report ─────────────────────────
settingsRouter.post("/report-bug", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { title, severity: severityInput, steps, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: "Bug title and description are required" });
    }

    const bugId = `BUG-${Math.floor(100000 + Math.random() * 900000)}`;

    const severity = ["low", "medium", "high", "critical"].includes(String(severityInput).toLowerCase())
      ? String(severityInput).toLowerCase()
      : "medium";

    await prisma.supportTicket
      .create({
        data: {
          userId,
          ticketId: bugId,
          subject: String(title).trim().slice(0, 200),
          category: "bug",
          message: `[${severity}] ${String(message).trim()}${steps ? `\nSteps:\n${String(steps).trim()}` : ""}`,
          severity,
          status: "open",
        },
      })
      .catch(() => {});

    await prisma.notification.create({
      data: {
        userId,
        title: `Bug Report Submitted (#${bugId})`,
        message: `Thank you for reporting "${title}". Severity: ${severity}.`,
        type: "system",
      },
    }).catch(() => {});

    await logActivity(prisma, userId, "Bug report submitted", "support", { bugId, severity });
    await auditSettingsAction(req, "Bug Report Submitted", { bugId, severity });

    res.json({
      success: true,
      bugId,
      message: `Bug report #${bugId} logged! Thank you for helping us improve Adyapan AI.`,
    });
  } catch (error) {
    handleRouteError(res, error, "Settings.reportBug", "Failed to submit bug report");
  }
});

// ─── GET /settings/support-tickets ── List all support tickets for user ─────
settingsRouter.get("/support-tickets", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
          "id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "ticket_id" TEXT NOT NULL,
          "subject" TEXT NOT NULL,
          "category" TEXT NOT NULL DEFAULT 'general',
          "message" TEXT NOT NULL,
          "severity" TEXT NOT NULL DEFAULT 'medium',
          "status" TEXT NOT NULL DEFAULT 'open',
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
      );
      CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
          "id" TEXT NOT NULL,
          "ticket_id" TEXT NOT NULL,
          "sender_id" TEXT NOT NULL,
          "sender_type" TEXT NOT NULL DEFAULT 'USER',
          "sender_name" TEXT NOT NULL DEFAULT 'User',
          "message" TEXT NOT NULL,
          "read" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "support_tickets_user_id_idx" ON "support_tickets"("user_id");
      CREATE INDEX IF NOT EXISTS "support_ticket_messages_ticket_id_idx" ON "support_ticket_messages"("ticket_id");
    `).catch(() => {});

    const tickets = await (prisma as any).supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    const ticketsWithLastMsg = await Promise.all(
      tickets.map(async (t: any) => {
        const lastMsg = await (prisma as any).supportTicketMessage.findFirst({
          where: { ticketId: t.id },
          orderBy: { createdAt: "desc" },
        }).catch(() => null);

        return {
          id: t.id,
          ticketId: t.ticketId,
          subject: t.subject,
          category: t.category,
          message: t.message,
          severity: t.severity,
          status: t.status,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          lastMessage: lastMsg,
        };
      })
    );

    res.json({
      success: true,
      tickets: ticketsWithLastMsg,
    });
  } catch (error) {
    handleRouteError(res, error, "Settings.getSupportTickets", "Failed to fetch tickets");
  }
});

// ─── GET /settings/support-tickets/:ticketId/messages ── Get ticket messages 
settingsRouter.get("/support-tickets/:ticketId/messages", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const { ticketId } = req.params;

    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
          "id" TEXT NOT NULL,
          "ticket_id" TEXT NOT NULL,
          "sender_id" TEXT NOT NULL,
          "sender_type" TEXT NOT NULL DEFAULT 'USER',
          "sender_name" TEXT NOT NULL DEFAULT 'User',
          "message" TEXT NOT NULL,
          "read" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "support_ticket_messages_ticket_id_idx" ON "support_ticket_messages"("ticket_id");
    `).catch(() => {});

    const ticket = await (prisma as any).supportTicket.findFirst({
      where: {
        userId,
        OR: [{ id: ticketId }, { ticketId }],
      },
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: "Support ticket not found" });
    }

    const messages = await (prisma as any).supportTicketMessage.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
    }).catch(() => []);

    // Mark unread admin messages as read
    await (prisma as any).supportTicketMessage.updateMany({
      where: {
        ticketId: ticket.id,
        senderType: "ADMIN",
        read: false,
      },
      data: { read: true },
    }).catch(() => {});

    res.json({
      success: true,
      ticket,
      messages,
    });
  } catch (error) {
    handleRouteError(res, error, "Settings.getTicketMessages", "Failed to fetch ticket messages");
  }
});

// ─── POST /settings/support-tickets/:ticketId/messages ── Send user message ─
settingsRouter.post("/support-tickets/:ticketId/messages", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;
    const userName = req.user?.name || "User";
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: "Message cannot be empty" });
    }

    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
          "id" TEXT NOT NULL,
          "ticket_id" TEXT NOT NULL,
          "sender_id" TEXT NOT NULL,
          "sender_type" TEXT NOT NULL DEFAULT 'USER',
          "sender_name" TEXT NOT NULL DEFAULT 'User',
          "message" TEXT NOT NULL,
          "read" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "support_ticket_messages_ticket_id_idx" ON "support_ticket_messages"("ticket_id");
    `).catch(() => {});

    const ticket = await (prisma as any).supportTicket.findFirst({
      where: {
        userId,
        OR: [{ id: ticketId }, { ticketId }],
      },
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: "Support ticket not found" });
    }

    const msgId = `msg_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;

    const newMsg = await (prisma as any).supportTicketMessage.create({
      data: {
        id: msgId,
        ticketId: ticket.id,
        senderId: userId,
        senderType: "USER",
        senderName: userName,
        message: String(message).trim(),
        read: false,
      },
    });

    // Reopen ticket if it was resolved/closed
    const updatedStatus = ticket.status === "closed" || ticket.status === "resolved" ? "open" : ticket.status;
    await (prisma as any).supportTicket.update({
      where: { id: ticket.id },
      data: { status: updatedStatus, updatedAt: new Date() },
    }).catch(() => {});

    res.json({
      success: true,
      message: "Reply sent successfully",
      chatMessage: newMsg,
    });
  } catch (error) {
    handleRouteError(res, error, "Settings.sendTicketMessage", "Failed to send message");
  }
});


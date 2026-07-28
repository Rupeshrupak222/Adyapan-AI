import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";
import bcrypt from "bcryptjs";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// ─── Helper: get or create UserSettings for a user ───────────────────────────
async function getOrCreateSettings(prisma: any, userId: string) {
  // Ensure profile exists first
  let profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.profile.create({
      data: { userId },
    });
  }

  let settings = await prisma.userSettings.findUnique({
    where: { profileId: profile.id },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        userId,
        profileId: profile.id,
      },
    });
  }

  return { settings, profile };
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

    const { settings, profile } = await getOrCreateSettings(prisma, userId);

    // Get user info for account section
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, createdAt: true, plan: true },
    });

    // Get notification count for activity
    const notificationCount = await prisma.notification.count({
      where: { userId },
    });

    res.json({
      success: true,
      settings: {
        // Appearance
        themeMode: settings.themeMode,
        accentColor: settings.accentColor,
        compactMode: settings.compactMode,
        glassEffect: settings.glassEffect,
        animationsEnabled: settings.animationsEnabled,
        sidebarCollapse: settings.sidebarCollapse,
        fontSize: settings.fontSize,

        // AI Preferences
        aiModel: settings.aiModel,
        responseLength: settings.responseLength,
        creativity: settings.creativity,
        aiMemory: settings.aiMemory,
        markdownOutput: settings.markdownOutput,
        codeHighlighting: settings.codeHighlighting,
        autoCitation: settings.autoCitation,
        autoSaveConversations: settings.autoSaveConversations,

        // Learning
        language: settings.language,
        learningStyle: settings.learningStyle,
        dailyGoal: settings.dailyGoal,
        reminderTime: settings.reminderTime,
        difficulty: settings.difficulty,
        noteFormat: settings.noteFormat,
        quizDifficulty: settings.quizDifficulty,
        tutorPersonality: settings.tutorPersonality,

        // Notifications
        notifEmail: settings.notifEmail,
        notifPush: settings.notifPush,
        notifAssignment: settings.notifAssignment,
        notifInterview: settings.notifInterview,
        notifCoding: settings.notifCoding,
        notifResearch: settings.notifResearch,
        notifWeekly: settings.notifWeekly,
        notifDaily: settings.notifDaily,

        // Privacy
        publicProfile: settings.publicProfile,
        dataCollection: settings.dataCollection,
        personalizedAI: settings.personalizedAI,

        // Security
        twoFactorEnabled: settings.twoFactorEnabled,
        loginAlerts: settings.loginAlerts,

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
          google: settings.googleConnected,
          github: settings.githubConnected,
          microsoft: settings.microsoftConnected,
          linkedin: settings.linkedinConnected,
        },
      },
      profile: {
        fullName: user?.name || "",
        email: user?.email || "",
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
      },
      meta: {
        notificationCount,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Settings.get", "Failed to fetch settings");
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

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(themeMode !== undefined && { themeMode }),
        ...(accentColor !== undefined && { accentColor }),
        ...(compactMode !== undefined && { compactMode }),
        ...(glassEffect !== undefined && { glassEffect }),
        ...(animationsEnabled !== undefined && { animationsEnabled }),
        ...(sidebarCollapse !== undefined && { sidebarCollapse }),
        ...(fontSize !== undefined && { fontSize: Number(fontSize) }),
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
    const { settings } = await getOrCreateSettings(prisma, userId);

    const {
      aiModel, responseLength, creativity, aiMemory,
      markdownOutput, codeHighlighting, autoCitation, autoSaveConversations,
    } = req.body;

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(aiModel !== undefined && { aiModel }),
        ...(responseLength !== undefined && { responseLength }),
        ...(creativity !== undefined && { creativity: Number(creativity) }),
        ...(aiMemory !== undefined && { aiMemory }),
        ...(markdownOutput !== undefined && { markdownOutput }),
        ...(codeHighlighting !== undefined && { codeHighlighting }),
        ...(autoCitation !== undefined && { autoCitation }),
        ...(autoSaveConversations !== undefined && { autoSaveConversations }),
      },
    });

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
    const { settings } = await getOrCreateSettings(prisma, userId);

    const {
      notifEmail, notifPush, notifAssignment, notifInterview,
      notifCoding, notifResearch, notifWeekly, notifDaily,
    } = req.body;

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(notifEmail !== undefined && { notifEmail }),
        ...(notifPush !== undefined && { notifPush }),
        ...(notifAssignment !== undefined && { notifAssignment }),
        ...(notifInterview !== undefined && { notifInterview }),
        ...(notifCoding !== undefined && { notifCoding }),
        ...(notifResearch !== undefined && { notifResearch }),
        ...(notifWeekly !== undefined && { notifWeekly }),
        ...(notifDaily !== undefined && { notifDaily }),
      },
    });

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

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(language !== undefined && { language }),
        ...(learningStyle !== undefined && { learningStyle }),
        ...(dailyGoal !== undefined && { dailyGoal: Number(dailyGoal) }),
        ...(reminderTime !== undefined && { reminderTime }),
        ...(difficulty !== undefined && { difficulty }),
        ...(noteFormat !== undefined && { noteFormat }),
        ...(quizDifficulty !== undefined && { quizDifficulty }),
        ...(tutorPersonality !== undefined && { tutorPersonality }),
      },
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

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, message: true, type: true, createdAt: true, isRead: true },
    });

    res.json({ success: true, activity: notifications });
  } catch (error) {
    handleRouteError(res, error, "Settings.activity", "Failed to fetch activity");
  }
});

// ─── GET /settings/storage ── Get storage usage ──────────────────────────────
settingsRouter.get("/storage", async (req: any, res) => {
  try {
    const prisma = await getUserPrismaFromRequest(req);
    const userId = req.user?.userId || req.user?.id;

    // Count each storage category
    const [notes, resumes, assignments, sessions] = await Promise.all([
      prisma.generatedNote.count({ where: { userId } }),
      prisma.uploadedResume.count({ where: { userId } }),
      prisma.assignment.count({ where: { userId } }),
      prisma.interviewSession.count({ where: { userId } }),
    ]);

    const storageData = {
      notes: { count: notes, estimatedMb: notes * 0.05 },
      resumes: { count: resumes, estimatedMb: resumes * 0.5 },
      assignments: { count: assignments, estimatedMb: assignments * 0.08 },
      sessions: { count: sessions, estimatedMb: sessions * 0.1 },
      totalMb: notes * 0.05 + resumes * 0.5 + assignments * 0.08 + sessions * 0.1,
    };

    res.json({ success: true, storage: storageData });
  } catch (error) {
    handleRouteError(res, error, "Settings.storage", "Failed to fetch storage info");
  }
});

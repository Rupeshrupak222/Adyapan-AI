import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { handleRouteError } from "../utils/routeError";
import { generateJSON, MODELS } from "../lib/ai/openrouter";

const router = Router();
router.use(requireAuth);

// Helper to get authenticated User ID
function getUserId(req: any): string {
  return req.user?.userId || req.user?.id || "";
}

// Helper to resolve actual User ID from userId/profileId/username
async function resolveUserId(idOrUsername: string): Promise<string> {
  const profile = await prisma.profile.findFirst({
    where: {
      OR: [
        { userId: idOrUsername },
        { id: idOrUsername },
        { username: idOrUsername },
      ],
    },
    select: { userId: true },
  });
  return profile ? profile.userId : idOrUsername;
}

// Get follow stats for a user
router.get("/stats/:userId", async (req: any, res) => {
  try {
    const targetUserId = await resolveUserId(req.params.userId);
    const currentUserId = getUserId(req);
    const followers = await prisma.communityFollow.count({ where: { followingId: targetUserId } });
    const following = await prisma.communityFollow.count({ where: { followerId: targetUserId } });
    const isFollowing = await prisma.communityFollow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
    });
    res.json({ success: true, followers, following, isFollowing: !!isFollowing });
  } catch (error) {
    handleRouteError(res, error, "Community.stats", "Failed to fetch stats");
  }
});

// Toggle follow
router.post("/follow/:userId", async (req: any, res) => {
  try {
    const targetUserId = await resolveUserId(req.params.userId);
    const currentUserId = getUserId(req);
    if (targetUserId === currentUserId) return res.status(400).json({ error: "Cannot follow yourself" });
    const existing = await prisma.communityFollow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
    });
    if (existing) {
      await prisma.communityFollow.delete({ where: { id: existing.id } });
      res.json({ success: true, isFollowing: false });
    } else {
      await prisma.communityFollow.create({
        data: { followerId: currentUserId, followingId: targetUserId },
      });
      res.json({ success: true, isFollowing: true });
    }
  } catch (error) {
    handleRouteError(res, error, "Community.follow", "Failed to toggle follow");
  }
});

// Send message
router.post("/messages", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    const { receiverId, content } = req.body;
    if (!receiverId || !content) return res.status(400).json({ error: "Receiver and content required" });
    const message = await prisma.communityMessage.create({
      data: { senderId: currentUserId, receiverId, content },
    });
    res.json({ success: true, message });
  } catch (error) {
    handleRouteError(res, error, "Community.sendMessage", "Failed to send message");
  }
});

// Get conversations
router.get("/messages", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    const messages = await prisma.communityMessage.findMany({
      where: { OR: [{ senderId: currentUserId }, { receiverId: currentUserId }] },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, messages });
  } catch (error) {
    handleRouteError(res, error, "Community.getMessages", "Failed to fetch messages");
  }
});

// Mark messages as read
router.put("/messages/read/:senderId", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    await prisma.communityMessage.updateMany({
      where: { senderId: req.params.senderId, receiverId: currentUserId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, "Community.markRead", "Failed to mark messages read");
  }
});

// Get activity feed
router.get("/activity", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    const activities = await prisma.communityActivity.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, activities });
  } catch (error) {
    handleRouteError(res, error, "Community.activity", "Failed to fetch activity");
  }
});

// Get achievements
router.get("/achievements", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    const achievements = await prisma.communityAchievement.findMany({
      where: { userId: currentUserId },
      orderBy: { unlockedAt: "desc" },
    });
    res.json({ success: true, achievements });
  } catch (error) {
    handleRouteError(res, error, "Community.achievements", "Failed to fetch achievements");
  }
});

// Get projects
router.get("/projects", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    const projects = await prisma.communityProject.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, projects });
  } catch (error) {
    handleRouteError(res, error, "Community.projects", "Failed to fetch projects");
  }
});

// Create project
router.post("/projects", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    const { title, description, techStack, url } = req.body;
    if (!title || !description) return res.status(400).json({ error: "Title and description required" });
    const project = await prisma.communityProject.create({
      data: {
        userId: currentUserId,
        title,
        description,
        techStack: techStack || [],
        url: url || null,
      },
    });
    res.json({ success: true, project });
  } catch (error) {
    handleRouteError(res, error, "Community.createProject", "Failed to create project");
  }
});

// AI Recommendations
router.get("/recommendations", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    const profile = await prisma.profile.findUnique({ where: { userId: currentUserId } });
    const skills = (profile?.skills as string[]) || [];
    
    const result = await generateJSON(
      "You are a career development AI. Provide personalized recommendations based on the user's skills and interests.",
      `User skills: ${skills.join(", ") || "Not specified"}
Provide 3-5 concise, actionable recommendations for skill development, projects to build, or communities to join.

Return JSON matching:
{
  "recommendations": [
    { "title": "Recommendation title", "description": "Brief description", "category": "skill|project|community" }
  ]
}`,
      { model: MODELS.FAST, temperature: 0.7 },
      { recommendations: [] }
    );

    res.json({ success: true, recommendations: result.recommendations });
  } catch (error) {
    handleRouteError(res, error, "Community.recommendations", "Failed to generate recommendations");
  }
});

// Get own full community profile (single endpoint for all own-profile data)
router.get("/me", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);

    let profile = await prisma.profile.findUnique({
      where: { userId: currentUserId },
      include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
    });

    if (!profile) {
      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      if (!user) return res.status(404).json({ error: "User not found" });

      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          username: user.name ? user.name.toLowerCase().replace(/\s+/g, "") : `user_${user.id.slice(0, 6)}`,
        },
        include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
      });
    }

    const [followers, following, projects, activities, achievements] = await Promise.all([
      prisma.communityFollow.count({ where: { followingId: currentUserId } }),
      prisma.communityFollow.count({ where: { followerId: currentUserId } }),
      prisma.communityProject.findMany({ where: { userId: currentUserId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.communityActivity.findMany({ where: { userId: currentUserId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.communityAchievement.findMany({ where: { userId: currentUserId }, orderBy: { unlockedAt: "desc" } }),
    ]);

    let recommendations: { title: string; description: string; category: string }[] = [];
    try {
      const skills = (profile.skills as string[]) || [];
      const result = await generateJSON(
        "You are a career development AI. Provide personalized recommendations based on the user's skills and interests.",
        `User skills: ${skills.join(", ") || "Not specified"}
Provide 3-5 concise, actionable recommendations for skill development, projects to build, or communities to join.

Return JSON matching:
{
  "recommendations": [
    { "title": "Recommendation title", "description": "Brief description", "category": "skill|project|community" }
  ]
}`,
        { model: MODELS.FAST, temperature: 0.7 },
        { recommendations: [] }
      );
      recommendations = result.recommendations || [];
    } catch { /* AI recommendations are optional */ }

    res.json({ success: true, profile, followers, following, isFollowing: false, projects, activities, achievements, recommendations });
  } catch (error) {
    handleRouteError(res, error, "Community.getMyProfile", "Failed to fetch profile");
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY BROWSING & MESSAGING
// ═══════════════════════════════════════════════════════════════════════════

// List community users (with search)
router.get("/users", async (req: any, res) => {
  try {
    const { q, page = "1", limit = "20" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Auto-create profile records for any users that don't have one yet
    const usersWithoutProfile = await prisma.user.findMany({
      where: { profile: null },
      select: { id: true, name: true },
    });
    if (usersWithoutProfile.length > 0) {
      await Promise.all(
        usersWithoutProfile.map((u: any) =>
          prisma.profile.create({
            data: {
              userId: u.id,
              username: u.name ? u.name.toLowerCase().replace(/\s+/g, "") : `user_${u.id.slice(0, 6)}`,
            },
          }).catch(() => { /* ignore if already created concurrently */ })
        )
      );
    }

    const where: any = {};
    if (q) {
      where.OR = [
        { user: { name: { contains: String(q), mode: "insensitive" } } },
        { username: { contains: String(q), mode: "insensitive" } },
        { college: { contains: String(q), mode: "insensitive" } },
      ];
    }
    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.profile.count({ where }),
    ]);
    res.json({ success: true, users: profiles, total });
  } catch (error) {
    handleRouteError(res, error, "Community.users", "Failed to fetch users");
  }
});

// Get another user's public profile
router.get("/users/:userId", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    const rawId = req.params.userId;
    let profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { userId: rawId },
          { id: rawId },
          { username: rawId },
        ],
      },
      include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
    });

    if (!profile) {
      const user = await prisma.user.findUnique({
        where: { id: rawId },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      if (!user) return res.status(404).json({ error: "Profile not found" });

      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          username: user.name ? user.name.toLowerCase().replace(/\s+/g, "") : `user_${user.id.slice(0, 6)}`,
        },
        include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
      });
    }

    const targetUserId = profile.userId;

    const [followers, following, isFollowing, projects, activities, achievements] = await Promise.all([
      prisma.communityFollow.count({ where: { followingId: targetUserId } }),
      prisma.communityFollow.count({ where: { followerId: targetUserId } }),
      prisma.communityFollow.findUnique({ where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } } }).then(Boolean),
      prisma.communityProject.findMany({ where: { userId: targetUserId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.communityActivity.findMany({ where: { userId: targetUserId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.communityAchievement.findMany({ where: { userId: targetUserId }, orderBy: { unlockedAt: "desc" } }),
    ]);
    res.json({ success: true, profile, followers, following, isFollowing, projects, activities, achievements });
  } catch (error) {
    handleRouteError(res, error, "Community.getUserProfile", "Failed to fetch user profile");
  }
});

// Get conversations list
router.get("/conversations", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const rawMessages = await prisma.communityMessage.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const convMap = new Map<string, any>();
    for (const msg of rawMessages) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!convMap.has(otherId)) {
        convMap.set(otherId, { userId: otherId, lastMessage: msg, unread: 0 });
      }
      if (msg.receiverId === userId && !msg.read) {
        convMap.get(otherId)!.unread++;
      }
    }
    const otherIds = [...convMap.keys()];
    const otherProfiles = await prisma.profile.findMany({
      where: { userId: { in: otherIds } },
      select: { userId: true, user: { select: { id: true, name: true } } },
    });
    const profileMap = new Map<string, any>(otherProfiles.map((p: any) => [p.userId, p]));
    const conversations = otherIds.map(id => ({
      userId: id,
      name: (profileMap.get(id) as any)?.user?.name || "Unknown",
      lastMessage: convMap.get(id)!.lastMessage,
      unread: convMap.get(id)!.unread,
    }));
    conversations.sort((a: any, b: any) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
    res.json({ success: true, conversations });
  } catch (error) {
    handleRouteError(res, error, "Community.conversations", "Failed to fetch conversations");
  }
});

// Get messages with a specific user
router.get("/messages/:userId", async (req: any, res) => {
  try {
    const currentUserId = getUserId(req);
    const { userId } = req.params;
    const messages = await prisma.communityMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    await prisma.communityMessage.updateMany({
      where: { senderId: userId, receiverId: currentUserId, read: false },
      data: { read: true },
    });
    res.json({ success: true, messages });
  } catch (error) {
    handleRouteError(res, error, "Community.getMessagesWith", "Failed to fetch messages");
  }
});

export const communityRouter = router;

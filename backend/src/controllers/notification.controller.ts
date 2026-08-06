import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/httpError";
import { emitNotification } from "../lib/notificationEmitter";
import { getUserPrismaFromRequest, masterPrisma } from "../utils/prisma";
import { requireUserId } from "../utils/request";

// ─── 1. List Notifications (paginated & merged with admin broadcasts) ──────

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Get user details to inspect plan (free vs premium) and registration date
    const user = await masterPrisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true, subscriptionStatus: true, createdAt: true },
    });

    const userPlan = (user?.plan || "free").toLowerCase();
    const isPremium = userPlan === "pro" || userPlan === "premium" || user?.subscriptionStatus === "active";
    const targetFilter = isPremium ? ["ALL", "PREMIUM"] : ["ALL", "FREE"];
    const userRegCutoff = user?.createdAt ? new Date(new Date(user.createdAt).getTime() - 60000) : null;

    const userPrisma = await getUserPrismaFromRequest(req);

    // Fetch personal notifications and active system broadcast notifications in parallel
    const [personalNotifications, systemBroadcasts] = await Promise.all([
      userPrisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      (masterPrisma as any).systemNotification.findMany({
        where: {
          isRevoked: false,
          targetAudience: { in: targetFilter },
          ...(userRegCutoff ? { createdAt: { gte: userRegCutoff } } : {}),
        },
        include: {
          reads: {
            where: { userId },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    // Map system broadcasts
    const mappedBroadcasts = systemBroadcasts.map((b: any) => ({
      id: `sys_${b.id}`,
      systemNotificationId: b.id,
      userId,
      type: b.type || "announcement",
      title: b.title,
      message: b.message,
      link: b.actionUrl,
      read: Array.isArray(b.reads) && b.reads.length > 0,
      targetAudience: b.targetAudience,
      priority: b.priority,
      isSystem: true,
      createdAt: b.createdAt,
    }));

    // Merge personal & broadcast notifications
    const allNotifications = [...mappedBroadcasts, ...personalNotifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = allNotifications.slice(skip, skip + limit);
    const unreadCount = allNotifications.filter((n) => !n.read).length;

    res.json({
      success: true,
      notifications: paginated,
      unreadCount,
      pagination: {
        page,
        limit,
        total: allNotifications.length,
        pages: Math.ceil(allNotifications.length / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 2. Get Unread Count ──────────────────────────────────────────

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const user = await masterPrisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true, subscriptionStatus: true, createdAt: true },
    });

    const userPlan = (user?.plan || "free").toLowerCase();
    const isPremium = userPlan === "pro" || userPlan === "premium" || user?.subscriptionStatus === "active";
    const targetFilter = isPremium ? ["ALL", "PREMIUM"] : ["ALL", "FREE"];
    const userRegCutoff = user?.createdAt ? new Date(new Date(user.createdAt).getTime() - 60000) : null;

    const userPrisma = await getUserPrismaFromRequest(req);

    const [personalUnread, systemBroadcasts] = await Promise.all([
      userPrisma.notification.count({ where: { userId, read: false } }),
      (masterPrisma as any).systemNotification.findMany({
        where: {
          isRevoked: false,
          targetAudience: { in: targetFilter },
          ...(userRegCutoff ? { createdAt: { gte: userRegCutoff } } : {}),
        },
        include: {
          reads: { where: { userId } },
        },
      }),
    ]);

    const systemUnread = systemBroadcasts.filter((b: any) => !b.reads || b.reads.length === 0).length;
    const totalCount = personalUnread + systemUnread;

    res.json({ success: true, count: totalCount });
  } catch (error) {
    next(error);
  }
}

// ─── 3. Mark Single Notification as Read ──────────────────────────

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const id = req.params.id as string;

    if (id.startsWith("sys_")) {
      const sysId = id.replace("sys_", "");
      await (masterPrisma as any).systemNotificationRead.upsert({
        where: {
          notificationId_userId: { notificationId: sysId, userId },
        },
        create: { notificationId: sysId, userId },
        update: { readAt: new Date() },
      });
      return res.json({ success: true });
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const notification = await userPrisma.notification.findUnique({ where: { id } });
    if (!notification) throw httpError(404, "Notification not found");
    if (notification.userId !== userId) throw httpError(403, "Not your notification");

    await userPrisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ─── 4. Mark All Notifications as Read ────────────────────────────

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const userPrisma = await getUserPrismaFromRequest(req);
    await userPrisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    // Mark system broadcasts as read for this user
    const user = await masterPrisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true, subscriptionStatus: true, createdAt: true },
    });
    const userPlan = (user?.plan || "free").toLowerCase();
    const isPremium = userPlan === "pro" || userPlan === "premium" || user?.subscriptionStatus === "active";
    const targetFilter = isPremium ? ["ALL", "PREMIUM"] : ["ALL", "FREE"];
    const userRegCutoff = user?.createdAt ? new Date(new Date(user.createdAt).getTime() - 60000) : null;

    const unreadSystem = await (masterPrisma as any).systemNotification.findMany({
      where: {
        isRevoked: false,
        targetAudience: { in: targetFilter },
        ...(userRegCutoff ? { createdAt: { gte: userRegCutoff } } : {}),
        reads: { none: { userId } },
      },
      select: { id: true },
    });

    await Promise.all(
      unreadSystem.map((b: any) =>
        (masterPrisma as any).systemNotificationRead.upsert({
          where: {
            notificationId_userId: { notificationId: b.id, userId },
          },
          create: { notificationId: b.id, userId },
          update: { readAt: new Date() },
        }).catch(() => {})
      )
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ─── 5. Delete Single Notification ────────────────────────────────

export async function deleteNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const id = req.params.id as string;

    const userPrisma = await getUserPrismaFromRequest(req);
    const notification = await userPrisma.notification.findUnique({ where: { id } });
    if (!notification) throw httpError(404, "Notification not found");
    if (notification.userId !== userId) throw httpError(403, "Not your notification");

    await userPrisma.notification.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ─── 6. Clear All Notifications ───────────────────────────────────

export async function clearAllNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const userPrisma = await getUserPrismaFromRequest(req);
    await userPrisma.notification.deleteMany({ where: { userId } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ─── 7. Create Notification (internal use / admin) ───────────────

export async function createNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const requester = await masterPrisma.user.findUnique({ where: { id: userId } });
    const { targetUserId, type, title, message, link } = req.body;

    if (!targetUserId || !type || !title || !message) {
      throw httpError(400, "Missing required fields: targetUserId, type, title, message");
    }

    if (requester?.role !== "ADMIN" && targetUserId !== userId) {
      throw httpError(403, "Only admins can create notifications for other users");
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const notification = await userPrisma.notification.create({
      data: { userId: targetUserId, type, title, message, link },
    });

    // Emit real-time event via Socket.io
    emitNotification(targetUserId, notification);

    res.status(201).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
}

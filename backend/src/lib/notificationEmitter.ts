import { io } from "./socket";

/**
 * Emit a real-time notification event to a specific user.
 * The frontend should listen for "notification:new" events.
 */
export function emitNotification(userId: string, notification: { id: string; type: string; title: string; message: string; link?: string | null; read: boolean; createdAt: Date }) {
  try {
    io.to(`user:${userId}`).emit("notification:new", notification);
  } catch {
    console.warn("Failed to emit notification via Socket.io — server may not be initialized");
  }
}

export async function emitBroadcastNotification(notification: { id: string; type: string; title: string; message: string; targetAudience: string; link?: string | null; createdAt: Date }) {
  try {
    if (notification.targetAudience === "PLACEMENT_READY_85") {
      const { masterPrisma } = require("../utils/prisma");
      const readyUsers = await masterPrisma.placementIntelligence.findMany({
        where: { placementScore: { gte: 85 } },
        select: { userId: true },
      }).catch(() => []);

      for (const u of readyUsers) {
        emitNotification(u.userId, {
          ...notification,
          read: false,
        });
      }
      return;
    }

    io.emit("notification:broadcast", notification);
    io.emit("notification:new", {
      ...notification,
      read: false,
    });
  } catch {
    console.warn("Failed to emit broadcast notification via Socket.io");
  }
}

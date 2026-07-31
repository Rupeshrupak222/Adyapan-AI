import { prisma } from "../config/prisma";

export interface AuditLogOptions {
  adminId?: string;
  adminName?: string;
  action: string;
  module: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export class AdminAuditService {
  static async log(options: AuditLogOptions): Promise<void> {
    try {
      await (prisma as any).adminAuditLog.create({
        data: {
          adminId: options.adminId || null,
          adminName: options.adminName || "System Admin",
          action: options.action,
          module: options.module,
          targetId: options.targetId || null,
          details: options.details || {},
          ipAddress: options.ipAddress || "127.0.0.1",
        },
      });
    } catch (error) {
      console.warn("[AdminAuditService] Failed to record audit log:", error);
    }
  }

  static async getLogs(take = 50, skip = 0) {
    return (prisma as any).adminAuditLog.findMany({
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });
  }
}

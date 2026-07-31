import { prisma } from "../config/prisma";
import { databaseService } from "./database.service";
import { createPrismaClient } from "../config/dynamicPrisma";
import { httpError } from "../utils/httpError";
import type { PrismaClient } from "@prisma/user-client";

interface DatabaseInfo {
  userId: string;
  dbName: string;
  createdAt: string;
}

interface UserStats {
  userId: string;
  email: string;
  name: string;
  databaseExists: boolean;
  databaseSize?: string;
}

class AdminDbService {
  async listUserDatabases(): Promise<DatabaseInfo[]> {
    try {
      const databases = await databaseService.listDatabases();
      return databases
        .filter((db) => db.name.startsWith("user_"))
        .map((db) => ({
          userId: db.name.replace("user_", ""),
          dbName: db.name,
          createdAt: db.created_at,
        }));
    } catch {
      return [];
    }
  }

  async getUserStats(): Promise<UserStats[]> {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });

    const databases = await this.listUserDatabases();
    const dbNames = new Set(databases.map((db) => db.dbName));

    return users.map((user) => ({
      userId: user.id,
      email: user.email,
      name: user.name,
      databaseExists: dbNames.has(`user_${user.id}`),
    }));
  }

  async queryUserDatabase(userId: string, query: string): Promise<unknown> {
    const dbUrl = await databaseService.getDatabaseUrlForUser(userId);
    const userPrisma = createPrismaClient(dbUrl);
    
    try {
      const result = await userPrisma.$queryRawUnsafe(query);
      return result;
    } finally {
      await userPrisma.$disconnect();
    }
  }

  async deleteUserDatabase(userId: string): Promise<void> {
    const dbInfo = await databaseService.getUserDatabaseInfo(userId);
    if (!dbInfo) {
      throw httpError(404, "User database not found");
    }
    await databaseService.deleteDatabase(dbInfo.id);
  }

  async getAggregatedStats(): Promise<{
    totalUsers: number;
    totalDatabases: number;
    activeDatabases: number;
  }> {
    const totalUsers = await prisma.user.count();
    const databases = await this.listUserDatabases();

    return {
      totalUsers,
      totalDatabases: databases.length,
      activeDatabases: databases.length,
    };
  }

  async getPerUserCounts(userIds: string[]): Promise<Map<string, { resumes: number; chatSessions: number; interviewSessions: number; codingSessions: number; studySessions: number }>> {
    const map = new Map<string, { resumes: number; chatSessions: number; interviewSessions: number; codingSessions: number; studySessions: number }>();
    userIds.forEach(id => map.set(id, { resumes: 0, chatSessions: 0, interviewSessions: 0, codingSessions: 0, studySessions: 0 }));
    return map;
  }

  // ─── Cross-DB Aggregation Methods ──────────────────────────────

  private async getAllUserPrismaClients(): Promise<{ userId: string; prisma: PrismaClient }[]> {
    const dbInfos = await this.listUserDatabases();
    const clients: { userId: string; prisma: PrismaClient }[] = [];

    for (const db of dbInfos) {
      try {
        const dbUrl = await databaseService.getDatabaseUrlForUser(db.userId);
        const client = createPrismaClient(dbUrl);
        clients.push({ userId: db.userId, prisma: client });
      } catch {
        // Skip databases that can't be connected to
      }
    }

    return clients;
  }

  private async disconnectClients(clients: { userId: string; prisma: PrismaClient }[]): Promise<void> {
    for (const c of clients) {
      try { await c.prisma.$disconnect(); } catch { /* ignore */ }
    }
  }

  /**
   * Count rows in a table across master database and all user databases.
   * Returns total count.
   */
  async countAcrossAllUserDbs(
    tableName: string,
    where?: Record<string, any>
  ): Promise<number> {
    let total = 0;

    // 1. Check primary master PostgreSQL DB first
    if ((prisma as any)[tableName] && typeof (prisma as any)[tableName].count === "function") {
      try {
        const count = await (prisma as any)[tableName].count({ where: where || {} });
        total += count;
      } catch {
        // Table/Model not present on master
      }
    }

    // 2. Check user-specific databases
    const clients = await this.getAllUserPrismaClients();
    try {
      for (const { prisma: userPrisma } of clients) {
        try {
          const count = await (userPrisma as any)[tableName].count({ where: where || {} });
          total += count;
        } catch {
          // Table may not exist in this user's DB
        }
      }
    } finally {
      await this.disconnectClients(clients);
    }

    return total;
  }

  /**
   * Find recent rows across master database and all user databases.
   * Returns merged + sorted + sliced results.
   */
  async findRecentAcrossAllUserDbs(
    tableName: string,
    options: {
      take?: number;
      orderBy?: Record<string, "asc" | "desc">;
      select?: Record<string, any>;
      include?: Record<string, any>;
    } = {}
  ): Promise<any[]> {
    const { take = 5, orderBy = { createdAt: "desc" }, select, include } = options;
    const allItems: any[] = [];

    // 1. Check primary master PostgreSQL DB first
    if ((prisma as any)[tableName] && typeof (prisma as any)[tableName].findMany === "function") {
      try {
        const masterItems = await (prisma as any)[tableName].findMany({
          take,
          orderBy,
          select: select || undefined,
          include: include || undefined,
        });
        allItems.push(...masterItems);
      } catch {
        // Table/Model not present on master
      }
    }

    // 2. Check user-specific databases
    const clients = await this.getAllUserPrismaClients();
    try {
      for (const { userId, prisma: userPrisma } of clients) {
        try {
          const items = await (userPrisma as any)[tableName].findMany({
            take,
            orderBy,
            select: select || undefined,
            include: include || undefined,
          });
          allItems.push(...items.map((item: any) => ({ ...item, _dbUserId: userId })));
        } catch {
          // Table may not exist in this user's DB
        }
      }
    } finally {
      await this.disconnectClients(clients);
    }

    return allItems.sort((a: any, b: any) => {
      const aTime = a.createdAt?.getTime?.() || 0;
      const bTime = b.createdAt?.getTime?.() || 0;
      return bTime - aTime;
    }).slice(0, take);
  }

  /**
   * Group by across all user databases for a given field.
   * Merges results from master and all user DBs.
   */
  async groupByAcrossAllUserDbs(
    tableName: string,
    groupByField: string
  ): Promise<{ [key: string]: number }> {
    const merged: { [key: string]: number } = {};

    if ((prisma as any)[tableName] && typeof (prisma as any)[tableName].groupBy === "function") {
      try {
        const masterGroups = await (prisma as any)[tableName].groupBy({
          by: [groupByField],
          _count: true,
        });
        for (const g of masterGroups) {
          const key = g[groupByField] || "unknown";
          merged[key] = (merged[key] || 0) + g._count;
        }
      } catch {
        // Table/Model not present on master
      }
    }

    const clients = await this.getAllUserPrismaClients();
    try {
      for (const { prisma: userPrisma } of clients) {
        try {
          const groups = await (userPrisma as any)[tableName].groupBy({
            by: [groupByField],
            _count: true,
          });
          for (const g of groups) {
            const key = g[groupByField] || "unknown";
            merged[key] = (merged[key] || 0) + g._count;
          }
        } catch {
          // Table may not exist in this user's DB
        }
      }
    } finally {
      await this.disconnectClients(clients);
    }

    return merged;
  }
}

export const adminDbService = new AdminDbService();
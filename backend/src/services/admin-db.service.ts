import { prisma } from "../config/prisma";
import { databaseService } from "./database.service";
import { createPrismaClient } from "../config/dynamicPrisma";
import { httpError } from "../utils/httpError";
import { env } from "../config/env";
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

interface QueryTarget {
  label: string;
  client: any;
}

const DB_LIST_TTL_MS = 30_000;

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

class AdminDbService {
  private cachedDbList: { items: DatabaseInfo[]; at: number } | null = null;
  private clientByUrl = new Map<string, any>();

  private getClient(url: string): any {
    let client = this.clientByUrl.get(url);
    if (!client) {
      client = createPrismaClient(url);
      this.clientByUrl.set(url, client);
    }
    return client;
  }

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

  private async listUserDatabasesCached(): Promise<DatabaseInfo[]> {
    const now = Date.now();
    if (this.cachedDbList && now - this.cachedDbList.at < DB_LIST_TTL_MS) {
      return this.cachedDbList.items;
    }
    const items = await this.listUserDatabases();
    this.cachedDbList = { items, at: now };
    return items;
  }

  async getUserStats(): Promise<UserStats[]> {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });

    const databases = await this.listUserDatabasesCached();
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

  /**
   * Build the list of databases to aggregate across:
   * the master database (which may hold legacy user-hub rows) plus every
   * per-user database. Clients are cached and connections reused.
   */
  private async getAllQueryTargets(): Promise<QueryTarget[]> {
    const targets: QueryTarget[] = [
      { label: "master", client: this.getClient(env.databaseUrl) },
    ];

    const dbs = await this.listUserDatabasesCached();
    await Promise.all(
      dbs.map(async (db) => {
        try {
          const url = await databaseService.getConnectionString(db.dbName);
          targets.push({ label: db.dbName, client: this.getClient(url) });
        } catch {
          // Skip databases that can't be resolved
        }
      })
    );

    return targets;
  }

  async getPerUserCounts(
    userIds: string[]
  ): Promise<Map<string, { resumes: number; chatSessions: number; interviewSessions: number; codingSessions: number; studySessions: number; atsReports: number; candidateProfiles: number }>> {
    const map = new Map<string, { resumes: number; chatSessions: number; interviewSessions: number; codingSessions: number; studySessions: number; atsReports: number; candidateProfiles: number }>();
    userIds.forEach((id) =>
      map.set(id, { resumes: 0, chatSessions: 0, interviewSessions: 0, codingSessions: 0, studySessions: 0, atsReports: 0, candidateProfiles: 0 })
    );

    const dbNames = userIds.map((id) => `user_${id}`);
    const dbs = (await this.listUserDatabasesCached()).filter((db) => dbNames.includes(db.dbName));

    const tables = ["resume", "chatSession", "interviewSession", "codingSession", "studySession", "aTSReport", "candidateProfile"] as const;
    const perDb: Record<string, Record<string, number>> = {};

    await mapLimit(dbs, 4, async (db) => {
      const dbUrl = await databaseService.getConnectionString(db.dbName);
      const client = this.getClient(dbUrl);
      const counts: Record<string, number> = {};
      await Promise.all(
        tables.map(async (table) => {
          try {
            const c = await (client as any)[table].count({ where: { userId: db.userId } });
            counts[table] = c ?? 0;
          } catch {
            counts[table] = 0;
          }
        })
      );
      perDb[db.userId] = counts;
    });

    for (const userId of userIds) {
      const counts = perDb[userId];
      if (!counts) continue;
      map.set(userId, {
        resumes: counts["resume"] || 0,
        chatSessions: counts["chatSession"] || 0,
        interviewSessions: counts["interviewSession"] || 0,
        codingSessions: counts["codingSession"] || 0,
        studySessions: counts["studySession"] || 0,
        atsReports: counts["aTSReport"] || 0,
        candidateProfiles: counts["candidateProfile"] || 0,
      });
    }

    return map;
  }

  /**
   * Count rows in a table across the master database and all user databases.
   * Queries run in parallel with cached connections.
   */
  async countAcrossAllUserDbs(tableName: string, where?: Record<string, any>): Promise<number> {
    const targets = await this.getAllQueryTargets();
    const results = await mapLimit(targets, 4, async ({ client }) => {
      try {
        const count = await (client as any)[tableName]?.count({ where: where || {} });
        return typeof count === "number" ? count : 0;
      } catch {
        return 0;
      }
    });
    return results.reduce((a, b) => a + b, 0);
  }

  private countAllCache: { data: Record<string, number>; timestamp: number } | null = null;
  private COUNT_ALL_TTL_MS = 15_000; // 15s cache

  /**
   * Batch count of many tables across all databases — all run in parallel.
   * Returns a map of table -> total count.
   */
  async countAllAcrossAllUserDbs(tables: string[]): Promise<Record<string, number>> {
    const now = Date.now();
    if (this.countAllCache && now - this.countAllCache.timestamp < this.COUNT_ALL_TTL_MS) {
      return { ...this.countAllCache.data };
    }

    const targets = await this.getAllQueryTargets();
    const out: Record<string, number> = {};
    for (const table of tables) out[table] = 0;

    await mapLimit(targets, 4, async ({ client }) => {
      await Promise.all(
        tables.map(async (table) => {
          try {
            const count = await (client as any)[table]?.count({});
            if (typeof count === "number") out[table] += count;
          } catch {
            // table may not exist in this database
          }
        })
      );
    });

    this.countAllCache = { data: out, timestamp: now };
    return out;
  }


  /**
   * Find recent rows across the master database and all user databases.
   * Parallelized; returns merged + sorted + sliced results.
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
    const targets = await this.getAllQueryTargets();

    const chunks = await mapLimit(targets, 4, async ({ label, client }) => {
      try {
        const items = await (client as any)[tableName]?.findMany({
          take,
          orderBy,
          select: select || undefined,
          include: include || undefined,
        });
        if (!Array.isArray(items)) return [];
        return label === "master" ? items : items.map((item: any) => ({ ...item, _dbUserId: label.replace("user_", "") }));
      } catch {
        return [];
      }
    });

    const allItems = chunks.flat();
    return allItems
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      })
      .slice(0, take);
  }

  /**
   * Group by across the master database and all user databases.
   * Parallelized; merges results.
   */
  async groupByAcrossAllUserDbs(tableName: string, groupByField: string): Promise<{ [key: string]: number }> {
    const merged: { [key: string]: number } = {};
    const targets = await this.getAllQueryTargets();

    const chunks = await mapLimit(targets, 4, async ({ client }) => {
      try {
        const groups = await (client as any)[tableName]?.groupBy({
          by: [groupByField],
          _count: true,
        });
        return Array.isArray(groups) ? groups : [];
      } catch {
        return [];
      }
    });

    for (const groups of chunks) {
      for (const g of groups) {
        const key = g[groupByField] || "unknown";
        merged[key] = (merged[key] || 0) + g._count;
      }
    }

    return merged;
  }
}

export const adminDbService = new AdminDbService();

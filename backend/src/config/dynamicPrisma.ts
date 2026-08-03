import { PrismaClient } from "@prisma/user-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { databaseService } from "../services/database.service";

type ExtendedUserClient = any;

/**
 * Bounded LRU cache of per-user Prisma clients. Each client owns a pg pool
 * (up to `max` connections), so an unbounded cache leaks connections and
 * memory as user count grows. Once the cap is reached, the least recently
 * used client is evicted and its pool is disconnected.
 */
const MAX_CACHED_CLIENTS = Number(process.env.MAX_USER_DB_CLIENTS) || 500;
const clientCache = new Map<string, ExtendedUserClient>();

function getCachedClient(userId: string): ExtendedUserClient | undefined {
  const client = clientCache.get(userId);
  if (client) {
    clientCache.delete(userId);
    clientCache.set(userId, client);
  }
  return client;
}

function cacheClient(userId: string, client: ExtendedUserClient): void {
  clientCache.set(userId, client);
  if (clientCache.size > MAX_CACHED_CLIENTS) {
    const oldestKey = clientCache.keys().next().value as string | undefined;
    if (oldestKey !== undefined) {
      const oldest = clientCache.get(oldestKey)!;
      clientCache.delete(oldestKey);
      Promise.resolve(oldest.$disconnect()).catch(() => {});
    }
  }
}

/**
 * Non-blocking, deduplicated schema sync for user databases.
 *
 * The previous implementation ran `execSync("prisma db push")` inside the
 * Prisma query interceptor, which blocked the ENTIRE Node.js event loop for
 * every missing table/column. With many user databases this made the server
 * unresponsive (admin dashboard requests hung indefinitely).
 *
 * Now a sync is triggered at most once per database URL (fire-and-forget,
 * never awaited). Queries against not-yet-synced databases fail fast; once the
 * background push completes, subsequent queries succeed.
 */
const syncPromises = new Map<string, Promise<boolean>>();

function triggerSchemaSync(databaseUrl: string): Promise<boolean> {
  const existing = syncPromises.get(databaseUrl);
  if (existing) return existing;

  const promise = new Promise<boolean>((resolve) => {
    const { exec } = require("child_process") as typeof import("child_process");
    console.log(`[dynamicPrisma] Running schema sync push for user database...`);
    exec(
      `npx prisma db push --config=prisma/prisma.config.user.ts --accept-data-loss`,
      {
        env: { ...process.env, USER_DATABASE_URL: databaseUrl },
      },
      (error: any, _stdout: any, stderr: any) => {
        syncPromises.delete(databaseUrl);
        if (error) {
          console.error(`[dynamicPrisma] Schema sync push failed for ${databaseUrl.slice(0, 60)}:`, error?.message || stderr);
          resolve(false);
        } else {
          console.log(`[dynamicPrisma] Schema sync push completed successfully for ${databaseUrl.slice(0, 60)}.`);
          resolve(true);
        }
      }
    );
  });

  syncPromises.set(databaseUrl, promise);
  return promise;
}

function isTableOrColumnMissing(err: any): boolean {
  return err?.code === "P2021" || (typeof err?.message === "string" && err.message.includes("does not exist"));
}

export function createPrismaClient(databaseUrl: string): any {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const adapter = new PrismaPg(pool);
  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = Date.now();
          let result;
          try {
            result = await query(args);
          } catch (err: any) {
            if (isTableOrColumnMissing(err)) {
              console.warn(`[dynamicPrisma] Table ${model} missing in user database. Triggering schema sync and retrying...`);
              const synced = await triggerSchemaSync(databaseUrl);
              if (synced) {
                try {
                  return await query(args);
                } catch (retryErr) {
                  throw retryErr;
                }
              }
            }
            throw err;
          }
          const duration = Date.now() - start;
          try {
            const { PerformanceMonitor } = require("../utils/monitoring");
            PerformanceMonitor.record("db", `user_db:${model || "generic"}.${operation}`, duration);
          } catch {}
          return result;
        },
      },
    },
  }) as any;
}

const pendingClientPromises = new Map<string, Promise<any>>();

export async function getUserPrisma(userId: string): Promise<any> {
  const cached = getCachedClient(userId);
  if (cached) {
    return cached;
  }
  if (pendingClientPromises.has(userId)) {
    return pendingClientPromises.get(userId)!;
  }

  const promise = (async () => {
    try {
      const dbUrl = await databaseService.getDatabaseUrlForUser(userId);
      const client = createPrismaClient(dbUrl);
      cacheClient(userId, client);
      return client;
    } finally {
      pendingClientPromises.delete(userId);
    }
  })();

  pendingClientPromises.set(userId, promise);
  return promise;
}


export function clearUserPrismaCache(userId?: string): void {
  if (userId) {
    const client = clientCache.get(userId);
    if (client) {
      client.$disconnect();
      clientCache.delete(userId);
    }
  } else {
    for (const [key, client] of clientCache) {
      client.$disconnect();
      clientCache.delete(key);
    }
  }
}

export function getMasterPrisma(): any {
  const { prisma } = require("./prisma");
  return prisma;
}

import { PrismaClient } from "@prisma/user-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { databaseService } from "../services/database.service";

type ExtendedUserClient = any;
const clientCache = new Map<string, ExtendedUserClient>();

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
const syncState = new Map<string, { synced: boolean; inFlight: boolean }>();

function triggerSchemaSync(databaseUrl: string): void {
  const state = syncState.get(databaseUrl);
  if (state?.inFlight || state?.synced) return;

  syncState.set(databaseUrl, { inFlight: true, synced: false });

  const { spawn } = require("child_process") as typeof import("child_process");
  const child = spawn(
    `npx prisma db push --config=prisma/prisma.config.user.ts --accept-data-loss`,
    {
      shell: true,
      stdio: "ignore",
      env: { ...process.env, USER_DATABASE_URL: databaseUrl },
    }
  );

  child.on("close", (code: number | null) => {
    const current = syncState.get(databaseUrl);
    if (current) {
      current.inFlight = false;
      current.synced = code === 0;
    }
    if (code !== 0) {
      console.error(`[dynamicPrisma] Background sync failed for ${databaseUrl.slice(0, 60)} (exit ${code}). It will be retried on the next table-miss.`);
      syncState.delete(databaseUrl);
    } else {
      console.log(`[dynamicPrisma] Background schema sync completed for ${databaseUrl.slice(0, 60)}.`);
    }
  });
}

function isTableOrColumnMissing(err: any): boolean {
  return err?.code === "P2021" || (typeof err?.message === "string" && err.message.includes("does not exist"));
}

export function createPrismaClient(databaseUrl: string): any {
  const adapter = new PrismaPg({ connectionString: databaseUrl, max: 2 });
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
              console.warn(`[dynamicPrisma] Table ${model} missing in user database. Triggering background sync push...`);
              triggerSchemaSync(databaseUrl);
              throw err;
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

export async function getUserPrisma(userId: string): Promise<any> {
  if (clientCache.has(userId)) {
    return clientCache.get(userId)!;
  }

  const dbUrl = await databaseService.getDatabaseUrlForUser(userId);
  const client = createPrismaClient(dbUrl);

  // Self-healing migration guard: verify the database contains the user tables.
  // This is non-blocking — a missing table triggers a background sync instead of
  // holding the event loop while running `prisma db push`.
  client.uploadedResume.findFirst().catch((err: any) => {
    if (isTableOrColumnMissing(err)) {
      console.warn(`[dynamicPrisma] Migration guard: tables missing for user ${userId}. Triggering background sync push...`);
      triggerSchemaSync(dbUrl);
    }
  });

  clientCache.set(userId, client);
  return client;
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

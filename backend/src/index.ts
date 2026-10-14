import "dotenv/config";
// Suppress pg SSL deprecation warning — we explicitly use sslmode=verify-full
process.env.NODE_NO_WARNINGS = "1";
import { createApp } from "./app";
import { env } from "./config/env";
import { PerformanceMonitor } from "./utils/monitoring";
import { createServer } from "http";
import { initSocketServer } from "./lib/socket";

const app = createApp();

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.originalUrl && req.originalUrl.startsWith("/api")) {
      PerformanceMonitor.record("api", `${req.method} ${req.originalUrl}`, duration);
      if (res.statusCode >= 400) {
        PerformanceMonitor.record("error", `${req.method} ${req.originalUrl}`, duration, { status: res.statusCode });
      }
    }
  });
  next();
});

const server = createServer(app);
initSocketServer(server);

import { JobSchedulerService } from "./services/job-scheduler.service";
import { HourlyQuestionSchedulerService } from "./services/hourly-question-scheduler.service";
import { ensureAdminTables } from "./scripts/ensure-admin-tables";
import { hydrateTestStoreFromDb } from "./services/mcq.service";

async function start() {
  const isProd = process.env.NODE_ENV === "production";

  // In development, the local JSON store (data/mcq-tests-store.json) is already populated
  // and serves instantaneously. Skip downloading 17,229 questions (~40MB) on every dev reload.
  if (isProd && process.env.ENABLE_DB_HYDRATION === "true") {
    try {
      await hydrateTestStoreFromDb();
    } catch (e: any) {
      console.warn("MCQ store hydration skipped (non-fatal):", e?.message || e);
    }
  } else {
    console.log("[MCQ] Serving tests from local JSON store (0 KB Supabase egress).");
  }

  server.listen(env.port, "0.0.0.0", () => {
    console.log(`Backend server started on port ${env.port}`);

    // Admin tables already exist — skip 275 SQL queries on every local reload unless requested
    if (isProd || process.env.SYNC_ADMIN_TABLES === "true") {
      ensureAdminTables().catch((e) => {
        console.warn("Admin tables sync skipped (non-fatal):", e?.message || e);
      });
    }

    // Background job scraping & question generation cron jobs run only in production or when enabled
    if (isProd || process.env.ENABLE_SCHEDULERS === "true") {
      JobSchedulerService.start();
      HourlyQuestionSchedulerService.start();
    }
  });
}

start();
// Touch to reload dev server with regenerated prisma client types

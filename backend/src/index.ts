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
  // The MCQ store hydrates from Postgres before the first request so a test
  // generated at runtime survives a redeploy. Failure is non-fatal: the service
  // falls back to its JSON cache.
  try {
    await hydrateTestStoreFromDb();
  } catch (e: any) {
    console.warn("MCQ store hydration skipped (non-fatal):", e?.message || e);
  }

  server.listen(env.port, "0.0.0.0", () => {
    console.log(`Backend server started on port ${env.port}`);
    ensureAdminTables().catch((e) => {
      console.warn("Admin tables sync skipped (non-fatal):", e?.message || e);
    });
    JobSchedulerService.start();
    HourlyQuestionSchedulerService.start();
  });
}

start();
// Touch to reload dev server with regenerated prisma client types

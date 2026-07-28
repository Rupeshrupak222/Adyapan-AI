import "dotenv/config";
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

server.listen(env.port, "0.0.0.0", () => {
  console.log(`Backend server started on port ${env.port}`);
  JobSchedulerService.start();
});
// Touch to reload dev server with regenerated prisma client types

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { healthRouter } from "./routes/health.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(compression({
    filter: (req, res) => {
      const contentType = res.getHeader("Content-Type");
      if (typeof contentType === "string" && contentType.includes("text/event-stream")) return false;
      if (req.headers.accept === "text/event-stream") return false;
      return compression.filter(req, res);
    },
  }));
  app.use(helmet());

  const allowedOrigins = [
    env.frontendUrl,
    ...env.corsOrigins,
    "http://localhost:3000",
    "http://localhost:3001",
    "https://adyapan-ai-gamma.vercel.app",
    "https://adyapan-ai-production.up.railway.app",
    "https://adyapan-ai.up.railway.app",
    "http://adyapan-ai.railway.internal:5000",
    "https://adyapan-ai.onrender.com",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
          /^https:\/\/[a-z0-9-]+\.up\.railway\.app$/.test(origin) ||
          /^https:\/\/adyapan-ai-[a-z0-9-]*\.vercel\.app$/.test(origin) ||
          /^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin) ||
          origin === "http://adyapan-ai.railway.internal:5000"
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-timezone", "X-Session-Id", "Accept", "Cache-Control", "x-request-id"],
    }),
  );



  // Raw body parser for Razorpay webhook signature verification — mounted
  // BEFORE express.json so the webhook path gets the raw Buffer.
  app.use("/api/payment/webhook", express.raw({ type: "application/json" }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Standalone root healthcheck endpoint for container health probes (/health)
  app.get("/health", (_req, res) => {
    res.status(200).json({
      success: true,
      service: "adyapan-ai-backend",
      status: "ok",
    });
  });

  // Health/readiness/version at root and under /api/health
  app.use("/api/health", healthRouter);
  app.use(healthRouter);

  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}

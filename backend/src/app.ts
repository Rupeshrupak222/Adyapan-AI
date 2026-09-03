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
import { securityHeaders } from "./middleware/auth";

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
  app.use(securityHeaders);

  const allowedOrigins = [
    env.frontendUrl,
    ...env.corsOrigins,
    "http://localhost:3000",
    "http://localhost:3001",
    // Explicit production origins only — no wildcard subdomains.
    // Add new origins here when deploying to a new domain.
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
          // Allow any localhost port for local development only
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
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

  // Global per-IP API rate limit (defense-in-depth against abuse/DoS). Tune via
  // GLOBAL_RATE_LIMIT_PER_MIN. Preflights, health checks and the HMAC-signed
  // payment webhook are excluded.
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: env.globalRateLimitPerMin,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many requests. Please slow down." },
    skip: (req) =>
      req.method === "OPTIONS" ||
      req.path === "/health" ||
      req.path.startsWith("/api/health") ||
      req.path.startsWith("/payment/webhook"),
  });
  app.use("/api", apiLimiter);

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

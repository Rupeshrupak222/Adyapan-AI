import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { env } from "./config/env";
import { apiRouter } from "./routes";
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
    "http://localhost:3000",
    "http://localhost:3001",
    "https://adyapan-ai-gamma.vercel.app",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-timezone", "Accept", "Cache-Control"],
    }),
  );

  // Rate limiting disabled for development — re-enable for production:
  // app.use("/api/auth", rateLimit({ windowMs: 15*60*1000, max: 20 }));
  // app.use("/api", rateLimit({ windowMs: 15*60*1000, max: 200 }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_req, res) => {
    res.json({ success: true, service: "Adyapan AI API", version: "1.0.0" });
  });

  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}

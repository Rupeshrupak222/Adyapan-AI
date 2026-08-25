import { Router } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../config/prisma";

let pkg: any = { name: "adyapan-ai-backend", version: "1.0.0" };
try {
  pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8"));
} catch {
  try {
    pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
  } catch {}
}

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "adyapan-ai-backend",
    status: "ok",
  });
});

healthRouter.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "adyapan-ai-backend",
    status: "ok",
  });
});

healthRouter.get("/version", (_req, res) => {
  res.json({
    success: true,
    name: pkg.name ?? "backend",
    version: pkg.version ?? "0.0.0",
  });
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: "ready",
      database: "connected",
    });
  } catch (e: any) {
    // Log the full error server-side; return a generic message to clients
    console.error("[Health] Readiness probe failed:", e?.message || e);
    res.status(503).json({
      success: false,
      status: "not_ready",
      database: "disconnected",
    });
  }
});

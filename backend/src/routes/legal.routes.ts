import { Router } from "express";
import { prisma } from "../config/prisma";
import { handleRouteError } from "../utils/routeError";

export const legalRouter = Router();

// In-memory cookie preferences store for non-db fallback + session logging
const cookiePreferencesStore = new Map<string, {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  status: "accepted" | "declined" | "custom";
  ipAddress?: string;
  userAgent?: string;
  updatedAt: string;
}>();

// ── 1. GET /api/legal/terms ───────────────────────────────────────────────────
legalRouter.get("/terms", async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        entity: "Adyapan Edutech Pvt Ltd",
        brand: "Adyapan AI",
        version: "1.2.0",
        lastUpdated: "2026-08-23",
        address: "Sattva Magnus, Sabza Colony, Toli Chowki, Hyderabad, Telangana 500008",
        supportEmail: "support@adyapan.com",
        governingLaw: "Laws of India (Jurisdiction: Hyderabad, Telangana)",
        sections: [
          { title: "Acceptance of Terms", ref: "1" },
          { title: "Account Registration & Security", ref: "2" },
          { title: "Platform Services & AI Features", ref: "3" },
          { title: "Subscriptions, Payments & Refunds", ref: "4" },
          { title: "Intellectual Property", ref: "5" },
          { title: "Prohibited Activities", ref: "6" },
          { title: "Limitation of Liability", ref: "7" },
          { title: "Governing Law & Jurisdiction", ref: "8" },
        ],
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Legal.terms", "Failed to fetch Terms of Service");
  }
});

// ── 2. GET /api/legal/privacy ─────────────────────────────────────────────────
legalRouter.get("/privacy", async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        entity: "Adyapan Edutech Pvt Ltd",
        brand: "Adyapan AI",
        version: "1.2.0",
        lastUpdated: "2026-08-23",
        dpoEmail: "privacy@adyapan.com",
        dataControllers: [
          { name: "Razorpay", purpose: "Payment Processing (PCI-DSS Level 1)" },
          { name: "Neon PostgreSQL Cloud", purpose: "Encrypted User Database" },
        ],
        sections: [
          { title: "Information We Collect", ref: "1" },
          { title: "How We Use Your Information", ref: "2" },
          { title: "Data Sharing & Third Parties", ref: "3" },
          { title: "Data Security & Encryption", ref: "4" },
          { title: "Your Rights & Data Portability", ref: "5" },
          { title: "Cookie Policy", ref: "6" },
          { title: "Data Retention Period", ref: "7" },
        ],
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Legal.privacy", "Failed to fetch Privacy Policy");
  }
});

// ── 3. GET /api/legal/cookies ─────────────────────────────────────────────────
legalRouter.get("/cookies", async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        categories: [
          {
            key: "essential",
            name: "Essential Cookies",
            required: true,
            description: "Session tokens, security authentication, and theme preferences.",
          },
          {
            key: "functional",
            name: "Functional Cookies",
            required: false,
            description: "Editor state, draft notes, study planner progress.",
          },
          {
            key: "analytics",
            name: "Analytics & Performance",
            required: false,
            description: "Anonymous feature performance monitoring.",
          },
          {
            key: "marketing",
            name: "Marketing & Communication",
            required: false,
            description: "Announcements for career drives and AI features.",
          },
        ],
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Legal.cookies", "Failed to fetch Cookie Policy");
  }
});

// ── 4. POST /api/legal/cookie-preferences ────────────────────────────────────
legalRouter.post("/cookie-preferences", async (req, res) => {
  try {
    const { sessionId, preferences, action } = req.body;

    const key = sessionId || req.ip || "global-session";
    const status: "accepted" | "declined" | "custom" =
      action === "decline" ? "declined" : action === "accept" ? "accepted" : "custom";

    const isDecline = status === "declined";
    const record = {
      essential: true,
      analytics: isDecline ? false : Boolean(preferences?.analytics ?? true),
      functional: isDecline ? false : Boolean(preferences?.functional ?? true),
      marketing: isDecline ? false : Boolean(preferences?.marketing ?? false),
      status,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      updatedAt: new Date().toISOString(),
    };

    cookiePreferencesStore.set(key, record);

    res.json({
      success: true,
      message: isDecline ? "Cookie consent declined (Essential only preserved)" : "Cookie preferences updated successfully",
      data: record,
    });
  } catch (error) {
    handleRouteError(res, error, "Legal.cookiePreferences.post", "Failed to save cookie preferences");
  }
});

// ── 5. POST /api/legal/cookie-decline ─────────────────────────────────────────
legalRouter.post("/cookie-decline", async (req, res) => {
  try {
    const { sessionId } = req.body;
    const key = sessionId || req.ip || "global-session";

    const record = {
      essential: true,
      analytics: false,
      functional: false,
      marketing: false,
      status: "declined" as const,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      updatedAt: new Date().toISOString(),
    };

    cookiePreferencesStore.set(key, record);

    res.json({
      success: true,
      message: "Non-essential cookies declined",
      data: record,
    });
  } catch (error) {
    handleRouteError(res, error, "Legal.cookieDecline.post", "Failed to process cookie decline");
  }
});

// ── 6. GET /api/legal/cookie-preferences ─────────────────────────────────────
legalRouter.get("/cookie-preferences", async (req, res) => {
  try {
    const key = (req.query.sessionId as string) || req.ip || "global-session";
    const existing = cookiePreferencesStore.get(key) || {
      essential: true,
      analytics: true,
      functional: true,
      marketing: false,
      status: "accepted" as const,
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: existing,
    });
  } catch (error) {
    handleRouteError(res, error, "Legal.cookiePreferences.get", "Failed to fetch cookie preferences");
  }
});

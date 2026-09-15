import { Router, type Request, type Response } from "express";
import express from "express";
import { PlatformLogger } from "../utils/logger";

/**
 * Security reporting endpoints.
 *
 * POST /api/security/csp-report
 *   Receives Content-Security-Policy violation reports from browsers. Browsers
 *   send these automatically (no credentials) when the CSP `report-uri`
 *   directive points here and a resource is blocked. This endpoint only LOGS
 *   the violation — it never blocks or changes request handling — so it is
 *   safe, isolated, and cannot affect any existing route.
 *
 * The endpoint is intentionally:
 *   - Public (no auth): browsers post reports without a session.
 *   - Given its own body parsers for the two report content-types
 *     (`application/csp-report` legacy, `application/reports+json` modern),
 *     because the global express.json() does not parse those types.
 *   - Always responds 204 so the browser considers the report delivered.
 */
export const securityRouter = Router();

// Accept both the legacy and modern CSP report content-types. These parsers are
// scoped to this router only and do not affect the app-wide express.json().
const cspBodyParsers = [
  express.json({ type: ["application/csp-report", "application/reports+json", "application/json"], limit: "64kb" }),
];

securityRouter.post("/csp-report", ...cspBodyParsers, (req: Request, res: Response) => {
  try {
    // Legacy format: { "csp-report": { ... } }. Modern Reporting API: an array
    // of report objects. Normalise to a compact summary for the log.
    const body: any = req.body ?? {};
    const legacy = body["csp-report"];
    const summary = legacy
      ? {
          documentUri: legacy["document-uri"],
          violatedDirective: legacy["violated-directive"],
          blockedUri: legacy["blocked-uri"],
        }
      : Array.isArray(body)
        ? body.map((r: any) => ({
            violatedDirective: r?.body?.effectiveDirective || r?.body?.violatedDirective,
            blockedUri: r?.body?.blockedURL || r?.body?.blockedUri,
            documentUri: r?.body?.documentURL,
          }))
        : body;

    PlatformLogger.logError({
      module: "CSP",
      errorType: "CSP_VIOLATION",
      message: JSON.stringify(summary).slice(0, 2000),
    });
  } catch {
    // Never throw from a reporting endpoint.
  }

  // 204 No Content — the browser only needs the report accepted.
  res.status(204).end();
});

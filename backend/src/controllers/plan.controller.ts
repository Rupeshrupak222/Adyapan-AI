import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { httpError } from "../utils/httpError";

// Default prices (paise) used when the plans table is empty.
export const DEFAULT_PLANS: Record<string, { amount: number; label: string }> = {
  pro_monthly: { amount: 19900, label: "Pro Monthly" },
  pro_yearly: { amount: 199900, label: "Pro Yearly" },
};

// ─── Shared price resolver ───────────────────────────────────────

/**
 * Resolves the chargeable amount (in paise) + display label for a plan code.
 * Prefers the admin-managed `plans` table and falls back to DEFAULT_PLANS.
 */
export async function resolvePlanPrice(planCode: string): Promise<{ amount: number; label: string }> {
  const code = String(planCode || "").toLowerCase().trim();
  if (!code) throw httpError(400, "Invalid plan. Choose pro_monthly or pro_yearly.");

  const dbPlan = await prisma.plan.findUnique({ where: { code } });
  if (dbPlan) {
    const amount = code.includes("yearly")
      ? Math.round(dbPlan.priceYearly * 100)
      : Math.round(dbPlan.priceMonthly * 100);
    return { amount, label: dbPlan.name };
  }

  const fallback = DEFAULT_PLANS[code];
  if (!fallback) throw httpError(400, "Invalid plan. Choose pro_monthly or pro_yearly.");
  return fallback;
}

// ─── 1. User: list plans ─────────────────────────────────────────

export async function listPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const dbPlans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });

    if (dbPlans.length > 0) {
      const plans = dbPlans.map((p) => ({
        id: p.code,
        code: p.code,
        label: p.name,
        name: p.name,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        amount: p.code.includes("yearly") ? Math.round(p.priceYearly * 100) : Math.round(p.priceMonthly * 100),
        monthlyAmount: Math.round(p.priceMonthly * 100),
        yearlyAmount: Math.round(p.priceYearly * 100),
        features: p.features && p.features.length > 0 ? p.features : [
          "Unlimited Resumes & ATS Checks",
          "All AI Models (GPT-4o, Claude, Gemini)",
          "Unlimited Cover Letters & LinkedIn Tools",
          "Full Interview & Coding Hub Access",
        ],
        currency: "INR",
      }));
      return res.json({ success: true, plans });
    }

    res.json({
      success: true,
      plans: Object.entries(DEFAULT_PLANS).map(([id, p]) => ({
        id,
        code: id,
        label: p.label,
        name: p.label,
        amount: p.amount,
        priceMonthly: id === "pro_yearly" ? 166 : 199,
        priceYearly: 1999,
        features: [
          "Unlimited Resumes & ATS Checks",
          "All AI Models (GPT-4o, Claude, Gemini)",
          "Unlimited Cover Letters & LinkedIn Tools",
          "Full Interview & Coding Hub Access",
        ],
        currency: "INR",
      })),
    });
  } catch (error) {
    next(error);
  }
}


// ─── 2. Admin: list plans ────────────────────────────────────────

export async function getPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { createdAt: "asc" } });
    res.json({ success: true, plans });
  } catch (error) {
    next(error);
  }
}

// ─── 3. Admin: create plan ───────────────────────────────────────

export async function createPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, code, priceMonthly, priceYearly, features, isActive } = req.body;

    if (typeof name !== "string" || name.trim().length === 0) {
      throw httpError(400, "Plan name is required");
    }
    if (typeof code !== "string" || code.trim().length === 0) {
      throw httpError(400, "Plan code is required");
    }
    const monthly = Number(priceMonthly);
    const yearly = Number(priceYearly);
    if (!Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(yearly) || yearly < 0) {
      throw httpError(400, "Plan prices must be valid numbers");
    }

    const normalizedCode = code.trim().toLowerCase();
    const existing = await prisma.plan.findUnique({ where: { code: normalizedCode } });
    if (existing) throw httpError(409, `Plan code ${normalizedCode} already exists`);

    const plan = await prisma.plan.create({
      data: {
        name: name.trim(),
        code: normalizedCode,
        priceMonthly: monthly,
        priceYearly: yearly,
        features: Array.isArray(features) ? features : [],
        isActive: isActive !== false,
      },
    });

    res.json({ success: true, plan });
  } catch (error) {
    next(error);
  }
}

// ─── 4. Admin: update plan ───────────────────────────────────────

export async function updatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw httpError(404, "Plan not found");

    const { name, code, priceMonthly, priceYearly, features, isActive } = req.body;

    const data: any = {};
    if (name != null) {
      if (typeof name !== "string" || name.trim().length === 0) throw httpError(400, "Plan name is required");
      data.name = name.trim();
    }
    if (code != null) {
      if (typeof code !== "string" || code.trim().length === 0) throw httpError(400, "Plan code is required");
      const normalizedCode = code.trim().toLowerCase();
      const dup = await prisma.plan.findFirst({ where: { code: normalizedCode, NOT: { id } } });
      if (dup) throw httpError(409, `Plan code ${normalizedCode} already exists`);
      data.code = normalizedCode;
    }
    if (priceMonthly != null) {
      const v = Number(priceMonthly);
      if (!Number.isFinite(v) || v < 0) throw httpError(400, "Monthly price must be a valid number");
      data.priceMonthly = v;
    }
    if (priceYearly != null) {
      const v = Number(priceYearly);
      if (!Number.isFinite(v) || v < 0) throw httpError(400, "Yearly price must be a valid number");
      data.priceYearly = v;
    }
    if (features != null) {
      if (!Array.isArray(features)) throw httpError(400, "Features must be an array");
      data.features = features;
    }
    if (isActive != null) data.isActive = Boolean(isActive);

    const updated = await prisma.plan.update({ where: { id }, data });
    res.json({ success: true, plan: updated });
  } catch (error) {
    next(error);
  }
}

// ─── 5. Admin: delete plan ───────────────────────────────────────

export async function deletePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw httpError(404, "Plan not found");

    await prisma.plan.delete({ where: { id } });
    res.json({ success: true, message: "Plan deleted" });
  } catch (error) {
    next(error);
  }
}

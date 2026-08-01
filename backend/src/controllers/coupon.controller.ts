import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { httpError } from "../utils/httpError";
import { requireUserId } from "../utils/request";
import { resolvePlanPrice } from "./plan.controller";

// ─── Shared validation ───────────────────────────────────────────

/**
 * Validates a coupon code against the coupon table.
 * Returns the coupon row when valid, otherwise throws a 400 HttpError.
 */
export async function validateCoupon(code: string) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) throw httpError(400, "Invalid coupon code.");
  if (!coupon.isActive) throw httpError(400, "This coupon is no longer active.");
  if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
    throw httpError(400, "This coupon has expired.");
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw httpError(400, "This coupon has reached its usage limit.");
  }
  return coupon;
}

function toPublicCoupon(c: {
  id: string;
  code: string;
  discountPct: number;
  validUntil: Date | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
}) {
  return {
    id: c.id,
    code: c.code,
    discountPct: c.discountPct,
    validUntil: c.validUntil,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    isActive: c.isActive,
  };
}

// ─── 1. User: list active coupons ────────────────────────────────

export async function listActiveCoupons(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: { isActive: true, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, coupons: coupons.map(toPublicCoupon) });
  } catch (error) {
    next(error);
  }
}

// ─── 2. User: apply a coupon to a plan ───────────────────────────

export async function applyCoupon(req: Request, res: Response, next: NextFunction) {
  try {
    requireUserId(req);

    const { code, plan } = req.body;
    if (typeof code !== "string" || code.trim().length === 0) {
      throw httpError(400, "Coupon code is required");
    }

    const { amount, label } = await resolvePlanPrice(plan);
    const coupon = await validateCoupon(code);
    const discountAmount = Math.round((amount * coupon.discountPct) / 100);

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountPct: coupon.discountPct,
        discountAmount,
        finalAmount: Math.max(amount - discountAmount, 0),
        plan,
        planLabel: label,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── 3. Admin: list all coupons ──────────────────────────────────

export async function getCoupons(_req: Request, res: Response, next: NextFunction) {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, coupons: coupons.map(toPublicCoupon) });
  } catch (error) {
    next(error);
  }
}

// ─── 4. Admin: create coupon ─────────────────────────────────────

export async function createCoupon(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, discountPct, validUntil, maxUses, isActive } = req.body;

    if (typeof code !== "string" || code.trim().length === 0) {
      throw httpError(400, "Coupon code is required");
    }
    const pct = Number(discountPct);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 90) {
      throw httpError(400, "Discount must be between 1 and 90 percent");
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
    if (existing) throw httpError(409, `Coupon ${normalizedCode} already exists`);

    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        discountPct: pct,
        validUntil: validUntil ? new Date(validUntil) : null,
        maxUses: maxUses != null ? Math.max(1, Math.floor(Number(maxUses))) : null,
        isActive: isActive !== false,
      },
    });

    res.json({ success: true, coupon: toPublicCoupon(coupon) });
  } catch (error) {
    next(error);
  }
}

// ─── 5. Admin: update coupon ─────────────────────────────────────

export async function updateCoupon(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw httpError(404, "Coupon not found");

    const { code, discountPct, validUntil, maxUses, isActive, usedCount } = req.body;

    if (code != null && (typeof code !== "string" || code.trim().length === 0)) {
      throw httpError(400, "Coupon code is required");
    }
    let pct = coupon.discountPct;
    if (discountPct != null) {
      pct = Number(discountPct);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 90) {
        throw httpError(400, "Discount must be between 1 and 90 percent");
      }
    }

    const data: any = {
      discountPct: pct,
      validUntil: validUntil != null ? new Date(validUntil) : coupon.validUntil,
      maxUses: maxUses != null ? Math.max(1, Math.floor(Number(maxUses))) : coupon.maxUses,
      isActive: isActive != null ? Boolean(isActive) : coupon.isActive,
      usedCount: usedCount != null ? Math.max(0, Math.floor(Number(usedCount))) : coupon.usedCount,
    };

    if (code != null) {
      const normalizedCode = String(code).trim().toUpperCase();
      const dup = await prisma.coupon.findFirst({ where: { code: normalizedCode, NOT: { id } } });
      if (dup) throw httpError(409, `Coupon ${normalizedCode} already exists`);
      data.code = normalizedCode;
    }

    const updated = await prisma.coupon.update({ where: { id }, data });
    res.json({ success: true, coupon: toPublicCoupon(updated) });
  } catch (error) {
    next(error);
  }
}

// ─── 6. Admin: delete coupon ─────────────────────────────────────

export async function deleteCoupon(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw httpError(404, "Coupon not found");

    await prisma.coupon.delete({ where: { id } });
    res.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    next(error);
  }
}

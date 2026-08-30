import type { NextFunction, Response } from "express";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { httpError } from "../utils/httpError";
import type { AdminAuthRequest } from "./adminAuth";

/**
 * Route-level RBAC guard. Must be chained after `requireAdminAuth`.
 *
 * - "Super Admin" role bypasses all permission checks.
 * - Admins with a role defined are authorized by `admin_permissions`
 *   rows (`resource` / `action`, with `*` wildcards supported).
 * - Admins with no assigned role (or a missing role row) are DENIED —
 *   the guard fails closed so an unassigned admin cannot inherit full access.
 */
export function requireAdminPermission(resource: string, action = "*") {
  return async (req: AdminAuthRequest, _res: Response, next: NextFunction) => {
    try {
      const admin = req.adminUser;
      if (!admin) throw httpError(401, "Admin authentication required");

      if (!admin.roleId) {
        throw httpError(403, "Access denied: no admin role is assigned to this account.");
      }

      const role = await (prisma as any).adminRole.findUnique({
        where: { id: admin.roleId },
        include: { permissions: true },
      });

      if (!role) {
        throw httpError(403, "Access denied: the assigned admin role could not be found.");
      }

      if (role.name === "Super Admin") {
        next();
        return;
      }

      const perms = (role.permissions || []) as Array<{ resource: string; action: string }>;
      const allowed = perms.some((p) => {
        const resourceMatch = p.resource === resource || p.resource === "*";
        const actionMatch = p.action === action || p.action === "*";
        return resourceMatch && actionMatch;
      });

      if (!allowed) {
        throw httpError(403, `Permission denied: role "${role.name}" cannot perform "${action}" on "${resource}"`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Restricts an endpoint to accounts holding the "Super Admin" role (or an
 * explicit entry in SUPER_ADMIN_EMAILS). Used for blast-radius endpoints
 * such as arbitrary raw SQL execution against tenant databases.
 */
export async function requireSuperAdmin(req: AdminAuthRequest, _res: Response, next: NextFunction) {
  try {
    const admin = req.adminUser;
    if (!admin) throw httpError(401, "Admin authentication required");

    if (env.superAdminEmails.includes((admin.email || "").toLowerCase())) {
      next();
      return;
    }

    const role = admin.roleId
      ? await (prisma as any).adminRole.findUnique({ where: { id: admin.roleId }, select: { name: true } }).catch(() => null)
      : null;

    if (role?.name === "Super Admin") {
      next();
      return;
    }

    throw httpError(403, "Only super admins can perform this operation.");
  } catch (error) {
    next(error);
  }
}

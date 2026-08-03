import type { NextFunction, Response } from "express";
import { prisma } from "../config/prisma";
import { httpError } from "../utils/httpError";
import type { AdminAuthRequest } from "./adminAuth";

/**
 * Route-level RBAC guard. Must be chained after `requireAdminAuth`.
 *
 * - "Super Admin" role bypasses all permission checks.
 * - Admins with a role defined are authorized by `admin_permissions`
 *   rows (`resource` / `action`, with `*` wildcards supported).
 * - Legacy admins without a role binding stay fully functional
 *   (backwards compatible while enforcement applies to assigned roles).
 */
export function requireAdminPermission(resource: string, action = "*") {
  return async (req: AdminAuthRequest, _res: Response, next: NextFunction) => {
    try {
      const admin = req.adminUser;
      if (!admin) throw httpError(401, "Admin authentication required");

      if (!admin.roleId) {
        next();
        return;
      }

      const role = await (prisma as any).adminRole.findUnique({
        where: { id: admin.roleId },
        include: { permissions: true },
      });

      if (!role) {
        next();
        return;
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

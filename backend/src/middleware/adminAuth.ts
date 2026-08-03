import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { httpError } from "../utils/httpError";

export interface AdminAuthRequest extends Request {
  adminUser?: {
    id: string;
    email: string;
    name: string;
    roleId?: string | null;
  };
}

export async function requireAdminAuth(
  req: AdminAuthRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.adminToken) {
      token = req.cookies.adminToken;
    }

    if (!token) {
      throw httpError(401, "Admin authentication required");
    }

    const decoded = jwt.verify(token, env.jwtSecret) as {
      userId?: string;
      id?: string;
      email: string;
      role?: string;
      type?: string;
    };

    const adminUserId = decoded.userId ?? decoded.id;
    if (!adminUserId) {
      throw httpError(401, "Invalid or expired admin token");
    }

    // Check if blacklisted
    const blacklisted = await prisma.blacklistedToken.findUnique({
      where: { token },
    });
    if (blacklisted) {
      throw httpError(401, "Admin token has been revoked");
    }

    // Check in dedicated admin_users table
    let admin: any = null;
    try {
      admin = await (prisma as any).adminUser.findUnique({
        where: { id: adminUserId },
        select: { id: true, name: true, email: true, roleId: true, status: true },
      });
    } catch {
      // admin_users table may not exist yet; fall through to users table
    }

    // Fallback sync: if legacy admin in user table, auto-seed admin_users
    if (!admin) {
      const user = await prisma.user.findUnique({ where: { id: adminUserId } });
      if (user && user.role === "ADMIN") {
        try {
          let superRoleId: string | undefined;
          try {
            const superRole = await (prisma as any).adminRole.findUnique({
              where: { name: "Super Admin" },
              select: { id: true },
            });
            superRoleId = superRole?.id;
          } catch {}
          admin = await (prisma as any).adminUser.upsert({
            where: { email: user.email },
            update: { status: "ACTIVE", roleId: superRoleId || undefined },
            create: {
              id: user.id,
              name: user.name,
              email: user.email,
              password: user.password,
              roleId: superRoleId || undefined,
              status: "ACTIVE",
            },
          });
        } catch {
          admin = {
            id: user.id,
            name: user.name,
            email: user.email,
            roleId: null,
            status: "ACTIVE",
          };
        }
      }
    }

    if (!admin || admin.status !== "ACTIVE") {
      throw httpError(403, "Access denied. Active Admin credentials required.");
    }

    req.adminUser = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      roleId: admin.roleId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(httpError(401, "Invalid or expired admin token"));
    }
    next(error);
  }
}

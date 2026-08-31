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

    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as {
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

    // Fallback: check main users table for ADMIN role or superAdminEmails
    if (!admin) {
      try {
        const user = await prisma.user.findUnique({ where: { id: adminUserId } });
        if (user && (user.role === "ADMIN" || env.superAdminEmails.includes(user.email.toLowerCase()))) {
          admin = {
            id: user.id,
            name: user.name,
            email: user.email,
            roleId: null,
            status: "ACTIVE",
          };
        }
      } catch {}
    }

    // Secondary fallback: check decoded JWT payload for ADMIN role
    if (!admin && decoded.role === "ADMIN") {
      admin = {
        id: adminUserId,
        name: "Admin",
        email: decoded.email,
        roleId: null,
        status: "ACTIVE",
      };
    }

    if (!admin || (admin.status && admin.status !== "ACTIVE")) {
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

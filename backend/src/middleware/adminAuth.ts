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
      id: string;
      email: string;
      type?: string;
    };

    // Check if blacklisted
    const blacklisted = await prisma.blacklistedToken.findUnique({
      where: { token },
    });
    if (blacklisted) {
      throw httpError(401, "Admin token has been revoked");
    }

    // Check in dedicated admin_users table
    let admin = await (prisma as any).adminUser.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, roleId: true, status: true },
    });

    // Fallback sync: if legacy admin in user table, auto-seed admin_users
    if (!admin) {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (user && user.role === "ADMIN") {
        admin = await (prisma as any).adminUser.upsert({
          where: { email: user.email },
          update: { status: "ACTIVE" },
          create: {
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password,
            status: "ACTIVE",
          },
        });
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

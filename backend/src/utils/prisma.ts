import type { Request } from "express";
import { getUserPrisma } from "../config/dynamicPrisma";
import { prisma } from "../config/prisma";

export async function getUserPrismaFromRequest(req: Request) {
  const userId =
    (req as any).user?.userId ||
    (req as any).user?.id ||
    (req as any).adminUser?.id;

  if (!userId) {
    if ((req as any).adminUser) {
      return getUserPrisma((req as any).adminUser.id);
    }
    return getUserPrisma();
  }
  return getUserPrisma(userId);
}

export { prisma as masterPrisma };
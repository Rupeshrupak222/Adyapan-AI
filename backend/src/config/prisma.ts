import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env";

const adapter = new PrismaPg({ connectionString: env.databaseUrl, max: 4 });

export const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === "development" ? ["error", "warn"] : ["error"],
});

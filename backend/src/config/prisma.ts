import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";

const pool = new Pool({ connectionString: env.databaseUrl, max: 10 });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === "development" ? ["error", "warn"] : ["error"],
});


import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  connectionTimeoutMillis: 20_000,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
  application_name: "adyapan-api-master",
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === "development" ? ["warn"] : [],
});


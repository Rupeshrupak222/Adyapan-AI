import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";

const pool = new Pool({
  // In development use the direct (non-pooler) Neon host — it is more reliable
  // from remote networks with high latency. The pooler host is optimised for
  // production where Railway and Neon are in the same AWS region.
  connectionString: env.nodeEnv === "development" && env.directUrl
    ? env.directUrl
    : env.databaseUrl,
  max: 10,
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  application_name: "adyapan-api-master",
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === "development" ? ["warn"] : [],
});

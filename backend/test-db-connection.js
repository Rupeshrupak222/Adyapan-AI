require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function main() {
  // This is exactly what prisma.ts does
  const adapter = new PrismaPg(process.env.DATABASE_URL);
  const baseClient = new PrismaClient({
    adapter,
    log: ["error", "warn", "info"],
  });
  const db = baseClient;

  try {
    // Test 1: raw query
    const raw = await db.$queryRaw`SELECT current_database() as db, count(*) as cnt FROM discovery_jobs`;
    console.log("Raw query:", raw);

    // Test 2: model count
    const count = await db.discoveryJob.count();
    console.log("Model count:", count);

    // Test 3: find first
    const first = await db.discoveryJob.findFirst();
    console.log("First job:", first?.title);
  } catch (e) {
    console.error("Error:", e.message);
    console.error("Full:", JSON.stringify(e, null, 2).substring(0, 2000));
  } finally {
    await db.$disconnect();
  }
}

main();

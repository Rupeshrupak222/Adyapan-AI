require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function test(label, url) {
  const adapter = new PrismaPg(url);
  const db = new PrismaClient({ adapter });
  try {
    const count = await db.discoveryJob.count();
    console.log(label + " count:", count);
  } catch (e) {
    console.log(label + " error:", e.message.substring(0, 200));
  }
  await db.$disconnect();
}

async function main() {
  console.log("DB URL:", process.env.DATABASE_URL.substring(0, 80));
  console.log("MASTER URL:", (process.env.MASTER_DATABASE_URL || "").substring(0, 80));
  console.log("DIRECT URL:", (process.env.DIRECT_URL || "").substring(0, 80));
  console.log("Same DB/MASTER:", process.env.DATABASE_URL === process.env.MASTER_DATABASE_URL);
  await test("DATABASE_URL", process.env.DATABASE_URL);
  await test("MASTER_DATABASE_URL", process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL);
  await test("DIRECT_URL", process.env.DIRECT_URL);
}

main();

require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function main() {
  const url = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL;
  console.log("Connecting to:", url?.substring(0, 40) + "...");
  const adapter = new PrismaPg(url);
  const db = new PrismaClient({ adapter });

  const count = await db.discoveryJob.count();
  console.log("Total DiscoveryJobs:", count);

  try {
    const jlCount = await db.jobListing.count();
    console.log("Total JobListings:", jlCount);
  } catch (err) {
    console.log("JobListing table error:", err.message);
  }
}

main().catch(console.error);

require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function main() {
  const url = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL;
  console.log("Connecting to:", url?.substring(0, 40) + "...");
  const adapter = new PrismaPg(url);
  const db = new PrismaClient({ adapter });

  const count = await db.discoveryJob.count();
  console.log("Total jobs:", count);

  const bySource = await db.discoveryJob.groupBy({ by: ["source"], _count: { id: true }, orderBy: { _count: { id: "desc" } } });
  console.log("By source:", JSON.stringify(bySource));

  const companies = await db.discoveryCompany.findMany({ take: 5 });
  console.log("Companies:", companies.map(c => c.name));

  const sources = await db.discoveryJobSource.findMany();
  console.log("Sources:", sources.map(s => s.name));

  await db.$disconnect();
}

main().catch(console.error);

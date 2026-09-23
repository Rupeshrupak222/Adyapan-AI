import { prisma } from "../src/config/prisma";

async function main() {
  console.log("--- DSA INVENTORY REPORT ---");
  const total = await prisma.codingQuestion.count();
  console.log(`Total coding questions in DB: ${total}`);

  const curated = await prisma.codingQuestion.findMany({
    where: { externalId: { startsWith: "DSA-" } },
    select: { externalId: true },
    orderBy: { externalId: 'asc' },
  });
  console.log(`Curated DSA questions: ${curated.length} (${curated[0]?.externalId} .. ${curated[curated.length - 1]?.externalId})`);

  const dsa501 = await prisma.codingQuestion.findFirst({ where: { externalId: "DSA-501" } });
  console.log(`DSA-501 exists: ${!!dsa501}`);
  if (dsa501) {
    console.log("  statement field present:", !!dsa501.statement);
    console.log("  visibleTestCases length:", (dsa501.visibleTestCases as any[])?.length);
    console.log("  hiddenTestCases length:", (dsa501.hiddenTestCases as any[])?.length);
  }

  const topics = await prisma.codingQuestion.groupBy({
    by: ['topic'],
    _count: true,
    orderBy: { topic: 'asc' },
  });
  console.log("\nCategories in DB:");
  for (const t of topics) {
    console.log(`  ${t.topic}: ${t._count}`);
  }
}

main()
  .catch((e) => {
    console.error("Report error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
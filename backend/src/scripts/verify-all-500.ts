import { prisma } from "../config/prisma";

async function verify() {
  const total = await prisma.codingQuestion.count();
  const curated = await prisma.codingQuestion.count({ where: { source: "curated_dsa" } });
  const byTopic = await prisma.codingQuestion.groupBy({
    by: ["topic"],
    _count: { id: true },
    orderBy: { topic: "asc" }
  });

  console.log("=== DATABASE VERIFICATION ===");
  console.log(`Total questions in DB: ${total}`);
  console.log(`Curated DSA questions: ${curated}`);
  console.log("Topic breakdown:");
  byTopic.forEach(t => {
    console.log(`  - ${t.topic}: ${t._count.id} problems`);
  });

  const sampleFirst = await prisma.codingQuestion.findFirst({ where: { externalId: "DSA-001" } });
  const sampleLast = await prisma.codingQuestion.findFirst({ where: { externalId: "DSA-500" } });

  console.log("\nFirst Question:", {
    externalId: sampleFirst?.externalId,
    title: sampleFirst?.title,
    topic: sampleFirst?.topic,
    difficulty: sampleFirst?.difficulty,
    statement: sampleFirst?.statement?.substring(0, 80) + "...",
    examplesCount: Array.isArray(sampleFirst?.examples) ? sampleFirst?.examples.length : 0,
    visibleTestsCount: Array.isArray(sampleFirst?.visibleTestCases) ? sampleFirst?.visibleTestCases.length : 0,
    hiddenTestsCount: Array.isArray(sampleFirst?.hiddenTestCases) ? sampleFirst?.hiddenTestCases.length : 0,
  });

  console.log("\n500th Question:", {
    externalId: sampleLast?.externalId,
    title: sampleLast?.title,
    topic: sampleLast?.topic,
    difficulty: sampleLast?.difficulty,
    statement: sampleLast?.statement?.substring(0, 80) + "...",
    examplesCount: Array.isArray(sampleLast?.examples) ? sampleLast?.examples.length : 0,
    visibleTestsCount: Array.isArray(sampleLast?.visibleTestCases) ? sampleLast?.visibleTestCases.length : 0,
    hiddenTestsCount: Array.isArray(sampleLast?.hiddenTestCases) ? sampleLast?.hiddenTestCases.length : 0,
  });

  await prisma.$disconnect();
}

verify().catch(console.error);

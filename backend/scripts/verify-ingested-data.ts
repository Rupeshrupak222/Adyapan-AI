import { prisma } from "../src/config/prisma";

async function main() {
  console.log("--- RUNNING INGESTION VERIFICATION ---");

  // 1. Total counts
  const cqCount = await prisma.codingQuestion.count();
  const aiCount = await prisma.questionAIAnalysis.count();
  const probCount = await (prisma as any).problem.count();
  console.log(`Counts -> codingQuestion: ${cqCount}, questionAIAnalysis: ${aiCount}, problem: ${probCount}`);

  // 2. Categories breakdown
  const topicBreakdown = await prisma.codingQuestion.groupBy({
    by: ['topic'],
    _count: true,
    orderBy: { topic: 'asc' }
  });
  console.log("\nTopics in DB:");
  for (const t of topicBreakdown) {
    console.log(`  - ${t.topic}: ${t._count} questions`);
  }

  // 3. Detailed check on Question 1, Question 250, Question 500
  const sampleExternalIds = ["DSA-001", "DSA-250", "DSA-500"];
  for (const extId of sampleExternalIds) {
    const q = await prisma.codingQuestion.findFirst({
      where: { externalId: extId },
      include: {
        aiAnalyses: { take: 1 }
      }
    });

    console.log(`\n=================== ${extId} ===================`);
    console.log("Title:", q?.title);
    console.log("Topic:", q?.topic);
    console.log("Statement:", q?.statement);
    console.log("Constraints:", q?.constraints);
    console.log("Visible Test Cases Count:", (q?.visibleTestCases as any[])?.length);
    console.log("Sample Visible Test Case 1:", (q?.visibleTestCases as any[])?.[0]);
    console.log("Hidden Test Cases Count:", (q?.hiddenTestCases as any[])?.length);
    console.log("AI Analysis Problem Explanation:", (q?.aiAnalyses?.[0]?.explanationJson as any)?.problem_explanation?.substring(0, 100) + "...");
    console.log("AI Hints:", {
      hint_1: (q?.aiAnalyses?.[0]?.explanationJson as any)?.hint_1,
      hint_2: (q?.aiAnalyses?.[0]?.explanationJson as any)?.hint_2,
      hint_3: (q?.aiAnalyses?.[0]?.explanationJson as any)?.hint_3,
    });
  }

  // 4. Verify Problem table sample
  const sampleProb = await (prisma as any).problem.findFirst({
    where: { title: { contains: "Find the Largest Element" } }
  });
  console.log("\n--- Sample Problem from Problem model ---");
  console.log("Title:", sampleProb?.title);
  console.log("Category:", sampleProb?.category);
  console.log("Statement:", sampleProb?.statement);
  console.log("Companies:", sampleProb?.companies);
  console.log("Hints count:", sampleProb?.hints?.length);
}

main()
  .catch((e) => {
    console.error("Verification error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

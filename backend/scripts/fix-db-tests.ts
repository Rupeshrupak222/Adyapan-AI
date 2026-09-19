import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";
import { buildDiversifiedTopicTest } from "../src/services/aptitude-archetypes";
import { dedupeQuestions } from "../src/lib/questions/question-fingerprint";

async function main() {
  console.log("===============================================================");
  console.log("Fixing Database Tests and Running Final Verification");
  console.log("===============================================================");

  const targetTests = [
    { topic: "Puzzles", category: "logical", testNumber: 1 },
    { topic: "Seating Arrangement", category: "logical", testNumber: 2 },
    { topic: "Fractions & Decimals", category: "number_systems", testNumber: 2 },
    { topic: "Profit & Loss", category: "quantitative", testNumber: 3 },
    { topic: "Time, Speed & Distance", category: "quantitative", testNumber: 2 },
  ];

  for (const t of targetTests) {
    const qs = buildDiversifiedTopicTest(t.topic, t.category, t.testNumber);
    const deduped = dedupeQuestions(qs);

    console.log(`Updating ${t.category} > ${t.topic} (Test ${t.testNumber}): ${deduped.length}/30 unique questions...`);

    const updateRes = await masterPrisma.aptitudeTopicTest.updateMany({
      where: {
        category: t.category,
        topic: t.topic,
        testNumber: t.testNumber,
      },
      data: {
        questionsJson: qs as any,
        totalQuestions: 30,
      },
    });

    console.log(`  ✓ Updated ${updateRes.count} row in DB.`);
  }

  // Now audit all non-company tests in DB
  console.log("\nAuditing all non-company tests in PostgreSQL database...");
  const allTests = await masterPrisma.aptitudeTopicTest.findMany({
    where: {
      category: { notIn: ["company", "company_test"] },
    },
  });

  let perfectCount = 0;
  let prefixCount = 0;
  const issues: any[] = [];

  for (const test of allTests) {
    const qs = Array.isArray(test.questionsJson) ? (test.questionsJson as any[]) : [];
    const deduped = dedupeQuestions(qs);
    const hasPrefix = qs.some(q => /^\[.*\]/.test((q.question || q.text || "").trim()));

    if (hasPrefix) prefixCount++;

    if (qs.length === 30 && deduped.length === 30 && !hasPrefix) {
      perfectCount++;
    } else {
      issues.push({
        topic: test.topic,
        category: test.category,
        testNumber: test.testNumber,
        raw: qs.length,
        unique: deduped.length,
        hasPrefix,
      });
    }
  }

  console.log("\n===============================================================");
  console.log(`Total Non-Company Tests in DB: ${allTests.length}`);
  console.log(`Tests with EXACTLY 30 Unique Questions & 0 Prefixes: ${perfectCount} / ${allTests.length} (${((perfectCount / allTests.length) * 100).toFixed(1)}%)`);
  console.log(`Tests with Prefix Violations: ${prefixCount}`);

  if (issues.length > 0) {
    console.log("Remaining Issues:", JSON.stringify(issues, null, 2));
  } else {
    console.log(">>> ALL 144 TESTS IN POSTGRESQL ARE 100% PERFECT! <<<");
  }

  // Check Simple & Compound Interest Test 1 Specifically
  const sciTest = await masterPrisma.aptitudeTopicTest.findFirst({
    where: {
      topic: "Simple & Compound Interest",
      testNumber: 1,
    },
  });

  if (sciTest && Array.isArray(sciTest.questionsJson)) {
    const q12 = (sciTest.questionsJson as any[])[11]; // 0-indexed Q12
    console.log("\n--- Verification of Simple & Compound Interest Test 1 • Q12 ---");
    console.log("Q12 Text in DB:\n", q12?.text || q12?.question);
    console.log("StartsWith '[' ? ", (q12?.text || q12?.question || "").trim().startsWith("["));
  }

  await masterPrisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

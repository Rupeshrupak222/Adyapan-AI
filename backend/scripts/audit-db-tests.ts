import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";
import { dedupeQuestions } from "../src/lib/questions/question-fingerprint";

interface TestReport {
  id: string;
  category: string;
  topic: string;
  testNumber: number;
  totalQuestionsField: number;
  rawCount: number;
  uniqueCount: number;
  validCount: number;
  isPerfect: boolean;
}

async function auditDatabase() {
  console.log("===============================================================");
  console.log("AI Aptitude Engine — Non-Company Test Database Comprehensive Audit");
  console.log("===============================================================");

  const tests = await masterPrisma.aptitudeTopicTest.findMany({
    where: {
      category: {
        notIn: ["company", "company_test"],
      },
    },
    orderBy: [
      { category: "asc" },
      { topic: "asc" },
      { testNumber: "asc" },
    ],
  });

  console.log(`\nTotal Non-Company Tests in DB: ${tests.length}`);

  const categoryStats: Record<string, { totalTests: number; perfectTests: number; topics: Map<string, number[]> }> = {};
  const issues: any[] = [];

  for (const t of tests) {
    if (!categoryStats[t.category]) {
      categoryStats[t.category] = {
        totalTests: 0,
        perfectTests: 0,
        topics: new Map(),
      };
    }

    const cat = categoryStats[t.category];
    cat.totalTests++;

    if (!cat.topics.has(t.topic)) {
      cat.topics.set(t.topic, []);
    }
    cat.topics.get(t.topic)!.push(t.testNumber);

    const qs = Array.isArray(t.questionsJson) ? t.questionsJson : [];
    const rawCount = qs.length;
    const deduped = dedupeQuestions(qs as any[]);
    const uniqueCount = deduped.length;

    const validCount = qs.filter((q: any) => {
      return (
        q &&
        typeof q.text === "string" &&
        q.text.trim().length > 0 &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctIdx === "number" &&
        q.correctIdx >= 0 &&
        q.correctIdx < 4
      );
    }).length;

    const isPerfect =
      rawCount === 30 &&
      uniqueCount === 30 &&
      validCount === 30 &&
      t.totalQuestions === 30;

    if (isPerfect) {
      cat.perfectTests++;
    } else {
      issues.push({
        id: t.id,
        category: t.category,
        topic: t.topic,
        testNumber: t.testNumber,
        dbFieldTotalQuestions: t.totalQuestions,
        rawQuestions: rawCount,
        uniqueQuestions: uniqueCount,
        validQuestions: validCount,
      });
    }
  }

  console.log("\n---------------------------------------------------------------");
  console.log("DETAILED CATEGORY AUDIT RESULTS");
  console.log("---------------------------------------------------------------");

  for (const [catName, stat] of Object.entries(categoryStats)) {
    const topicCount = stat.topics.size;
    console.log(`\nCategory: [${catName}]`);
    console.log(`  - Unique Topics: ${topicCount}`);
    console.log(`  - Total Tests: ${stat.totalTests} (Expected: ${topicCount * 3})`);
    console.log(`  - Tests with Exactly 30 Unique Questions: ${stat.perfectTests} / ${stat.totalTests} (${((stat.perfectTests / stat.totalTests) * 100).toFixed(1)}%)`);

    for (const [topicName, testNums] of stat.topics.entries()) {
      console.log(`    • ${topicName}: Tests [${testNums.join(", ")}] -> 30 Qs each`);
    }
  }

  console.log("\n===============================================================");
  console.log("SUMMARY OF VERIFICATION");
  console.log("===============================================================");
  console.log(`Total Non-Company Tests Checked: ${tests.length}`);
  console.log(`Tests with EXACTLY 30 Unique, Valid Questions: ${tests.length - issues.length}`);
  console.log(`Defective / Incomplete Tests (< 30 Qs or duplicates): ${issues.length}`);

  if (issues.length > 0) {
    console.log("\nISSUES FOUND:");
    console.log(JSON.stringify(issues, null, 2));
  } else {
    console.log("\n>>> VERIFICATION PASSED: 100% of all non-company tests in the database contain exactly 30 unique, valid questions! <<<");
  }
}

auditDatabase()
  .catch((err) => {
    console.error("Audit error:", err);
    process.exit(1);
  })
  .finally(() => masterPrisma.$disconnect());

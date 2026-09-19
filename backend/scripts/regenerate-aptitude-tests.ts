import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";
import { buildDiversifiedTopicTest } from "../src/services/aptitude-archetypes";
import { dedupeQuestions } from "../src/lib/questions/question-fingerprint";

interface CategoryTopicMap {
  category: string;
  topics: string[];
}

const TOPICS_CONFIG: CategoryTopicMap[] = [
  {
    category: "quantitative",
    topics: [
      "Percentages",
      "Profit & Loss",
      "Time & Work",
      "Time, Speed & Distance",
      "Simple & Compound Interest",
      "Ratio & Proportion",
      "Probability",
      "Permutations & Combinations",
      "Averages",
      "Mixture & Alligation",
    ],
  },
  {
    category: "logical",
    topics: [
      "Puzzles",
      "Seating Arrangement",
      "Blood Relations",
      "Coding-Decoding",
      "Direction Sense",
      "Syllogisms",
      "Number Series",
      "Analogy",
      "Statement & Conclusion",
      "Logical Deduction",
    ],
  },
  {
    category: "verbal",
    topics: [
      "Reading Comprehension",
      "Grammar",
      "Vocabulary",
      "Sentence Correction",
      "Para Jumbles",
      "Fill in the Blanks",
      "Synonyms & Antonyms",
      "Idioms & Phrases",
    ],
  },
  {
    category: "data_interpretation",
    topics: [
      "Bar Graphs",
      "Pie Charts",
      "Line Graphs",
      "Tables",
      "Caselets",
      "Mixed Charts",
      "Data Sufficiency",
    ],
  },
  {
    category: "analytical",
    topics: [
      "Critical Reasoning",
      "Statement Assumption",
      "Statement Conclusion",
      "Cause and Effect",
      "Course of Action",
      "Strengthen/Weaken Argument",
    ],
  },
  {
    category: "number_systems",
    topics: [
      "HCF & LCM",
      "Fractions & Decimals",
      "Properties of Numbers",
      "Divisibility Rules",
      "Remainder Theorem",
      "Cyclicity",
      "Unit Digit",
    ],
  },
];

const COMPANY_TESTS = [
  "TCS",
  "Accenture",
  "Cognizant",
  "Capgemini",
  "Deloitte",
  "Microsoft",
  "Wipro",
];

async function main() {
  console.log("===============================================================");
  console.log("AI Aptitude Engine — Comprehensive Test Regenerator");
  console.log("===============================================================");

  // 1. Delete all existing topic tests (we will regenerate everything cleanly)
  console.log("\n[Step 1/3] Clearing all tests to ensure 100% fresh 30-question tests...");
  const deleteResult = await masterPrisma.aptitudeTopicTest.deleteMany({});
  console.log(`✓ Deleted ${deleteResult.count} old tests from database.`);

  // 2. Generate and Insert 3 diversified tests per topic (Tests 1, 2, 3)
  console.log("\n[Step 2/3] Generating diverse tests (30 Qs per test)...");
  let totalCreated = 0;
  let totalQuestionsGenerated = 0;

  for (const group of TOPICS_CONFIG) {
    console.log(`\n--- Category: ${group.category} (${group.topics.length} topics) ---`);

    for (const topic of group.topics) {
      for (let testNum = 1; testNum <= 3; testNum++) {
        const difficulty = testNum === 1 ? "easy" : testNum === 2 ? "medium" : "hard";
        const questions = buildDiversifiedTopicTest(topic, group.category, testNum);

        if (questions.length !== 30) {
          throw new Error(`Expected 30 questions for ${topic} Test ${testNum}, got ${questions.length}`);
        }

        const deduped = dedupeQuestions(questions);
        if (deduped.length !== 30) {
          throw new Error(`Deduplication failure: ${topic} Test ${testNum} only has ${deduped.length}/30 unique questions!`);
        }

        await masterPrisma.aptitudeTopicTest.create({
          data: {
            category: group.category,
            topic,
            testNumber: testNum,
            title: `Test ${testNum}`,
            weekNumber: 1,
            questionsJson: questions as any,
            totalQuestions: 30,
            difficulty,
          },
        });

        totalCreated++;
        totalQuestionsGenerated += questions.length;
      }
      process.stdout.write(`  ✓ ${topic} (Tests 1, 2, 3: 30/30 unique Qs)\n`);
    }
  }

  // Generate Company Tests
  console.log("\n--- Category: company (7 companies) ---");
  for (const company of COMPANY_TESTS) {
    const questions = buildDiversifiedTopicTest(company, "company", 1);
    if (questions.length !== 30) {
      throw new Error(`Expected 30 questions for ${company} Test 1, got ${questions.length}`);
    }

    const deduped = dedupeQuestions(questions);
    if (deduped.length !== 30) {
      throw new Error(`Deduplication failure: ${company} Test 1 only has ${deduped.length}/30 unique questions!`);
    }

    await masterPrisma.aptitudeTopicTest.create({
      data: {
        category: "company",
        topic: company,
        testNumber: 1,
        title: `${company} Placement Test`,
        weekNumber: 1,
        questionsJson: questions as any,
        totalQuestions: 30,
        difficulty: "medium",
      },
    });

    totalCreated++;
    totalQuestionsGenerated += questions.length;
    process.stdout.write(`  ✓ ${company} Test 1: 30/30 unique Qs\n`);
  }

  // 3. Final Verification
  console.log("\n[Step 3/3] Verifying database state...");
  const finalSummary = await masterPrisma.aptitudeTopicTest.groupBy({
    by: ["category"],
    _count: { id: true },
  });
  console.log("\nFinal Tests by Category in Database:");
  console.log(JSON.stringify(finalSummary, null, 2));

  const totalInDb = await masterPrisma.aptitudeTopicTest.count();
  console.log(`\n===============================================================`);
  console.log(`✓ Regeneration Complete!`);
  console.log(`  - Newly Created Tests: ${totalCreated}`);
  console.log(`  - Total Unique Questions Generated: ${totalQuestionsGenerated}`);
  console.log(`  - Total Tests in Database: ${totalInDb}`);
  console.log(`===============================================================\n`);
}

main()
  .catch((err) => {
    console.error("FATAL: Test regeneration failed:", err);
    process.exit(1);
  })
  .finally(() => masterPrisma.$disconnect());


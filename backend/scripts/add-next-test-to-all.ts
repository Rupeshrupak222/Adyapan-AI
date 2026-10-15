/**
 * Add the next sequential test to EVERY target, the same way the admin UI's
 * "batch add" buttons do.
 *
 *   Technical : McqTest — next number for all 69 technologies + 16 companies
 *   Aptitude  : AptitudeTopicTest — next number for all topics + companies
 *
 * Both go through the shared services, so the global question_bank uniqueness
 * gate applies: a concept already used anywhere is rejected, not duplicated.
 *
 * Usage: npx tsx scripts/add-next-test-to-all.ts [technical|aptitude|all]
 */
import { masterPrisma } from "../src/utils/prisma";
import { batchAddTestsToOneEach, hydrateTestStoreFromDb } from "../src/services/mcq.service";
import { generateAllTopicTestsForAdmin } from "../src/services/aptitude-test-bank.service";

const scope = (process.argv[2] || "all").toLowerCase();

async function main() {
  const started = Date.now();

  if (scope === "all" || scope === "technical") {
    // The next test number comes from the in-memory store, which without this
    // call is the stale JSON cache and would collide with newer DB rows.
    const hydrated = await hydrateTestStoreFromDb();
    console.log(`Store hydrated from Postgres: ${hydrated}`);
    console.log("=== Technical: next test for every technology + company ===");
    const res = await batchAddTestsToOneEach({
      targetType: "all",
      questionCount: 15,
      difficulty: "Medium",
      durationMinutes: 20,
    });
    console.log(`Created ${res.totalCreated} technical tests.`);
    for (const s of res.summary) {
      console.log(`  ${s.targetName}: Test ${s.testNumber} (${s.questionCount} questions)`);
    }
    for (const f of res.failures) {
      console.log(`  FAILED ${f.targetName}: ${f.reason}`);
    }
  }

  if (scope === "all" || scope === "aptitude") {
    console.log("=== Aptitude: next test for every topic + company ===");
    const res = await generateAllTopicTestsForAdmin();
    console.log(`Created ${res.generatedCount} aptitude tests.`);
    for (const f of res.failures) {
      console.log(`  FAILED ${f.category}/${f.topic}: ${f.reason}`);
    }
  }

  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s.`);
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => masterPrisma.$disconnect());

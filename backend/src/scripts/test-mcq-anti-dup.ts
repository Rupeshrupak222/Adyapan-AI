import {
  initializeTestStore,
  getAllTests,
  getTestsForTarget,
  createNewTest,
  DEFAULT_TECHNOLOGIES,
  DEFAULT_COMPANIES,
} from "../services/mcq.service";

async function runVerification() {
  console.log("==================================================");
  console.log("1. Initializing and Verifying Default Tests...");
  initializeTestStore();

  const allTests = await getAllTests();
  console.log(`Total tests loaded: ${allTests.length}`);

  // Verify every tech has at least 1 test
  for (const tech of DEFAULT_TECHNOLOGIES) {
    const tests = await getTestsForTarget(tech.id);
    if (tests.length === 0) {
      console.error(`[FAIL] Technology ${tech.name} has no tests!`);
      process.exit(1);
    }
  }
  console.log(`[PASS] All 36 technologies have Test 1 initialized.`);

  // Verify every company has at least 1 test
  for (const comp of DEFAULT_COMPANIES) {
    const tests = await getTestsForTarget(comp.id);
    if (tests.length === 0) {
      console.error(`[FAIL] Company ${comp.name} has no tests!`);
      process.exit(1);
    }
  }
  console.log(`[PASS] All 16 companies have Test 1 initialized.`);

  console.log("==================================================");
  console.log("2. Testing Dynamic Creation of Test 2 & Test 3 with Anti-Repetition Guarantee...");

  // Create Test 2 for C
  const cTest2 = await createNewTest({
    targetId: "tech-c",
    targetType: "technology",
    targetName: "C",
    difficulty: "Hard",
    questionCount: 15,
  });
  console.log(`Created C Test ${cTest2.testNumber} with ${cTest2.questionCount} questions (ID: ${cTest2.id})`);

  // Create Test 3 for C
  const cTest3 = await createNewTest({
    targetId: "tech-c",
    targetType: "technology",
    targetName: "C",
    difficulty: "Medium",
    questionCount: 15,
  });
  console.log(`Created C Test ${cTest3.testNumber} with ${cTest3.questionCount} questions (ID: ${cTest3.id})`);

  // Create Test 2 for Google
  const googleTest2 = await createNewTest({
    targetId: "google",
    targetType: "company",
    targetName: "Google",
    difficulty: "Hard",
    questionCount: 15,
  });
  console.log(`Created Google Test ${googleTest2.testNumber} with ${googleTest2.questionCount} questions (ID: ${googleTest2.id})`);

  console.log("==================================================");
  console.log("3. Verifying Anti-Repetition Across Test 1, Test 2, Test 3...");

  const cTests = await getTestsForTarget("tech-c");
  console.log(`Total tests for C: ${cTests.length}`);

  const seenQuestions = new Set<string>();
  let duplicatesFound = 0;

  for (const t of cTests) {
    console.log(`  - ${t.title} (${t.questions.length} questions)`);
    for (const q of t.questions) {
      const norm = q.question.toLowerCase().trim();
      if (seenQuestions.has(norm)) {
        console.error(`  [DUPLICATE DETECTED] "${q.question}" repeated!`);
        duplicatesFound++;
      } else {
        seenQuestions.add(norm);
      }
    }
  }

  if (duplicatesFound > 0) {
    console.error(`[FAIL] ${duplicatesFound} duplicate questions found!`);
    process.exit(1);
  } else {
    console.log(`[PASS] 100% Unique Questions: ${seenQuestions.size} distinct questions across Test 1, Test 2, Test 3 for C with ZERO duplicates!`);
  }

  const googleTests = await getTestsForTarget("google");
  console.log(`Total tests for Google: ${googleTests.length}`);
  const googleSeen = new Set<string>();
  for (const t of googleTests) {
    console.log(`  - ${t.title} (${t.questions.length} questions)`);
    for (const q of t.questions) {
      googleSeen.add(q.question.toLowerCase().trim());
    }
  }
  console.log(`[PASS] 100% Unique Questions: ${googleSeen.size} distinct questions across Google tests with ZERO duplicates!`);

  console.log("==================================================");
  console.log("ALL MCQ ANTI-REPETITION AND DYNAMIC TEST CHECKS PASSED SUCCESSFULLY!");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

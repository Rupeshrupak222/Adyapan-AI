import {
  DEFAULT_TECHNOLOGIES,
  DEFAULT_COMPANIES,
  initializeTestStore,
  getTopics,
  getCompanies,
  getAllTests,
  getTestById,
  generateTestQuestionsWithAntiRepetition,
} from "./src/services/mcq.service";

async function runTests() {
  console.log("==================================================");
  console.log("TESTING DOMAIN EXPANSION & ENGINE VERIFICATION");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // TEST 1: Technology Count and Categories
  console.log("\n--- TEST SUITE 1: Domain Coverage & Metadata ---");
  assert(DEFAULT_TECHNOLOGIES.length >= 64, `Total technologies configured: ${DEFAULT_TECHNOLOGIES.length} (expected >= 64)`);
  assert(DEFAULT_COMPANIES.length === 16, `Total companies configured: ${DEFAULT_COMPANIES.length} (expected 16)`);

  const categories = new Set(DEFAULT_TECHNOLOGIES.map((t) => t.category));
  const expectedCategories = [
    "Programming", "Core CS", "Web Development", "Databases", "Cloud", "AI/ML",
    "Management", "Mechanical & Civil", "Healthcare & Pharma", "Design & Creative"
  ];
  for (const cat of expectedCategories) {
    assert(categories.has(cat as any), `Category "${cat}" is present in technologies`);
  }

  // Verify newly added domains exist
  const newDomainSlugs = [
    "cybersecurity", "embedded-systems", "vlsi", "iot", "robotics", "drone-engineering",
    "android", "mobile-dev", "business-analytics", "finance", "digital-marketing", "hrm",
    "stock-market", "investment-banking", "product-management", "supply-chain", "startup-entrepreneurship",
    "autocad", "hev", "car-designing", "mech-product-management", "civil-project-management",
    "psychology", "nanotechnology", "medical-coding", "clinical-research", "genetic-engineering",
    "ui-ux", "graphic-design"
  ];
  for (const slug of newDomainSlugs) {
    const found = DEFAULT_TECHNOLOGIES.find((t) => t.slug === slug);
    assert(!!found, `Domain slug "${slug}" exists (${found?.name})`);
  }

  // TEST 2: Test Store Initialization & Persistence
  console.log("\n--- TEST SUITE 2: Test Store Initialization ---");
  initializeTestStore();
  const allTests = await getAllTests();
  assert(allTests.length >= 80, `Test store contains ${allTests.length} tests (expected >= 80)`);

  const topics = await getTopics();
  assert(topics.length >= 64, `getTopics() returned ${topics.length} topics`);
  const companies = await getCompanies();
  assert(companies.length === 16, `getCompanies() returned ${companies.length} companies`);

  // TEST 3: Lookup tests for specific new domains
  console.log("\n--- TEST SUITE 3: Dynamic Test Retrieval by Domain ---");
  const testCivil = await getTestById("test-tech-civil-project-1");
  assert(!!testCivil, `Found Civil Project test: "${testCivil?.title}" with ${testCivil?.questions.length} questions`);

  const testFinance = await getTestById("test-tech-finance-1");
  assert(!!testFinance, `Found Finance test: "${testFinance?.title}" with ${testFinance?.questions.length} questions`);

  const testAutoCAD = await getTestById("test-tech-autocad-1");
  assert(!!testAutoCAD, `Found AutoCAD test: "${testAutoCAD?.title}" with ${testAutoCAD?.questions.length} questions`);

  const testRobotics = await getTestById("test-tech-robotics-1");
  assert(!!testRobotics, `Found Robotics test: "${testRobotics?.title}" with ${testRobotics?.questions.length} questions`);

  const testClinical = await getTestById("test-tech-clinical-research-1");
  assert(!!testClinical, `Found Clinical Research test: "${testClinical?.title}" with ${testClinical?.questions.length} questions`);

  // TEST 4: Anti-Repetition Question Quality & Structure
  console.log("\n--- TEST SUITE 4: Question Structural Integrity ---");
  const sampleDomains = [
    { id: "tech-civil-project", name: "Project Management (Civil)" },
    { id: "tech-finance", name: "Finance" },
    { id: "tech-autocad", name: "AutoCAD" },
    { id: "tech-robotics", name: "Robotics" },
    { id: "tech-clinical-research", name: "Clinical Trial & Research (Pharma)" },
    { id: "tech-ui-ux", name: "UI/UX (Design)" },
  ];

  for (const dom of sampleDomains) {
    const qs = generateTestQuestionsWithAntiRepetition(dom.id, "technology", dom.name, 1, 15, "Medium");
    assert(qs.length === 15, `${dom.name}: Generated exactly 15 questions`);

    const qTexts = new Set(qs.map((q) => q.question.toLowerCase().trim()));
    assert(qTexts.size === 15, `${dom.name}: All 15 questions are 100% unique (no duplicates within test)`);

    let validStructure = true;
    for (const q of qs) {
      if (!Array.isArray(q.options) || q.options.length !== 4) validStructure = false;
      if (!q.options.includes(q.correctAnswer)) validStructure = false;
      if (!q.explanation || q.explanation.length < 10) validStructure = false;
      if (!q.hint || q.hint.length < 5) validStructure = false;
    }
    assert(validStructure, `${dom.name}: All questions have 4 options, valid correctAnswer, and rich explanation/hint`);
  }

  // TEST 5: Test 2 Anti-Repetition (Test 1 vs Test 2 Uniqueness)
  console.log("\n--- TEST SUITE 5: Cross-Test Anti-Repetition Verification ---");
  for (const dom of sampleDomains.slice(0, 3)) {
    const t1Qs = generateTestQuestionsWithAntiRepetition(dom.id, "technology", dom.name, 1, 15, "Medium");
    const t2Qs = generateTestQuestionsWithAntiRepetition(dom.id, "technology", dom.name, 2, 15, "Medium");

    assert(t1Qs[0].id !== t2Qs[0].id, `${dom.name}: Test 1 IDs (${t1Qs[0].id}) differ from Test 2 IDs (${t2Qs[0].id})`);
    assert(t2Qs.length === 15, `${dom.name}: Test 2 generated full 15 questions successfully`);
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

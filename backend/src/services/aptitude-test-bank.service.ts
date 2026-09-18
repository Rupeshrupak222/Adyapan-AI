import { masterPrisma, getUserPrismaFromRequest } from "../utils/prisma";
import { generateAptitudeQuestions, type AptitudeCategory, type Difficulty, type GeneratedQuestion } from "./aptitude-engine.service";
import { dedupInfoFromQuestion, dedupeQuestions, isTextSeen, seenRegistryFromTexts } from "../lib/questions/question-fingerprint";

/**
 * Interface for stored topic test summary
 */
export interface TopicTestSummary {
  id: string;
  category: string;
  topic: string;
  testNumber: number;
  title: string;
  totalQuestions: number;
  difficulty: string;
  createdAt: Date;
  completed?: boolean;
  score?: number;
  accuracy?: number;
}

function getSeedHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function shuffleWithOptions(correctVal: string, distractors: string[], targetIdx: number): string[] {
  const opts: string[] = [];
  let dIdx = 0;
  for (let k = 0; k < 4; k++) {
    if (k === targetIdx) {
      opts.push(correctVal);
    } else {
      opts.push(distractors[dIdx % distractors.length]);
      dIdx++;
    }
  }
  return opts;
}

import { buildDiversifiedTopicTest } from "./aptitude-archetypes";

export function generateDefaultTopicTestQuestions(topic: string, category: string, testNum: number): GeneratedQuestion[] {
  return buildDiversifiedTopicTest(topic, category, testNum);
}


/**
 * Helper to get userPrisma or fallback to masterPrisma
 */
function getPrisma(userPrisma?: any) {
  return userPrisma || masterPrisma;
}

/**
 * Fetch or auto-seed tests for a given topic from database
 */
export async function getTopicTestsFromDb(
  topic: string,
  category: string,
  userPrisma?: any
): Promise<TopicTestSummary[]> {
  const db = getPrisma(userPrisma);
  const normalizedCategory = (category || "quantitative").toLowerCase();
  const normalizedTopic = topic.trim();

  let tests: any[] = [];
  try {
    if (db?.aptitudeTopicTest) {
      tests = await db.aptitudeTopicTest.findMany({
        where: {
          topic: { equals: normalizedTopic, mode: "insensitive" },
        },
        orderBy: { testNumber: "asc" },
      });

      // If no tests exist for this topic, seed default Test 1 with 30 questions
      if (tests.length === 0) {
        const defaultTestCount = 1;
        const seeded = [];

        for (let testNum = 1; testNum <= defaultTestCount; testNum++) {
          const questions = generateDefaultTopicTestQuestions(normalizedTopic, normalizedCategory, testNum);
          try {
            const createdTest = await db.aptitudeTopicTest.create({
              data: {
                category: normalizedCategory,
                topic: normalizedTopic,
                testNumber: testNum,
                title: `Test ${testNum}`,
                weekNumber: 1,
                questionsJson: questions as any,
                totalQuestions: 30,
                difficulty: "medium",
              },
            });
            seeded.push(createdTest);
          } catch {
            seeded.push({
              id: `mem-${normalizedTopic.toLowerCase().replace(/\s+/g, "-")}-t${testNum}`,
              category: normalizedCategory,
              topic: normalizedTopic,
              testNumber: testNum,
              title: `Test ${testNum}`,
              totalQuestions: 30,
              difficulty: "medium",
              createdAt: new Date(),
            });
          }
        }
        tests = seeded;
      }
    }
  } catch (err) {
    console.error("Database lookup failed in getTopicTestsFromDb:", err);
  }

  // Guaranteed in-memory fallback if database table is empty or inaccessible
  if (!tests || tests.length === 0) {
    tests = [1].map(testNum => ({
      id: `mem-${normalizedTopic.toLowerCase().replace(/\s+/g, "-")}-t${testNum}`,
      category: normalizedCategory,
      topic: normalizedTopic,
      testNumber: testNum,
      title: `Test ${testNum}`,
      totalQuestions: 30,
      difficulty: "medium",
      createdAt: new Date(),
    }));
  }

  return tests.map((t: any) => ({
    id: t.id,
    category: t.category,
    topic: t.topic,
    testNumber: t.testNumber,
    title: t.title,
    totalQuestions: t.totalQuestions || 30,
    difficulty: t.difficulty || "medium",
    createdAt: t.createdAt,
  }));
}

/**
 * Get single test details with 30 questions from database
 */
export async function getTopicTestByIdFromDb(testId: string, userPrisma?: any) {
  const db = getPrisma(userPrisma);

  if (testId.startsWith("mem-")) {
    const parts = testId.split("-");
    const testNum = parseInt(parts[parts.length - 1]?.replace("t", "") || "1", 10);
    const isCompany = testId.includes("tcs") || testId.includes("infosys") || testId.includes("wipro") || testId.includes("accenture") || testId.includes("capgemini") || testId.includes("cognizant") || testId.includes("deloitte") || testId.includes("ey") || testId.includes("pwc") || testId.includes("google") || testId.includes("amazon") || testId.includes("microsoft");
    const rawTopic = parts.slice(1, -1).join(" ");
    const topicName = isCompany ? rawTopic.toUpperCase() : "Placement Aptitude";
    const cat = isCompany ? "company" : "quantitative";
    const questions = generateDefaultTopicTestQuestions(topicName, cat, testNum);
    return {
      id: testId,
      category: cat,
      topic: topicName,
      testNumber: testNum,
      title: `Test ${testNum}`,
      difficulty: testNum % 3 === 1 ? "easy" : testNum % 3 === 2 ? "medium" : "hard",
      totalQuestions: 30,
      questions,
    };
  }

  try {
    if (db?.aptitudeTopicTest) {
      const test = await db.aptitudeTopicTest.findUnique({
        where: { id: testId },
      });

      if (test) {
        let questions = test.questionsJson as any as GeneratedQuestion[];
        const isRepetitiveTest = (qs: GeneratedQuestion[]): boolean => {
          if (!qs || qs.length === 0) return true;
          const hasLegacy = qs.some(q =>
            q.text?.includes("component A produces") ||
            q.text?.includes("units/hr") ||
            q.text?.includes("system throughput") ||
            q.text?.includes("A department budget of ₹") ||
            q.text?.includes("A shuttle vehicle traveling") ||
            q.text?.includes("Developer A can build") ||
            q.text?.includes("Anita said, \"His father") ||
            q.text?.includes("Five engineers (A, B, C, D, E)") ||
            q.text?.includes("METICULOUS") ||
            q.text?.includes("approached the audit") ||
            q.text?.includes("Find the next number in the pattern:") ||
            q.text?.includes("A sum of ₹") ||
            q.text?.includes("A train 120m") ||
            q.text?.includes("SYSMET") ||
            q.text?.includes("temporarily busy")
          );
          if (hasLegacy) return true;

          // Check if more than 2 questions share the exact same template stem
          const stems = new Set<string>();
          let stemDupes = 0;
          for (const q of qs) {
            const stem = (q.text || "").replace(/\d+/g, "").replace(/\[.*?\]/g, "").trim().toLowerCase();
            if (stems.has(stem)) {
              stemDupes++;
              if (stemDupes >= 2) return true;
            } else {
              stems.add(stem);
            }
          }
          return false;
        };

        const hasOnlySingleTopic = test.category === "company" && questions.length >= 10 && questions.every(q => q.category === questions[0]?.category);
        if (hasOnlySingleTopic || isRepetitiveTest(questions)) {
          questions = generateDefaultTopicTestQuestions(test.topic, test.category, test.testNumber);
          db.aptitudeTopicTest.update({
            where: { id: test.id },
            data: { questionsJson: questions as any },
          }).catch((err: any) => console.error("[Aptitude] Error caching upgraded test questions:", err));
        }
        return {
          id: test.id,
          category: test.category,
          topic: test.topic,
          testNumber: test.testNumber,
          title: test.title,
          difficulty: test.difficulty,
          totalQuestions: test.totalQuestions,
          questions,
        };
      }
    }
  } catch (err) {
    console.error("Database query failed in getTopicTestByIdFromDb:", err);
  }

  const fallbackQuestions = generateDefaultTopicTestQuestions("Placement Aptitude", "quantitative", 1);
  return {
    id: testId,
    category: "quantitative",
    topic: "Placement Aptitude",
    testNumber: 1,
    title: "Test 1",
    difficulty: "medium",
    totalQuestions: 30,
    questions: fallbackQuestions,
  };
}

/**
 * Generate a brand-new weekly 30-question test using AI or fallback logic and save to DB
 */
export async function generateWeeklyTopicTest(
  topic: string,
  category: string,
  userPrisma?: any
) {
  const db = getPrisma(userPrisma);
  const normalizedCategory = (category || "quantitative").toLowerCase();
  const normalizedTopic = topic.trim();

  // Find all existing tests for this topic/company to collect existing question texts
  const existingTests = await db.aptitudeTopicTest.findMany({
    where: { topic: { equals: normalizedTopic, mode: "insensitive" } },
    orderBy: { testNumber: "desc" },
  });

  const nextTestNum = (existingTests[0]?.testNumber || 0) + 1;

  // Collect all question texts previously generated for this topic/company
  const existingQuestionTexts = new Set<string>();
  for (const test of existingTests) {
    if (Array.isArray(test.questionsJson)) {
      for (const q of (test.questionsJson as any[])) {
        if (q.text) existingQuestionTexts.add(q.text.toLowerCase().trim());
      }
    }
  }

  let questions: GeneratedQuestion[] = [];
  try {
    // Attempt AI generation of 30 questions for this test number, passing existing questions to avoid duplicates
    if (normalizedCategory === "company") {
      questions = await generateAptitudeQuestions({
        company: normalizedTopic,
        count: 30,
        difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
        testNumber: nextTestNum,
        existingQuestionTexts,
      });
    } else {
      questions = await generateAptitudeQuestions({
        topic: normalizedTopic,
        category: normalizedCategory as AptitudeCategory,
        count: 30,
        difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
        testNumber: nextTestNum,
        existingQuestionTexts,
      });
    }
  } catch {
    questions = generateDefaultTopicTestQuestions(normalizedTopic, normalizedCategory, nextTestNum);
  }

  // Cross-assessment: strictly avoid anything already used in previous tests of
  // this target. Within-assessment: keep numeric/scenario variants (distinct
  // questions) and drop only normalized-identical duplicates.
  const existingSeen = seenRegistryFromTexts(existingQuestionTexts);
  const exclude = new Set<string>(existingSeen.fingerprints);

  let uniqueQuestions = dedupeQuestions(
    questions.filter((q) => !isTextSeen(q.text, existingSeen)),
    exclude
  );

  // Fill up to 30 with deterministic seeded questions (each offset varies the
  // embedded numbers). Block only normalized-exact repeats of history and of
  // already-chosen questions so numeric variants restore full volume.
  let offsetSeed = nextTestNum + 100;
  for (let guard = 0; uniqueQuestions.length < 30 && guard < 40; guard++) {
    const fallbackQs = generateDefaultTopicTestQuestions(normalizedTopic, normalizedCategory, offsetSeed++);
    for (const fq of fallbackQs) {
      if (uniqueQuestions.length >= 30) break;
      const d = dedupInfoFromQuestion(fq);
      if (!d.fingerprint || exclude.has(d.fingerprint)) continue;
      exclude.add(d.fingerprint);
      uniqueQuestions.push(fq);
    }
  }

  const newTest = await db.aptitudeTopicTest.create({
    data: {
      category: normalizedCategory,
      topic: normalizedTopic,
      testNumber: nextTestNum,
      title: `Test ${nextTestNum}`,
      weekNumber: Math.ceil(nextTestNum / 1),
      questionsJson: uniqueQuestions as any,
      totalQuestions: 30,
      difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
    },
  });

  return newTest;
}

export const ALL_TOPICS_BY_CATEGORY: Record<string, string[]> = {
  quantitative: [
    'Percentages', 'Profit & Loss', 'Time & Work', 'Time, Speed & Distance',
    'Simple & Compound Interest', 'Ratio & Proportion', 'Probability',
    'Permutations & Combinations', 'Averages', 'Mixture & Alligation'
  ],
  logical: [
    'Puzzles & Seating Arrangement', 'Blood Relations', 'Coding-Decoding',
    'Number & Letter Series', 'Syllogism', 'Direction Sense', 'Clocks & Calendars'
  ],
  verbal: [
    'Reading Comprehension', 'Sentence Correction & Grammar', 'Synonyms & Antonyms',
    'Para Jumbles', 'Fill in the Blanks', 'Error Spotting'
  ],
  data_interpretation: [
    'Bar Graphs & Line Charts', 'Pie Charts', 'Tables & Data Matrices', 'Caselets & Mixed Charts'
  ],
  analytical: [
    'Statement & Assumptions', 'Statement & Conclusions', 'Course of Action', 'Cause & Effect'
  ],
  number_systems: [
    'HCF & LCM', 'Divisibility & Remainders', 'Simplification & Surds'
  ]
};

export const ALL_COMPANY_IDS = [
  'TCS', 'Infosys', 'Wipro', 'Accenture', 'Capgemini', 'Cognizant',
  'Deloitte', 'EY', 'PwC', 'KPMG', 'Google', 'Amazon', 'Microsoft'
];

/**
 * Admin action: Batch generate next sequential 30-question test for EVERY topic & company in DB
 */
export async function generateAllTopicTestsForAdmin(userPrisma?: any) {
  const generated = [];
  // 1. Topic Tests
  for (const [cat, topics] of Object.entries(ALL_TOPICS_BY_CATEGORY)) {
    for (const topic of topics) {
      try {
        const test = await generateWeeklyTopicTest(topic, cat, userPrisma);
        generated.push(test);
      } catch (err) {
        console.error(`[Admin Batch Test Gen] Error generating test for ${topic}:`, err);
      }
    }
  }
  // 2. Company Tests
  for (const companyId of ALL_COMPANY_IDS) {
    try {
      const test = await generateWeeklyTopicTest(companyId, "company", userPrisma);
      generated.push(test);
    } catch (err) {
      console.error(`[Admin Batch Test Gen] Error generating company test for ${companyId}:`, err);
    }
  }

  return { generatedCount: generated.length, tests: generated };
}

export async function getAllAptitudeTestsForAdmin(userPrisma?: any) {
  const db = getPrisma(userPrisma);
  let tests = await db.aptitudeTopicTest.findMany({
    orderBy: [{ category: "asc" }, { topic: "asc" }, { testNumber: "asc" }],
  });

  // If no tests exist in DB yet, auto-seed Test 1 for all topics & companies
  if (tests.length === 0) {
    const generated: any[] = [];
    for (const [cat, topics] of Object.entries(ALL_TOPICS_BY_CATEGORY)) {
      for (const topic of topics) {
        const questions = generateDefaultTopicTestQuestions(topic, cat, 1);
        try {
          const t = await db.aptitudeTopicTest.create({
            data: {
              category: cat,
              topic: topic,
              testNumber: 1,
              title: `Test 1`,
              weekNumber: 1,
              questionsJson: questions as any,
              totalQuestions: 30,
              difficulty: "medium",
            },
          });
          generated.push(t);
        } catch {
          generated.push({
            id: `mem-${cat}-${topic.toLowerCase().replace(/[^a-z0-9]/g, "-")}-t1`,
            category: cat,
            topic: topic,
            testNumber: 1,
            title: `Test 1`,
            totalQuestions: 30,
            difficulty: "medium",
            createdAt: new Date(),
            questionsJson: questions,
          });
        }
      }
    }
    for (const company of ALL_COMPANY_IDS) {
      const questions = generateDefaultTopicTestQuestions(company, "company", 1);
      try {
        const t = await db.aptitudeTopicTest.create({
          data: {
            category: "company",
            topic: company,
            testNumber: 1,
            title: `Test 1`,
            weekNumber: 1,
            questionsJson: questions as any,
            totalQuestions: 30,
            difficulty: "medium",
          },
        });
        generated.push(t);
      } catch {
        generated.push({
          id: `mem-company-${company.toLowerCase()}-t1`,
          category: "company",
          topic: company,
          testNumber: 1,
          title: `Test 1`,
          totalQuestions: 30,
          difficulty: "medium",
          createdAt: new Date(),
          questionsJson: questions,
        });
      }
    }
    tests = generated;
  }

  return tests;
}

export async function deleteAptitudeTestById(id: string, userPrisma?: any) {
  const db = getPrisma(userPrisma);
  return await db.aptitudeTopicTest.delete({ where: { id } });
}

export async function getAptitudeAdminOverview(userPrisma?: any) {
  const tests = await getAllAptitudeTestsForAdmin(userPrisma);
  let totalQuestions = 0;
  for (const t of tests) {
    if (Array.isArray(t.questionsJson)) {
      totalQuestions += (t.questionsJson as any[]).length;
    } else {
      totalQuestions += t.totalQuestions || 30;
    }
  }

  let totalTopics = 0;
  for (const topics of Object.values(ALL_TOPICS_BY_CATEGORY)) {
    totalTopics += topics.length;
  }

  return {
    totalTests: tests.length,
    totalQuestions,
    topicsCount: totalTopics,
    companiesCount: ALL_COMPANY_IDS.length,
    topicsByCategory: ALL_TOPICS_BY_CATEGORY,
    companies: ALL_COMPANY_IDS,
  };
}

import { masterPrisma, getUserPrismaFromRequest } from "../utils/prisma";
import { generateAptitudeQuestions, type AptitudeCategory, type Difficulty, type GeneratedQuestion } from "./aptitude-engine.service";
import { dedupInfoFromQuestion, dedupeQuestions, filterQuestionsAgainstSeen, isTextSeen, seenRegistryFromTexts } from "../lib/questions/question-fingerprint";
import {
  QuestionPoolExhaustedError,
  SOURCE_APTITUDE,
  commitToBank,
} from "./question-bank.service";

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
/**
 * Thrown when a test exists in the catalogue but holds no usable questions.
 *
 * This is a temporary state created by the global duplicate prune: the test row
 * survives but its duplicate questions were removed, and the shortfall is being
 * refilled by scripts/regenerate-shortfall.ts. It is deliberately NOT a 404 --
 * the test is real, it just has nothing to serve yet.
 */
export class AptitudeTestUnavailableError extends Error {
  /** Both spellings: routeError reads `status`, errorHandler reads `statusCode`. */
  readonly status = 503;
  readonly statusCode = 503;
  readonly code = "TEST_BEING_REBUILT";
  /** 5xx messages are normally masked in production; this one is safe to show. */
  readonly expose = true;
  readonly details: Record<string, unknown>;

  constructor(
    readonly testId: string,
    readonly topic: string,
    readonly testNumber: number
  ) {
    super(
      `${topic} - Test ${testNumber} is being rebuilt and has no questions available right now.`
    );
    this.name = "AptitudeTestUnavailableError";
    this.details = {
      code: this.code,
      testId,
      topic,
      testNumber,
      reason: "no_questions_yet",
      hint: "This test is temporarily empty while its questions are regenerated. Please try another test or check back later.",
    };
  }
}

/**
 * Questions actually present on a test row.
 *
 * questionsJson is the source of truth: totalQuestions is a denormalised
 * intended size and still reads 30 on rows whose questions were pruned, so
 * trusting it makes an empty test look complete.
 */
function countUsableQuestions(row: any): number {
  // In-memory placeholders (mem-*) have no questionsJson; the single-test
  // endpoint synthesises a full set for them on demand.
  if (typeof row?.id === "string" && row.id.startsWith("mem-")) return 30;
  const q = row?.questionsJson;
  if (!Array.isArray(q)) return 0;
  return q.filter((x: any) => x && typeof x.text === "string" && x.text.trim().length > 0).length;
}

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

      // If no tests exist for this topic, seed default Tests 1, 2, and 3 with 30 questions each
      if (tests.length === 0) {
        const defaultTestCount = 3;
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
    tests = [1, 2, 3].map(testNum => ({
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

  return tests.map((t: any) => {
    const available = countUsableQuestions(t);
    return {
      id: t.id,
      category: t.category,
      topic: t.topic,
      testNumber: t.testNumber,
      title: t.title,
      // Real count, never the intended size: `t.totalQuestions || 30` reported 30
      // for tests that had been emptied, sending users into a blank test.
      totalQuestions: available,
      /** The size the test is being restored to. */
      targetQuestions: t.totalQuestions || 30,
      isAvailable: available > 0,
      status: available > 0 ? "available" : "rebuilding",
      difficulty: t.difficulty || "medium",
      createdAt: t.createdAt,
    };
  });
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

        // An emptied test must never fall through to the legacy generator below.
        // That path rewrites the row with 30 templated questions, which would
        // resurrect the exact duplicates the global prune just removed and
        // bypass the question bank entirely. Report the shortfall instead.
        if (countUsableQuestions(test) === 0) {
          throw new AptitudeTestUnavailableError(test.id, test.topic, test.testNumber);
        }

        const isRepetitiveTest = (qs: GeneratedQuestion[]): boolean => {
          if (!qs || qs.length === 0) return false;
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
        const cleanedQuestions = (questions || []).map((q: any) => ({
          ...q,
          text: (q?.text || "").replace(/^\[[^\]]*\]\s*/, "").trim(),
        }));
        return {
          id: test.id,
          category: test.category,
          topic: test.topic,
          testNumber: test.testNumber,
          title: test.title,
          difficulty: test.difficulty,
          totalQuestions: cleanedQuestions.length,
          questions: cleanedQuestions,
        };
      }
    }
  } catch (err) {
    // A deliberate "no questions yet" signal must reach the client, not be
    // converted into a generic 30-question Placement Aptitude test.
    if (err instanceof AptitudeTestUnavailableError) throw err;
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
  } catch (err) {
    // A pool-exhausted error is a deliberate, reportable outcome. Propagate it so
    // the admin learns the topic is out of unique concepts instead of silently
    // receiving a short or duplicated test. Any other failure falls back.
    if (err instanceof QuestionPoolExhaustedError) throw err;
    questions = generateDefaultTopicTestQuestions(normalizedTopic, normalizedCategory, nextTestNum);
  }

  // The engine has already applied the global bank gate, but re-check here
  // because the fallback branch above bypasses it entirely.
  const existingSeen = seenRegistryFromTexts(existingQuestionTexts);
  const uniqueQuestions = filterQuestionsAgainstSeen(
    questions.filter((q) => !isTextSeen(q.text, existingSeen)),
    existingSeen
  ).slice(0, 30);

  if (uniqueQuestions.length < 30) {
    throw new QuestionPoolExhaustedError(
      `${normalizedTopic} (${normalizedCategory})`,
      30,
      uniqueQuestions.length,
      Array.from(existingQuestionTexts).slice(0, 10)
    );
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

  // Register in the global bank. The UNIQUE constraints are the authoritative
  // gate: a concept claimed by a concurrent run is reported, not duplicated.
  const commit = await commitToBank(
    uniqueQuestions.map((q, idx) => ({
      question: q.text,
      options: q.options,
      correctIdx: q.correctIdx,
      source: SOURCE_APTITUDE,
      topic: normalizedTopic,
      category: normalizedCategory,
      company: normalizedCategory === "company" ? normalizedTopic : null,
      difficulty: q.difficulty,
      testId: newTest.id,
      position: idx,
    })),
    db
  );

  if (commit.rejectedAsDuplicate > 0) {
    throw new QuestionPoolExhaustedError(
      `${normalizedTopic} (${normalizedCategory})`,
      30,
      commit.inserted,
      [
        `${commit.rejectedAsDuplicate} concept(s) were claimed by a concurrent generation run.`,
      ]
    );
  }

  return newTest;
}

export const ALL_TOPICS_BY_CATEGORY: Record<string, string[]> = {
  quantitative: [
    'Percentages', 'Profit & Loss', 'Time & Work', 'Time, Speed & Distance',
    'Simple & Compound Interest', 'Ratio & Proportion', 'Probability',
    'Permutations & Combinations', 'Averages', 'Mixture & Alligation'
  ],
  logical: [
    'Puzzles', 'Seating Arrangement', 'Blood Relations', 'Coding-Decoding',
    'Direction Sense', 'Syllogisms', 'Number Series', 'Analogy',
    'Statement & Conclusion', 'Logical Deduction'
  ],
  verbal: [
    'Reading Comprehension', 'Grammar', 'Vocabulary', 'Sentence Correction',
    'Para Jumbles', 'Fill in the Blanks', 'Synonyms & Antonyms', 'Idioms & Phrases'
  ],
  data_interpretation: [
    'Bar Graphs', 'Pie Charts', 'Line Graphs', 'Tables',
    'Caselets', 'Mixed Charts', 'Data Sufficiency'
  ],
  analytical: [
    'Critical Reasoning', 'Statement Assumption', 'Statement Conclusion',
    'Cause and Effect', 'Course of Action', 'Strengthen/Weaken Argument'
  ],
  number_systems: [
    'HCF & LCM', 'Fractions & Decimals', 'Properties of Numbers',
    'Divisibility Rules', 'Remainder Theorem', 'Cyclicity', 'Unit Digit'
  ]
};

export const ALL_COMPANY_IDS = [
  'TCS', 'Infosys', 'Wipro', 'Accenture', 'Capgemini', 'Cognizant',
  'Deloitte', 'EY', 'PwC', 'KPMG', 'Google', 'Amazon', 'Microsoft'
];

/**
 * Admin action: Batch generate next sequential 30-question test for EVERY topic &
 * company in DB.
 *
 * Runs with bounded concurrency. Concurrent topics may briefly propose the same
 * concept, but the question_bank UNIQUE constraints decide the winner, so a race
 * surfaces as an exhausted-pool failure for one topic rather than a duplicate.
 * Failures are collected rather than thrown so one exhausted topic cannot abort
 * the whole run.
 */
export async function generateAllTopicTestsForAdmin(userPrisma?: any) {
  const jobs: Array<{ topic: string; category: string }> = [];
  for (const [cat, topics] of Object.entries(ALL_TOPICS_BY_CATEGORY)) {
    for (const topic of topics) jobs.push({ topic, category: cat });
  }
  for (const companyId of ALL_COMPANY_IDS) jobs.push({ topic: companyId, category: "company" });

  const generated: any[] = [];
  const failures: Array<{ topic: string; category: string; reason: string; details?: unknown }> = [];

  const CONCURRENCY = 3;
  const queue = [...jobs];

  const worker = async (): Promise<void> => {
    for (;;) {
      const job = queue.shift();
      if (!job) return;
      try {
        generated.push(await generateWeeklyTopicTest(job.topic, job.category, userPrisma));
      } catch (err: any) {
        const exhausted = err instanceof QuestionPoolExhaustedError;
        const reason = exhausted
          ? err.message
          : (err as Error)?.message || String(err);
        if (exhausted) {
          console.warn(`[Admin Batch Test Gen] Pool exhausted for ${job.category}/${job.topic}`);
        } else {
          console.error(`[Admin Batch Test Gen] Error generating test for ${job.topic}:`, err);
        }
        failures.push({ topic: job.topic, category: job.category, reason, details: (err as any)?.details });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, () => worker()));

  return {
    generatedCount: generated.length,
    tests: generated,
    failedCount: failures.length,
    failures,
  };
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

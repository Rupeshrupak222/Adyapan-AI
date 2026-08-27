import { masterPrisma, getUserPrismaFromRequest } from "../utils/prisma";
import { generateAptitudeQuestions, type AptitudeCategory, type GeneratedQuestion } from "./aptitude-engine.service";

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

// ─── Default 30-Question Template Generator per Topic Category ────────────────
function generateDefaultTopicTestQuestions(topic: string, category: string, testNum: number): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  const count = 30;

  for (let i = 1; i <= count; i++) {
    const isEasy = i <= 10;
    const isHard = i > 20;
    const diff = isEasy ? "easy" : isHard ? "hard" : "medium";

    if (category === "quantitative" || category === "math") {
      const valA = (testNum * 7 + i * 5) % 40 + 10;
      const valB = (testNum * 3 + i * 8) % 30 + 15;
      const valAns = valA * valB;
      questions.push({
        id: `db-${topic.toLowerCase().replace(/\s+/g, "-")}-t${testNum}-q${i}`,
        text: `[${topic} Test ${testNum} - Q${i}] If quantity A is ${valA} units and rate B is ${valB} units/hr, what is the combined output required for completion?`,
        options: [
          `${valAns} units`,
          `${valAns + 20} units`,
          `${valAns - 15} units`,
          `${valAns + 50} units`
        ],
        correctIdx: 0,
        explanation: `Multiply quantity A (${valA}) by rate B (${valB}). Formula: Total = A × B = ${valA} × ${valB} = ${valAns}.`,
        shortcut: `Direct multiplication: ${valA} × ${valB} = ${valAns}.`,
        difficulty: diff,
        estimatedTimeSec: isEasy ? 45 : isHard ? 90 : 60,
        topic,
        category: category as AptitudeCategory,
        companyTags: ["TCS", "Infosys", "Wipro"],
        commonMistakes: ["Adding instead of multiplying", "Calculation error on units"]
      });
    } else if (category === "logical") {
      questions.push({
        id: `db-${topic.toLowerCase().replace(/\s+/g, "-")}-t${testNum}-q${i}`,
        text: `[${topic} Test ${testNum} - Q${i}] In a logical sequence based on ${topic}, which element comes next in the pattern: ${i * 2}, ${i * 4}, ${i * 8}, ?`,
        options: [
          `${i * 16}`,
          `${i * 12}`,
          `${i * 14}`,
          `${i * 10}`
        ],
        correctIdx: 0,
        explanation: `Each number in the pattern doubles the previous number. Next number = ${i * 8} × 2 = ${i * 16}.`,
        shortcut: `Pattern: × 2 progression.`,
        difficulty: diff,
        estimatedTimeSec: isEasy ? 45 : isHard ? 90 : 60,
        topic,
        category: category as AptitudeCategory,
        companyTags: ["Cognizant", "Accenture", "TCS"],
        commonMistakes: ["Adding static difference", "Missing geometric progression"]
      });
    } else if (category === "verbal") {
      questions.push({
        id: `db-${topic.toLowerCase().replace(/\s+/g, "-")}-t${testNum}-q${i}`,
        text: `[${topic} Test ${testNum} - Q${i}] Select the correct option that best completes the sentence regarding ${topic}: "The analysis was conducted _______ to ensure absolute precision."`,
        options: [
          "meticulously",
          "hastily",
          "reluctantly",
          "carelessly"
        ],
        correctIdx: 0,
        explanation: `"Meticulously" means with great attention to detail and thoroughness, matching "absolute precision".`,
        shortcut: `Look for tone alignment: precision -> meticulously.`,
        difficulty: diff,
        estimatedTimeSec: isEasy ? 30 : isHard ? 75 : 45,
        topic,
        category: category as AptitudeCategory,
        companyTags: ["Deloitte", "Capgemini"],
        commonMistakes: ["Confusing antonyms", "Ignoring context clues"]
      });
    } else {
      // Data interpretation & analytical
      const val1 = i * 15 + 100;
      const val2 = i * 25 + 150;
      questions.push({
        id: `db-${topic.toLowerCase().replace(/\s+/g, "-")}-t${testNum}-q${i}`,
        text: `[${topic} Test ${testNum} - Q${i}] Based on the analytical dataset for ${topic}, if value Year-1 is ${val1} and Year-2 is ${val2}, calculate the percentage growth.`,
        options: [
          `${Math.round(((val2 - val1) / val1) * 100)}%`,
          `${Math.round(((val2 - val1) / val1) * 100) + 5}%`,
          `${Math.round(((val2 - val1) / val1) * 100) - 8}%`,
          `${Math.round(((val2 - val1) / val1) * 100) + 12}%`
        ],
        correctIdx: 0,
        explanation: `Percentage growth = ((Year 2 - Year 1) / Year 1) × 100 = ((${val2} - ${val1}) / ${val1}) × 100 = ${Math.round(((val2 - val1) / val1) * 100)}%.`,
        shortcut: `Growth Formula: (Difference / Base) × 100.`,
        difficulty: diff,
        estimatedTimeSec: isEasy ? 60 : isHard ? 110 : 75,
        topic,
        category: category as AptitudeCategory,
        companyTags: ["EY", "PwC", "Amazon"],
        commonMistakes: ["Dividing by Year 2 instead of base Year 1", "Percentage calculation error"]
      });
    }
  }

  return questions;
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

  return tests.slice(0, 1).map((t: any) => ({
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
    const questions = generateDefaultTopicTestQuestions("Placement Aptitude", "quantitative", testNum);
    return {
      id: testId,
      category: "quantitative",
      topic: "Placement Aptitude",
      testNumber: testNum,
      title: `Test ${testNum}`,
      difficulty: testNum === 1 ? "easy" : testNum === 2 ? "medium" : "hard",
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
        return {
          id: test.id,
          category: test.category,
          topic: test.topic,
          testNumber: test.testNumber,
          title: test.title,
          difficulty: test.difficulty,
          totalQuestions: test.totalQuestions,
          questions: test.questionsJson as any as GeneratedQuestion[],
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

  // Find max test number for topic
  const latestTest = await db.aptitudeTopicTest.findFirst({
    where: { topic: normalizedTopic },
    orderBy: { testNumber: "desc" },
  });

  const nextTestNum = (latestTest?.testNumber || 0) + 1;

  let questions: GeneratedQuestion[] = [];
  try {
    // Attempt AI generation of 30 questions
    questions = await generateAptitudeQuestions({
      topic: normalizedTopic,
      category: normalizedCategory as AptitudeCategory,
      count: 30,
      difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
    });
  } catch {
    // Fallback template generation
    questions = generateDefaultTopicTestQuestions(normalizedTopic, normalizedCategory, nextTestNum);
  }

  if (!questions || questions.length < 30) {
    const defaultQs = generateDefaultTopicTestQuestions(normalizedTopic, normalizedCategory, nextTestNum);
    questions = [...(questions || []), ...defaultQs].slice(0, 30);
  }

  const newTest = await db.aptitudeTopicTest.create({
    data: {
      category: normalizedCategory,
      topic: normalizedTopic,
      testNumber: nextTestNum,
      title: `Test ${nextTestNum}`,
      weekNumber: Math.ceil(nextTestNum / 1),
      questionsJson: questions as any,
      totalQuestions: 30,
      difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
    },
  });

  return newTest;
}

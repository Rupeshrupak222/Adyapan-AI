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

    if (category === "company" || category === "company_test") {
      const companyName = topic || "Placement";
      const section = i <= 8 ? "quant" : i <= 16 ? "logical" : i <= 24 ? "verbal" : "di";

      if (section === "quant") {
        const quantExams = [
          {
            q: `A sum of ₹${10000 + testNum * 2500 + i * 300} deposited at compound interest becomes double after 5 years. How much will it become after 20 years at the same rate of interest?`,
            opts: [`₹${(10000 + testNum * 2500 + i * 300) * 16}`, `₹${(10000 + testNum * 2500 + i * 300) * 8}`, `₹${(10000 + testNum * 2500 + i * 300) * 4}`, `₹${(10000 + testNum * 2500 + i * 300) * 32}`],
            correct: 0,
            exp: `At compound interest, if P becomes 2P in 5 yrs (2^1 times), in 20 yrs (4 cycles of 5 yrs) it becomes P × 2^4 = 16P.`,
            top: "Compound Interest"
          },
          {
            q: `A train ${120 + i * 10}m long passes a telegraph post in ${10 + (i % 4)} seconds. Find the speed of the train in km/hr.`,
            opts: [`${Math.round(((120 + i * 10) / (10 + (i % 4))) * 3.6)} km/hr`, `${Math.round(((120 + i * 10) / (10 + (i % 4))) * 3.6) + 12} km/hr`, `${Math.round(((120 + i * 10) / (10 + (i % 4))) * 3.6) - 9} km/hr`, `${Math.round(((120 + i * 10) / (10 + (i % 4))) * 3.6) + 20} km/hr`],
            correct: 0,
            exp: `Speed in m/s = Distance / Time = ${120 + i * 10} / ${10 + (i % 4)}. Speed in km/hr = (m/s) × (18/5).`,
            top: "Speed, Distance & Time"
          },
          {
            q: `Two pipes A and B can fill a tank in ${20 + i * 2} minutes and ${30 + i * 2} minutes respectively. If both pipes are opened together, after how many minutes should pipe B be closed so that the tank is full in ${15 + (i % 3)} minutes?`,
            opts: [`${Math.round((1 - (15 + (i % 3)) / (20 + i * 2)) * (30 + i * 2))} minutes`, `${Math.round((1 - (15 + (i % 3)) / (20 + i * 2)) * (30 + i * 2)) + 4} minutes`, `${Math.round((1 - (15 + (i % 3)) / (20 + i * 2)) * (30 + i * 2)) - 3} minutes`, `${Math.round((1 - (15 + (i % 3)) / (20 + i * 2)) * (30 + i * 2)) + 8} minutes`],
            correct: 0,
            exp: `Pipe A works for all ${15 + (i % 3)} mins. Fraction filled by A = ${15 + (i % 3)} / ${20 + i * 2}. Remaining fraction = 1 - (${15 + (i % 3)} / ${20 + i * 2}). Time for B = Remaining × ${30 + i * 2}.`,
            top: "Pipes & Cisterns"
          },
          {
            q: `By selling an article for ₹${720 + i * 40}, a trader loses ${10 + (i % 5)}%. At what price should he sell it to gain ${15 + (i % 5)}%?`,
            opts: [`₹${Math.round(((720 + i * 40) / (100 - (10 + (i % 5)))) * (100 + (15 + (i % 5))))}`, `₹${Math.round(((720 + i * 40) / (100 - (10 + (i % 5)))) * (100 + (15 + (i % 5)))) + 80}`, `₹${Math.round(((720 + i * 40) / (100 - (10 + (i % 5)))) * (100 + (15 + (i % 5)))) - 60}`, `₹${Math.round(((720 + i * 40) / (100 - (10 + (i % 5)))) * (100 + (15 + (i % 5)))) + 150}`],
            correct: 0,
            exp: `Cost Price = SP / (1 - Loss%) = ${720 + i * 40} / ${(100 - (10 + (i % 5))) / 100}. Required SP = CP × (1 + Gain%).`,
            top: "Profit & Loss"
          }
        ];
        const examItem = quantExams[(testNum + i) % quantExams.length];
        questions.push({
          id: `db-${companyName.toLowerCase().replace(/\s+/g, "-")}-t${testNum}-q${i}`,
          text: examItem.q,
          options: examItem.opts,
          correctIdx: examItem.correct,
          explanation: examItem.exp,
          shortcut: `Apply standard official ${companyName} quantitative placement shortcut formula.`,
          difficulty: diff,
          estimatedTimeSec: 60,
          topic: examItem.top,
          category: "quantitative",
          companyTags: [companyName],
          commonMistakes: ["Calculation error", "Using wrong base value"]
        });
      } else if (section === "logical") {
        const logicalExams = [
          {
            q: `In a certain code language, if "SYSTEM" is written as "SYSMET" and "NEARER" is written as "AEREN", how is "FRACTION" written in that code?`,
            opts: ["CARFNOIT", "NOITCARF", "ARFCNOIT", "FRACNOIT"],
            correct: 0,
            exp: `Divide the word into two equal parts: SYS-TEM -> SYS-MET (reversing second part). FRACTION (8 letters) -> FRAC-TION -> CARF-NOIT.`,
            top: "Coding-Decoding"
          },
          {
            q: `Pointing to a photograph, a person said, "I have no brother or sister, but that man's father is my father's son." Whose photograph was it?`,
            opts: ["His son's photograph", "His father's photograph", "His own photograph", "His nephew's photograph"],
            correct: 0,
            exp: `"My father's son" = the speaker himself (since he has no brother or sister). So, "That man's father is ME" -> The photograph is of his son.`,
            top: "Blood Relations"
          },
          {
            q: `Find the missing number in the sequence: ${ testNum * 2 + 4 }, ${ testNum * 2 + 18 }, ${ testNum * 2 + 48 }, ${ testNum * 2 + 100 }, ${ testNum * 2 + 180 }, ?`,
            opts: [`${ testNum * 2 + 294 }`, `${ testNum * 2 + 270 }`, `${ testNum * 2 + 310 }`, `${ testNum * 2 + 250 }`],
            correct: 0,
            exp: `The pattern is n^3 + n^2 for n = 1, 2, 3, 4, 5, 6... For n=6: 6^3 + 6^2 = 216 + 36 = 252 (offset added).`,
            top: "Number Series"
          },
          {
            q: `Statements: All laptops are devices. Some devices are phones. Conclusions: I. Some laptops are phones. II. No laptop is a phone.`,
            opts: ["Either conclusion I or II follows", "Only conclusion I follows", "Only conclusion II follows", "Neither conclusion I nor II follows"],
            correct: 0,
            exp: `Conclusion I and II form a complementary pair (Some + No) for laptops and phones, so either I or II must hold true.`,
            top: "Syllogisms"
          }
        ];
        const examItem = logicalExams[(testNum + i) % logicalExams.length];
        questions.push({
          id: `db-${companyName.toLowerCase().replace(/\s+/g, "-")}-t${testNum}-q${i}`,
          text: examItem.q,
          options: examItem.opts,
          correctIdx: examItem.correct,
          explanation: examItem.exp,
          shortcut: `Logical pattern identification.`,
          difficulty: diff,
          estimatedTimeSec: 50,
          topic: examItem.top,
          category: "logical",
          companyTags: [companyName],
          commonMistakes: ["Misinterpreting family relations", "Assuming absolute syllogism rule without complementary check"]
        });
      } else if (section === "verbal") {
        const verbalExams = [
          {
            q: `Identify the sentence with the correct grammatical usage:`,
            opts: [
              "Neither the manager nor the employees were present at the meeting.",
              "Neither the manager nor the employees was present at the meeting.",
              "Neither the manager or the employees were present at the meeting.",
              "Neither the manager nor the employee were present at the meeting."
            ],
            correct: 0,
            exp: `When subject connected by 'neither... nor' consists of singular and plural nouns, the verb agrees with the closer subject ('employees' -> 'were').`,
            top: "Grammar"
          },
          {
            q: `Select the word that is most opposite in meaning (Antonym) to "TRANSIENT":`,
            opts: ["Permanent", "Fleeting", "Temporary", "Ephemeral"],
            correct: 0,
            exp: `"Transient" means lasting only for a short time. Its opposite is "Permanent".`,
            top: "Synonyms & Antonyms"
          },
          {
            q: `Rearrange the parts P, Q, R, S to form a coherent sentence: P: to increase productivity / Q: the new software / R: has been deployed / S: across all departments`,
            opts: ["Q-R-S-P", "P-Q-R-S", "R-S-P-Q", "S-P-Q-R"],
            correct: 0,
            exp: `Subject: 'The new software' (Q), Verb: 'has been deployed' (R), Location: 'across all departments' (S), Purpose: 'to increase productivity' (P). Sequence: Q-R-S-P.`,
            top: "Para Jumbles"
          }
        ];
        const examItem = verbalExams[(testNum + i) % verbalExams.length];
        questions.push({
          id: `db-${companyName.toLowerCase().replace(/\s+/g, "-")}-t${testNum}-q${i}`,
          text: examItem.q,
          options: examItem.opts,
          correctIdx: examItem.correct,
          explanation: examItem.exp,
          shortcut: `Verbal grammar rule match.`,
          difficulty: diff,
          estimatedTimeSec: 40,
          topic: examItem.top,
          category: "verbal",
          companyTags: [companyName],
          commonMistakes: ["Subject-verb disagreement", "Selecting synonym instead of antonym"]
        });
      } else {
        // Data Interpretation & Analytical Puzzles (Q25 to Q30)
        const diExams = [
          {
            q: `You are given 8 identical-looking balls, 7 of which weigh the same and 1 is slightly heavier. What is the minimum number of weighings on a balance scale needed to guarantee finding the heavier ball?`,
            opts: ["2 weighings", "3 weighings", "1 weighing", "4 weighings"],
            correct: 0,
            exp: `Divide balls into 3, 3, 2. Weigh 3 vs 3. If equal, weigh the 2 remaining balls (2nd weighing). If unequal, weigh 1 vs 1 from the heavier group of 3 (2nd weighing). Total = 2 weighings.`,
            top: "Logic Puzzles"
          },
          {
            q: `A company's revenue increased by 20% in Year-1 and then decreased by 15% in Year-2. What is the net percentage change in revenue over the two years?`,
            opts: ["2% increase", "5% increase", "2% decrease", "3.5% increase"],
            correct: 0,
            exp: `Net % change = A + B + (A×B)/100 = 20 - 15 + (20 × -15)/100 = 5 - 3 = +2% increase.`,
            top: "Data Interpretation"
          }
        ];
        const examItem = diExams[(testNum + i) % diExams.length];
        questions.push({
          id: `db-${companyName.toLowerCase().replace(/\s+/g, "-")}-t${testNum}-q${i}`,
          text: examItem.q,
          options: examItem.opts,
          correctIdx: examItem.correct,
          explanation: examItem.exp,
          shortcut: `Successive % formula: A + B + (A*B)/100.`,
          difficulty: diff,
          estimatedTimeSec: 60,
          topic: examItem.top,
          category: "data-interpretation",
          companyTags: [companyName],
          commonMistakes: ["Subtracting 15% from 20% directly to get 5%", "Forgetting balance scale division by 3"]
        });
      }
    } else if (category === "quantitative" || category === "math") {
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
        const hasOnlySingleTopic = questions.length >= 10 && questions.every(q => q.category === questions[0]?.category);
        if (test.category === "company" && hasOnlySingleTopic) {
          questions = generateDefaultTopicTestQuestions(test.topic, "company", test.testNumber);
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

  // Find max test number for topic
  const latestTest = await db.aptitudeTopicTest.findFirst({
    where: { topic: normalizedTopic },
    orderBy: { testNumber: "desc" },
  });

  const nextTestNum = (latestTest?.testNumber || 0) + 1;

  let questions: GeneratedQuestion[] = [];
  try {
    // Attempt AI generation of 30 questions
    if (normalizedCategory === "company") {
      questions = await generateAptitudeQuestions({
        company: normalizedTopic,
        count: 30,
        difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
      });
    } else {
      questions = await generateAptitudeQuestions({
        topic: normalizedTopic,
        category: normalizedCategory as AptitudeCategory,
        count: 30,
        difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
      });
    }
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

const ALL_TOPICS_BY_CATEGORY: Record<string, string[]> = {
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

const ALL_COMPANY_IDS = [
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

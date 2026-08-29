import { masterPrisma, getUserPrismaFromRequest } from "../utils/prisma";
import { generateAptitudeQuestions, type AptitudeCategory, type Difficulty, type GeneratedQuestion } from "./aptitude-engine.service";

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

export function generateDefaultTopicTestQuestions(topic: string, category: string, testNum: number): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  const count = 30;
  const normalizedCategory = (category || "quantitative").toLowerCase();

  if (normalizedCategory === "company" || normalizedCategory === "company_test") {
    const companyName = (topic || "Placement").trim();
    const seed = getSeedHash(companyName.toUpperCase() + `-TEST-${testNum}`);

    for (let i = 1; i <= count; i++) {
      const isEasy = i <= 10;
      const isHard = i > 20;
      const diff: Difficulty = isEasy ? "easy" : isHard ? "hard" : "medium";
      const qSeed = seed + i * 97;
      const correctIdx = (qSeed + i * 3) % 4;

      let qText = "";
      let correctVal = "";
      let distractors: string[] = [];
      let explanation = "";
      let shortcut = "";
      let qCategory: AptitudeCategory = "quantitative";
      let qTopic = "Quantitative Aptitude";

      const sectionIdx = (i - 1) % 4; // 0: Quant, 1: Logical, 2: Verbal, 3: DI / Analytical

      if (sectionIdx === 0) {
        qCategory = "quantitative";
        const quantVariant = (qSeed + i) % 6;
        if (quantVariant === 0) {
          qTopic = "Percentages & Profit";
          const base = 5000 + ((qSeed * 13) % 25000);
          const p1 = 8 + ((qSeed * 7) % 20);
          const p2 = 4 + ((qSeed * 3) % 15);
          const ans = Math.round(base * (1 + p1 / 100) * (1 - p2 / 100));
          qText = `[${companyName} Exam Pattern] A department budget of ₹${base} for ${companyName} project operations was increased by ${p1}% in Quarter-1 and then reduced by ${p2}% in Quarter-2. What is the final allocation?`;
          correctVal = `₹${ans}`;
          distractors = [`₹${ans + 350}`, `₹${ans - 240}`, `₹${ans + 750}`];
          explanation = `Base = ₹${base}. Q1 = ₹${base} × ${(1 + p1 / 100).toFixed(2)}. Q2 = Q1 × ${(1 - p2 / 100).toFixed(2)} = ₹${ans}.`;
          shortcut = `Successive % change: Base × (1 + ${p1}/100) × (1 - ${p2}/100).`;
        } else if (quantVariant === 1) {
          qTopic = "Time Speed & Distance";
          const dist = 180 + ((qSeed * 11) % 320);
          const timeHrs = 3 + ((qSeed * 5) % 5);
          const speed = Math.round(dist / timeHrs);
          qText = `[${companyName} Exam Pattern] A shuttle vehicle traveling between ${companyName} offices covers ${dist} km in ${timeHrs} hours. Calculate its average speed.`;
          correctVal = `${speed} km/hr`;
          distractors = [`${speed + 12} km/hr`, `${speed - 8} km/hr`, `${speed + 20} km/hr`];
          explanation = `Speed = Distance / Time = ${dist} / ${timeHrs} = ${speed} km/hr.`;
          shortcut = `Direct S = D / T calculation.`;
        } else if (quantVariant === 2) {
          qTopic = "Time & Work";
          const daysA = 10 + ((qSeed * 3) % 15);
          const daysB = 15 + ((qSeed * 7) % 20);
          const combined = Number(((daysA * daysB) / (daysA + daysB)).toFixed(1));
          qText = `[${companyName} Exam Pattern] Developer A can build a feature in ${daysA} days and Developer B in ${daysB} days. How long will they take working together?`;
          correctVal = `${combined} days`;
          distractors = [`${(combined + 2.1).toFixed(1)} days`, `${Math.max(1, combined - 1.4).toFixed(1)} days`, `${(combined + 3.8).toFixed(1)} days`];
          explanation = `Combined work rate = 1/${daysA} + 1/${daysB} = (${daysA + daysB})/${daysA * daysB}. Time = ${daysA * daysB}/${daysA + daysB} = ${combined} days.`;
          shortcut = `Product / Sum formula: (A × B) / (A + B).`;
        } else if (quantVariant === 3) {
          qTopic = "Compound Interest";
          const P = 10000 + ((qSeed * 17) % 20000);
          const amt = Math.round(P * 1.21);
          qText = `[${companyName} Exam Pattern] An investment of ₹${P} in a corporate fund earns 10% per annum compound interest. What is the total amount after 2 years?`;
          correctVal = `₹${amt}`;
          distractors = [`₹${P + P * 0.20}`, `₹${amt + 450}`, `₹${amt - 300}`];
          explanation = `A = P(1 + r/100)^n = ${P} × (1.10)^2 = ${P} × 1.21 = ₹${amt}.`;
          shortcut = `For 2 years at 10%, effective CI is 21%. Amt = P × 1.21.`;
        } else if (quantVariant === 4) {
          qTopic = "Ratio & Proportion";
          const total = 120 + ((qSeed * 19) % 240);
          const rA = 3;
          const rB = 5;
          const shareB = Math.round(total * (rB / (rA + rB)));
          qText = `[${companyName} Exam Pattern] A bonus pool of ₹${total * 1000} is divided between Team A and Team B in the ratio ${rA}:${rB}. What is Team B's allocation?`;
          correctVal = `₹${shareB * 1000}`;
          distractors = [`₹${(total - shareB) * 1000}`, `₹${(shareB + 15) * 1000}`, `₹${(shareB - 20) * 1000}`];
          explanation = `Team B share = ${rB}/(${rA} + ${rB}) × ${total * 1000} = ${rB}/8 × ${total * 1000} = ₹${shareB * 1000}.`;
          shortcut = `Ratio fraction: 5/8 of total.`;
        } else {
          qTopic = "Averages";
          const n = 6;
          const avg = 75 + ((qSeed * 3) % 20);
          const newScore = 95;
          const newAvg = Number((((n * avg) + newScore) / (n + 1)).toFixed(1));
          qText = `[${companyName} Exam Pattern] The average score of ${n} candidates in a ${companyName} screening is ${avg}. If a 7th candidate scoring 95 is added, what is the new average?`;
          correctVal = `${newAvg}`;
          distractors = [`${(newAvg + 2.5).toFixed(1)}`, `${(newAvg - 1.8).toFixed(1)}`, `${(newAvg + 4.2).toFixed(1)}`];
          explanation = `Total = ${n} × ${avg} = ${n * avg}. New sum = ${n * avg} + 95. New Avg = Sum / 7 = ${newAvg}.`;
          shortcut = `Deviation method: Add (95 - ${avg}) / 7 to old average.`;
        }
      } else if (sectionIdx === 1) {
        qCategory = "logical";
        const logVariant = (qSeed + i) % 5;
        if (logVariant === 0) {
          qTopic = "Coding-Decoding";
          qText = `[${companyName} Exam Pattern] In a ${companyName} cipher, if "DATA" is written as "FCVC" (+2 shift), how is "SERVER" encoded under the same rule?`;
          correctVal = "UFTWGT";
          distractors = ["TFSUFS", "UGTWGU", "RESDDQ"];
          explanation = `Each letter is shifted forward by +2 positions in the alphabet: S->U, E->G, R->T, V->X...`;
          shortcut = `Apply +2 alphabet offset.`;
        } else if (logVariant === 1) {
          qTopic = "Blood Relations";
          qText = `[${companyName} Exam Pattern] Pointing to a team member, Anita said, "His father is the only son of my grandfather." How is Anita related to the team member?`;
          correctVal = "Sister";
          distractors = ["Mother", "Aunt", "Cousin"];
          explanation = `"Only son of my grandfather" = Anita's father. The person's father is Anita's father, so they are siblings. Anita is his sister.`;
          shortcut = `Grandfather's only son = Father.`;
        } else if (logVariant === 2) {
          qTopic = "Seating Arrangement";
          qText = `[${companyName} Exam Pattern] Five engineers (A, B, C, D, E) sit in a row facing North. C is sitting in the middle. A is to the immediate right of C. B is at the extreme left end. Who is sitting immediately to the left of C?`;
          correctVal = "D or E (neither A nor B)";
          distractors = ["A", "B", "Cannot be determined"];
          explanation = `Positions 1 to 5: Pos 3 is C. Pos 4 is A. Pos 1 is B. Pos 2 must be D or E. Thus immediately left of C is Pos 2 (D or E).`;
          shortcut = `Map linear indices 1, 2, 3, 4, 5.`;
        } else if (logVariant === 3) {
          qTopic = "Number Series";
          const start = 4 + ((qSeed * 7) % 10);
          const diffVal = 3 + ((qSeed * 2) % 5);
          const t1 = start;
          const t2 = t1 + diffVal;
          const t3 = t2 + diffVal * 2;
          const t4 = t3 + diffVal * 3;
          const t5 = t4 + diffVal * 4;
          qText = `[${companyName} Exam Pattern] Find the missing term in the sequence: ${t1}, ${t2}, ${t3}, ${t4}, ?`;
          correctVal = `${t5}`;
          distractors = [`${t4 + diffVal * 3}`, `${t5 + 5}`, `${t5 - 4}`];
          explanation = `Differences between terms increase as multiples of ${diffVal}: +${diffVal}, +${diffVal * 2}, +${diffVal * 3}, +${diffVal * 4}. Next term = ${t4} + ${diffVal * 4} = ${t5}.`;
          shortcut = `Second-order difference pattern.`;
        } else {
          qTopic = "Syllogisms";
          qText = `[${companyName} Exam Pattern] Statements: All servers are nodes. All nodes are endpoints. Conclusions: I. All servers are endpoints. II. Some endpoints are nodes.`;
          correctVal = "Both conclusions I and II follow";
          distractors = ["Only conclusion I follows", "Only conclusion II follows", "Neither conclusion follows"];
          explanation = `Since Servers ⊆ Nodes ⊆ Endpoints, all servers are endpoints (I is true) and some endpoints are nodes (II is true).`;
          shortcut = `Universal transitive inclusion: All A in B and All B in C implies All A in C.`;
        }
      } else if (sectionIdx === 2) {
        qCategory = "verbal";
        const verbVariant = (qSeed + i) % 4;
        if (verbVariant === 0) {
          qTopic = "Grammar & Subject-Verb Agreement";
          qText = `[${companyName} Exam Pattern] Select the grammatically correct sentence for professional communication:`;
          correctVal = `Neither the project lead nor the engineers were aware of the system crash.`;
          distractors = [
            `Neither the project lead nor the engineers was aware of the system crash.`,
            `Neither the project lead or the engineers were aware of the system crash.`,
            `Neither the project lead nor the engineer were aware of the system crash.`
          ];
          explanation = `With 'neither... nor', the verb agrees with the closer subject ('engineers' -> plural verb 'were').`;
          shortcut = `Rule of proximity for neither/nor.`;
        } else if (verbVariant === 1) {
          qTopic = "Vocabulary & Antonyms";
          qText = `[${companyName} Exam Pattern] Select the word that is most opposite in meaning (Antonym) to "METICULOUS":`;
          correctVal = "Careless";
          distractors = ["Thorough", "Precise", "Detailed"];
          explanation = `"Meticulous" means showing great attention to detail. Its antonym is "Careless".`;
          shortcut = `Meticulous = Diligent. Antonym = Careless.`;
        } else if (verbVariant === 2) {
          qTopic = "Para Jumbles";
          qText = `[${companyName} Exam Pattern] Rearrange parts P, Q, R, S: P: to enhance security / Q: the authentication service / R: has been updated / S: with multi-factor support`;
          correctVal = "Q-R-S-P";
          distractors = ["P-Q-R-S", "R-S-P-Q", "S-P-Q-R"];
          explanation = `Subject (Q: the authentication service) + Verb (R: has been updated) + Modifier (S: with multi-factor support) + Purpose (P: to enhance security) -> Q-R-S-P.`;
          shortcut = `Identify subject-verb core sequence (Q-R).`;
        } else {
          qTopic = "Sentence Correction";
          qText = `[${companyName} Exam Pattern] Identify the phrase that best replaces the underlined segment: "The system performance had *drastic degraded* after the update."`;
          correctVal = "degraded drastically";
          distractors = ["drastically degrading", "drastic degradation", "degraded drastic"];
          explanation = `An adverb ("drastically") is required to modify the verb ("degraded").`;
          shortcut = `Verb modification requires an adverb.`;
        }
      } else {
        qCategory = "data-interpretation";
        const diVariant = (qSeed + i) % 4;
        if (diVariant === 0) {
          qTopic = "Data Interpretation - Revenue";
          const r1 = 120 + ((qSeed * 5) % 80);
          const r2 = 150 + ((qSeed * 9) % 100);
          const pct = Math.round(((r2 - r1) / r1) * 100);
          qText = `[${companyName} Exam Pattern] A ${companyName} business unit reported revenue of ₹${r1} Cr in Year 1 and ₹${r2} Cr in Year 2. What was the percentage growth?`;
          correctVal = `${pct}%`;
          distractors = [`${pct + 6}%`, `${pct - 4}%`, `${pct + 12}%`];
          explanation = `% Growth = ((Year 2 - Year 1) / Year 1) × 100 = ((${r2} - ${r1}) / ${r1}) × 100 = ${pct}%.`;
          shortcut = `Growth % = (Diff / Base) × 100.`;
        } else if (diVariant === 1) {
          qTopic = "Data Interpretation - Pie Chart";
          const totalEmp = 1000 + ((qSeed * 13) % 2000);
          const deptPct = 25;
          const countEmp = Math.round(totalEmp * (deptPct / 100));
          qText = `[${companyName} Exam Pattern] In a pie chart showing ${companyName}'s workforce distribution, the Cloud division accounts for ${deptPct}% of total ${totalEmp} employees. How many employees work in Cloud?`;
          correctVal = `${countEmp}`;
          distractors = [`${countEmp + 50}`, `${countEmp - 40}`, `${countEmp + 100}`];
          explanation = `Count = ${deptPct}% of ${totalEmp} = 0.25 × ${totalEmp} = ${countEmp}.`;
          shortcut = `25% = 1/4 of Total.`;
        } else if (diVariant === 2) {
          qTopic = "Critical Reasoning";
          qText = `[${companyName} Exam Pattern] Statement: "Deploying automated testing reduced regression bugs by 60%." Which assumption is implicit?`;
          correctVal = "Manual testing previously missed certain regression bugs";
          distractors = [
            "All software bugs are regression bugs",
            "Automated testing completely eliminates human developers",
            "Regression testing is no longer necessary"
          ];
          explanation = `A 60% reduction implies that the previous process (manual testing) was missing bugs that automated testing now catches.`;
          shortcut = `Identify the underlying baseline premise.`;
        } else {
          qTopic = "Logic Puzzle";
          const weighings = 2;
          qText = `[${companyName} Exam Pattern] Out of 9 microchips produced in a ${companyName} lab, 8 weigh identical and 1 is defective (heavier). What is the minimum number of balance scale weighings needed to identify the defective chip?`;
          correctVal = `${weighings} weighings`;
          distractors = ["3 weighings", "1 weighing", "4 weighings"];
          explanation = `Divide 9 chips into 3 groups of 3 (3, 3, 3). Weigh Group 1 vs Group 2. This identifies the heavier group in 1 weighing. Weigh 1 vs 1 from the heavier group (2nd weighing). Total = 2.`;
          shortcut = `Ternary division: 3^2 = 9, so 2 weighings needed.`;
        }
      }

      const opts = shuffleWithOptions(correctVal, distractors, correctIdx);

      questions.push({
        id: `db-${companyName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-t${testNum}-q${i}`,
        text: qText,
        options: opts,
        correctIdx,
        explanation,
        shortcut,
        difficulty: diff,
        estimatedTimeSec: diff === "easy" ? 45 : diff === "hard" ? 90 : 60,
        topic: qTopic,
        category: qCategory,
        companyTags: [companyName],
        commonMistakes: ["Calculation error", "Misinterpreting condition details"]
      });
    }
    return questions;
  }

  // Topic specific non-company test generator
  for (let i = 1; i <= count; i++) {
    const isEasy = i <= 10;
    const isHard = i > 20;
    const diff: Difficulty = isEasy ? "easy" : isHard ? "hard" : "medium";
    const seedVal = getSeedHash(topic + `-T${testNum}-Q${i}`);
    const correctIdx = (seedVal + i) % 4;

    let qText = "";
    let correctVal = "";
    let distractors: string[] = [];
    let explanation = "";

    if (normalizedCategory === "quantitative" || normalizedCategory === "math") {
      const valA = (seedVal % 30) + 10;
      const valB = ((seedVal * 3) % 25) + 5;
      const ans = valA * valB;
      qText = `[${topic} Test ${testNum} - Q${i}] If component A produces ${valA} units/hr and operates for ${valB} hours, what is the total units produced?`;
      correctVal = `${ans} units`;
      distractors = [`${ans + 25} units`, `${ans - 18} units`, `${ans + 60} units`];
      explanation = `Total units = Rate × Time = ${valA} × ${valB} = ${ans} units.`;
    } else if (normalizedCategory === "logical") {
      const start = (seedVal % 15) + 2;
      const mult = 2;
      const ans = start * Math.pow(mult, 3);
      qText = `[${topic} Test ${testNum} - Q${i}] Find the next number in the pattern: ${start}, ${start * 2}, ${start * 4}, ?`;
      correctVal = `${ans}`;
      distractors = [`${ans - 4}`, `${ans + 8}`, `${ans + 12}`];
      explanation = `Pattern multiplies by 2 each step. Next term = ${start * 4} × 2 = ${ans}.`;
    } else if (normalizedCategory === "verbal") {
      qText = `[${topic} Test ${testNum} - Q${i}] Choose the most appropriate word to complete: "The team approached the audit _______ to ensure complete accuracy."`;
      correctVal = "meticulously";
      distractors = ["hastily", "reluctantly", "carelessly"];
      explanation = `"Meticulously" means with great care and precision, matching the context of accuracy.`;
    } else {
      const baseVal = (seedVal % 80) + 100;
      const inc = 20;
      const finalVal = Math.round(baseVal * 1.2);
      qText = `[${topic} Test ${testNum} - Q${i}] Data point baseline is ${baseVal}. If it increases by ${inc}%, what is the updated value?`;
      correctVal = `${finalVal}`;
      distractors = [`${finalVal + 10}`, `${finalVal - 8}`, `${finalVal + 25}`];
      explanation = `Updated value = ${baseVal} × (1 + 20/100) = ${baseVal} × 1.2 = ${finalVal}.`;
    }

    const opts = shuffleWithOptions(correctVal, distractors, correctIdx);

    questions.push({
      id: `db-${topic.toLowerCase().replace(/[^a-z0-9]/g, "-")}-t${testNum}-q${i}`,
      text: qText,
      options: opts,
      correctIdx,
      explanation,
      shortcut: "Standard formula application.",
      difficulty: diff,
      estimatedTimeSec: diff === "easy" ? 45 : diff === "hard" ? 90 : 60,
      topic,
      category: (normalizedCategory as AptitudeCategory) || "quantitative",
      companyTags: ["Placement"],
      commonMistakes: ["Calculation slip", "Reading error"]
    });
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
        const hasLegacyDuplicate = questions.some(q => q.text?.includes("A sum of ₹") || q.text?.includes("A train 120m") || q.text?.includes("SYSMET") || q.text?.includes("temporarily busy"));
        if (test.category === "company" && (hasOnlySingleTopic || hasLegacyDuplicate)) {
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
    // Attempt AI generation of 30 questions for this test number
    if (normalizedCategory === "company") {
      questions = await generateAptitudeQuestions({
        company: normalizedTopic,
        count: 30,
        difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
        testNumber: nextTestNum,
      });
    } else {
      questions = await generateAptitudeQuestions({
        topic: normalizedTopic,
        category: normalizedCategory as AptitudeCategory,
        count: 30,
        difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
        testNumber: nextTestNum,
      });
    }
  } catch {
    questions = generateDefaultTopicTestQuestions(normalizedTopic, normalizedCategory, nextTestNum);
  }

  // Filter out any duplicate questions that already existed in previous tests
  let uniqueQuestions = questions.filter(q => !existingQuestionTexts.has(q.text.toLowerCase().trim()));

  // Fill up to 30 with fallback seeded questions for nextTestNum if needed
  if (uniqueQuestions.length < 30) {
    const fallbackQs = generateDefaultTopicTestQuestions(normalizedTopic, normalizedCategory, nextTestNum);
    for (const fq of fallbackQs) {
      if (uniqueQuestions.length >= 30) break;
      const cleanFq = fq.text.toLowerCase().trim();
      if (!existingQuestionTexts.has(cleanFq) && !uniqueQuestions.some(uq => uq.text.toLowerCase().trim() === cleanFq)) {
        uniqueQuestions.push(fq);
      }
    }
  }

  // Guaranteed offset seed loop to guarantee 30 100% unique questions
  let offsetSeed = nextTestNum + 100;
  while (uniqueQuestions.length < 30) {
    const fallbackQs = generateDefaultTopicTestQuestions(normalizedTopic, normalizedCategory, offsetSeed++);
    for (const fq of fallbackQs) {
      if (uniqueQuestions.length >= 30) break;
      const cleanFq = fq.text.toLowerCase().trim();
      if (!existingQuestionTexts.has(cleanFq) && !uniqueQuestions.some(uq => uq.text.toLowerCase().trim() === cleanFq)) {
        uniqueQuestions.push(fq);
      }
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

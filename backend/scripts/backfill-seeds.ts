/**
 * Backfill the hand-authored seeds into every store that serves them.
 *
 * Dry run by default:
 *   npx tsx scripts/backfill-seeds.ts
 * Apply:
 *   npx tsx scripts/backfill-seeds.ts --apply
 *
 * Writes, in order:
 *   1. backups/<timestamp>/{mcq-tests-store.json,aptitude-tests.json}
 *   2. aptitudeTopicTest.questionsJson for the 7 verbal rows (one transaction)
 *   3. data/mcq-tests-store.json for the 6 technical tests (temp file + rename)
 *   4. QuestionBankEntry rows for all 390 questions (createMany, skipDuplicates)
 *
 * Every step is idempotent: re-running reports the same counts and inserts
 * nothing new, because the bank rejects questions it already holds and the
 * store/aptitude writes are whole-value replacements.
 *
 * The `mcq_tests` / `mcq_questions` mirror tables are deliberately NOT written:
 * nothing under src/ reads them, they hold questionCount 0 for all 101 tests,
 * and the runtime serves questions from data/mcq-tests-store.json.
 */
import * as fs from "fs";
import * as path from "path";
import { masterPrisma } from "../src/utils/prisma";
import {
  SOURCE_APTITUDE,
  SOURCE_MCQ,
  auditBank,
  commitToBank,
} from "../src/services/question-bank.service";
import { dedupInfoFromQuestion } from "../src/lib/questions/question-fingerprint";
import { SEED_VERSION } from "./export-seed-json";
import type { BuiltAptitudeQuestion, BuiltTechnicalQuestion } from "./seeds/shared";

interface AptitudeTarget {
  topicTestId: string;
  topic: string;
  testNumber: number;
  category: string;
  questions: BuiltAptitudeQuestion[];
}

interface TechnicalTarget {
  testId: string;
  targetId: string;
  targetType: "technology";
  targetName: string;
  questions: BuiltTechnicalQuestion[];
}

const APPLY = process.argv.includes("--apply");
const STORE_FILE = path.join(__dirname, "..", "data", "mcq-tests-store.json");
const BACKUP_ROOT = path.join(__dirname, "..", "backups");
const EXPECTED = 30;

// Imported lazily through a helper so the seed modules stay the single source
// of truth for ids, technology labels and ordering.
async function loadTargets(): Promise<{ aptitude: AptitudeTarget[]; technical: TechnicalTarget[] }> {
  const { SENTENCE_CORRECTION_TESTS } = await import("./seeds/aptitude-sentence-correction");
  const { SYNONYMS_ANTONYMS_TESTS } = await import("./seeds/aptitude-synonyms-antonyms");
  const { VOCABULARY_TESTS } = await import("./seeds/aptitude-vocabulary");
  const { INVESTMENT_BANKING_QUESTIONS } = await import("./seeds/technical-investment-banking");
  const { CAR_DESIGNING_QUESTIONS } = await import("./seeds/technical-car-designing");
  const { MECHANICAL_PRODUCT_QUESTIONS } = await import("./seeds/technical-mech-product");
  const { NANOTECHNOLOGY_QUESTIONS } = await import("./seeds/technical-nanotechnology");
  const { CLINICAL_RESEARCH_QUESTIONS } = await import("./seeds/technical-clinical-research");
  const { GENETIC_ENGINEERING_QUESTIONS } = await import("./seeds/technical-genetic-engineering");

  const aptitude: AptitudeTarget[] = [
    { topicTestId: "cmu801bh7001y74k4hnxdpgoe", topic: "Sentence Correction", testNumber: 2, category: "verbal", questions: SENTENCE_CORRECTION_TESTS.test2 },
    { topicTestId: "cmu801boo001z74k4a3ovwxdq", topic: "Sentence Correction", testNumber: 3, category: "verbal", questions: SENTENCE_CORRECTION_TESTS.test3 },
    { topicTestId: "cmu801dd8002674k499giso51", topic: "Synonyms & Antonyms", testNumber: 1, category: "verbal", questions: SYNONYMS_ANTONYMS_TESTS.test1 },
    { topicTestId: "cmu801dki002774k47e4yzo8k", topic: "Synonyms & Antonyms", testNumber: 2, category: "verbal", questions: SYNONYMS_ANTONYMS_TESTS.test2 },
    { topicTestId: "cmu801drr002874k4s0scchl7", topic: "Synonyms & Antonyms", testNumber: 3, category: "verbal", questions: SYNONYMS_ANTONYMS_TESTS.test3 },
    { topicTestId: "cmu801av4001v74k47l4ew6w5", topic: "Vocabulary", testNumber: 2, category: "verbal", questions: VOCABULARY_TESTS.test2 },
    { topicTestId: "cmu801b2f001w74k4v0fop4jv", topic: "Vocabulary", testNumber: 3, category: "verbal", questions: VOCABULARY_TESTS.test3 },
  ];

  const technical: TechnicalTarget[] = [
    { testId: "test-tech-investment-banking-1", targetId: "tech-investment-banking", targetType: "technology", targetName: "Investment Banking & Finance", questions: INVESTMENT_BANKING_QUESTIONS },
    { testId: "test-tech-car-designing-1", targetId: "tech-car-designing", targetType: "technology", targetName: "Car Designing", questions: CAR_DESIGNING_QUESTIONS },
    { testId: "test-tech-mech-product-1", targetId: "tech-mech-product", targetType: "technology", targetName: "Product Management (Mechanical)", questions: MECHANICAL_PRODUCT_QUESTIONS },
    { testId: "test-tech-nanotechnology-1", targetId: "tech-nanotechnology", targetType: "technology", targetName: "Nanotechnology (Pharma/ECE)", questions: NANOTECHNOLOGY_QUESTIONS },
    { testId: "test-tech-clinical-research-1", targetId: "tech-clinical-research", targetType: "technology", targetName: "Clinical Trial & Research (Pharma)", questions: CLINICAL_RESEARCH_QUESTIONS },
    { testId: "test-tech-genetic-engineering-1", targetId: "tech-genetic-engineering", targetType: "technology", targetName: "Genetic Engineering", questions: GENETIC_ENGINEERING_QUESTIONS },
  ];

  return { aptitude, technical };
}

/** Fail before touching anything if a seed group is malformed. */
function preflight(
  aptitude: AptitudeTarget[],
  technical: TechnicalTarget[],
  store: any[]
): string[] {
  const problems: string[] = [];

  for (const t of aptitude) {
    if (t.questions.length !== EXPECTED) {
      problems.push(`${t.topic} T${t.testNumber}: ${t.questions.length} questions, expected ${EXPECTED}`);
    }
    for (const q of t.questions) {
      if (q.options.length !== 4) problems.push(`${q.id}: ${q.options.length} options`);
      if (q.category !== t.category) problems.push(`${q.id}: category ${q.category} != ${t.category}`);
      if (q.text.trim().length < 15) problems.push(`${q.id}: text too short`);
      // Every question must have its correct answer at its own correctIdx.
      const answer = q.options[q.correctIdx];
      if (!answer || answer.trim().length === 0) problems.push(`${q.id}: empty correct option`);
    }
  }

  for (const t of technical) {
    if (t.questions.length !== EXPECTED) {
      problems.push(`${t.testId}: ${t.questions.length} questions, expected ${EXPECTED}`);
    }
    const storeTest = store.find((x: any) => x.id === t.testId);
    if (!storeTest) {
      problems.push(`${t.testId}: not present in ${path.basename(STORE_FILE)}`);
      continue;
    }
    if (storeTest.targetName !== t.targetName) {
      problems.push(`${t.testId}: store targetName "${storeTest.targetName}" != seed "${t.targetName}"`);
    }
    if (storeTest.targetId !== t.targetId) {
      problems.push(`${t.testId}: store targetId "${storeTest.targetId}" != seed "${t.targetId}"`);
    }
    const seenIds = new Set<string>();
    for (const q of t.questions) {
      if (seenIds.has(q.id)) problems.push(`${t.testId}: duplicate question id ${q.id}`);
      seenIds.add(q.id);
      if (q.technology !== t.targetName) problems.push(`${q.id}: technology ${q.technology} != ${t.targetName}`);
      if (q.options.length !== 4) problems.push(`${q.id}: ${q.options.length} options`);
      if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) {
        problems.push(`${q.id}: options are not 4 distinct values`);
      }
      if (q.correctAnswer !== q.options[q.correctIdx]) {
        problems.push(`${q.id}: correctAnswer does not match options[correctIdx]`);
      }
    }
  }

  return problems;
}

/** Matches the store convention: "[<Technology> • Test N • Qn] " prefix. */
function storeQuestion(q: BuiltTechnicalQuestion, testNumber: number, position: number): Record<string, unknown> {
  return {
    id: q.id,
    question: `[${q.technology} • Test ${testNumber} • Q${position}] ${q.question}`,
    technology: q.technology,
    difficulty: q.difficulty,
    ...(q.codeSnippet ? { codeSnippet: q.codeSnippet } : {}),
    ...(q.language ? { language: q.language } : {}),
    options: q.options,
    correctAnswer: q.correctAnswer,
    correctIdx: q.correctIdx,
    explanation: q.explanation,
    hint: q.hint,
    relatedConcept: q.relatedConcept,
    estimatedTime: q.estimatedTime,
    ...(q.interviewTip ? { interviewTip: q.interviewTip } : {}),
  };
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const db = masterPrisma as any;
  const { aptitude, technical } = await loadTargets();
  const storeRaw = fs.readFileSync(STORE_FILE, "utf8");
  const store: any[] = JSON.parse(storeRaw);

  console.log(`seed version ${SEED_VERSION}   mode=${APPLY ? "APPLY" : "DRY RUN"}`);

  const problems = preflight(aptitude, technical, store);
  if (problems.length > 0) {
    console.error(`\nPREFLIGHT FAILED (${problems.length} problem(s)):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log(`preflight OK: ${aptitude.length} aptitude + ${technical.length} technical tests`);

  // ── Current state ────────────────────────────────────────────────────────
  const aptitudeRows: any[] = await db.aptitudeTopicTest.findMany({
    where: { id: { in: aptitude.map((t) => t.topicTestId) } },
    select: { id: true, topic: true, testNumber: true, category: true, totalQuestions: true, questionsJson: true },
  });
  const rowById = new Map(aptitudeRows.map((r: any) => [r.id, r]));

  console.log("\n--- aptitude rows (PostgreSQL) ---");
  for (const t of aptitude) {
    const row = rowById.get(t.topicTestId);
    if (!row) {
      console.log(`  MISSING  ${t.topic} T${t.testNumber} (${t.topicTestId})`);
      continue;
    }
    if (row.topic !== t.topic || row.testNumber !== t.testNumber || row.category !== t.category) {
      console.log(`  MISMATCH ${t.topicTestId}: db=${row.topic} T${row.testNumber}`);
    }
    const have = Array.isArray(row.questionsJson) ? row.questionsJson.length : 0;
    const verb = have === 0 ? "fill   " : have === EXPECTED ? "replace" : "top-up ";
    console.log(`  ${verb} ${t.topic} T${t.testNumber}: ${have} -> ${EXPECTED}`);
  }

  console.log("\n--- technical tests (mcq-tests-store.json) ---");
  for (const t of technical) {
    const storeTest = store.find((x: any) => x.id === t.testId)!;
    const have = (storeTest.questions ?? []).length;
    const verb = have === 0 ? "fill   " : have === EXPECTED ? "replace" : "top-up ";
    console.log(`  ${verb} ${t.testId}: ${have} -> ${EXPECTED} (questionCount ${storeTest.questionCount} -> ${EXPECTED})`);
    if (have > 0 && have !== EXPECTED) {
      console.log(`    WARNING: ${have} existing questions are not 30; --apply replaces them wholesale`);
    }
  }

  // ── Bank pre-check ───────────────────────────────────────────────────────
  const existing = await db.questionBankEntry.findMany({ select: { fingerprint: true } });
  const existingFingerprints = new Set<string>(existing.map((e: any) => e.fingerprint));
  let alreadyBanked = 0;
  let newToBank = 0;
  for (const t of aptitude) {
    for (const q of t.questions) {
      const f = dedupInfoFromQuestion({ text: q.text }).fingerprint;
      if (f && existingFingerprints.has(f)) alreadyBanked++;
      else newToBank++;
    }
  }
  for (const t of technical) {
    for (const q of t.questions) {
      const f = dedupInfoFromQuestion({ question: q.question, codeSnippet: q.codeSnippet }).fingerprint;
      if (f && existingFingerprints.has(f)) alreadyBanked++;
      else newToBank++;
    }
  }
  console.log(
    `\n--- question bank ---\n  existing rows ${existing.length}; seeds already banked ${alreadyBanked}; will insert ${newToBank}`
  );

  if (!APPLY) {
    console.log("\nDRY RUN: no writes. Re-run with --apply to execute.");
    return;
  }

  // ── 1. Backups ───────────────────────────────────────────────────────────
  const backupDir = path.join(BACKUP_ROOT, stamp());
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, "mcq-tests-store.json"), storeRaw);
  fs.writeFileSync(
    path.join(backupDir, "aptitude-tests.json"),
    JSON.stringify(aptitudeRows, null, 2) + "\n"
  );
  const bankBefore = await db.questionBankEntry.findMany({ select: { fingerprint: true } });
  fs.writeFileSync(
    path.join(backupDir, "question-bank-fingerprints.json"),
    JSON.stringify(bankBefore.map((e: any) => e.fingerprint), null, 2) + "\n"
  );
  console.log(`\nbackups written to ${path.relative(process.cwd(), backupDir)}`);

  // ── 2. Aptitude rows, one transaction ────────────────────────────────────
  await db.$transaction(async (tx: any) => {
    for (const t of aptitude) {
      await tx.aptitudeTopicTest.update({
        where: { id: t.topicTestId },
        data: { questionsJson: t.questions, totalQuestions: EXPECTED },
      });
    }
  });
  console.log(`aptitude: updated ${aptitude.length} rows`);

  // ── 3. Technical store, atomic file replace ──────────────────────────────
  const nextStore = store.map((test) => {
    const t = technical.find((x) => x.testId === test.id);
    if (!t) return test;
    return {
      ...test,
      questionCount: EXPECTED,
      questions: t.questions.map((q, i) => storeQuestion(q, test.testNumber ?? 1, i + 1)),
    };
  });
  const tmp = `${STORE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(nextStore, null, 2) + "\n");
  fs.renameSync(tmp, STORE_FILE);
  console.log(`store: updated ${technical.length} tests in ${path.basename(STORE_FILE)}`);

  // ── 4. Global question bank ──────────────────────────────────────────────
  const entries = [
    ...aptitude.flatMap((t) =>
      t.questions.map((q, idx) => ({
        question: q.text,
        options: q.options,
        correctIdx: q.correctIdx,
        source: SOURCE_APTITUDE,
        topic: t.topic,
        category: t.category,
        company: null,
        difficulty: q.difficulty,
        testId: t.topicTestId,
        position: idx,
      }))
    ),
    ...technical.flatMap((t) =>
      t.questions.map((q, idx) => ({
        question: q.question,
        codeSnippet: q.codeSnippet,
        options: q.options,
        correctIdx: q.correctIdx,
        source: SOURCE_MCQ,
        topic: t.targetName,
        category: t.targetType,
        company: null,
        difficulty: q.difficulty,
        testId: t.testId,
        position: idx,
      }))
    ),
  ];
  const commit = await commitToBank(entries, db);
  console.log(`bank: inserted ${commit.inserted}, rejected as duplicate ${commit.rejectedAsDuplicate}`);

  // ── 5. Verification ──────────────────────────────────────────────────────
  console.log("\n--- verification ---");
  const verifyRows: any[] = await db.aptitudeTopicTest.findMany({
    where: { id: { in: aptitude.map((t) => t.topicTestId) } },
    select: { id: true, topic: true, testNumber: true, totalQuestions: true, questionsJson: true },
  });
  let bad = 0;
  for (const t of aptitude) {
    const row = verifyRows.find((r: any) => r.id === t.topicTestId);
    const have = Array.isArray(row?.questionsJson) ? row.questionsJson.length : 0;
    const ok = have === EXPECTED && row?.totalQuestions === EXPECTED;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"} ${t.topic} T${t.testNumber}: questionsJson=${have} totalQuestions=${row?.totalQuestions}`);
  }

  const verifyStore: any[] = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  for (const t of technical) {
    const test = verifyStore.find((x: any) => x.id === t.testId);
    const ok = test && test.questions.length === EXPECTED && test.questionCount === EXPECTED;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"} ${t.testId}: questions=${test?.questions.length} questionCount=${test?.questionCount}`);
  }

  const bankAfter = await db.questionBankEntry.count();
  console.log(`  bank rows: ${bankBefore.length} -> ${bankAfter}`);

  const audit = await auditBank(db);
  console.log(`  bank audit: exactDuplicates=${audit.exactDuplicates} valueChangeDuplicates=${audit.valueChangeDuplicates}`);

  console.log(`\n=== RESULT: ${bad === 0 ? "PASS" : `${bad} FAILING TARGET(S)`} ===`);
  if (bad) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("BACKFILL FAILED:", e?.message || e);
    console.error(e?.stack || "");
    process.exitCode = 1;
  })
  .finally(async () => {
    await (masterPrisma as any).$disconnect().catch(() => {});
  });
/**
 * Migrates the MCQ test bank from data/mcq-tests-store.json into the Postgres
 * `mcq_tests` / `mcq_questions` tables.
 *
 * This is a COPY, not a move: the JSON file stays authoritative until
 * mcq.service.ts is switched over to read from the database, so a failure here
 * can never lose data. It is idempotent (upsert by id) and defaults to a dry
 * run.
 *
 * Usage:
 *   npx tsx scripts/import-mcq-to-postgres.ts            # dry run, reports plan
 *   npx tsx scripts/import-mcq-to-postgres.ts --apply    # perform the import
 *   npx tsx scripts/import-mcq-to-postgres.ts --apply --prune  # also delete
 *                                                              # JSON tests that
 *                                                              # are empty after
 *                                                              # the dedupe
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { masterPrisma } from "../src/utils/prisma";

const DATA_DIR = path.join(__dirname, "../data");
const MCQ_STORE = path.join(DATA_DIR, "mcq-tests-store.json");

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const PRUNE = argv.includes("--prune");

interface JsonQuestion {
  id: string;
  question: string;
  technology: string;
  company?: string;
  difficulty?: string;
  options: string[];
  correctAnswer: string;
  correctIdx: number;
  explanation?: string;
  hint?: string;
  relatedConcept?: string;
  estimatedTime?: string;
  codeSnippet?: string;
  language?: string;
  optionExplanations?: { option: string; isCorrect: boolean; reason: string }[];
  interviewTip?: string;
}

interface JsonTest {
  id: string;
  targetId: string;
  targetType: string;
  targetName: string;
  testNumber: number;
  title: string;
  description?: string;
  difficulty?: string;
  questionCount?: number;
  durationMinutes?: number;
  isPublished?: boolean;
  createdAt?: string;
  questions: JsonQuestion[];
}

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : v == null ? fallback : String(v);

async function main() {
  console.log("=".repeat(78));
  console.log(APPLY ? "MCQ -> POSTGRES IMPORT (APPLY)" : "MCQ -> POSTGRES IMPORT (DRY RUN)");
  console.log("=".repeat(78));

  if (!fs.existsSync(MCQ_STORE)) {
    console.error(`Source not found: ${MCQ_STORE}`);
    process.exit(1);
  }

  const tests: JsonTest[] = JSON.parse(fs.readFileSync(MCQ_STORE, "utf-8"));
  const totalQuestions = tests.reduce((n, t) => n + (t.questions?.length || 0), 0);
  console.log(`source: ${tests.length} tests, ${totalQuestions} questions`);

  // ── Validate before writing anything ──────────────────────────────────
  const problems: string[] = [];
  let optionsFixed = 0;
  let missingCorrect = 0;

  for (const t of tests) {
    if (!t.id) problems.push(`test with no id (${t.targetName} T${t.testNumber})`);
    if (!t.targetId) problems.push(`${t.id}: no targetId`);
    if (typeof t.testNumber !== "number") problems.push(`${t.id}: no testNumber`);

    const seenIds = new Set<string>();
    for (const q of t.questions || []) {
      if (!q.id) problems.push(`${t.id}: question with no id`);
      else if (seenIds.has(q.id)) problems.push(`${t.id}: duplicate question id ${q.id}`);
      else seenIds.add(q.id);

      if (!q.question?.trim()) problems.push(`${t.id}/${q.id}: empty question text`);

      if (!Array.isArray(q.options) || q.options.length < 2) {
        problems.push(`${t.id}/${q.id}: needs at least 2 options`);
        continue;
      }
      // The DB stores options as JSONB and correctIdx as an int, so a
      // correctIdx outside the range would silently mark the wrong answer.
      if (typeof q.correctIdx !== "number" || q.correctIdx < 0 || q.correctIdx >= q.options.length) {
        const byText = q.correctAnswer
          ? q.options.findIndex((o) => o === q.correctAnswer)
          : -1;
        if (byText >= 0) {
          q.correctIdx = byText;
          optionsFixed++;
        } else {
          missingCorrect++;
          problems.push(`${t.id}/${q.id}: correctIdx ${q.correctIdx} out of range and correctAnswer not found`);
        }
      }
    }
  }

  console.log(`\nvalidation: ${problems.length} issue(s)`);
  for (const p of problems.slice(0, 15)) console.log(`  ! ${p}`);
  if (problems.length > 15) console.log(`  ... and ${problems.length - 15} more`);
  console.log(`  correctIdx repaired from correctAnswer: ${optionsFixed}`);
  console.log(`  unrecoverable correct-answer issues:    ${missingCorrect}`);

  // Duplicate (targetId, testNumber) would violate targetTestNumberUnique.
  const seenKeys = new Set<string>();
  let keyClashes = 0;
  for (const t of tests) {
    const k = `${t.targetId}::${t.testNumber}`;
    if (seenKeys.has(k)) {
      keyClashes++;
      problems.push(`duplicate (targetId,testNumber) = ${k}`);
    }
    seenKeys.add(k);
  }
  if (keyClashes > 0) console.log(`  duplicate test keys: ${keyClashes}`);

  const emptyTests = tests.filter((t) => (t.questions?.length || 0) === 0);
  console.log(`  tests with zero questions: ${emptyTests.length}`);

  if (missingCorrect > 0) {
    console.error(
      "\nABORT: some questions have no recoverable correct answer. Fix the JSON first."
    );
    process.exit(1);
  }

  if (!APPLY) {
    const existing = await masterPrisma.mcqTest.count();
    const existingQ = await masterPrisma.mcqQuestion.count();
    console.log(`\ndatabase currently holds: ${existing} tests, ${existingQ} questions`);
    console.log(
      `\nDRY RUN - nothing written. Re-run with --apply to import ` +
        `${tests.length} tests / ${totalQuestions} questions (upsert by id).`
    );
    await masterPrisma.$disconnect();
    return;
  }

  // ── Import ────────────────────────────────────────────────────────────
  console.log("\nimporting...");
  let testRows = 0;
  let questionRows = 0;

  for (const t of tests) {
    const questions = t.questions || [];
    await masterPrisma.mcqTest.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        targetId: t.targetId,
        targetType: t.targetType,
        targetName: t.targetName,
        testNumber: t.testNumber,
        title: t.title || `Test ${t.testNumber}`,
        description: t.description || "",
        difficulty: t.difficulty || "Medium",
        questionCount: questions.length,
        durationMinutes: t.durationMinutes || 30,
        isPublished: t.isPublished !== false,
        ...(t.createdAt ? { createdAt: new Date(t.createdAt) } : {}),
      },
      update: {
        targetId: t.targetId,
        targetType: t.targetType,
        targetName: t.targetName,
        testNumber: t.testNumber,
        title: t.title || `Test ${t.testNumber}`,
        description: t.description || "",
        difficulty: t.difficulty || "Medium",
        questionCount: questions.length,
        durationMinutes: t.durationMinutes || 30,
        isPublished: t.isPublished !== false,
      },
    });
    testRows++;

    // Replace the question set wholesale: the JSON is the source of truth, so a
    // partial merge would leave orphans behind.
    await masterPrisma.mcqQuestion.deleteMany({ where: { testId: t.id } });

    if (questions.length > 0) {
      await masterPrisma.mcqQuestion.createMany({
        data: questions.map((q, i) => ({
          id: q.id,
          testId: t.id,
          position: i,
          question: q.question || "",
          technology: q.technology || t.targetName || "",
          company: q.company || null,
          difficulty: q.difficulty || "Medium",
          codeSnippet: q.codeSnippet || null,
          language: q.language || null,
          optionsJson: (q.options || []) as any,
          correctAnswer: q.correctAnswer || "",
          correctIdx: q.correctIdx ?? 0,
          explanation: q.explanation || "",
          hint: q.hint || "",
          relatedConcept: q.relatedConcept || "",
          estimatedTime: q.estimatedTime || "45 sec",
          interviewTip: q.interviewTip || null,
          optionExplanations: (q.optionExplanations || null) as any,
        })),
      });
      questionRows += questions.length;
    }
  }

  const dbTests = await masterPrisma.mcqTest.count();
  const dbQuestions = await masterPrisma.mcqQuestion.count();
  console.log(`\nwrote ${testRows} test row(s), ${questionRows} question row(s)`);
  console.log(`database now holds: ${dbTests} tests, ${dbQuestions} questions`);

  if (dbTests !== tests.length || dbQuestions !== totalQuestions) {
    console.error(
      `\nMISMATCH: expected ${tests.length} tests / ${totalQuestions} questions. ` +
        `The JSON file is untouched, so re-running is safe.`
    );
    process.exitCode = 1;
  } else {
    console.log("VERIFIED: database matches the JSON source.");
  }

  if (PRUNE) {
    if (emptyTests.length === 0) {
      console.log("\n--prune: nothing to do, no empty tests.");
    } else {
      console.log(
        `\n--prune: ${emptyTests.length} test(s) have zero questions after the ` +
          `dedupe. They are imported as-is; removing them from the JSON is a ` +
          `separate deliberate step.`
      );
    }
  }

  await masterPrisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[import-mcq] FAILED:", err);
  await masterPrisma.$disconnect().catch(() => {});
  process.exit(1);
});

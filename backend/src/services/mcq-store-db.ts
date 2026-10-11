/**
 * Postgres persistence for the Technical MCQ store.
 *
 * `mcq.service.ts` keeps the whole store in an in-memory `Map` for cheap
 * synchronous reads. This module is the durable half: it hydrates that map from
 * the `mcq_tests` / `mcq_questions` tables at boot and writes every mutation
 * back, so the JSON file is no longer the source of truth.
 *
 * Why this exists: the store used to live only in `data/mcq-tests-store.json`.
 * On an ephemeral host (Railway) any test generated at runtime was lost on the
 * next deploy, and the `mcq_tests` tables sat stale with 119 of 3,024 questions
 * because nothing ever read them.
 *
 * Every function here is failure-tolerant and returns a falsy value instead of
 * throwing, so a database outage degrades to the JSON file rather than taking
 * the MCQ routes down.
 */
import { masterPrisma } from "../utils/prisma";
import type { MCQQuestion, MCQTest } from "./mcq.service";

/** Guard so one slow/hung query cannot stall the whole boot sequence. */
const DB_BOOT_TIMEOUT_MS = 15_000;

export interface McqDbLoadResult {
  tests: MCQTest[];
  questions: number;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

// ─── Row mapping ─────────────────────────────────────────────────────────────

function rowToQuestion(row: any): MCQQuestion {
  return {
    id: row.id,
    question: row.question ?? "",
    technology: row.technology ?? "",
    company: row.company ?? undefined,
    difficulty: (row.difficulty ?? "Medium") as MCQQuestion["difficulty"],
    options: Array.isArray(row.optionsJson) ? (row.optionsJson as string[]) : [],
    correctAnswer: row.correctAnswer ?? "",
    correctIdx: typeof row.correctIdx === "number" ? row.correctIdx : 0,
    explanation: row.explanation ?? "",
    hint: row.hint ?? "",
    relatedConcept: row.relatedConcept ?? "",
    estimatedTime: row.estimatedTime ?? "45 sec",
    codeSnippet: row.codeSnippet ?? undefined,
    language: row.language ?? undefined,
    optionExplanations: Array.isArray(row.optionExplanations)
      ? (row.optionExplanations as MCQQuestion["optionExplanations"])
      : undefined,
    interviewTip: row.interviewTip ?? undefined,
  };
}

function questionToRow(q: MCQQuestion, testId: string, position: number, test: MCQTest) {
  return {
    id: q.id,
    testId,
    position,
    question: q.question ?? "",
    technology: q.technology || test.targetName || "",
    company: q.company ?? null,
    difficulty: q.difficulty ?? "Medium",
    codeSnippet: q.codeSnippet ?? null,
    language: q.language ?? null,
    optionsJson: (Array.isArray(q.options) ? q.options : []) as any,
    correctAnswer: q.correctAnswer ?? "",
    correctIdx: typeof q.correctIdx === "number" ? q.correctIdx : 0,
    explanation: q.explanation ?? "",
    hint: q.hint ?? "",
    relatedConcept: q.relatedConcept ?? "",
    estimatedTime: q.estimatedTime ?? "45 sec",
    interviewTip: q.interviewTip ?? null,
    optionExplanations: (q.optionExplanations ?? null) as any,
  };
}

function rowToTest(row: any): MCQTest {
  const questions: MCQQuestion[] = Array.isArray(row.questions)
    ? row.questions.map(rowToQuestion)
    : [];
  return {
    id: row.id,
    targetId: row.targetId,
    targetType: row.targetType === "company" ? "company" : "technology",
    targetName: row.targetName,
    testNumber: row.testNumber,
    title: row.title ?? `Test ${row.testNumber}`,
    description: row.description ?? "",
    difficulty: (row.difficulty ?? "Medium") as MCQTest["difficulty"],
    questionCount: questions.length,
    durationMinutes: row.durationMinutes ?? 30,
    isPublished: row.isPublished !== false,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : typeof row.createdAt === "string"
          ? row.createdAt
          : new Date().toISOString(),
    questions,
  };
}

function testToRow(t: MCQTest) {
  return {
    id: t.id,
    targetId: t.targetId,
    targetType: t.targetType,
    targetName: t.targetName,
    testNumber: t.testNumber,
    title: t.title || `Test ${t.testNumber}`,
    description: t.description || "",
    difficulty: t.difficulty || "Medium",
    questionCount: Array.isArray(t.questions) ? t.questions.length : 0,
    durationMinutes: t.durationMinutes || 30,
    isPublished: t.isPublished !== false,
  };
}

// ─── Reads ───────────────────────────────────────────────────────────────────

/**
 * Load the entire store from Postgres.
 *
 * Returns `null` — never throws — when the database is unreachable, the
 * `mcq_tests` migration has not been applied, or the tables are empty. The
 * caller must treat `null` as "fall back to the JSON file".
 */
export async function loadTestsFromDb(): Promise<McqDbLoadResult | null> {
  try {
    const rows = await withTimeout(
      (masterPrisma as any).mcqTest.findMany({
        include: { questions: { orderBy: { position: "asc" } } },
        orderBy: [{ targetType: "asc" }, { targetName: "asc" }, { testNumber: "asc" }],
      }),
      DB_BOOT_TIMEOUT_MS,
      "mcqTest.findMany"
    );

    if (!Array.isArray(rows) || rows.length === 0) return null;

    const tests = rows.map(rowToTest);
    const questions = tests.reduce((sum, t) => sum + t.questions.length, 0);
    return { tests, questions };
  } catch (err) {
    console.warn(
      "[MCQ-DB] load failed, falling back to the JSON store:",
      (err as Error)?.message || err
    );
    return null;
  }
}

// ─── Writes ──────────────────────────────────────────────────────────────────

async function writeTest(t: MCQTest): Promise<void> {
  const row = testToRow(t);

  await (masterPrisma as any).mcqTest.upsert({
    where: { id: t.id },
    create: {
      ...row,
      ...(t.createdAt ? { createdAt: new Date(t.createdAt) } : {}),
    },
    update: row,
  });

  // Replace the question set wholesale. The in-memory test is the source of
  // truth for its own contents, so a partial merge would leave orphans behind.
  await (masterPrisma as any).mcqQuestion.deleteMany({ where: { testId: t.id } });

  const questions = withUniqueIds(t);
  if (questions.length === 0) return;

  await (masterPrisma as any).mcqQuestion.createMany({
    data: questions.map((q, i) => questionToRow(q, t.id, i, t)),
  });
}

/**
 * Guarantee every question id is unique inside its test.
 *
 * `mcq_questions.id` is the primary key, so one collision aborts the whole
 * `createMany` and leaves the test with *zero* rows — the failure mode that
 * left 80 of 101 tests empty. Fifteen real collisions of this kind existed in
 * the store; the id generator has since been fixed, but re-numbering here means
 * no future collision can ever cost a test its entire question set.
 */
function withUniqueIds(t: MCQTest): MCQQuestion[] {
  const seen = new Set<string>();
  let renumbered = 0;

  const fixed = (Array.isArray(t.questions) ? t.questions : []).map((q, i) => {
    let id = typeof q.id === "string" && q.id.trim().length > 0 ? q.id : `${t.id}-q${i + 1}`;
    if (seen.has(id)) {
      let n = 2;
      while (seen.has(`${id}#${n}`)) n++;
      id = `${id}#${n}`;
      renumbered++;
    }
    seen.add(id);
    return q.id === id ? q : { ...q, id };
  });

  if (renumbered > 0) {
    console.warn(
      `[MCQ-DB] ${t.id}: renumbered ${renumbered} duplicate question id(s) on write.`
    );
  }

  return fixed;
}

/**
 * Upsert a single test and its questions. Idempotent, so it is safe to call on
 * every mutation and safe to retry after a partial failure.
 */
export async function persistTestToDb(test: MCQTest): Promise<boolean> {
  try {
    await writeTest(test);
    return true;
  } catch (err) {
    console.error(
      `[MCQ-DB] failed to persist test ${test?.id}:`,
      (err as Error)?.message || err
    );
    return false;
  }
}

/** Upsert many tests. Used by the boot-time reconciliation and bulk imports. */
export async function persistTestsToDb(tests: MCQTest[]): Promise<{
  ok: number;
  failed: number;
  questions: number;
}> {
  let ok = 0;
  let failed = 0;
  let questions = 0;

  for (const t of tests) {
    const wrote = await persistTestToDb(t);
    if (wrote) {
      ok++;
      questions += Array.isArray(t.questions) ? t.questions.length : 0;
    } else {
      failed++;
    }
  }

  return { ok, failed, questions };
}

export async function deleteTestFromDb(testId: string): Promise<boolean> {
  try {
    // Questions cascade via the schema relation.
    await (masterPrisma as any).mcqTest.delete({ where: { id: testId } });
    return true;
  } catch (err) {
    const message = (err as Error)?.message || String(err);
    // Already gone is the desired end state, not a failure.
    if (message.includes("Record to delete does not exist")) return true;
    console.error(`[MCQ-DB] failed to delete test ${testId}:`, message);
    return false;
  }
}

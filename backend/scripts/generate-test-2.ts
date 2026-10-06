/**
 * Add Test #2 to every test that only has Test #1, and top Test #2 up to the
 * target size wherever it came up short.
 *
 * Targets are read from the database (mcq_tests and aptitude_topic_tests), not
 * from a hardcoded topic list, so "all tests" means every target the platform
 * actually serves today.
 *
 * Every question is produced by the bank-gated generators
 * (mcq-topup.service / aptitude-engine.service), so nothing similar and nothing
 * that is merely a renumbered or reworded variant of an existing question can
 * land. Four gates, all of them must pass:
 *   - exact match    → sha256 fingerprint of the normalised text
 *   - value change   → digits-masked template fingerprint
 *   - same idea      → concept signature (units, currency and protagonist names
 *                      stripped, stopwords removed)
 *   - reworded clone → Jaccard similarity over the whole text list
 *
 * The registry those gates read is the union of question_bank AND every question
 * currently live in mcq_questions / aptitude_topic_tests. question_bank alone is
 * not enough: 2,826 of the 4,620 live aptitude questions were never banked, so a
 * bank-only registry would happily re-serve one of them as a "new" question.
 *
 * New question text is written verbatim — no "[Target • Test N • Qn]" prefix and
 * no "(Variant 2.5)" suffix, both of which are cosmetic markers of reworked
 * questions rather than genuinely new ones.
 *
 * Usage:
 *   npx tsx scripts/generate-test-2.ts                        # plan only (default)
 *   npx tsx scripts/generate-test-2.ts --apply                 # create/top up Test #2
 *   npx tsx scripts/generate-test-2.ts --apply --source mcq --limit 2
 *   npx tsx scripts/generate-test-2.ts --apply --rebuild       # discard Test #2, regenerate
 *   npx tsx scripts/generate-test-2.ts --verify-only           # uniqueness audit only
 *
 * Resumable and convergent: a target whose Test #2 already holds the target size
 * is skipped, so an interrupted run can simply be restarted and a second run
 * fills whatever the first one could not reach.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { masterPrisma } from "../src/utils/prisma";
import {
  dedupInfoFromQuestion,
  stripBracketedPrefix,
} from "../src/lib/questions/question-fingerprint";
import {
  SOURCE_APTITUDE,
  SOURCE_MCQ,
  commitToBank,
  loadBank,
  type BankSnapshot,
} from "../src/services/question-bank.service";
import {
  generateUniqueMcqQuestions,
  summarizeCovered,
} from "../src/services/mcq-topup.service";
import {
  generateUniqueTopicQuestions,
  type AptitudeCategory,
  type Difficulty,
} from "../src/services/aptitude-engine.service";
import { persistTestsToDb } from "../src/services/mcq-store-db";
// Type-only on purpose: mcq.service runs initializeTestStore() on import, which
// would re-seed and rewrite the JSON cache behind the running server's back.
import type { MCQQuestion, MCQTest } from "../src/services/mcq.service";

const DATA_DIR = path.join(__dirname, "../data");
const REPORT_FILE = path.join(DATA_DIR, "test2-generation-report.json");

// ─── CLI ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const has = (flag: string) => argv.includes(flag);
const val = (flag: string, fallback: number) => {
  const i = argv.indexOf(flag);
  const n = i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const APPLY = has("--apply");
const REBUILD = has("--rebuild");
const VERIFY_ONLY = has("--verify-only");
const SOURCE = (() => {
  const i = argv.indexOf("--source");
  const v = i >= 0 && argv[i + 1] ? argv[i + 1] : "all";
  return v === "mcq" || v === "aptitude" ? v : "all";
})();
const LIMIT = val("--limit", 0);
// Case-insensitive substring match on the target/topic name, for piloting one paper.
const ONLY = (() => {
  const i = argv.indexOf("--only");
  return i >= 0 && argv[i + 1] ? argv[i + 1].toLowerCase() : "";
})();
const TARGET_SIZE = val("--target-size", 30);
const BATCH_SIZE = val("--batch-size", 2);
// Free-tier providers throttle hard under back-to-back calls, and a throttled or
// truncated call degrades into a silent null that looks like "topic exhausted".
const THROTTLE_MS = val("--throttle-ms", 3000);
// Pause between targets so one target's burst cannot starve the next.
const TARGET_PAUSE_MS = val("--target-pause-ms", 2000);
const TEST_NUMBER = 2;

// ─── Types ───────────────────────────────────────────────────────────────────

interface McqTarget {
  targetId: string;
  targetType: "technology" | "company";
  targetName: string;
  test1Id: string;
  test2Id: string;
  /** Questions Test #2 already holds. */
  have: number;
  /** Existing Test #2 repeats a question stored elsewhere, so it must be rebuilt. */
  collides: boolean;
}

interface AptitudeTarget {
  category: string;
  topic: string;
  test1Id: string;
  test2Id: string | null;
  have: number;
  /** (topic, category, count) of Test #1, so Test #2 mirrors its shape. */
  mix: { topic: string; category: string; count: number }[];
  /** Existing Test #2 repeats a question stored elsewhere, so it must be rebuilt. */
  collides: boolean;
}

type Status = "created" | "topped-up" | "short" | "skipped" | "no-model" | "exhausted" | "error";

interface Diagnostics {
  parseFailures: number;
  apiErrors: number;
  bankRejections: number;
  validResponses: number;
  /** Proposals discarded by the structural gate before they reached the bank. */
  invalidCandidates: number;
}

interface TargetResult {
  suite: "mcq" | "aptitude";
  label: string;
  testId: string;
  before: number;
  requested: number;
  written: number;
  after: number;
  attempts: number;
  diagnostics: Diagnostics;
  status: Status;
  note?: string;
}

const emptyDiagnostics = (): Diagnostics => ({
  parseFailures: 0,
  apiErrors: 0,
  bankRejections: 0,
  validResponses: 0,
  invalidCandidates: 0,
});

function addDiagnostics(a: Diagnostics, b: Diagnostics): Diagnostics {
  return {
    parseFailures: a.parseFailures + b.parseFailures,
    apiErrors: a.apiErrors + b.apiErrors,
    bankRejections: a.bankRejections + b.bankRejections,
    validResponses: a.validResponses + b.validResponses,
    invalidCandidates: a.invalidCandidates + (b.invalidCandidates ?? 0),
  };
}

function describeDiagnostics(d: Diagnostics): string {
  return (
    `${d.validResponses} valid response(s), ${d.bankRejections} bank rejection(s), ` +
    `${d.invalidCandidates} malformed, ${d.parseFailures} parse failure(s), ${d.apiErrors} API error(s)`
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

function normalizeText(s: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Rotate difficulty by test number so successive tests do not all look alike. */
function difficultyFor(testNumber: number): Difficulty {
  return testNumber % 3 === 1 ? "easy" : testNumber % 3 === 2 ? "medium" : "hard";
}

/** MCQ tests store Title-Case difficulty; aptitude tests store lower case. */
function mcqDifficultyFor(testNumber: number): "Easy" | "Medium" | "Hard" {
  return testNumber % 3 === 1 ? "Easy" : testNumber % 3 === 2 ? "Medium" : "Hard";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Whole-database dedup registry ───────────────────────────────────────────

/**
 * question_bank ∪ mcq_questions ∪ aptitude_topic_tests.questionsJson.
 *
 * This is the registry the generator gates read, so "unique" means unique against
 * every question the platform stores anywhere — not merely against the bank.
 */
async function buildDatabaseRegistry(): Promise<BankSnapshot> {
  const snap = await loadBank(undefined, { includeTexts: true });
  const texts = new Set(snap.recentTexts);
  let liveOnly = 0;

  const add = (text: string, codeSnippet?: string) => {
    if (!text) return;
    const d = dedupInfoFromQuestion({ question: text, codeSnippet });
    if (!d.fingerprint) return;
    const known = snap.fingerprints.has(d.fingerprint);
    snap.fingerprints.add(d.fingerprint);
    if (d.templateFingerprint) snap.templates.add(d.templateFingerprint);
    if (d.conceptSignature) snap.conceptSignatures.add(d.conceptSignature);
    texts.add(stripBracketedPrefix(text).toLowerCase());
    if (!known) liveOnly++;
  };

  const mcqRows = await (masterPrisma as any).mcqQuestion.findMany({
    select: { question: true, codeSnippet: true },
  });
  for (const row of mcqRows) add(row.question, row.codeSnippet ?? undefined);

  const aptitudeRows = await (masterPrisma as any).aptitudeTopicTest.findMany({
    select: { questionsJson: true },
  });
  for (const row of aptitudeRows) {
    const list = Array.isArray(row.questionsJson) ? (row.questionsJson as any[]) : [];
    for (const q of list) add(q?.text ?? q?.question ?? "");
  }

  snap.recentTexts = Array.from(texts);
  snap.totalEntries = snap.fingerprints.size;
  log(
    `Dedup registry: ${snap.fingerprints.size} fingerprints, ` +
      `${snap.templates.size} templates, ${snap.conceptSignatures.size} concepts, ` +
      `${snap.recentTexts.length} texts (${liveOnly} reachable only from the live tests).`
  );
  return snap;
}

/** Ban freshly accepted questions for every later target in the same run. */
function banInRegistry(snapshot: BankSnapshot, questions: { text: string; codeSnippet?: string }[]) {
  for (const q of questions) {
    const d = dedupInfoFromQuestion({ question: q.text, codeSnippet: q.codeSnippet });
    if (!d.fingerprint) continue;
    snapshot.fingerprints.add(d.fingerprint);
    snapshot.templates.add(d.templateFingerprint);
    snapshot.conceptSignatures.add(d.conceptSignature);
    snapshot.recentTexts.push(stripBracketedPrefix(d.text).toLowerCase());
  }
}

// ─── Discovery ───────────────────────────────────────────────────────────────

async function discoverMcqTargets(): Promise<McqTarget[]> {
  const tests = await (masterPrisma as any).mcqTest.findMany({
    select: { id: true, targetId: true, targetType: true, targetName: true, testNumber: true, questionCount: true },
    orderBy: [{ targetType: "asc" }, { targetName: "asc" }, { testNumber: "asc" }],
  });

  const groups = new Map<string, McqTarget & { numbers: Set<number> }>();
  for (const t of tests) {
    const key = `${t.targetType}:${t.targetId}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        targetId: t.targetId,
        targetType: t.targetType === "company" ? "company" : "technology",
        targetName: t.targetName,
        test1Id: "",
        test2Id: `test-${t.targetId}-${TEST_NUMBER}`,
        have: 0,
        collides: false,
        numbers: new Set<number>(),
      };
      groups.set(key, g);
    }
    g.numbers.add(t.testNumber);
    if (t.testNumber === 1) g.test1Id = t.id;
    if (t.testNumber === TEST_NUMBER) {
      g.test2Id = t.id;
      g.have = t.questionCount || 0;
    }
  }

  return Array.from(groups.values())
    .filter((g) => g.test1Id)
    .map(({ numbers, ...rest }) => rest);
}

async function discoverAptitudeTargets(): Promise<AptitudeTarget[]> {
  const tests = await (masterPrisma as any).aptitudeTopicTest.findMany({
    select: { id: true, category: true, topic: true, testNumber: true, totalQuestions: true, questionsJson: true },
    orderBy: [{ category: "asc" }, { topic: "asc" }, { testNumber: "asc" }],
  });

  const groups = new Map<string, AptitudeTarget>();
  for (const t of tests) {
    const key = `${t.category}::${t.topic}`;
    let g = groups.get(key);
    if (!g) {
      g = { category: t.category, topic: t.topic, test1Id: "", test2Id: null, have: 0, mix: [], collides: false };
      groups.set(key, g);
    }
    if (t.testNumber === TEST_NUMBER) {
      g.test2Id = t.id;
      g.have = Array.isArray(t.questionsJson) ? (t.questionsJson as any[]).length : 0;
    }
    if (t.testNumber !== 1) continue;

    g.test1Id = t.id;
    const counts = new Map<string, { category: string; count: number }>();
    for (const q of (Array.isArray(t.questionsJson) ? (t.questionsJson as any[]) : [])) {
      const subTopic = typeof q?.topic === "string" && q.topic.trim() ? q.topic : t.topic;
      const category = typeof q?.category === "string" && q.category.trim() ? q.category : "quantitative";
      const entry = counts.get(subTopic) || { category, count: 0 };
      entry.count++;
      counts.set(subTopic, entry);
    }
    g.mix = Array.from(counts.entries()).map(([topic, v]) => ({
      topic,
      category: v.category,
      count: v.count,
    }));
  }

  return Array.from(groups.values()).filter((g) => g.test1Id);
}

// ─── MCQ Test #2 ─────────────────────────────────────────────────────────────

/** Ids already present in mcq_questions, so a generated id can never collide. */
async function loadExistingQuestionIds(): Promise<Set<string>> {
  const rows = await (masterPrisma as any).mcqQuestion.findMany({ select: { id: true } });
  return new Set(rows.map((r: any) => r.id));
}

async function ensureMcqTest2(
  target: McqTarget,
  snapshot: BankSnapshot,
  takenIds: Set<string>
): Promise<TargetResult> {
  const result: TargetResult = {
    suite: "mcq",
    label: `${target.targetName} (${target.targetType})`,
    testId: target.test2Id,
    before: target.have,
    requested: Math.max(0, TARGET_SIZE - target.have),
    written: 0,
    after: target.have,
    attempts: 0,
    diagnostics: emptyDiagnostics(),
    status: "error",
  };

  const existingQuestions = await (masterPrisma as any).mcqQuestion.findMany({
    where: { testId: target.test2Id },
    select: { id: true, question: true, optionsJson: true, correctIdx: true, correctAnswer: true, explanation: true, hint: true, relatedConcept: true, codeSnippet: true, language: true, difficulty: true, technology: true, company: true, interviewTip: true, estimatedTime: true, position: true },
    orderBy: { position: "asc" },
  });
  for (const q of existingQuestions) takenIds.add(q.id);
  result.before = existingQuestions.length;
  result.after = existingQuestions.length;

  const shortfall = TARGET_SIZE - existingQuestions.length;
  if (shortfall <= 0) {
    result.status = "skipped";
    return result;
  }
  result.requested = shortfall;

  const test1Questions = await (masterPrisma as any).mcqQuestion.findMany({
    where: { testId: target.test1Id },
    select: { question: true },
    orderBy: { position: "asc" },
  });

  const gen = await generateUniqueMcqQuestions({
    target: target.targetName,
    targetType: target.targetType,
    count: shortfall,
    difficulty: mcqDifficultyFor(TEST_NUMBER),
    idPrefix: `mcq-${target.targetId}-t${TEST_NUMBER}`,
    idOffset: existingQuestions.length,
    coveredSummary: summarizeCovered(test1Questions) || undefined,
    maxAttempts: Math.ceil(shortfall / BATCH_SIZE) + 8,
    batchSize: BATCH_SIZE,
    throttleMs: THROTTLE_MS,
    bank: snapshot,
  });
  result.attempts = gen.attempts;
  result.diagnostics = {
    parseFailures: gen.diagnostics.parseFailures,
    apiErrors: gen.diagnostics.apiErrors,
    bankRejections: gen.diagnostics.bankRejections,
    validResponses: gen.diagnostics.validResponses,
    invalidCandidates: gen.diagnostics.invalidCandidates ?? 0,
  };

  if (gen.diagnostics.validResponses === 0) {
    result.status = "no-model";
    result.note = `the model returned nothing usable — retry later`;
    return result;
  }
  if (gen.questions.length === 0) {
    result.status = "exhausted";
    result.note = `every proposal was already in the database`;
    return result;
  }

  // Reserve in the bank before writing the test, so a concurrent run cannot claim
  // the same concepts in between. The UNIQUE constraints are the real gate.
  const commit = await commitToBank(
    gen.questions.map((q, i) => ({
      question: q.question,
      codeSnippet: q.codeSnippet,
      options: q.options,
      correctIdx: q.correctIdx,
      source: SOURCE_MCQ,
      topic: target.targetName,
      category: target.targetType,
      company: target.targetType === "company" ? target.targetName : null,
      difficulty: q.difficulty,
      testId: target.test2Id,
      position: existingQuestions.length + i,
    }))
  );
  if (commit.rejectedAsDuplicate > 0) {
    log(`    ! ${commit.rejectedAsDuplicate} concept(s) lost a commit race — discarded.`);
  }
  if (commit.inserted === 0) {
    result.status = "exhausted";
    result.note = "every proposed concept was claimed by a concurrent run";
    return result;
  }

  // The bank keeps text/options/answer but not the model's hint, interviewTip or
  // relatedConcept, so read the committed rows back to see which concepts actually
  // won and keep those generated objects intact. Match on the canonical fingerprint
  // rather than the text: the bank stores its own normalised form, which is not
  // always byte-equal to what the model returned.
  const proposed = new Map(
    gen.questions.map((q) => [dedupInfoFromQuestion({ question: q.question, codeSnippet: q.codeSnippet }).fingerprint, q])
  );
  const banked = await (masterPrisma as any).questionBankEntry.findMany({
    where: { testId: target.test2Id, source: SOURCE_MCQ },
    select: { fingerprint: true },
  });
  const survivors = banked
    .map((b: any) => proposed.get(b.fingerprint))
    .filter((q): q is MCQQuestion => !!q);

  // `mcq_questions.id` is the primary key: one collision aborts the whole
  // createMany and leaves the test with zero questions, so re-number defensively.
  const added: MCQQuestion[] = survivors.map((q) => {
    let id = q.id;
    if (takenIds.has(id)) {
      let n = 2;
      while (takenIds.has(`${id}#${n}`)) n++;
      id = `${id}#${n}`;
    }
    takenIds.add(id);
    return {
      ...q,
      id,
      technology: target.targetType === "technology" ? target.targetName : q.technology || "Computer Science",
      company: target.targetType === "company" ? target.targetName : q.company,
      difficulty: (q.difficulty as any) || mcqDifficultyFor(TEST_NUMBER),
    } as MCQQuestion;
  });

  const kept: MCQQuestion[] = existingQuestions.map((q: any) => ({
    id: q.id,
    question: q.question,
    technology: q.technology,
    company: q.company ?? undefined,
    difficulty: q.difficulty,
    codeSnippet: q.codeSnippet ?? undefined,
    language: q.language ?? undefined,
    options: Array.isArray(q.optionsJson) ? (q.optionsJson as string[]) : [],
    correctAnswer: q.correctAnswer,
    correctIdx: q.correctIdx,
    explanation: q.explanation,
    hint: q.hint,
    relatedConcept: q.relatedConcept,
    estimatedTime: q.estimatedTime,
    interviewTip: q.interviewTip ?? undefined,
  }));

  const questions = [...kept, ...added];
  const test: MCQTest = {
    id: target.test2Id,
    targetId: target.targetId,
    targetType: target.targetType,
    targetName: target.targetName,
    testNumber: TEST_NUMBER,
    title: `${target.targetName} - Test ${TEST_NUMBER}: Technical Assessment`,
    description:
      `Test ${TEST_NUMBER} for ${target.targetName}. Every question is unique against the whole ` +
      `question database — no repeats, no renumbered or reworded variants of an existing question.`,
    difficulty: mcqDifficultyFor(TEST_NUMBER) as any,
    questionCount: questions.length,
    durationMinutes: 30,
    isPublished: true,
    createdAt: new Date().toISOString(),
    questions,
  };

  const persisted = await persistTestsToDb([test]);
  if (!persisted.ok) {
    result.note = `persistTestsToDb rejected ${target.test2Id}`;
    return result;
  }

  banInRegistry(snapshot, questions);

  result.written = added.length;
  result.after = questions.length;
  result.status = questions.length >= TARGET_SIZE ? (result.before > 0 ? "topped-up" : "created") : "short";
  if (questions.length < TARGET_SIZE) {
    result.note = `${questions.length}/${TARGET_SIZE} questions — the rest had no unused concept left`;
  }
  return result;
}

// ─── Aptitude Test #2 ────────────────────────────────────────────────────────

async function ensureAptitudeTest2(
  target: AptitudeTarget,
  snapshot: BankSnapshot
): Promise<TargetResult> {
  const result: TargetResult = {
    suite: "aptitude",
    label: `${target.topic} (${target.category})`,
    testId: target.test2Id || `${target.category}::${target.topic}::T${TEST_NUMBER}`,
    before: target.have,
    requested: Math.max(0, TARGET_SIZE - target.have),
    written: 0,
    after: target.have,
    attempts: 0,
    diagnostics: emptyDiagnostics(),
    status: "error",
  };

  const existingQuestions: any[] = target.test2Id
    ? ((await (masterPrisma as any).aptitudeTopicTest.findUnique({
        where: { id: target.test2Id },
        select: { questionsJson: true },
      }))?.questionsJson ?? [])
    : [];
  result.before = existingQuestions.length;
  result.after = existingQuestions.length;

  const shortfall = TARGET_SIZE - existingQuestions.length;
  if (shortfall <= 0) {
    result.status = "skipped";
    return result;
  }
  result.requested = shortfall;

  const isCompany = target.category === "company";
  // A company test is a mixed paper (Test #1 spreads 30 questions over ~27
  // sub-topics). Mirror that shape, otherwise Test #2 would cover one narrow slice.
  const mix = isCompany
    ? target.mix.length > 0
      ? target.mix
      : [{ topic: target.topic, category: "quantitative", count: shortfall }]
    : [{ topic: target.topic, category: target.category, count: shortfall }];

  const added: any[] = [];
  const bankEntries: any[] = [];
  const bankTestId = target.test2Id || `${target.category}::${target.topic}::T${TEST_NUMBER}`;
  let attempts = 0;
  let diagnostics = emptyDiagnostics();

  for (const slice of mix) {
    const remaining = TARGET_SIZE - existingQuestions.length - added.length;
    const requested = Math.min(slice.count, Math.max(0, remaining));
    if (requested <= 0) break;

    const gen = await generateUniqueTopicQuestions({
      topic: slice.topic,
      category: slice.category as AptitudeCategory,
      count: requested,
      difficulty: difficultyFor(TEST_NUMBER),
      company: isCompany ? target.topic : undefined,
      maxAttempts: Math.ceil(requested / BATCH_SIZE) + 4,
      batchSize: BATCH_SIZE,
      throttleMs: THROTTLE_MS,
      bank: snapshot,
    });
    attempts += gen.attempts;
    diagnostics = addDiagnostics(diagnostics, gen.diagnostics);

    if (gen.questions.length === 0) {
      log(`    ! no unique question left for "${slice.topic}" (${gen.diagnostics.bankRejections} rejected).`);
      continue;
    }

    for (const q of gen.questions) {
      if (existingQuestions.length + added.length >= TARGET_SIZE) break;
      const position = existingQuestions.length + added.length;
      added.push({
        id: `db-${slug(slice.topic)}-t${TEST_NUMBER}-q${position + 1}`,
        text: q.text,
        topic: slice.topic,
        options: q.options,
        category: slice.category,
        shortcut: q.shortcut,
        correctIdx: q.correctIdx,
        difficulty: q.difficulty,
        companyTags: q.companyTags,
        explanation: q.explanation,
        commonMistakes: q.commonMistakes,
        estimatedTimeSec: q.estimatedTimeSec,
      });
      bankEntries.push({
        question: q.text,
        options: q.options,
        correctIdx: q.correctIdx,
        source: SOURCE_APTITUDE,
        topic: slice.topic,
        category: slice.category,
        company: isCompany ? target.topic : null,
        difficulty: q.difficulty,
        testId: bankTestId,
        position,
      });
    }

    // Ban what this slice just produced for every later slice and target.
    banInRegistry(snapshot, gen.questions.map((q) => ({ text: q.text })));
  }

  result.attempts = attempts;
  result.diagnostics = diagnostics;

  if (diagnostics.validResponses === 0) {
    result.status = "no-model";
    result.note = "the model returned nothing usable — retry later";
    return result;
  }
  if (added.length === 0) {
    result.status = "exhausted";
    result.note = "every proposal was already in the database";
    return result;
  }

  const commit = await commitToBank(bankEntries);
  if (commit.rejectedAsDuplicate > 0) {
    log(`    ! ${commit.rejectedAsDuplicate} concept(s) lost a commit race — discarded.`);
  }
  if (commit.inserted === 0) {
    result.status = "exhausted";
    result.note = "every proposed concept was claimed by a concurrent run";
    return result;
  }

  // Only the concepts that actually won the commit may enter the test. Matching on
  // the canonical fingerprint, because the bank stores its own normalised text.
  const banked = await (masterPrisma as any).questionBankEntry.findMany({
    where: { testId: bankTestId, source: SOURCE_APTITUDE },
    select: { fingerprint: true },
  });
  const wonFingerprints = new Set(banked.map((b: any) => b.fingerprint));
  const survivors = added.filter((q) =>
    wonFingerprints.has(dedupInfoFromQuestion({ question: q.text }).fingerprint)
  );
  const questions = [...existingQuestions, ...survivors];

  if (target.test2Id) {
    await (masterPrisma as any).aptitudeTopicTest.update({
      where: { id: target.test2Id },
      data: { questionsJson: questions as any, totalQuestions: questions.length },
    });
  } else {
    const created = await (masterPrisma as any).aptitudeTopicTest.create({
      data: {
        category: target.category,
        topic: target.topic,
        testNumber: TEST_NUMBER,
        title: `Test ${TEST_NUMBER}`,
        weekNumber: TEST_NUMBER,
        questionsJson: questions as any,
        totalQuestions: questions.length,
        difficulty: difficultyFor(TEST_NUMBER),
      },
      select: { id: true },
    });
    target.test2Id = created.id;
    // The bank stores the sub-topic, the test row the outer topic; keep them linked.
    await (masterPrisma as any).questionBankEntry.updateMany({
      where: { testId: bankTestId },
      data: { testId: created.id },
    });
  }

  banInRegistry(snapshot, survivors);

  result.testId = target.test2Id || result.testId;
  result.written = survivors.length;
  result.after = questions.length;
  result.status = questions.length >= TARGET_SIZE ? (result.before > 0 ? "topped-up" : "created") : "short";
  if (questions.length < TARGET_SIZE) {
    result.note = `${questions.length}/${TARGET_SIZE} questions — the rest had no unused concept left`;
  }
  return result;
}

// ─── Verification ────────────────────────────────────────────────────────────

interface Collision {
  kind: "exact" | "template" | "concept";
  question: string;
  alsoIn: string;
  testKey: string;
}

interface Audit {
  collisions: Collision[];
  /** Test keys whose Test #2 shares a fingerprint group with a non-Test #2 row. */
  dirtyTests: Set<string>;
  /** Test keys whose Test #2 repeats another Test #2 row. */
  dirtyTest2Pairs: Set<string>;
  /** Test keys that hold the same question twice inside the paper itself. */
  dirtyIntraPaper: Set<string>;
}

/**
 * Acceptance check for "unique against the complete database": no question in a
 * Test #2 row may share an exact fingerprint, a digits-masked template or a
 * concept signature with any other question stored anywhere — Test #1, Test #3+
 * or another target's Test #2.
 */
async function auditTest2(): Promise<Audit> {
  const exact = new Map<string, string[]>();
  const template = new Map<string, string[]>();
  const concept = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, key: string, where: string) => {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(where);
    else map.set(key, [where]);
  };

  const mcqRows = await (masterPrisma as any).mcqQuestion.findMany({
    select: { id: true, testId: true, question: true, codeSnippet: true },
  });
  for (const r of mcqRows) {
    const d = dedupInfoFromQuestion({ question: r.question, codeSnippet: r.codeSnippet });
    const where = `mcq:${r.testId}#${r.id}`;
    push(exact, d.fingerprint, where);
    push(template, d.templateFingerprint, where);
    push(concept, d.conceptSignature, where);
  }

  const aptitudeRows = await (masterPrisma as any).aptitudeTopicTest.findMany({
    select: { id: true, testNumber: true, questionsJson: true },
  });
  for (const t of aptitudeRows) {
    for (const q of (Array.isArray(t.questionsJson) ? (t.questionsJson as any[]) : [])) {
      const d = dedupInfoFromQuestion({ question: q?.text ?? q?.question ?? "" });
      const where = `aptitude:${t.id}#${q?.id ?? "?"}`;
      push(exact, d.fingerprint, where);
      push(template, d.templateFingerprint, where);
      push(concept, d.conceptSignature, where);
    }
  }

  const aptitudeTest2 = new Set(
    aptitudeRows.filter((t: any) => t.testNumber === TEST_NUMBER).map((t: any) => `aptitude:${t.id}`)
  );
  const isTest2Mcq = (testId: string) => new RegExp(`-${TEST_NUMBER}$`).test(testId);
  const keyOf = (where: string) => where.split("#")[0];
  const isTest2 = (where: string) => {
    const k = keyOf(where);
    return k.startsWith("mcq:") ? isTest2Mcq(k.slice(4)) : aptitudeTest2.has(k);
  };

  const collisions: Collision[] = [];
  const dirtyTests = new Set<string>();
  const dirtyTest2Pairs = new Set<string>();
  const dirtyIntraPaper = new Set<string>();

  const check = (kind: Collision["kind"], map: Map<string, string[]>, key: string, text: string, selfKey: string) => {
    const locations = map.get(key);
    if (!locations || locations.length < 2) return;
    const mine = locations.filter(isTest2);
    if (mine.length === 0) return;
    const foreign = locations.filter((w) => !isTest2(w));
    dirtyTests.add(selfKey);
    for (const m of mine) dirtyTests.add(keyOf(m));
    const holders = new Set(mine.map(keyOf));
    // The same question twice inside one paper.
    if (mine.length > holders.size) {
      dirtyIntraPaper.add(selfKey);
      for (const h of holders) dirtyIntraPaper.add(h);
    }
    // Two different Test #2 papers repeating each other is still a duplicate.
    if (foreign.length === 0 && holders.size > 1) {
      for (const m of mine) dirtyTest2Pairs.add(keyOf(m));
    }
    if (foreign.length === 0) return;
    collisions.push({ kind, question: text.slice(0, 110), alsoIn: foreign[0], testKey: selfKey });
  };

  for (const r of mcqRows) {
    if (!isTest2Mcq(r.testId)) continue;
    const d = dedupInfoFromQuestion({ question: r.question, codeSnippet: r.codeSnippet });
    check("exact", exact, d.fingerprint, d.text, `mcq:${r.testId}`);
    check("template", template, d.templateFingerprint, d.text, `mcq:${r.testId}`);
    check("concept", concept, d.conceptSignature, d.text, `mcq:${r.testId}`);
  }
  for (const t of aptitudeRows) {
    if (t.testNumber !== TEST_NUMBER) continue;
    for (const q of (Array.isArray(t.questionsJson) ? (t.questionsJson as any[]) : [])) {
      const d = dedupInfoFromQuestion({ question: q?.text ?? q?.question ?? "" });
      check("exact", exact, d.fingerprint, d.text, `aptitude:${t.id}`);
      check("template", template, d.templateFingerprint, d.text, `aptitude:${t.id}`);
      check("concept", concept, d.conceptSignature, d.text, `aptitude:${t.id}`);
    }
  }
  for (const k of dirtyTest2Pairs) dirtyTests.add(k);
  return { collisions, dirtyTests, dirtyTest2Pairs, dirtyIntraPaper };
}

function printAudit(a: Audit, label: string) {
  // Duplicates between two Test #2 papers, and a question repeated inside one
  // paper, produce no collision record, so they must be reported separately or
  // the check reads as clean while a duplicate is still live.
  const pairs = [...a.dirtyTest2Pairs];
  const intra = [...a.dirtyIntraPaper];
  const n = a.collisions.length;
  const clean = n === 0 && pairs.length === 0 && intra.length === 0;
  console.log(
    clean
      ? `${label}: every Test #${TEST_NUMBER} question is unique against the whole database.`
      : `${label}: ${n} collision(s) across ${a.dirtyTests.size} Test #${TEST_NUMBER} paper(s)` +
        `${pairs.length ? `, ${pairs.length} paper(s) repeating another Test #${TEST_NUMBER}` : ""}` +
        `${intra.length ? `, ${intra.length} paper(s) repeating a question internally` : ""}.`
  );
  for (const k of pairs.slice(0, 15)) console.log(`    repeats another Test #2: ${k}`);
  for (const k of intra.slice(0, 15)) console.log(`    repeats a question inside the paper: ${k}`);
  const perTest = new Map<string, number>();
  for (const c of a.collisions) perTest.set(c.testKey, (perTest.get(c.testKey) || 0) + 1);
  for (const [k, v] of [...perTest.entries()].sort((x, y) => y[1] - x[1]).slice(0, 15)) {
    console.log(`    ${k.padEnd(38)} ${v} collision(s)`);
  }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function needsWork(have: number, collides: boolean): boolean {
  return REBUILD || collides || have < TARGET_SIZE;
}

async function main() {
  console.log("=".repeat(78));
  console.log(
    VERIFY_ONLY
      ? `TEST #${TEST_NUMBER} UNIQUENESS AUDIT`
      : APPLY
        ? `GENERATE TEST #${TEST_NUMBER} (target ${TARGET_SIZE} questions/test)`
        : `TEST #${TEST_NUMBER} PLAN (dry run — pass --apply to write)`
  );
  console.log("=".repeat(78));

  if (VERIFY_ONLY) {
    printAudit(await auditTest2(), "Uniqueness check");
    await masterPrisma.$disconnect();
    return;
  }

  const snapshot = await buildDatabaseRegistry();
  const takenIds = await loadExistingQuestionIds();
  const audit = await auditTest2();

  const mcqTargets = SOURCE === "aptitude" ? [] : await discoverMcqTargets();
  const aptitudeTargets = SOURCE === "mcq" ? [] : await discoverAptitudeTargets();

  for (const t of mcqTargets) t.collides = audit.dirtyTests.has(`mcq:${t.test2Id}`);
  for (const t of aptitudeTargets) t.collides = !!t.test2Id && audit.dirtyTests.has(`aptitude:${t.test2Id}`);

  // Missing Test #2 first, then broken copies, then the ones that came up short.
  const byPriority = (a: { have: number; collides: boolean }, b: { have: number; collides: boolean }) =>
    a.have - b.have || Number(a.collides) - Number(b.collides);
  const mcqTodo = mcqTargets.filter((t) => needsWork(t.have, t.collides)).sort(byPriority);
  const aptitudeTodo = aptitudeTargets.filter((t) => needsWork(t.have, t.collides)).sort(byPriority);
  const matches = (t: { targetName?: string; topic?: string }) =>
    !ONLY || `${t.targetName || t.topic}`.toLowerCase().includes(ONLY);
  const mcqQueue = (LIMIT > 0 ? mcqTodo.filter(matches).slice(0, LIMIT) : mcqTodo.filter(matches));
  const aptitudeQueue = (LIMIT > 0 ? aptitudeTodo.filter(matches).slice(0, LIMIT) : aptitudeTodo.filter(matches));

  const missingMcq = mcqTodo.filter((t) => t.have === 0).length;
  const missingAptitude = aptitudeTodo.filter((t) => t.have === 0).length;
  const dirtyMcq = mcqTodo.filter((t) => t.collides).length;
  const dirtyAptitude = aptitudeTodo.filter((t) => t.collides).length;
  console.log(
    `\nMCQ targets: ${mcqTargets.length} total, ${mcqTodo.length} need work ` +
      `(${missingMcq} without Test #${TEST_NUMBER}, ${dirtyMcq} with a duplicated Test #${TEST_NUMBER}, ` +
      `${mcqTodo.length - missingMcq - dirtyMcq} short of ${TARGET_SIZE}).`
  );
  console.log(
    `Aptitude targets: ${aptitudeTargets.length} total, ${aptitudeTodo.length} need work ` +
      `(${missingAptitude} without Test #${TEST_NUMBER}, ${dirtyAptitude} with a duplicated Test #${TEST_NUMBER}, ` +
      `${aptitudeTodo.length - missingAptitude - dirtyAptitude} short of ${TARGET_SIZE}).`
  );
  // A duplicated row is discarded before generation, so it needs a full paper.
  const need = (t: { have: number; collides: boolean }) => (t.collides ? TARGET_SIZE : Math.max(0, TARGET_SIZE - t.have));
  const mcqQuestions = mcqQueue.reduce((n, t) => n + need(t), 0);
  const aptitudeQuestions = aptitudeQueue.reduce((n, t) => n + need(t), 0);
  const aptitudeCalls = aptitudeQueue.reduce((n, t) => n + (t.mix.length || 1), 0);
  console.log(
    `This run: ${mcqQueue.length} MCQ + ${aptitudeQueue.length} aptitude, ` +
      `${mcqQuestions + aptitudeQuestions} questions, ` +
      `~${Math.ceil(mcqQuestions / BATCH_SIZE) + aptitudeCalls} model calls.`
  );
  if (mcqQueue.length < mcqTodo.length || aptitudeQueue.length < aptitudeTodo.length) {
    console.log(`(--limit ${LIMIT} pilot)`);
  }

  if (!APPLY) {
    for (const t of mcqQueue) {
      const why = t.have === 0 ? "missing" : t.collides ? "duplicated" : `short ${t.have}`;
      console.log(`  mcq      ${t.targetName.padEnd(26)} (${t.targetType}) ${why} -> ${t.test2Id}`);
    }
    for (const t of aptitudeQueue) {
      const why = t.have === 0 ? "missing" : t.collides ? "duplicated" : `short ${t.have}`;
      console.log(`  aptitude ${t.topic.padEnd(26)} (${t.category}) ${why}, ${t.mix.length} sub-topic(s)`);
    }
    console.log("\nNothing written. Re-run with --apply.");
    await masterPrisma.$disconnect();
    return;
  }

  const results: TargetResult[] = [];

  // A duplicated Test #2 has to be discarded rather than topped up: appending
  // would keep the copies that already collide. --rebuild does the same for every
  // queued target regardless of the audit.
  const dropMcq = mcqQueue.filter((t) => REBUILD || t.collides);
  const dropAptitude = aptitudeQueue.filter((t) => REBUILD || t.collides);
  if (dropMcq.length > 0 || dropAptitude.length > 0) {
    for (const t of dropMcq) {
      await (masterPrisma as any).mcqTest.deleteMany({ where: { id: t.test2Id } });
      t.have = 0;
    }
    for (const t of dropAptitude) {
      await (masterPrisma as any).aptitudeTopicTest.deleteMany({
        where: { topic: t.topic, category: t.category, testNumber: TEST_NUMBER },
      });
      t.have = 0;
      t.test2Id = null;
    }
    log(
      `Discarded ${dropMcq.length} MCQ and ${dropAptitude.length} aptitude Test #${TEST_NUMBER} ` +
        `row(s)${REBUILD ? " (--rebuild)" : " because they duplicate questions stored elsewhere"}.`
    );
  }

  const runQueue = async (
    suite: "mcq" | "aptitude",
    queue: McqTarget[] | AptitudeTarget[],
    worker: (t: any) => Promise<TargetResult>
  ) => {
    for (let i = 0; i < queue.length; i++) {
      const t: any = queue[i];
      const progress = `[${i + 1}/${queue.length}]`;
      const want = need(t);
      log(`${progress} ${suite} ${t.targetName || t.topic} — ${t.have}/${TARGET_SIZE}, generating ${want}...`);

      let r: TargetResult;
      try {
        r = await worker(t);
      } catch (err: any) {
        const message = (err as Error)?.message?.slice(0, 200) || String(err);
        r = {
          suite,
          label: `${t.targetName || t.topic}`,
          testId: t.test2Id || `${t.category}::${t.topic}`,
          before: t.have,
          requested: want,
          written: 0,
          after: t.have,
          attempts: 0,
          diagnostics: emptyDiagnostics(),
          status: "error",
          note: message,
        };
        log(`    x ${message}`);
      }

      results.push(r);
      log(
        `    ${r.status}: ${r.before} -> ${r.after}/${TARGET_SIZE} ` +
          `(+${r.written}, ${r.attempts} attempts, ${describeDiagnostics(r.diagnostics)})` +
          `${r.note ? ` — ${r.note}` : ""}`
      );

      if (TARGET_PAUSE_MS > 0) await sleep(TARGET_PAUSE_MS);
    }
  };

  if (mcqQueue.length > 0) {
    await runQueue("mcq", mcqQueue, (t) => ensureMcqTest2(t, snapshot, takenIds));
  }
  if (aptitudeQueue.length > 0) {
    await runQueue("aptitude", aptitudeQueue, (t) => ensureAptitudeTest2(t, snapshot));
  }

  // ── Summary ──
  const byStatus = (s: Status) => results.filter((r) => r.status === s).length;
  const written = results.reduce((n, r) => n + r.written, 0);
  const short = byStatus("short") + byStatus("no-model") + byStatus("exhausted") + byStatus("error");

  console.log("\n" + "=".repeat(78));
  console.log("SUMMARY");
  console.log("=".repeat(78));
  console.log(`Targets processed: ${results.length}`);
  console.log(`Questions written: ${written}`);
  console.log(
    `created: ${byStatus("created")}  topped-up: ${byStatus("topped-up")}  skipped: ${byStatus("skipped")}  ` +
      `short: ${byStatus("short")}  no-model: ${byStatus("no-model")}  exhausted: ${byStatus("exhausted")}  error: ${byStatus("error")}`
  );

  const after = await loadBank(undefined, { includeTexts: false });
  log(`Bank: ${snapshot.totalEntries} -> ${after.totalEntries} concepts`);

  const finalAudit = await auditTest2();
  printAudit(finalAudit, "Uniqueness check");

  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        testNumber: TEST_NUMBER,
        targetSize: TARGET_SIZE,
        batchSize: BATCH_SIZE,
        throttleMs: THROTTLE_MS,
        rebuild: REBUILD,
        summary: {
          processed: results.length,
          written,
          created: byStatus("created"),
          toppedUp: byStatus("topped-up"),
          skipped: byStatus("skipped"),
          short: byStatus("short"),
          noModel: byStatus("no-model"),
          exhausted: byStatus("exhausted"),
          error: byStatus("error"),
          collisions: finalAudit.collisions.length,
        },
        collisions: finalAudit.collisions,
        results,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`\nReport: ${REPORT_FILE}`);
  console.log(
    short > 0
      ? `\n${short} target(s) are still short — re-run the same command to top them up.`
      : `\nEvery queued target reached ${TARGET_SIZE} questions.`
  );

  await masterPrisma.$disconnect();
}

main().catch(async (err) => {
  console.error("\nFATAL:", err);
  await masterPrisma.$disconnect();
  process.exit(1);
});
/**
 * Refill the MCQ question store after the global dedupe prune.
 *
 * Context: scripts/dedupe-existing-questions.ts removed ~7,290 duplicate
 * questions across 243 tests and wrote data/question-backfill-shortfall.json so
 * the gaps could be refilled. That refill was never wired up — mcq-topup.service.ts
 * (the bank-gated generator built for exactly this) had no caller — so 80 tests
 * shipped empty. This script is that missing driver.
 *
 * It reads the live store the app actually serves (data/mcq-tests-store.json),
 * tops every under-filled test up to the target through the uniqueness-gated
 * generator, and commits every accepted question to the global question bank so
 * the next dedupe pass sees them.
 *
 * Usage:
 *   npx ts-node scripts/backfill-mcq-questions.ts                  # dry-run plan
 *   npx ts-node scripts/backfill-mcq-questions.ts --apply          # write
 *   npx ts-node scripts/backfill-mcq-questions.ts --apply --limit-tests 2 --per-test 5
 *
 * Safety:
 *   - dry-run unless --apply
 *   - timestamped backup written before any mutation
 *   - resumes: a test already at target is skipped, so re-running is safe
 *   - appends only; never rewrites or deletes an existing question
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { generateUniqueMcqQuestions } from "../src/services/mcq-topup.service";
import { commitToBank, SOURCE_MCQ } from "../src/services/question-bank.service";
import { masterPrisma } from "../src/utils/prisma";

const DATA_DIR = path.join(__dirname, "../data");
const MCQ_STORE = path.join(DATA_DIR, "mcq-tests-store.json");

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");

/** Numeric flag with a sane default when the flag is absent or malformed. */
function flag(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const LIMIT_TESTS = flag("--limit-tests", Infinity);
const PER_TEST = flag("--per-test", Infinity);
const THROTTLE_MS = flag("--throttle", 2500);
const TARGET = 30;

type StoreTest = {
  id: string;
  targetId: string;
  targetType: "technology" | "company";
  targetName: string;
  testNumber: number;
  title: string;
  difficulty: string;
  questionCount: number;
  isPublished: boolean;
  questions: any[];
};

function loadStore(): StoreTest[] {
  const raw = fs.readFileSync(MCQ_STORE, "utf-8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.tests;
}

function saveStore(tests: StoreTest[]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = MCQ_STORE.replace(/\.json$/, `.pre-backfill.${stamp}.json`);
  fs.copyFileSync(MCQ_STORE, backup);
  console.log(`\n[backup] ${backup}`);
  fs.writeFileSync(MCQ_STORE, JSON.stringify(tests, null, 2), "utf-8");
  console.log(`[write]  ${MCQ_STORE}`);
}

/** Nudge the model away from concepts the test already covers. */
function coveredSummary(t: StoreTest, limit = 12): string | undefined {
  const concepts = (t.questions || [])
    .map((q) => q.relatedConcept)
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0);
  if (concepts.length === 0) return undefined;
  return concepts.slice(0, limit).join("; ");
}

/** Match the store's existing "[Target • Test N • Qn] " convention. */
function withPrefix(text: string, t: StoreTest, position: number): string {
  return `[${t.targetName} • Test ${t.testNumber} • Q${position}] ${text}`;
}

async function main() {
  const tests = loadStore();

  const needsWork = tests
    .filter((t) => t.isPublished !== false)
    .map((t) => ({ t, have: (t.questions || []).length }))
    .filter(({ have }) => have < TARGET)
    .map(({ t, have }) => ({ t, have, need: Math.min(TARGET - have, PER_TEST) }));

  const totalNeeded = needsWork.reduce((s, x) => s + (TARGET - x.have), 0);
  const queued = needsWork.slice(0, Number.isFinite(LIMIT_TESTS) ? LIMIT_TESTS : undefined);

  console.log("MCQ BACKFILL PLAN");
  console.log(`  store:            ${MCQ_STORE}`);
  console.log(`  target per test:  ${TARGET}`);
  console.log(`  tests needing:    ${needsWork.length}`);
  console.log(`  questions needed: ${totalNeeded}`);
  console.log(`  this run:         ${queued.length} test(s), up to ${queued.reduce((s, x) => s + x.need, 0)} question(s)`);
  console.log(
    `  empty: ${needsWork.filter((x) => x.have === 0).length}   ` +
      `underfilled: ${needsWork.filter((x) => x.have > 0).length}`
  );

  for (const { t, have, need } of queued.slice(0, 15)) {
    console.log(`    ${t.targetName.padEnd(24)} Test ${String(t.testNumber).padEnd(3)} ${have} -> +${need}`);
  }
  if (queued.length > 15) console.log(`    ...and ${queued.length - 15} more tests`);

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply to generate and store questions.");
    return;
  }

  let inserted = 0;
  let failed = 0;
  const committed: any[] = [];

  for (let i = 0; i < queued.length; i++) {
    const { t, have, need } = queued[i];
    const progress = `[${i + 1}/${queued.length}]`;
    console.log(`\n${progress} ${t.targetName} Test ${t.testNumber} — need ${need}`);

    // maxAttempts must cover the requested count: the generator only adds
    // `batchSize` questions per attempt, so a fixed cap silently under-fills
    // every test (8 attempts x batchSize 2 = 16, not 30). Derive it from `need`
    // plus headroom for bank rejections.
    const batchSize = 2;
    const maxAttempts = Math.ceil(need / batchSize) + 6;

    const result = await generateUniqueMcqQuestions({
      target: t.targetName,
      targetType: t.targetType,
      count: need,
      difficulty: t.difficulty || "Medium",
      idPrefix: `mcq-${t.targetId}-t${t.testNumber}`,
      idOffset: have,
      coveredSummary: coveredSummary(t),
      maxAttempts,
      batchSize,
      throttleMs: 1500,
    });

    if (result.questions.length === 0) {
      failed++;
      console.log(
        `${progress} SKIPPED — pool exhausted or provider error. ` +
          `diagnostics=${JSON.stringify(result.diagnostics)}`
      );
      continue;
    }

    for (const q of result.questions) {
      if (!Array.isArray(t.questions)) t.questions = [];
      const position = t.questions.length + 1;
      q.question = withPrefix(q.question, t, position);
      t.questions.push(q);
      committed.push({
        source: SOURCE_MCQ,
        question: q.question,
        codeSnippet: q.codeSnippet,
        company: t.targetType === "company" ? t.targetName : null,
        difficulty: q.difficulty || t.difficulty,
      });
      inserted++;
    }
    t.questionCount = (t.questions || []).length;

    console.log(
      `${progress} +${result.questions.length} (attempts=${result.attempts}, ` +
        `bankRejections=${result.diagnostics.bankRejections}, apiErrors=${result.diagnostics.apiErrors})` +
        `  total now ${t.questionCount}`
    );

    // Persist incrementally so a long run is never lost to a crash.
    if ((i + 1) % 5 === 0) {
      saveStore(tests);
      if (committed.length) await commitToBank(committed.splice(0), masterPrisma);
    }

    if (THROTTLE_MS > 0) await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  saveStore(tests);
  if (committed.length) {
    const c = await commitToBank(committed.splice(0), masterPrisma);
    console.log(`\n[bank] inserted=${c.inserted} rejectedAsDuplicate=${c.rejectedAsDuplicate}`);
  }

  console.log(`\nDONE — inserted ${inserted} question(s), ${failed} test(s) skipped.`);
}

main()
  .then(async () => {
    await masterPrisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("\nFATAL:", e);
    await masterPrisma.$disconnect();
    process.exit(1);
  });
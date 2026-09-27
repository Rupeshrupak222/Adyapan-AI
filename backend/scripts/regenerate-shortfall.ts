/**
 * Regenerates questions for aptitude/MCQ tests that were emptied or shortened by
 * the global duplicate prune.
 *
 * Every replacement question passes the global question_bank gate, so nothing
 * reintroduced here can collide with anything already stored. Where a topic has
 * genuinely no unused concepts left, the test is left short and reported rather
 * than padded — see QuestionPoolExhaustedError.
 *
 * Usage:
 *   npx tsx scripts/regenerate-shortfall.ts --dry-run          # report only
 *   npx tsx scripts/regenerate-shortfall.ts --limit 3          # pilot 3 topics
 *   npx tsx scripts/regenerate-shortfall.ts                    # full run
 *   npx tsx scripts/regenerate-shortfall.ts --source aptitude  # aptitude only
 *   npx tsx scripts/regenerate-shortfall.ts --source mcq
 *   npx tsx scripts/regenerate-shortfall.ts --target-size 30
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { masterPrisma } from "../src/utils/prisma";
import { stripBracketedPrefix } from "../src/lib/questions/question-fingerprint";
import {
  SOURCE_APTITUDE,
  SOURCE_MCQ,
  commitToBank,
  loadBank,
} from "../src/services/question-bank.service";
import { generateUniqueTopicQuestions } from "../src/services/aptitude-engine.service";
import type { AptitudeCategory, Difficulty } from "../src/services/aptitude-engine.service";

const DATA_DIR = path.join(__dirname, "../data");
const MCQ_STORE = path.join(DATA_DIR, "mcq-tests-store.json");
const REPORT_FILE = path.join(DATA_DIR, "regeneration-report.json");

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string, d: number) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : d;
};

const DRY_RUN = has("--dry-run");
const LIMIT = val("--limit", 0);
const TARGET = val("--target-size", 30);
// Free-tier Gemini starts returning HTTP 429 under back-to-back calls, and a
// throttled call degrades into a silent null that looks like "topic exhausted".
// Pace the requests.
const THROTTLE_MS = val("--throttle-ms", 5000);
// Questions requested per AI call. Three questions with explanations, hints,
// shortcuts and common mistakes run to roughly 1000 output tokens, which is
// exactly the budget the fallback providers will serve (Groq's OTPM cap is
// 1000, OpenRouter is trimmed to 1024). Asking for three made nearly every
// fallback response truncate mid-structure ("Unterminated string", "Expected
// ',' or ']' after array element"), so those calls were discarded. Two fits
// with headroom; more calls, far less waste.
const BATCH_SIZE = val("--batch-size", 2);
const SOURCE = (() => {
  const i = argv.indexOf("--source");
  return i >= 0 && argv[i + 1] ? argv[i + 1] : "all";
})();

interface TopicResult {
  testId: string;
  topic: string;
  category: string;
  testNumber: number;
  before: number;
  requested: number;
  generated: number;
  attempts: number;
  after: number;
  status: "filled" | "partial" | "exhausted" | "error" | "dry-run";
  note?: string;
  /** How many of the model's proposals the bank rejected as already-known. */
  bankRejections?: number;
  /** Attempts where the model returned nothing parseable (quota/JSON). */
  parseFailures?: number;
}

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

/** Derive a difficulty from the test number so successive tests differ. */
function difficultyFor(testNumber: number): Difficulty {
  return testNumber % 3 === 1 ? "easy" : testNumber % 3 === 2 ? "medium" : "hard";
}

async function regenerateAptitude(): Promise<TopicResult[]> {
  const tests = await masterPrisma.aptitudeTopicTest.findMany({
    select: { id: true, topic: true, category: true, testNumber: true, questionsJson: true },
    orderBy: [{ category: "asc" }, { topic: "asc" }, { testNumber: "asc" }],
  });

  const deficient = tests.filter((t) => {
    const n = Array.isArray(t.questionsJson) ? t.questionsJson.length : 0;
    return n < TARGET;
  });

  // A status report is the main thing you want when picking this back up after a
  // quota reset, so surface the shape of the remaining work before doing any.
  if (DRY_RUN) {
    const byCat = new Map<string, { short: number; total: number; missing: number; empty: number }>();
    let emptyTopics = 0;
    for (const t of tests) {
      const n = Array.isArray(t.questionsJson) ? t.questionsJson.length : 0;
      const e = byCat.get(t.category) || { short: 0, total: 0, missing: 0, empty: 0 };
      e.total++;
      if (n < TARGET) {
        e.short++;
        e.missing += TARGET - n;
        if (n === 0) {
          e.empty++;
          emptyTopics++;
        }
      }
      byCat.set(t.category, e);
    }
    console.log(`\nAptitude shortfall (target ${TARGET} questions per test)`);
    console.log("-".repeat(72));
    console.log("category                 short/total   missing   empty");
    for (const [c, e] of [...byCat.entries()].sort((a, b) => b[1].missing - a[1].missing)) {
      console.log(
        `  ${c.padEnd(22)} ${String(e.short).padStart(3)}/${String(e.total).padEnd(4)} ` +
          `${String(e.missing).padStart(9)} ${String(e.empty).padStart(7)}`
      );
    }
    console.log("-".repeat(72));
    console.log(
      `  ${"TOTAL".padEnd(22)} ${String(deficient.length).padStart(3)}/${String(tests.length).padEnd(4)} ` +
        `${String(deficient.reduce((n, t) => n + (TARGET - (Array.isArray(t.questionsJson) ? t.questionsJson.length : 0)), 0)).padStart(9)} ` +
        `${String(emptyTopics).padStart(7)}`
    );
    if (emptyTopics > 0) {
      console.log(
        `\n${emptyTopics} test(s) have ZERO questions. These are shown as` +
          `\n"Being rebuilt" in the app until they are refilled.`
      );
    }
    console.log(
      `\nRe-run without --dry-run to generate. It is resumable: tests already at` +
        `\n${TARGET} questions are skipped.`
    );
  }

  // Cap the work list, not the results, so a pilot cannot burn LLM budget on
  // every remaining test.
  const queue = LIMIT > 0 ? deficient.slice(0, LIMIT) : deficient;
  log(
    `Aptitude: ${deficient.length} of ${tests.length} tests below ${TARGET} questions` +
      (LIMIT > 0 ? ` — pilot will process the first ${queue.length}.` : ".")
  );

  const results: TopicResult[] = [];
  for (const t of queue) {
    const before = Array.isArray(t.questionsJson) ? t.questionsJson.length : 0;
    const requested = Math.min(TARGET - before, 30);
    const result: TopicResult = {
      testId: t.id,
      topic: t.topic,
      category: t.category,
      testNumber: t.testNumber,
      before,
      requested,
      generated: 0,
      attempts: 0,
      after: before,
      status: "error",
    };

    if (DRY_RUN) {
      result.status = "dry-run";
      results.push(result);
      continue;
    }

    const covered = (Array.isArray(t.questionsJson) ? (t.questionsJson as any[]) : [])
      .slice(0, 12)
      .map((q: any, i: number) => `${i + 1}. ${stripBracketedPrefix(q.text || "").slice(0, 80)}`)
      .join("\n");

    try {
      const gen = await generateUniqueTopicQuestions({
        topic: t.topic,
        category: t.category as AptitudeCategory,
        count: requested,
        difficulty: difficultyFor(t.testNumber),
        company: t.category === "company" ? t.topic : undefined,
        coveredSummary: covered || undefined,
        maxAttempts: 6,
        batchSize: BATCH_SIZE,
        throttleMs: THROTTLE_MS,
      });
      result.generated = gen.questions.length;
      result.attempts = gen.attempts;
      result.bankRejections = gen.diagnostics.bankRejections;
      result.parseFailures = gen.diagnostics.parseFailures;

      // The model never returned anything parseable: a quota/rate-limit or JSON
      // problem, not evidence the topic is out of concepts. Reporting this as
      // "exhausted" would permanently mark a fillable test as unfixable.
      if (gen.diagnostics.validResponses === 0) {
        result.status = "error";
        result.note =
          `no usable model response in ${gen.attempts} attempt(s) ` +
          `(${gen.diagnostics.parseFailures} parse failure(s), ` +
          `${gen.diagnostics.apiErrors} API error(s)) — retry later`;
      } else if (gen.questions.length === 0) {
        result.status = "exhausted";
        result.note =
          `all ${gen.diagnostics.bankRejections} proposal(s) were already in the bank; ` +
          `no unused concepts remain for this topic`;
      } else {
        // Reserve in the bank BEFORE writing, so a concurrent run cannot claim
        // the same concepts between generation and persistence.
        const commit = await commitToBank(
          gen.questions.map((q, i) => ({
            question: q.text,
            options: q.options,
            correctIdx: q.correctIdx,
            source: SOURCE_APTITUDE,
            topic: t.topic,
            category: t.category,
            company: t.category === "company" ? t.topic : null,
            difficulty: q.difficulty,
            testId: t.id,
            position: before + i,
          }))
        );
        if (commit.rejectedAsDuplicate > 0) {
          log(
            `  ! ${t.topic} T${t.testNumber}: ${commit.rejectedAsDuplicate} concept(s) ` +
              `lost a commit race — discarding them.`
          );
        }
        if (commit.inserted === 0) {
          result.status = "exhausted";
          result.note = "All proposed concepts were already claimed by a concurrent run.";
        } else {
          // The bank stores text/options/answer but not the model's explanation,
          // shortcut or common mistakes. Re-reading rows and rebuilding the
          // question from scratch threw all of that away, so map the surviving
          // bank rows back onto the generated objects to keep the full payload.
          const banked = await masterPrisma.questionBankEntry.findMany({
            where: { testId: t.id },
            select: { questionText: true, position: true },
            orderBy: { position: "asc" },
          });
          const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
          const byText = new Map(gen.questions.map((q) => [norm(q.text), q]));
          const newOnes = banked
            .filter((b) => (b.position ?? 0) >= before)
            .map((b) => byText.get(norm(b.questionText)))
            .filter((q): q is (typeof gen.questions)[number] => !!q);
          if (newOnes.length !== commit.inserted) {
            log(
              `  ! ${t.topic} T${t.testNumber}: bank has ${commit.inserted} new row(s) but ` +
                `${newOnes.length} matched a generated question — persisting ${newOnes.length}.`
            );
          }
          const existing = Array.isArray(t.questionsJson) ? (t.questionsJson as any[]) : [];
          const merged = [
            ...existing,
            ...newOnes.map((q) => ({
              text: q.text,
              options: q.options,
              correctIdx: q.correctIdx,
              explanation: q.explanation,
              shortcut: q.shortcut,
              difficulty: q.difficulty,
              estimatedTimeSec: q.estimatedTimeSec,
              commonMistakes: q.commonMistakes,
              topic: q.topic,
              category: q.category,
              companyTags: q.companyTags,
            })),
          ];
          await masterPrisma.aptitudeTopicTest.update({
            where: { id: t.id },
            data: { questionsJson: merged as any, totalQuestions: merged.length },
          });
          result.after = merged.length;
          result.status = merged.length >= TARGET ? "filled" : "partial";
        }
      }
    } catch (err: any) {
      result.status = "error";
      result.note = (err as Error)?.message?.slice(0, 200) || String(err);
      log(`  x ${t.topic} T${t.testNumber}: ${result.note}`);
    }

    log(
      `  ${t.topic.padEnd(28)} T${t.testNumber}  ${before} -> ${result.after} ` +
        `(${result.status}, ${result.attempts} attempts)`
    );
    results.push(result);
  }
  return results;
}

async function regenerateMcq(): Promise<TopicResult[]> {
  if (!fs.existsSync(MCQ_STORE)) {
    log("MCQ store not found; skipping MCQ source.");
    return [];
  }
  const tests = JSON.parse(fs.readFileSync(MCQ_STORE, "utf-8"));
  const deficient = tests.filter((t: any) => (t.questions?.length || 0) < TARGET);
  log(`MCQ: ${deficient.length} of ${tests.length} tests below ${TARGET} questions.`);

  const results: TopicResult[] = [];
  for (const t of deficient) {
    const before = t.questions?.length || 0;
    const requested = Math.min(TARGET - before, 30);
    const result: TopicResult = {
      testId: t.id,
      topic: t.targetName,
      category: t.targetType,
      testNumber: t.testNumber,
      before,
      requested,
      generated: 0,
      attempts: 0,
      after: before,
      status: "error",
    };
    if (DRY_RUN) {
      result.status = "dry-run";
      results.push(result);
      continue;
    }
    // MCQ regeneration reuses the aptitude generator's uniqueness gate via the
    // bank; a dedicated technical generator is added in a later pass.
    result.status = "error";
    result.note = "MCQ top-up not yet implemented; aptitude path only.";
    results.push(result);
  }
  return results;
}

async function main() {
  console.log("=".repeat(78));
  console.log(
    DRY_RUN
      ? "SHORTFALL REGENERATION (DRY RUN)"
      : `SHORTFALL REGENERATION (target ${TARGET} questions/test${LIMIT ? `, pilot ${LIMIT}` : ""})`
  );
  console.log("=".repeat(78));

  // One bank load up front purely to report the starting position.
  const bank = await loadBank(undefined, { includeTexts: false });
  log(`Global bank currently holds ${bank.totalEntries} concepts.`);

  let all: TopicResult[] = [];
  if (SOURCE === "all" || SOURCE === "aptitude") {
    all = all.concat(await regenerateAptitude());
  }
  if (SOURCE === "all" || SOURCE === "mcq") {
    all = all.concat(await regenerateMcq());
  }

  // The aptitude queue is already capped by LIMIT, so no result slicing here.
  const filled = all.filter((r) => r.status === "filled").length;
  const partial = all.filter((r) => r.status === "partial").length;
  const exhausted = all.filter((r) => r.status === "exhausted").length;
  const errored = all.filter((r) => r.status === "error").length;
  const added = all.reduce((n, r) => n + r.generated, 0);

  console.log("\n" + "=".repeat(78));
  console.log("SUMMARY");
  console.log("=".repeat(78));
  console.log(`Tests processed:  ${all.length}`);
  console.log(`Questions added:  ${added}`);
  console.log(`Filled to target: ${filled}`);
  console.log(`Partial:          ${partial}`);
  console.log(`Exhausted:        ${exhausted}`);
  console.log(`Errors:           ${errored}`);

  const bankAfter = await loadBank(undefined, { includeTexts: false });
  console.log(`Bank: ${bank.totalEntries} -> ${bankAfter.totalEntries} concepts`);

  if (!DRY_RUN) {
    fs.writeFileSync(
      REPORT_FILE,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          targetSize: TARGET,
          summary: { processed: all.length, added, filled, partial, exhausted, errored },
          results: all,
        },
        null,
        2
      ),
      "utf-8"
    );
    console.log(`\nReport: ${REPORT_FILE}`);
  }

  if (exhausted + errored > 0) {
    console.log(
      "\nTopics that stayed short need authored content, not regeneration —\n" +
        "the LLM cannot invent concepts that do not exist in the source material."
    );
  }

  await masterPrisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[regenerate] FAILED:", err);
  await masterPrisma.$disconnect();
  process.exit(1);
});

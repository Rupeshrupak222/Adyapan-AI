/**
 * Global question uniqueness backfill.
 *
 * Audits every question that already exists (MCQ tests from the JSON store and
 * aptitude tests from Postgres), prunes duplicates, seeds the global
 * question_bank from the survivors, and reports the shortfall so the gaps can be
 * refilled with genuinely new questions.
 *
 * Usage:
 *   npx tsx scripts/dedupe-existing-questions.ts              # dry-run audit
 *   npx tsx scripts/dedupe-existing-questions.ts --apply      # write changes
 *   npx tsx scripts/dedupe-existing-questions.ts --apply --prune-only
 *   npx tsx scripts/dedupe-existing-questions.ts --seed-only
 *
 * Policy: KEEP THE FIRST OCCURRENCE of each concept, prune the rest. The first
 * occurrence is the oldest published question, so users who already saw it keep
 * a consistent view.
 *
 * Safety: a timestamped backup of the MCQ store is written before any mutation,
 * and the script refuses to run twice with --apply unless --force is passed.
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
  auditBank,
  commitToBank,
} from "../src/services/question-bank.service";

const DATA_DIR = path.join(__dirname, "../data");
const MCQ_STORE = path.join(DATA_DIR, "mcq-tests-store.json");

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const PRUNE_ONLY = args.has("--prune-only");
const SEED_ONLY = args.has("--seed-only");
const FORCE = args.has("--force");
const SKIP_BACKFILL = args.has("--skip-backfill");

interface Occurrence {
  source: "mcq" | "aptitude";
  /** Stable location so the survivor can be traced back. */
  locator: string;
  testId: string;
  testName: string;
  position: number;
  text: string;
  codeSnippet?: string;
  options?: string[];
  correctIdx?: number;
  topic?: string | null;
  category?: string | null;
  company?: string | null;
  difficulty?: string | null;
}

interface PruneGroup {
  key: string;
  kind: "exact" | "template" | "concept";
  kept: Occurrence;
  removed: Occurrence[];
}

function heading(title: string) {
  console.log("\n" + "=".repeat(78));
  console.log(title);
  console.log("=".repeat(78));
}

/**
 * Assign every occurrence to exactly one group so a question is never reported
 * as removed twice. Exact duplicates are resolved first (they are the most
 * severe), then digits-masked template variants, then concept signatures.
 */
function groupOccurrences(occurrences: Occurrence[]): {
  groups: PruneGroup[];
  kept: Occurrence[];
  removed: Occurrence[];
} {
  const removedIds = new Set<string>();
  const groups: PruneGroup[] = [];
  const survivors: Occurrence[] = [];

  const resolve = (kind: PruneGroup["kind"], keyFn: (o: Occurrence) => string) => {
    const buckets = new Map<string, Occurrence[]>();
    for (const o of occurrences) {
      if (removedIds.has(o.locator)) continue;
      const k = keyFn(o);
      if (!k) continue;
      const arr = buckets.get(k) || [];
      arr.push(o);
      buckets.set(k, arr);
    }
    for (const [key, items] of buckets) {
      if (items.length <= 1) continue;
      // Keep the first occurrence; prune the rest.
      const [kept, ...rest] = items;
      for (const r of rest) removedIds.add(r.locator);
      groups.push({ key, kind, kept, removed: rest });
    }
  };

  resolve("exact", (o) => dedupInfoFromQuestion({ question: o.text, codeSnippet: o.codeSnippet }).fingerprint);
  resolve("template", (o) =>
    dedupInfoFromQuestion({ question: o.text, codeSnippet: o.codeSnippet }).templateFingerprint
  );
  resolve("concept", (o) =>
    dedupInfoFromQuestion({ question: o.text, codeSnippet: o.codeSnippet }).conceptSignature
  );

  for (const o of occurrences) {
    if (!removedIds.has(o.locator)) survivors.push(o);
  }
  return { groups, kept: survivors, removed: occurrences.filter((o) => removedIds.has(o.locator)) };
}

function loadMcqOccurrences(): { tests: any[]; occurrences: Occurrence[] } {
  if (!fs.existsSync(MCQ_STORE)) {
    console.warn(`[backfill] MCQ store not found at ${MCQ_STORE} — skipping MCQ source.`);
    return { tests: [], occurrences: [] };
  }
  const tests = JSON.parse(fs.readFileSync(MCQ_STORE, "utf-8"));
  const occurrences: Occurrence[] = [];
  for (const t of tests) {
    const qs = Array.isArray(t.questions) ? t.questions : [];
    qs.forEach((q: any, i: number) => {
      if (!q?.question) return;
      occurrences.push({
        source: SOURCE_MCQ as "mcq",
        locator: `mcq:${t.id}:${i}`,
        testId: t.id,
        testName: `${t.targetName} - Test ${t.testNumber}`,
        position: i,
        text: q.question,
        codeSnippet: q.codeSnippet,
        options: q.options,
        correctIdx: q.correctIdx,
        topic: t.targetName,
        category: t.targetType,
        company: t.targetType === "company" ? t.targetName : null,
        difficulty: q.difficulty ?? t.difficulty ?? null,
      });
    });
  }
  return { tests, occurrences };
}

async function loadAptitudeOccurrences(): Promise<Occurrence[]> {
  const rows = await masterPrisma.aptitudeTopicTest.findMany({
    select: { id: true, topic: true, category: true, questionsJson: true, testNumber: true },
  });
  const occurrences: Occurrence[] = [];
  for (const t of rows) {
    const qs = Array.isArray(t.questionsJson) ? (t.questionsJson as any[]) : [];
    qs.forEach((q: any, i: number) => {
      if (!q?.text) return;
      occurrences.push({
        source: SOURCE_APTITUDE as "aptitude",
        locator: `aptitude:${t.id}:${i}`,
        testId: t.id,
        testName: `${t.topic} - Test ${t.testNumber}`,
        position: i,
        text: q.text,
        options: q.options,
        correctIdx: q.correctIdx,
        topic: t.topic,
        category: t.category,
        company: t.category === "company" ? t.topic : null,
        difficulty: q.difficulty ?? null,
      });
    });
  }
  return occurrences;
}

async function main() {
  heading(
    APPLY
      ? "GLOBAL QUESTION UNIQUENESS BACKFILL (APPLYING)"
      : "GLOBAL QUESTION UNIQUENESS BACKFILL (DRY RUN — no changes written)"
  );
  if (!APPLY) {
    console.log("Re-run with --apply to write changes.");
  }

  // ── 1. Collect every existing question ────────────────────────────────
  const { tests: mcqTests, occurrences: mcqOcc } = loadMcqOccurrences();
  let aptOcc: Occurrence[] = [];
  try {
    aptOcc = await loadAptitudeOccurrences();
  } catch (err) {
    console.warn(
      "[backfill] Could not read aptitudeTopicTest (is the database reachable?):",
      (err as Error)?.message || err
    );
  }

  const all = [...mcqOcc, ...aptOcc];
  console.log(`MCQ questions:      ${mcqOcc.length}`);
  console.log(`Aptitude questions: ${aptOcc.length}`);
  console.log(`Total questions:    ${all.length}`);

  if (all.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  // ── 2. Group and resolve duplicates ──────────────────────────────────
  const { groups, kept, removed } = groupOccurrences(all);
  const byKind = (k: PruneGroup["kind"]) => groups.filter((g) => g.kind === k);

  heading("DUPLICATE GROUPS FOUND");
  for (const kind of ["exact", "template", "concept"] as const) {
    const gs = byKind(kind);
    const affected = gs.reduce((n, g) => n + g.removed.length, 0);
    console.log(`${kind.padEnd(8)} groups: ${String(gs.length).padStart(5)}   questions to prune: ${affected}`);
  }
  const uniqCount = new Set(
    kept.map((o) => dedupInfoFromQuestion({ question: o.text, codeSnippet: o.codeSnippet }).fingerprint)
  ).size;
  console.log(
    `\nDuplication rate: ${(((all.length - uniqCount) / all.length) * 100).toFixed(1)}% ` +
      `(${all.length} questions -> ${uniqCount} unique concepts)`
  );

  if (groups.length === 0) {
    console.log("\nNo duplicates found.");
  } else {
    heading("TOP 15 DUPLICATE GROUPS (first 5 shown)");
    const worst = [...groups].sort((a, b) => b.removed.length - a.removed.length).slice(0, 15);
    for (const g of worst) {
      console.log(`\n[${g.kind}] ${g.removed.length + 1} copies — kept from ${g.kept.testName}`);
      console.log(`  KEPT:    ${stripBracketedPrefix(g.kept.text).slice(0, 110)}`);
      for (const r of g.removed.slice(0, 4)) {
        console.log(`  PRUNED:  ${r.testName} :: ${stripBracketedPrefix(r.text).slice(0, 100)}`);
      }
      if (g.removed.length > 4) console.log(`  ... and ${g.removed.length - 4} more`);
    }
  }

  // ── 3. Per-test shortfall ────────────────────────────────────────────
  heading("PER-TEST IMPACT");
  const removedByTest = new Map<string, number>();
  for (const r of removed) {
    removedByTest.set(r.testId, (removedByTest.get(r.testId) || 0) + 1);
  }
  const testNames = new Map<string, string>();
  for (const o of all) if (!testNames.has(o.testId)) testNames.set(o.testId, o.testName);

  const impacted = Array.from(removedByTest.entries()).sort((a, b) => b[1] - a[1]);
  console.log(`Tests affected: ${impacted.length}`);
  for (const [testId, n] of impacted.slice(0, 30)) {
    console.log(`  ${(testNames.get(testId) || testId).padEnd(45)} -${n}`);
  }
  if (impacted.length > 30) console.log(`  ... and ${impacted.length - 30} more`);

  const shortfallPath = path.join(DATA_DIR, "question-backfill-shortfall.json");
  const shortfall = impacted.map(([testId, n]) => ({ testId, testName: testNames.get(testId), removed: n }));

  if (!APPLY) {
    heading("DRY RUN SUMMARY");
    console.log(`Would prune ${removed.length} duplicate question(s) across ${impacted.length} test(s).`);
    console.log(`Would seed ${kept.length} unique concept(s) into question_bank.`);
    console.log(`Shortfall report would be written to ${shortfallPath}`);
    console.log("\nRe-run with --apply to write these changes.");
    return;
  }

  if (args.has("--prune-only") && args.has("--seed-only")) {
    throw new Error("--prune-only and --seed-only are mutually exclusive");
  }

  // ── 4. Back up before mutating ───────────────────────────────────────
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (fs.existsSync(MCQ_STORE)) {
    const backup = MCQ_STORE.replace(/\.json$/, `.pre-dedupe.${stamp}.json`);
    fs.copyFileSync(MCQ_STORE, backup);
    console.log(`\nMCQ backup written:    ${backup}`);
  }
  // The aptitude tests live in Postgres, so they need their own backup. Without
  // this the prune step would be irreversible.
  try {
    const allTests = await masterPrisma.aptitudeTopicTest.findMany();
    const backupFile = path.join(DATA_DIR, `aptitude-tests.pre-dedupe.${stamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(allTests, null, 2), "utf-8");
    console.log(`Aptitude backup written: ${backupFile} (${allTests.length} tests)`);
  } catch (err) {
    console.error(
      "\n[backfill] FATAL: could not back up aptitude_topic_tests — refusing to prune.",
      (err as Error)?.message || err
    );
    process.exit(1);
  }

  // ── 5. Prune duplicates ──────────────────────────────────────────────
  if (!SEED_ONLY) {
    heading("PRUNING DUPLICATES");
    const aptitudeRemovals = new Map<string, number[]>();
    for (const r of removed) {
      if (r.source === SOURCE_APTITUDE) {
        const arr = aptitudeRemovals.get(r.testId) || [];
        arr.push(r.position);
        aptitudeRemovals.set(r.testId, arr);
      }
    }

    // MCQ: rewrite the store, dropping pruned questions.
    if (mcqOcc.length > 0) {
      const removedMcq = new Set(removed.filter((r) => r.source === SOURCE_MCQ).map((r) => r.locator));
      let prunedCount = 0;
      const rewritten = mcqTests.map((t: any) => {
        const keptQs = (t.questions || []).filter((_q: any, i: number) => {
          const drop = removedMcq.has(`mcq:${t.id}:${i}`);
          if (drop) prunedCount++;
          return !drop;
        });
        // Question IDs are intentionally left untouched so existing bookmarks,
        // attempts and user_question_history rows keep resolving.
        return { ...t, questionCount: keptQs.length, questions: keptQs };
      });
      fs.writeFileSync(MCQ_STORE, JSON.stringify(rewritten, null, 2), "utf-8");
      console.log(`MCQ: pruned ${prunedCount} question(s) from ${mcqTests.length} test(s).`);
    }

    // Aptitude: rewrite questionsJson per test, dropping pruned positions.
    for (const [testId, positions] of aptitudeRemovals) {
      const drop = new Set(positions);
      const test = await masterPrisma.aptitudeTopicTest.findUnique({ where: { id: testId } });
      if (!test || !Array.isArray(test.questionsJson)) continue;
      const qs = (test.questionsJson as any[]).filter((_q, i) => !drop.has(i));
      await masterPrisma.aptitudeTopicTest.update({
        where: { id: testId },
        data: { questionsJson: qs as any, totalQuestions: qs.length },
      });
    }
    if (aptitudeRemovals.size > 0) {
      const total = Array.from(aptitudeRemovals.values()).reduce((n, a) => n + a.length, 0);
      console.log(`Aptitude: pruned ${total} question(s) from ${aptitudeRemovals.size} test(s).`);
    }
  }

  // ── 6. Seed the global bank ──────────────────────────────────────────
  if (!PRUNE_ONLY) {
    heading("SEEDING GLOBAL QUESTION BANK");
    const result = await commitToBank(
      kept.map((o, idx) => ({
        question: o.text,
        codeSnippet: o.codeSnippet,
        options: o.options,
        correctIdx: o.correctIdx,
        source: o.source,
        topic: o.topic ?? null,
        category: o.category ?? null,
        company: o.company ?? null,
        difficulty: o.difficulty ?? null,
        testId: o.testId,
        position: o.position ?? idx,
      }))
    );
    console.log(`Inserted ${result.inserted} concept(s).`);
    if (result.rejectedAsDuplicate > 0) {
      console.log(
        `${result.rejectedAsDuplicate} rejected by the UNIQUE constraints ` +
          `(pre-existing bank rows) — these were already banked.`
      );
    }
  }

  // ── 7. Write the shortfall report ────────────────────────────────────
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(shortfallPath, JSON.stringify(shortfall, null, 2), "utf-8");
  console.log(`\nShortfall report: ${shortfallPath}`);

  // ── 8. Verify ────────────────────────────────────────────────────────
  heading("VERIFICATION");
  const audit = await auditBank();
  const exactRows = audit.exactDuplicateGroups.reduce((n, g) => n + g.count - 1, 0);
  const templateRows = audit.templateDuplicateGroups.reduce((n, g) => n + g.count - 1, 0);
  console.log(`Bank entries:               ${audit.totalEntries}`);
  console.log(`Exact duplicate groups:     ${audit.exactDuplicateGroups.length}`);
  console.log(`Value-change dup groups:    ${audit.templateDuplicateGroups.length}`);
  console.log(
    `RESULT: ${audit.exactDuplicateGroups.length === 0 && audit.templateDuplicateGroups.length === 0 ? "PASS — 0 duplicates" : "FAIL — duplicates remain"}`
  );

  heading("NEXT STEP: BACKFILL THE GAPS");
  console.log(`${impacted.length} test(s) are now short on questions.`);
  if (SKIP_BACKFILL) {
    console.log("Backfill skipped (--skip-backfill).");
  } else {
    console.log(
      "Re-generate the affected tests from the admin panel. Generation now reads\n" +
        "the seeded bank, so replacement questions are guaranteed not to collide\n" +
        "with anything already stored."
    );
  }
  if (!FORCE && !SKIP_BACKFILL) {
    console.log(
      "\nNote: the admin generator will hard-fail for any target whose unique\n" +
        "concept pool is genuinely exhausted rather than emit duplicates."
    );
  }
}

main()
  .then(async () => {
    await masterPrisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[backfill] FAILED:", err);
    await masterPrisma.$disconnect();
    process.exit(1);
  });

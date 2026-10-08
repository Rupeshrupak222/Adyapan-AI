/**
 * Exact-duplicate prune for the Technical MCQ store (JSON + Postgres).
 *
 * Two copies of the same question (same normalised text AND the same code
 * snippet) are a real uniqueness bug: a user can meet the same item twice inside
 * one test, or once in Test #1 and again in Test #2 of the same target. This
 * script finds every such group with the platform's own gate
 * (`dedupInfoFromQuestion().fingerprint`), keeps the first occurrence in store
 * order, prunes the rest, and — with `--topup` — regenerates a replacement for
 * each pruned question so no test ends up shorter than it was.
 *
 * Both stores move together. Postgres is the source of truth at boot and the
 * JSON file is only the offline cache, but the boot-time self-heal pushes the
 * JSON copy into the database whenever the JSON copy has MORE questions — so
 * pruning the file alone would silently restore the duplicates on restart.
 *
 * The pruned concept stays in question_bank, so a top-up cannot regenerate it.
 *
 * Usage:
 *   npx tsx scripts/dedupe-exact-duplicates.ts                  # dry run
 *   npx tsx scripts/dedupe-exact-duplicates.ts --apply          # prune + sync
 *   npx tsx scripts/dedupe-exact-duplicates.ts --apply --topup  # + regenerate
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
  SOURCE_MCQ,
  commitToBank,
  loadBank,
  type BankSnapshot,
} from "../src/services/question-bank.service";
import {
  generateUniqueMcqQuestions,
  summarizeCovered,
} from "../src/services/mcq-topup.service";
import { persistTestToDb } from "../src/services/mcq-store-db";
// Type-only on purpose: importing mcq.service runs initializeTestStore(), which
// would re-seed and rewrite the JSON cache behind our back.
import type { MCQQuestion, MCQTest } from "../src/services/mcq.service";

const DATA_DIR = path.join(__dirname, "../data");
const MCQ_STORE = path.join(DATA_DIR, "mcq-tests-store.json");

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const TOPUP = argv.includes("--topup");
const FORCE_DB = argv.includes("--force-db");
const THROTTLE_MS = 3000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function heading(title: string) {
  console.log("\n" + "=".repeat(78));
  console.log(title);
  console.log("=".repeat(78));
}

const fpOf = (q: { question?: string; codeSnippet?: string }) =>
  dedupInfoFromQuestion({ question: q.question || "", codeSnippet: q.codeSnippet }).fingerprint;

interface Occ {
  testId: string;
  testName: string;
  testNumber: number;
  qid: string;
  fp: string;
}

function collect(tests: MCQTest[]): Occ[] {
  const out: Occ[] = [];
  for (const t of tests) {
    for (const q of t.questions || []) {
      const fp = fpOf(q);
      if (!fp) continue;
      out.push({
        testId: t.id,
        testName: `${t.targetName} - Test ${t.testNumber}`,
        testNumber: t.testNumber,
        qid: q.id,
        fp,
      });
    }
  }
  return out;
}

function duplicateGroups(occ: Occ[]): Map<string, Occ[]> {
  const m = new Map<string, Occ[]>();
  for (const o of occ) {
    const arr = m.get(o.fp) || [];
    arr.push(o);
    m.set(o.fp, arr);
  }
  for (const [k, v] of m) if (v.length <= 1) m.delete(k);
  return m;
}

/**
 * question_bank ∪ mcq_questions ∪ aptitude_topic_tests.questionsJson — the same
 * whole-database registry the daily generator gates on, so a replacement cannot
 * collide with anything the platform stores anywhere.
 */
async function buildRegistry(): Promise<BankSnapshot> {
  const snap = await loadBank(undefined, { includeTexts: true });
  const texts = new Set(snap.recentTexts);

  const add = (text: string, codeSnippet?: string) => {
    if (!text) return;
    const d = dedupInfoFromQuestion({ question: text, codeSnippet });
    if (!d.fingerprint) return;
    snap.fingerprints.add(d.fingerprint);
    if (d.templateFingerprint) snap.templates.add(d.templateFingerprint);
    if (d.conceptSignature) snap.conceptSignatures.add(d.conceptSignature);
    texts.add(stripBracketedPrefix(text).toLowerCase());
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
  return snap;
}

function ban(snap: BankSnapshot, questions: { question?: string; text?: string; codeSnippet?: string }[]) {
  for (const q of questions) {
    const d = dedupInfoFromQuestion(q as any);
    if (!d.fingerprint) continue;
    snap.fingerprints.add(d.fingerprint);
    if (d.templateFingerprint) snap.templates.add(d.templateFingerprint);
    if (d.conceptSignature) snap.conceptSignatures.add(d.conceptSignature);
    snap.recentTexts.push(stripBracketedPrefix(d.text).toLowerCase());
  }
}

async function main() {
  heading(APPLY ? "EXACT-DUPLICATE PRUNE (APPLYING)" : "EXACT-DUPLICATE PRUNE (DRY RUN — no changes written)");
  if (!APPLY) console.log("Re-run with --apply to write changes.");

  const tests: MCQTest[] = JSON.parse(fs.readFileSync(MCQ_STORE, "utf-8"));
  const jsonOcc = collect(tests);
  const jsonGroups = duplicateGroups(jsonOcc);
  console.log(`JSON store: ${tests.length} tests / ${jsonOcc.length} questions`);

  // ── Postgres side ──────────────────────────────────────────────────────────
  let dbOcc: Occ[] = [];
  let dbAvailable = false;
  const dbOnlyIds: string[] = [];
  const outOfSync: string[] = [];
  try {
    const rows = await (masterPrisma as any).mcqQuestion.findMany({
      select: { id: true, testId: true, question: true, codeSnippet: true },
    });
    dbAvailable = true;
    const testNameById = new Map(tests.map((t) => [t.id, `${t.targetName} - Test ${t.testNumber}`]));
    dbOcc = rows.map((r: any) => ({
      testId: r.testId,
      testName: testNameById.get(r.testId) || r.testId,
      testNumber: 0,
      qid: r.id,
      fp: dedupInfoFromQuestion({ question: r.question, codeSnippet: r.codeSnippet ?? undefined }).fingerprint,
    }));
    const jsonIds = new Set(jsonOcc.map((o) => o.qid));
    for (const o of dbOcc) if (!jsonIds.has(o.qid)) dbOnlyIds.push(`${o.testId}#${o.qid}`);

    const byTestJson = new Map<string, string[]>();
    for (const o of jsonOcc) (byTestJson.get(o.testId) || byTestJson.set(o.testId, []).get(o.testId)!).push(o.fp);
    const byTestDb = new Map<string, string[]>();
    for (const o of dbOcc) (byTestDb.get(o.testId) || byTestDb.set(o.testId, []).get(o.testId)!).push(o.fp);
    for (const t of tests) {
      const a = (byTestJson.get(t.id) || []).slice().sort();
      const b = (byTestDb.get(t.id) || []).slice().sort();
      if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
        outOfSync.push(`${t.id} (json=${a.length}, db=${b.length})`);
      }
    }
  } catch (err) {
    console.warn("Postgres unavailable:", (err as Error).message);
  }

  heading("EXACT DUPLICATE GROUPS (same text + same code snippet)");
  if (jsonGroups.size === 0) {
    console.log("None in the JSON store.");
  }
  const removalsByTest = new Map<string, { keep: Occ; drop: Occ[]; testName: string; before: number }>();
  for (const [, occs] of jsonGroups) {
    const [keep, ...drop] = occs;
    console.log(`x${occs.length}  keep ${keep.testId}#${keep.qid}`);
    for (const d of drop) console.log(`       drop ${d.testId}#${d.qid}`);
    for (const d of drop) {
      const entry = removalsByTest.get(d.testId) || {
        keep,
        drop: [],
        testName: d.testName,
        before: (tests.find((t) => t.id === d.testId)?.questions || []).length,
      };
      entry.drop.push(d);
      removalsByTest.set(d.testId, entry);
    }
  }

  heading("PER-TEST IMPACT");
  if (removalsByTest.size === 0) console.log("No test is affected.");
  for (const [testId, e] of removalsByTest) {
    console.log(`  ${e.testName.padEnd(45)} ${e.before} -> ${e.before - e.drop.length}  (-${e.drop.length})`);
  }

  heading("POSTGRES");
  if (!dbAvailable) {
    console.log("Database not reachable — only the JSON file could be pruned.");
  } else {
    const dbGroups = duplicateGroups(dbOcc);
    console.log(`DB questions: ${dbOcc.length} / exact-duplicate groups: ${dbGroups.size}`);
    for (const [, occs] of dbGroups) {
      console.log(`  x${occs.length}: ${occs.map((o) => `${o.testId}#${o.qid}`).join("  ||  ")}`);
    }
    console.log(`Tests out of sync (JSON vs DB): ${outOfSync.length}`);
    for (const s of outOfSync.slice(0, 20)) console.log(`  ${s}`);
    if (outOfSync.length > 20) console.log(`  ... and ${outOfSync.length - 20} more`);
    console.log(`Question ids present only in the DB: ${dbOnlyIds.length}`);
    for (const d of dbOnlyIds.slice(0, 10)) console.log(`  ${d}`);
  }

  if (!APPLY) {
    heading("DRY RUN SUMMARY");
    console.log(`Would prune ${Array.from(jsonGroups.values()).reduce((n, g) => n + g.length - 1, 0)} question(s) from ${removalsByTest.size} test(s).`);
    if (TOPUP) console.log("Would regenerate a replacement for each pruned question (--topup).");
    if (dbAvailable) {
      console.log(`Would re-persist ${outOfSync.length} out-of-sync test(s) to Postgres.`);
      if (dbOnlyIds.length > 0 && !FORCE_DB) {
        console.log(
          `WARNING: ${dbOnlyIds.length} question(s) exist only in Postgres and would be dropped by ` +
            `a sync — pass --force-db to proceed anyway.`
        );
      }
    }
    console.log("\nRe-run with --apply to write these changes.");
    return;
  }

  if (dbAvailable && dbOnlyIds.length > 0 && !FORCE_DB) {
    console.log(
      `\nRefusing to sync: ${dbOnlyIds.length} question(s) exist only in Postgres. ` +
        `Re-run with --force-db after checking them, or with --skip-db to prune the file only.`
    );
    if (!argv.includes("--skip-db")) return;
  }
  const SYNC_DB = dbAvailable && !argv.includes("--skip-db");

  // ── Backup, then prune ────────────────────────────────────────────────────
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = MCQ_STORE.replace(/\.json$/, `.pre-exact-dedupe.${stamp}.json`);
  fs.copyFileSync(MCQ_STORE, backup);
  console.log(`\nBackup written: ${backup}`);

  const prunedIds = new Set<string>();
  const pruned: MCQTest[] = tests.map((t) => {
    const affected = removalsByTest.get(t.id);
    if (!affected) return t;
    const dropQids = new Set(affected.drop.map((d) => d.qid));
    for (const q of dropQids) prunedIds.add(`${t.id}#${q}`);
    const questions = (t.questions || []).filter((q) => !dropQids.has(q.id));
    return { ...t, questionCount: questions.length, questions };
  });
  fs.writeFileSync(MCQ_STORE, JSON.stringify(pruned, null, 2), "utf-8");
  console.log(`Pruned ${prunedIds.size} question(s); JSON store rewritten.`);

  // ── Sync the affected tests into Postgres ─────────────────────────────────
  if (SYNC_DB) {
    heading("SYNCING POSTGRES");
    const toSync = pruned.filter((t) => outOfSync.some((s) => s.startsWith(`${t.id} `)) || removalsByTest.has(t.id));
    let ok = 0;
    let failed = 0;
    for (const t of toSync) {
      const wrote = await persistTestToDb(t);
      if (wrote) ok++;
      else failed++;
    }
    console.log(`Re-persisted ${ok} test(s), ${failed} failed (${toSync.length} attempted).`);
  }

  // ── Optional top-up ───────────────────────────────────────────────────────
  if (TOPUP && removalsByTest.size > 0) {
    heading("TOPPING UP PRUNED TESTS");
    const snapshot = await buildRegistry();
    const takenIds = new Set(pruned.flatMap((t) => (t.questions || []).map((q) => q.id)));

    for (const [testId, e] of removalsByTest) {
      const test = pruned.find((t) => t.id === testId);
      if (!test) continue;
      const needed = e.drop.length;
      const idOffset = (test.questions || []).length;

      const gen = await generateUniqueMcqQuestions({
        target: test.targetName,
        targetType: test.targetType as "technology" | "company",
        count: needed,
        difficulty: test.difficulty || "Medium",
        idPrefix: `mcq-${test.targetId}-t${test.testNumber}`,
        idOffset,
        coveredSummary: summarizeCovered(test.questions) || undefined,
        maxAttempts: Math.ceil(needed / 2) + 6,
        batchSize: 2,
        throttleMs: THROTTLE_MS,
        bank: snapshot,
      });

      if (gen.questions.length === 0) {
        console.log(`  ! ${e.testName}: no replacement generated (${gen.diagnostics.bankRejections} rejected) — test left at ${idOffset}.`);
        continue;
      }

      const commit = await commitToBank(
        gen.questions.map((q, i) => ({
          question: q.question,
          codeSnippet: q.codeSnippet,
          options: q.options,
          correctIdx: q.correctIdx,
          source: SOURCE_MCQ,
          topic: test.targetName,
          category: test.targetType,
          company: test.targetType === "company" ? test.targetName : null,
          difficulty: q.difficulty,
          testId: test.id,
          position: idOffset + i,
        }))
      );
      if (commit.inserted === 0) {
        console.log(`  ! ${e.testName}: every proposal was already banked — test left at ${idOffset}.`);
        continue;
      }

      const proposed = new Map(
        gen.questions.map((q) => [dedupInfoFromQuestion({ question: q.question, codeSnippet: q.codeSnippet }).fingerprint, q])
      );
      const banked = await (masterPrisma as any).questionBankEntry.findMany({
        where: { testId: test.id, source: SOURCE_MCQ },
        select: { fingerprint: true },
      });
      const won = new Set(banked.map((b: any) => b.fingerprint));
      const added: MCQQuestion[] = [];
      for (const q of gen.questions) {
        if (added.length >= commit.inserted) break;
        if (!won.has(dedupInfoFromQuestion({ question: q.question, codeSnippet: q.codeSnippet }).fingerprint)) continue;
        let id = q.id;
        while (takenIds.has(id)) id = `${id}#2`;
        takenIds.add(id);
        added.push({
          ...q,
          id,
          technology: test.targetType === "technology" ? test.targetName : q.technology || "Computer Science",
          company: test.targetType === "company" ? test.targetName : q.company,
        } as MCQQuestion);
      }
      if (added.length === 0) {
        console.log(`  ! ${e.testName}: commit lost every race — test left at ${idOffset}.`);
        continue;
      }

      test.questions = [...(test.questions || []), ...added];
      test.questionCount = test.questions.length;
      ban(snapshot, added.map((q) => ({ question: q.question, codeSnippet: q.codeSnippet })));

      if (SYNC_DB) await persistTestToDb(test);
      console.log(`  + ${e.testName}: generated ${added.length}/${needed} replacement(s) -> ${test.questionCount}.`);
      await sleep(THROTTLE_MS);
    }

    fs.writeFileSync(MCQ_STORE, JSON.stringify(pruned, null, 2), "utf-8");
    console.log("JSON store rewritten with top-ups.");
  }

  // ── Verify ────────────────────────────────────────────────────────────────
  heading("VERIFICATION");
  const finalTests: MCQTest[] = JSON.parse(fs.readFileSync(MCQ_STORE, "utf-8"));
  const finalGroups = duplicateGroups(collect(finalTests));
  console.log(`JSON: ${finalTests.length} tests / ${collect(finalTests).length} questions / exact-duplicate groups: ${finalGroups.size}`);
  for (const [, occs] of finalGroups) {
    console.log(`  x${occs.length}: ${occs.map((o) => `${o.testId}#${o.qid}`).join("  ||  ")}`);
  }
  const short = finalTests.filter((t) => (t.questions || []).length !== t.questionCount);
  console.log(`Tests whose questionCount disagrees with their array: ${short.length}`);

  if (SYNC_DB) {
    const rows = await (masterPrisma as any).mcqQuestion.findMany({
      select: { id: true, testId: true, question: true, codeSnippet: true },
    });
    const dbFinal = rows.map((r: any) => ({
      testId: r.testId,
      testName: r.testId,
      testNumber: 0,
      qid: r.id,
      fp: dedupInfoFromQuestion({ question: r.question, codeSnippet: r.codeSnippet ?? undefined }).fingerprint,
    }));
    const dbFinalGroups = duplicateGroups(dbFinal);
    console.log(`DB: ${dbFinal.length} questions / exact-duplicate groups: ${dbFinalGroups.size}`);
    for (const [, occs] of dbFinalGroups) {
      console.log(`  x${occs.length}: ${occs.map((o) => `${o.testId}#${o.qid}`).join("  ||  ")}`);
    }
    const jsonIds = new Set(collect(finalTests).map((o) => o.qid));
    const stillDbOnly = dbFinal.filter((o) => !jsonIds.has(o.qid)).length;
    console.log(`Question ids still only in the DB: ${stillDbOnly}`);
  }

  console.log(
    `\nRESULT: ${finalGroups.size === 0 ? "PASS — 0 exact duplicates in the JSON store" : "FAIL — duplicates remain"}`
  );
}

main()
  .then(async () => {
    await masterPrisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\nFAILED:", err);
    await masterPrisma.$disconnect();
    process.exit(1);
  });

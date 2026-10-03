/**
 * Replace duplicate / near-duplicate aptitude questions with genuinely new ones.
 *
 * Why this is a content swap and not a delete:
 *   - The global prune already ran (scripts/dedupe-existing-questions.ts) and
 *     left 250 near-duplicate "variations" plus 98 cross-test duplicates that
 *     its fingerprint pass could not see — chiefly reason puzzles where only the
 *     character names were swapped ("Karan said to Ananya" vs "Dev said to
 *     Meera"), which no fingerprint catches because the entities are unknown.
 *   - Users have already attempted many of these. Deleting them would shift
 *     every later index and orphan their attempts, so each offending question is
 *     REPLACED IN PLACE: same row, same index, same id. A user's attempt against
 *     position N keeps pointing at position N.
 *
 * Policy: keep the first occurrence, replace every later one — the same rule the
 * prune used, so the surviving question is always the one users already saw.
 *
 * Detection (per test, plus a global pass):
 *   - exact duplicate  -> same fingerprint as an already-kept question
 *   - near duplicate   -> Jaccard token overlap >= SIMILARITY_THRESHOLD (0.7)
 *
 * Usage:
 *   npx ts-node scripts/replace-aptitude-duplicates.ts                # dry-run
 *   npx ts-node scripts/replace-aptitude-duplicates.ts --apply
 *   npx ts-node scripts/replace-aptitude-duplicates.ts --apply --limit 10
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { masterPrisma } from "../src/utils/prisma";
import { generateUniqueTopicQuestions } from "../src/services/aptitude-engine.service";
import { commitToBank, SOURCE_APTITUDE } from "../src/services/question-bank.service";
import {
  fingerprint,
  tokenize,
  jaccard,
  SIMILARITY_THRESHOLD,
  conceptSignature,
} from "../src/lib/questions/question-fingerprint";

const DATA_DIR = path.join(__dirname, "../data");

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");

function flag(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const LIMIT_TESTS = flag("--limit-tests", Infinity);
const BATCH = 3;

type Slot = {
  testId: string;
  testName: string;
  topic: string;
  category: string;
  difficulty: string;
  position: number;
  questionId: string;
  reason: "exact" | "variation";
  score: number;
  against: string;
};

type AptTest = {
  id: string;
  topic: string;
  category: string;
  difficulty: string;
  title: string;
  testNumber: number;
  questionsJson: any;
};

/** Decide which questions must be replaced, without touching the database. */
function findDuplicates(tests: AptTest[]): Slot[] {
  const slots: Slot[] = [];
  // Global "already kept" registry: fingerprint -> first-seen question.
  const keptByFingerprint = new Map<string, string>();
  // Only questions already promoted to a slot. A kept question must NOT be in
  // here — otherwise pass 2 treats every kept question as "already decided" and
  // silently skips the variation check for the whole bank.
  const isSlot = new Set<string>();
  const key = (testId: string, pos: number) => `${testId}#${pos}`;

  // Pass 1 — exact duplicates across the whole bank.
  for (const t of tests) {
    const qs: any[] = Array.isArray(t.questionsJson) ? t.questionsJson : [];
    for (let i = 0; i < qs.length; i++) {
      const text = String(qs[i]?.text || "");
      if (!text.trim()) continue;
      const fp = fingerprint(text, [t.topic || ""]);
      const prior = keptByFingerprint.get(fp);
      if (prior) {
        slots.push({
          testId: t.id,
          testName: `${t.topic} / ${t.title}`,
          topic: t.topic,
          category: t.category,
          difficulty: t.difficulty || "medium",
          position: i,
          questionId: String(qs[i]?.id ?? `${t.id}-q${i}`),
          reason: "exact",
          score: 1,
          against: prior,
        });
        isSlot.add(key(t.id, i));
      } else {
        keptByFingerprint.set(fp, `${t.topic} / ${t.title} #${i + 1}`);
      }
    }
  }

  // Pass 2 — near-duplicate variations inside each test. Compared only against
  // questions in the same test that are themselves kept, so a replacement never
  // gets flagged against another replacement.
  for (const t of tests) {
    const qs: any[] = Array.isArray(t.questionsJson) ? t.questionsJson : [];
    const anchorTokens: { pos: number; toks: Set<string>; text: string }[] = [];
    for (let i = 0; i < qs.length; i++) {
      const text = String(qs[i]?.text || "");
      if (!text.trim()) continue;
      const k = key(t.id, i);

      // Already a slot from pass 1 — nothing left to decide.
      if (isSlot.has(k)) continue;

      let best = 0;
      let bestText = "";
      const toks = tokenize(text);
      for (const a of anchorTokens) {
        const s = jaccard(a.toks, toks);
        if (s > best) {
          best = s;
          bestText = a.text;
        }
      }
      if (best >= SIMILARITY_THRESHOLD) {
        slots.push({
          testId: t.id,
          testName: `${t.topic} / ${t.title}`,
          topic: t.topic,
          category: t.category,
          difficulty: t.difficulty || "medium",
          position: i,
          questionId: String(qs[i]?.id ?? `${t.id}-q${i}`),
          reason: "variation",
          score: best,
          against: bestText.slice(0, 80),
        });
        isSlot.add(k);
      } else {
        anchorTokens.push({ pos: i, toks, text });
      }
    }
  }

  return slots;
}

async function backup() {
  const tests = await masterPrisma.aptitudeTopicTest.findMany();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(DATA_DIR, `aptitude-tests.pre-replace.${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(tests, null, 2), "utf-8");
  console.log(`[backup] ${file} (${tests.length} tests)`);
}

async function main() {
  const tests = (await masterPrisma.aptitudeTopicTest.findMany()) as unknown as AptTest[];
  const slots = findDuplicates(tests);

  const exact = slots.filter((s) => s.reason === "exact").length;
  const variation = slots.length - exact;

  console.log("APTITUDE DUPLICATE REPLACEMENT PLAN");
  console.log(`  tests scanned:     ${tests.length}`);
  console.log(`  duplicates found:  ${slots.length}  (exact=${exact}, variation=${variation})`);
  console.log(`  tests affected:    ${new Set(slots.map((s) => s.testId)).size}`);

  const byTest = new Map<string, Slot[]>();
  for (const s of slots) {
    if (!byTest.has(s.testId)) byTest.set(s.testId, []);
    byTest.get(s.testId)!.push(s);
  }

  console.log("\n  per test:");
  for (const [testId, list] of Array.from(byTest.entries()).slice(0, 20)) {
    const t = tests.find((x) => x.id === testId)!;
    const mix = list.filter((s) => s.reason === "exact").length;
    console.log(
      `    ${(t?.topic || "?").padEnd(34)} ${String(list.length).padStart(3)} to replace  ` +
        `(exact=${mix}, variation=${list.length - mix})`
    );
  }
  if (byTest.size > 20) console.log(`    ...and ${byTest.size - 20} more tests`);

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply to replace.");
    return;
  }

  await backup();

  // Group by (topic, category, difficulty) so one generator call fills several
  // slots of the same flavour instead of one AI call per question.
  const groups = new Map<string, Slot[]>();
  for (const s of slots) {
    const k = `${s.topic}||${s.category}||${s.difficulty}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(s);
  }

  const grouped = Array.from(groups.entries()).slice(0, Number.isFinite(LIMIT_TESTS) ? LIMIT_TESTS : undefined);
  console.log(`\n[apply] ${slots.length} replacement(s) across ${grouped.length} generation group(s)`);

  let replaced = 0;
  let skipped = 0;
  const committed: any[] = [];

  for (let gi = 0; gi < grouped.length; gi++) {
    const [gk, list] = grouped[gi];
    const [topic, category, difficulty] = gk.split("||");
    const progress = `[${gi + 1}/${grouped.length}]`;

    const result = await generateUniqueTopicQuestions({
      topic,
      category: category as any,
      count: list.length,
      difficulty: difficulty as any,
      maxAttempts: Math.ceil(list.length / BATCH) + 6,
      batchSize: BATCH,
      throttleMs: 1500,
    });

    if (result.questions.length === 0) {
      skipped += list.length;
      console.log(`${progress} ${topic} — SKIPPED ${list.length}, diagnostics=${JSON.stringify(result.diagnostics)}`);
      continue;
    }

    // Only the questions that were actually accepted get swapped in; any
    // surplus acceptance is dropped rather than written somewhere arbitrary.
    for (let i = 0; i < list.length; i++) {
      const slot = list[i];
      const fresh = result.questions[i];
      const test = tests.find((t) => t.id === slot.testId)!;
      const qs: any[] = test.questionsJson as any[];
      const old = qs[slot.position];
      if (!old || !fresh) continue;

      // Preserve id and index; swap only the content.
      qs[slot.position] = {
        ...old,
        text: fresh.text,
        options: fresh.options,
        correctIdx: fresh.correctIdx,
        explanation: fresh.explanation,
        shortcut: fresh.shortcut ?? old.shortcut ?? "",
        commonMistakes: fresh.commonMistakes ?? old.commonMistakes ?? [],
        difficulty: fresh.difficulty ?? slot.difficulty,
      };
      committed.push({
        source: SOURCE_APTITUDE,
        question: fresh.text,
        topic: slot.topic,
        category: slot.category,
        difficulty: slot.difficulty,
      });
      replaced++;
    }
    console.log(
      `${progress} ${topic} — replaced ${Math.min(result.questions.length, list.length)}/${list.length} ` +
        `diagnostics=${JSON.stringify(result.diagnostics)}`
    );

    // Persist after every group so a long run survives a crash.
    await persist(tests, committed.splice(0));
    await new Promise((r) => setTimeout(r, 2000));
  }

  await persist(tests, committed.splice(0));
  console.log(`\nDONE — replaced ${replaced}, skipped ${skipped}.`);
}

async function persist(tests: AptTest[], pending: any[]) {
  for (const t of tests) {
    await masterPrisma.aptitudeTopicTest.update({
      where: { id: t.id },
      data: { questionsJson: t.questionsJson as any },
    });
  }
  if (pending.length) {
    const c = await commitToBank(pending, masterPrisma);
    console.log(`[persist] bank inserted=${c.inserted} rejectedAsDuplicate=${c.rejectedAsDuplicate}`);
  }
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
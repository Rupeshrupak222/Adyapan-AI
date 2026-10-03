/**
 * READ-ONLY audit of the aptitude + technical MCQ banks.
 *
 * Reports, per test:
 *   - question count (and whether it is empty / under-filled vs the 30 target)
 *   - exact duplicates (normalised fingerprint already in this test)
 *   - cross-test duplicates (same fingerprint appearing in another test)
 *   - near-duplicate "variations" (Jaccard token overlap above the threshold)
 *
 * Sources matter here. MCQ questions are served from the JSON store
 * (see mcq.service.ts) — the `mcq_tests`/`mcq_questions` tables are a stale seed
 * mirror that no read path touches, so auditing them reports numbers that no
 * longer reflect what users get. Aptitude genuinely lives in Postgres
 * (`AptitudeTopicTest.questionsJson`) and is read from there.
 *
 * Writes nothing. Run `npm run db:audit` then act on the report; adding
 * questions is a separate, explicit step because it calls the AI providers.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma";
import {
  fingerprint,
  tokenize,
  jaccard,
  SIMILARITY_THRESHOLD,
  normalizeQuestionText,
} from "../lib/questions/question-fingerprint";

const TARGET_PER_TEST = 30;
const MCQ_STORE = path.join(__dirname, "../../data/mcq-tests-store.json");

/** The canonical, live MCQ question list. */
function loadMcqTests(): any[] {
  const raw = JSON.parse(fs.readFileSync(MCQ_STORE, "utf-8"));
  const tests = Array.isArray(raw) ? raw : raw.tests;
  if (!Array.isArray(tests)) {
    throw new Error(`Unexpected shape in ${MCQ_STORE} — expected an array or { tests: [] }`);
  }
  return tests.map((t: any) => ({
    targetName: t.targetName ?? t.target ?? "Unknown",
    targetType: t.targetType ?? "technology",
    testNumber: t.testNumber ?? 1,
    title: t.title ?? "",
    isPublished: t.isPublished !== false,
    questions: Array.isArray(t.questions) ? t.questions : [],
  }));
}

type Finding = {
  kind: "EMPTY" | "UNDERFILLED" | "DUP_WITHIN" | "DUP_CROSS" | "VARIATION";
  test: string;
  detail: string;
};

function textOf(q: any): string {
  if (!q) return "";
  const raw = typeof q === "string" ? q : q.question || q.text || "";
  return String(raw || "");
}

/** O(n^2) jaccard within a bucket — fine for bank-sized question lists. */
function findVariations(
  entries: { key: string; text: string }[],
  label: string,
  findings: Finding[]
) {
  const tokenCache = new Map<string, Set<string>>();
  const tokensFor = (s: string) => {
    let t = tokenCache.get(s);
    if (!t) {
      t = tokenize(s);
      tokenCache.set(s, t);
    }
    return t;
  };

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.key === b.key) continue;
      const score = jaccard(tokensFor(a.text), tokensFor(b.text));
      if (score >= SIMILARITY_THRESHOLD) {
        findings.push({
          kind: "VARIATION",
          test: label,
          detail: `${(score * 100).toFixed(0)}% overlap: "${truncate(a.text)}" ~ "${truncate(b.text)}"`,
        });
      }
    }
  }
}

function truncate(s: string, n = 70) {
  const clean = (s || "").replace(/\s+/g, " ").trim();
  return clean.length > n ? `${clean.slice(0, n)}...` : clean;
}

async function auditMcq() {
  const tests = loadMcqTests();

  const findings: Finding[] = [];
  const globalSeen = new Map<string, string>(); // fingerprint -> first test label
  let totalQuestions = 0;

  for (const t of tests) {
    const questions = t.questions as any[];
    totalQuestions += questions.length;
    const label = `${t.targetName} / ${t.title}`;

    if (questions.length === 0) {
      findings.push({ kind: "EMPTY", test: label, detail: "0 questions" });
      continue;
    }
    if (questions.length < TARGET_PER_TEST) {
      findings.push({
        kind: "UNDERFILLED",
        test: label,
        detail: `${questions.length}/${TARGET_PER_TEST}`,
      });
    }

    const withinSeen = new Set<string>();
    const bucket: { key: string; text: string }[] = [];

    for (const q of t.questions) {
      const text = textOf(q);
      const fp = fingerprint(text, [q.technology || "", q.relatedConcept || ""]);
      if (withinSeen.has(fp)) {
        findings.push({
          kind: "DUP_WITHIN",
          test: label,
          detail: `"${truncate(text)}" appears twice in the same test`,
        });
      }
      withinSeen.add(fp);

      const prior = globalSeen.get(fp);
      if (prior && prior !== label) {
        findings.push({
          kind: "DUP_CROSS",
          test: label,
          detail: `"${truncate(text)}" also present in ${prior}`,
        });
      } else if (!prior) {
        globalSeen.set(fp, label);
      }

      bucket.push({ key: fp, text });
    }

    findVariations(bucket, label, findings);
  }

  return { title: "TECHNICAL MCQ", tests: tests.length, totalQuestions, findings };
}

async function auditAptitude() {
  const tests = await prisma.aptitudeTopicTest.findMany({
    orderBy: [{ topic: "asc" }, { testNumber: "asc" }],
  });

  const findings: Finding[] = [];
  const globalSeen = new Map<string, string>();
  let totalQuestions = 0;

  for (const t of tests) {
    const questions = Array.isArray(t.questionsJson) ? (t.questionsJson as any[]) : [];
    totalQuestions += questions.length;
    const label = `${t.topic} / ${t.title}`;

    if (questions.length === 0) {
      findings.push({ kind: "EMPTY", test: label, detail: "0 questions" });
      continue;
    }
    if (questions.length < TARGET_PER_TEST) {
      findings.push({
        kind: "UNDERFILLED",
        test: label,
        detail: `${questions.length}/${TARGET_PER_TEST} (declared totalQuestions=${t.totalQuestions})`,
      });
    }

    const withinSeen = new Set<string>();
    const bucket: { key: string; text: string }[] = [];

    for (const q of questions) {
      const text = textOf(q);
      const fp = fingerprint(text, [t.topic || ""]);

      if (withinSeen.has(fp)) {
        findings.push({
          kind: "DUP_WITHIN",
          test: label,
          detail: `"${truncate(text)}" appears twice in the same test`,
        });
      }
      withinSeen.add(fp);

      const prior = globalSeen.get(fp);
      if (prior && prior !== label) {
        findings.push({
          kind: "DUP_CROSS",
          test: label,
          detail: `"${truncate(text)}" also present in ${prior}`,
        });
      } else if (!prior) {
        globalSeen.set(fp, label);
      }

      bucket.push({ key: fp, text });
    }

    findVariations(bucket, label, findings);
  }

  return { title: "AI APTITUDE", tests: tests.length, totalQuestions, findings };
}

async function main() {
  // Visibility summary — an empty but unpublished test is far less urgent than
  // an empty published one, because only the latter is reachable by a user.
  try {
    const tests = loadMcqTests();
    const empty = tests.filter((t) => t.questions.length === 0);
    const under = tests.filter((t) => t.questions.length > 0 && t.questions.length < TARGET_PER_TEST);
    const needed = tests
      .filter((t) => t.isPublished)
      .reduce((sum, t) => sum + Math.max(0, TARGET_PER_TEST - t.questions.length), 0);
    console.log("MCQ VISIBILITY (source: data/mcq-tests-store.json)");
    console.log(`  empty: ${empty.length} (published ${empty.filter((t) => t.isPublished).length})`);
    console.log(`  underfilled: ${under.length} (published ${under.filter((t) => t.isPublished).length})`);
    console.log(`  questions needed to reach ${TARGET_PER_TEST} on published tests: ${needed}`);
  } catch (e: any) {
    console.error("[audit] MCQ visibility stats failed:", e?.message || e);
  }

  const results = [];
  try {
    results.push(await auditMcq());
  } catch (e: any) {
    console.error("[audit] MCQ audit failed:", e?.message || e);
  }
  try {
    results.push(await auditAptitude());
  } catch (e: any) {
    console.error("[audit] Aptitude audit failed:", e?.message || e);
  }

  for (const r of results) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`${r.title}: ${r.tests} tests, ${r.totalQuestions} questions`);
    console.log("=".repeat(70));

    if (r.findings.length === 0) {
      console.log(`  OK — no empty / duplicate / variation issues found.`);
      continue;
    }

    const byKind: Record<string, Finding[]> = {};
    for (const f of r.findings) {
      if (!byKind[f.kind]) byKind[f.kind] = [];
      byKind[f.kind].push(f);
    }

    for (const kind of ["EMPTY", "UNDERFILLED", "DUP_WITHIN", "DUP_CROSS", "VARIATION"]) {
      const list = byKind[kind];
      if (!list?.length) continue;
      console.log(`\n--- ${kind} (${list.length}) ---`);
      for (const f of list.slice(0, 40)) {
        console.log(`  [${f.test}] ${f.detail}`);
      }
      if (list.length > 40) console.log(`  ...and ${list.length - 40} more`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[audit] fatal:", e);
  await prisma.$disconnect();
  process.exit(1);
});
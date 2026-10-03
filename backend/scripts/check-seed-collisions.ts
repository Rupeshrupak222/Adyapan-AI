/**
 * Read-only uniqueness gate for the hand-authored seeds.
 *
 * Five layers of comparison, all using the same primitives the runtime
 * dedupe path uses (src/lib/questions/question-fingerprint.ts):
 *
 *   1. EXACT / TEMPLATE / CONCEPT fingerprints inside each seed group.
 *   2. Jaccard >= 0.7 inside each seed group and across all new groups.
 *   3. Aptitude seeds vs every usable aptitude question already in PostgreSQL.
 *   4. Technical seeds vs every question already in the technical MCQ store.
 *   5. All new seeds vs every row of the global question bank, so a seed cannot
 *      re-ask something the platform already serves.
 *
 * Jaccard over the ~11k corpus texts x 390 candidates is done with an inverted
 * token index and the algebraic lower bound
 *     jaccard(a,b) = i / (|a| + |b| - i) >= t   <=>   i >= t(|a| + |b|) / (1 + t)
 * so only genuinely overlapping candidates are scored exactly.
 */
import * as fs from "fs";
import * as path from "path";
import { SENTENCE_CORRECTION_TESTS } from "./seeds/aptitude-sentence-correction";
import { SYNONYMS_ANTONYMS_TESTS } from "./seeds/aptitude-synonyms-antonyms";
import { VOCABULARY_TESTS } from "./seeds/aptitude-vocabulary";
import { INVESTMENT_BANKING_QUESTIONS } from "./seeds/technical-investment-banking";
import { CAR_DESIGNING_QUESTIONS } from "./seeds/technical-car-designing";
import { MECHANICAL_PRODUCT_QUESTIONS } from "./seeds/technical-mech-product";
import { NANOTECHNOLOGY_QUESTIONS } from "./seeds/technical-nanotechnology";
import { CLINICAL_RESEARCH_QUESTIONS } from "./seeds/technical-clinical-research";
import { GENETIC_ENGINEERING_QUESTIONS } from "./seeds/technical-genetic-engineering";
import {
  SIMILARITY_THRESHOLD,
  dedupInfoFromQuestion,
  jaccard,
  type QuestionDedupInfo,
} from "../src/lib/questions/question-fingerprint";
import { masterPrisma } from "../src/utils/prisma";

interface SeedGroup {
  label: string;
  questions: { text: string }[];
}

const T = SIMILARITY_THRESHOLD;
const EXPECTED_PER_GROUP = 30;

function minIntersections(sizeA: number, sizeB: number): number {
  return (T * (sizeA + sizeB)) / (1 + T);
}

function describe(kind: string, score: number): string {
  return `${kind}${score >= 1 ? " (exact match)" : ` ${score.toFixed(2)}`}`;
}

/** Corpus indexed for fast similarity lookups. */
class Corpus {
  private infos: QuestionDedupInfo[] = [];
  private byFingerprint = new Map<string, number[]>();
  private byTemplate = new Map<string, number[]>();
  private byConcept = new Map<string, number[]>();
  private postings = new Map<string, number[]>();

  get size(): number {
    return this.infos.length;
  }

  add(text: string): void {
    const d = dedupInfoFromQuestion({ question: text });
    if (!d.fingerprint) return;
    const i = this.infos.push(d) - 1;
    push(this.byFingerprint, d.fingerprint, i);
    if (d.templateFingerprint) push(this.byTemplate, d.templateFingerprint, i);
    if (d.conceptSignature) push(this.byConcept, d.conceptSignature, i);
    for (const t of d.tokens) push(this.postings, t, i);
  }

  private text(i: number): string {
    return this.infos[i].text.length > 90 ? this.infos[i].text.slice(0, 90) + "..." : this.infos[i].text;
  }

  find(candidate: string): string[] {
    const d = dedupInfoFromQuestion({ question: candidate });
    if (!d.fingerprint) return [];
    const hits = new Set<string>();
    const add = (i: number, kind: string, score: number) =>
      hits.add(`${describe(kind, score)}: ${this.text(i)}`);

    for (const i of this.byFingerprint.get(d.fingerprint) ?? []) add(i, "FINGERPRINT", 1);
    for (const i of this.byTemplate.get(d.templateFingerprint) ?? []) add(i, "TEMPLATE", 1);
    for (const i of this.byConcept.get(d.conceptSignature) ?? []) add(i, "CONCEPT", 1);

    const counts = new Map<number, number>();
    for (const t of d.tokens) {
      const list = this.postings.get(t);
      if (!list) continue;
      for (const i of list) counts.set(i, (counts.get(i) ?? 0) + 1);
    }
    for (const [i, inter] of counts) {
      if (inter < minIntersections(d.tokens.size, this.infos[i].tokens.size)) continue;
      const score = jaccard(d.tokens, this.infos[i].tokens);
      if (score >= T) add(i, "JACCARD", score);
    }
    return Array.from(hits).sort();
  }
}

function push(map: Map<string, number[]>, key: string, value: number): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function checkIntra(label: string, questions: { text: string }[]): number {
  const infos = questions.map((q) => dedupInfoFromQuestion({ question: q.text }));
  let count = 0;
  const seenF = new Map<string, number>();
  const seenT = new Map<string, number>();
  const seenC = new Map<string, number>();
  infos.forEach((d, i) => {
    const note = (kind: string, map: Map<string, number>) => {
      const key = d[kind as "fingerprint" | "templateFingerprint" | "conceptSignature"];
      if (!key) return;
      const prior = map.get(key);
      if (prior !== undefined) {
        count++;
        console.log(`  ${label}: ${kind} #${i + 1} == #${prior + 1}`);
      } else map.set(key, i);
    };
    note("fingerprint", seenF);
    note("templateFingerprint", seenT);
    note("conceptSignature", seenC);
  });
  for (let i = 0; i < infos.length; i++) {
    for (let j = i + 1; j < infos.length; j++) {
      const s = jaccard(infos[i].tokens, infos[j].tokens);
      if (s >= T) {
        count++;
        console.log(`  ${label}: JACCARD ${s.toFixed(2)} #${i + 1} vs #${j + 1}`);
      }
    }
  }
  return count;
}

/** Total number of colliding questions found for one seed scope. */
function compare(groups: SeedGroup[], corpus: Corpus, corpusLabel: string): number {
  let failures = 0;
  for (const g of groups) {
    let n = 0;
    g.questions.forEach((q, i) => {
      for (const hit of corpus.find(q.text)) {
        n++;
        console.log(`  ${g.label} #${i + 1} vs ${corpusLabel} -> ${hit}`);
      }
    });
    if (n) failures++;
    console.log(`  ${n === 0 ? "OK  " : "FAIL"} ${g.label}: ${n} collision(s)`);
  }
  console.log(`  (corpus: ${corpus.size} distinct texts)`);
  return failures;
}

/** Every question stem already present in the technical MCQ store. */
function loadTechnicalStoreTexts(): string[] {
  const file = path.join(__dirname, "..", "data", "mcq-tests-store.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const tests: any[] = Array.isArray(raw) ? raw : raw.tests ?? [];
  const texts: string[] = [];
  for (const t of tests) {
    for (const q of t?.questions ?? []) {
      const text = q?.question ?? q?.text;
      if (typeof text === "string" && text.trim().length > 0) texts.push(text);
    }
  }
  return texts;
}

async function main() {
  const aptitudeGroups: SeedGroup[] = [
    { label: "Sentence Correction T2", questions: SENTENCE_CORRECTION_TESTS.test2 as { text: string }[] },
    { label: "Sentence Correction T3", questions: SENTENCE_CORRECTION_TESTS.test3 as { text: string }[] },
    { label: "Synonyms & Antonyms T1", questions: SYNONYMS_ANTONYMS_TESTS.test1 as { text: string }[] },
    { label: "Synonyms & Antonyms T2", questions: SYNONYMS_ANTONYMS_TESTS.test2 as { text: string }[] },
    { label: "Synonyms & Antonyms T3", questions: SYNONYMS_ANTONYMS_TESTS.test3 as { text: string }[] },
    { label: "Vocabulary T2", questions: VOCABULARY_TESTS.test2 as { text: string }[] },
    { label: "Vocabulary T3", questions: VOCABULARY_TESTS.test3 as { text: string }[] },
  ];

  const tech = (label: string, questions: { question: string }[]): SeedGroup => ({
    label,
    questions: questions.map((q) => ({ text: q.question })),
  });

  const technicalGroups: SeedGroup[] = [
    tech("Investment Banking & Finance", INVESTMENT_BANKING_QUESTIONS),
    tech("Car Designing", CAR_DESIGNING_QUESTIONS),
    tech("Product Management (Mechanical)", MECHANICAL_PRODUCT_QUESTIONS),
    tech("Nanotechnology (Pharma/ECE)", NANOTECHNOLOGY_QUESTIONS),
    tech("Clinical Trial & Research (Pharma)", CLINICAL_RESEARCH_QUESTIONS),
    tech("Genetic Engineering", GENETIC_ENGINEERING_QUESTIONS),
  ];

  const allGroups = [...aptitudeGroups, ...technicalGroups];

  let failures = 0;
  console.log("=== 1. Per-group counts (must be exactly 30) ===");
  for (const g of allGroups) {
    const ok = g.questions.length === EXPECTED_PER_GROUP;
    if (!ok) failures++;
    console.log(`  ${ok ? "OK  " : "FAIL"} ${g.label}: ${g.questions.length}`);
  }

  console.log(`\n=== 2. Intra-group collisions (${allGroups.length} groups) ===`);
  for (const g of allGroups) {
    const n = checkIntra(g.label, g.questions);
    if (n) failures++;
    console.log(`  ${n === 0 ? "OK  " : "FAIL"} ${g.label}: ${n} collision(s)`);
  }

  console.log(`\n=== 3. Cross-group collisions among the new seeds ===`);
  for (const g of allGroups) {
    const others = allGroups.filter((o) => o !== g);
    const corpus = new Corpus();
    for (const o of others) {
      for (const q of o.questions) corpus.add(q.text);
    }
    let n = 0;
    g.questions.forEach((q, i) => {
      for (const hit of corpus.find(q.text)) {
        n++;
        console.log(`  ${g.label} #${i + 1} vs [${others.map((o) => o.label).join(", ")}] -> ${hit}`);
      }
    });
    if (n) failures++;
    console.log(`  ${n === 0 ? "OK  " : "FAIL"} ${g.label} vs other ${others.length} groups: ${n} collision(s)`);
  }

  console.log(`\n=== 4. Aptitude seeds vs live aptitude questions in PostgreSQL ===`);
  const liveAptitude = new Corpus();
  const tests: any[] = await (masterPrisma as any).aptitudeTopicTest.findMany({
    select: { questionsJson: true },
  });
  let liveCount = 0;
  for (const t of tests) {
    const qs = Array.isArray(t.questionsJson) ? t.questionsJson : [];
    for (const q of qs) {
      if (q && typeof q.text === "string" && q.text.trim().length > 0) {
        liveAptitude.add(q.text);
        liveCount++;
      }
    }
  }
  failures += compare(aptitudeGroups, liveAptitude, "LIVE APERTURE");
  console.log(`  (live aptitude rows: ${liveCount})`);

  console.log(`\n=== 5. Technical seeds vs existing technical MCQ store ===`);
  const storeTexts = loadTechnicalStoreTexts();
  const store = new Corpus();
  for (const t of storeTexts) store.add(t);
  failures += compare(technicalGroups, store, "MCQ STORE");
  console.log(`  (store question rows: ${storeTexts.length})`);

  console.log(`\n=== 6. All new seeds vs global question bank ===`);
  const bank = new Corpus();
  let bankRows = 0;
  const entries: any[] = await (masterPrisma as any).questionBankEntry.findMany({
    select: { questionText: true },
  });
  for (const e of entries) {
    const raw = e?.questionText;
    const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : raw?.text ?? raw?.question;
    if (typeof text === "string" && text.trim().length > 0) {
      bank.add(text);
      bankRows++;
    }
  }
  failures += compare(allGroups, bank, "BANK");
  console.log(`  (bank rows: ${bankRows})`);

  console.log(`\n=== RESULT: ${failures === 0 ? "PASS" : `${failures} FAILING SECTION(S)`} ===`);
  if (failures) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("CHECK FAILED:", e?.message || e);
    console.error(e?.stack || "");
    process.exitCode = 1;
  })
  .finally(async () => {
    await (masterPrisma as any).$disconnect().catch(() => {});
  });
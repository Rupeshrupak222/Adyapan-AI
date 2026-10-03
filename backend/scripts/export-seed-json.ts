/**
 * Versioned JSON snapshot of every hand-authored seed question.
 *
 * The TypeScript files in this directory remain the source of truth; this
 * export is the reviewable, diffable artefact that records exactly which
 * questions a given backfill wrote, so a production run can be audited and
 * reproduced without re-deriving anything from the builders.
 *
 *   npx tsx scripts/export-seed-json.ts
 *
 * Refuses to run when the output already exists with different content unless
 * --force is passed, so an accidental overwrite cannot silently change a
 * version that has already been applied.
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

export const SEED_VERSION = "2026-10-03.1";

interface VersionedSeed {
  version: string;
  generatedAt: string;
  counts: { aptitude: number; technical: number; total: number };
  aptitude: {
    topicTestId: string;
    topic: string;
    testNumber: number;
    category: string;
    questions: unknown[];
  }[];
  technical: {
    testId: string;
    targetId: string;
    targetName: string;
    questions: unknown[];
  }[];
}

function build(): VersionedSeed {
  const aptitude: VersionedSeed["aptitude"] = [
    {
      topicTestId: "cmu801bh7001y74k4hnxdpgoe",
      topic: "Sentence Correction",
      testNumber: 2,
      category: "verbal",
      questions: SENTENCE_CORRECTION_TESTS.test2,
    },
    {
      topicTestId: "cmu801boo001z74k4a3ovwxdq",
      topic: "Sentence Correction",
      testNumber: 3,
      category: "verbal",
      questions: SENTENCE_CORRECTION_TESTS.test3,
    },
    {
      topicTestId: "cmu801dd8002674k499giso51",
      topic: "Synonyms & Antonyms",
      testNumber: 1,
      category: "verbal",
      questions: SYNONYMS_ANTONYMS_TESTS.test1,
    },
    {
      topicTestId: "cmu801dki002774k47e4yzo8k",
      topic: "Synonyms & Antonyms",
      testNumber: 2,
      category: "verbal",
      questions: SYNONYMS_ANTONYMS_TESTS.test2,
    },
    {
      topicTestId: "cmu801drr002874k4s0scchl7",
      topic: "Synonyms & Antonyms",
      testNumber: 3,
      category: "verbal",
      questions: SYNONYMS_ANTONYMS_TESTS.test3,
    },
    {
      topicTestId: "cmu801av4001v74k47l4ew6w5",
      topic: "Vocabulary",
      testNumber: 2,
      category: "verbal",
      questions: VOCABULARY_TESTS.test2,
    },
    {
      topicTestId: "cmu801b2f001w74k4v0fop4jv",
      topic: "Vocabulary",
      testNumber: 3,
      category: "verbal",
      questions: VOCABULARY_TESTS.test3,
    },
  ];

  const technical: VersionedSeed["technical"] = [
    {
      testId: "test-tech-investment-banking-1",
      targetId: "tech-investment-banking",
      targetName: "Investment Banking & Finance",
      questions: INVESTMENT_BANKING_QUESTIONS,
    },
    {
      testId: "test-tech-car-designing-1",
      targetId: "tech-car-designing",
      targetName: "Car Designing",
      questions: CAR_DESIGNING_QUESTIONS,
    },
    {
      testId: "test-tech-mech-product-1",
      targetId: "tech-mech-product",
      targetName: "Product Management (Mechanical)",
      questions: MECHANICAL_PRODUCT_QUESTIONS,
    },
    {
      testId: "test-tech-nanotechnology-1",
      targetId: "tech-nanotechnology",
      targetName: "Nanotechnology (Pharma/ECE)",
      questions: NANOTECHNOLOGY_QUESTIONS,
    },
    {
      testId: "test-tech-clinical-research-1",
      targetId: "tech-clinical-research",
      targetName: "Clinical Trial & Research (Pharma)",
      questions: CLINICAL_RESEARCH_QUESTIONS,
    },
    {
      testId: "test-tech-genetic-engineering-1",
      targetId: "tech-genetic-engineering",
      targetName: "Genetic Engineering",
      questions: GENETIC_ENGINEERING_QUESTIONS,
    },
  ];

  const aptitudeCount = aptitude.reduce((n, g) => n + g.questions.length, 0);
  const technicalCount = technical.reduce((n, g) => n + g.questions.length, 0);
  return {
    version: SEED_VERSION,
    generatedAt: new Date().toISOString(),
    counts: { aptitude: aptitudeCount, technical: technicalCount, total: aptitudeCount + technicalCount },
    aptitude,
    technical,
  };
}

function main() {
  const outDir = path.join(__dirname, "seed-data");
  const outFile = path.join(outDir, `v${SEED_VERSION}.json`);
  const force = process.argv.includes("--force");
  fs.mkdirSync(outDir, { recursive: true });

  const seed = build();
  const payload = JSON.stringify(seed, null, 2) + "\n";

  if (fs.existsSync(outFile) && !force) {
    const existing = fs.readFileSync(outFile, "utf8");
    const strip = (s: string) => s.replace(/"generatedAt": "[^"]*"/, '"generatedAt": "X"');
    if (strip(existing) === strip(payload)) {
      console.log(`UNCHANGED ${path.relative(process.cwd(), outFile)}`);
      return;
    }
    console.error(
      `REFUSING TO OVERWRITE ${path.relative(process.cwd(), outFile)}\n` +
        `  Version ${SEED_VERSION} already exists with different content.\n` +
        `  Bump SEED_VERSION, or re-run with --force if the change is intended.`
    );
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(outFile, payload);
  console.log(
    `WROTE ${path.relative(process.cwd(), outFile)} ` +
      `(aptitude=${seed.counts.aptitude} technical=${seed.counts.technical} total=${seed.counts.total})`
  );
}

if (require.main === module) main();

export { build as buildSeedSnapshot };
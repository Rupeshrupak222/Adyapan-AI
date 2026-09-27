/**
 * Applies the question_bank schema to the live database.
 *
 * This project provisions with `prisma db push` (there is no
 * `_prisma_migrations` table), so running `migrate deploy` would try to replay
 * the init migration against an already-populated database. Instead we apply the
 * exact DDL from prisma/migrations/20260926000000_add_question_bank/migration.sql
 * statement by statement, guarded so it is safe to re-run.
 *
 * Safe to run repeatedly. Prints what it did.
 */
import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";

type Stmt = { label: string; sql: string };

const STATEMENTS: Stmt[] = [
  {
    label: "create table question_bank",
    sql: `CREATE TABLE IF NOT EXISTS "question_bank" (
      "id" TEXT NOT NULL,
      "fingerprint" TEXT NOT NULL,
      "template_fingerprint" TEXT NOT NULL,
      "concept_signature" TEXT,
      "source" TEXT NOT NULL,
      "topic" TEXT,
      "category" TEXT,
      "company" TEXT,
      "difficulty" TEXT,
      "question_text" TEXT NOT NULL,
      "options_json" JSONB,
      "correct_idx" INTEGER,
      "test_id" TEXT,
      "position" INTEGER,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    label: "create table mcq_tests",
    sql: `CREATE TABLE IF NOT EXISTS "mcq_tests" (
      "id" TEXT NOT NULL,
      "target_id" TEXT NOT NULL,
      "target_type" TEXT NOT NULL,
      "target_name" TEXT NOT NULL,
      "test_number" INTEGER NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "difficulty" TEXT NOT NULL DEFAULT 'Medium',
      "question_count" INTEGER NOT NULL DEFAULT 0,
      "duration_minutes" INTEGER NOT NULL DEFAULT 30,
      "is_published" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "mcq_tests_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    label: "create table mcq_questions",
    sql: `CREATE TABLE IF NOT EXISTS "mcq_questions" (
      "id" TEXT NOT NULL,
      "test_id" TEXT NOT NULL,
      "position" INTEGER NOT NULL,
      "question" TEXT NOT NULL,
      "technology" TEXT NOT NULL,
      "company" TEXT,
      "difficulty" TEXT NOT NULL DEFAULT 'Medium',
      "code_snippet" TEXT,
      "language" TEXT,
      "options_json" JSONB NOT NULL,
      "correct_answer" TEXT NOT NULL DEFAULT '',
      "correct_idx" INTEGER NOT NULL DEFAULT 0,
      "explanation" TEXT NOT NULL DEFAULT '',
      "hint" TEXT NOT NULL DEFAULT '',
      "related_concept" TEXT NOT NULL DEFAULT '',
      "estimated_time" TEXT NOT NULL DEFAULT '45 sec',
      "interview_tip" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "mcq_questions_pkey" PRIMARY KEY ("id")
    )`,
  },
  // The two UNIQUE indexes are the actual guarantee that a concept can exist
  // only once in the entire database. Without them the whole change is a no-op.
  {
    label: "unique index question_bank.fingerprint",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "question_bank_fingerprint_key" ON "question_bank"("fingerprint")`,
  },
  {
    label: "unique index question_bank.template_fingerprint",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "question_bank_template_fingerprint_key" ON "question_bank"("template_fingerprint")`,
  },
  {
    label: "index question_bank source/topic",
    sql: `CREATE INDEX IF NOT EXISTS "question_bank_source_topic_idx" ON "question_bank"("source", "topic")`,
  },
  {
    label: "index question_bank source/company",
    sql: `CREATE INDEX IF NOT EXISTS "question_bank_source_company_idx" ON "question_bank"("source", "company")`,
  },
  {
    label: "index question_bank source/category",
    sql: `CREATE INDEX IF NOT EXISTS "question_bank_source_category_idx" ON "question_bank"("source", "category")`,
  },
  {
    label: "index question_bank test_id",
    sql: `CREATE INDEX IF NOT EXISTS "question_bank_test_id_idx" ON "question_bank"("test_id")`,
  },
  {
    label: "unique index mcq_tests target/testNumber",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "mcq_tests_target_id_test_number_key" ON "mcq_tests"("target_id", "test_number")`,
  },
  {
    label: "index mcq_tests target_id",
    sql: `CREATE INDEX IF NOT EXISTS "mcq_tests_target_id_idx" ON "mcq_tests"("target_id")`,
  },
  {
    label: "index mcq_questions test/position",
    sql: `CREATE INDEX IF NOT EXISTS "mcq_questions_test_id_position_idx" ON "mcq_questions"("test_id", "position")`,
  },
  {
    label: "fk mcq_questions -> mcq_tests",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'mcq_questions_test_id_fkey'
      ) THEN
        ALTER TABLE "mcq_questions" ADD CONSTRAINT "mcq_questions_test_id_fkey"
          FOREIGN KEY ("test_id") REFERENCES "mcq_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;`,
  },
  {
    label: "add column user_question_history.concept_signature",
    sql: `ALTER TABLE "user_question_history" ADD COLUMN IF NOT EXISTS "concept_signature" TEXT`,
  },
  {
    // Per-option feedback the MCQ review UI reads. Added after the table was
    // first created, so it is a separate idempotent statement rather than part
    // of the CREATE TABLE branch above.
    label: "add column mcq_questions.option_explanations",
    sql: `ALTER TABLE "mcq_questions" ADD COLUMN IF NOT EXISTS "option_explanations" JSONB`,
  },
  // Dead model that was never referenced by any code path. Verified empty (0 rows)
  // immediately before this script was run.
  {
    label: "drop legacy question_fingerprints (0 rows, dead model)",
    sql: `DROP TABLE IF EXISTS "question_fingerprints"`,
  },
];

async function main() {
  console.log("Applying question_bank schema...\n");
  for (const s of STATEMENTS) {
    try {
      await masterPrisma.$executeRawUnsafe(s.sql);
      console.log(`  OK   ${s.label}`);
    } catch (err: any) {
      console.error(`  FAIL ${s.label}`);
      console.error(`       ${err?.message || err}`);
      process.exitCode = 1;
      return;
    }
  }

  console.log("\nVerifying...");
  const check: any[] = await masterPrisma.$queryRawUnsafe(`
    SELECT
      to_regclass('public.question_bank')   IS NOT NULL AS has_bank,
      to_regclass('public.mcq_tests')       IS NOT NULL AS has_mcq_tests,
      to_regclass('public.mcq_questions')   IS NOT NULL AS has_mcq_q,
      to_regclass('public.question_fingerprints') IS NULL AS legacy_gone,
      EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='user_question_history' AND column_name='concept_signature')
                                             AS has_concept_col,
      EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='mcq_questions' AND column_name='option_explanations')
                                             AS has_opt_expl_col,
      (SELECT count(*)::int FROM pg_indexes
        WHERE tablename='question_bank' AND indexname IN
        ('question_bank_fingerprint_key','question_bank_template_fingerprint_key')) AS unique_idxs
  `);
  const c = check[0];
  console.log(`  question_bank table:        ${c.has_bank}`);
  console.log(`  mcq_tests table:            ${c.has_mcq_tests}`);
  console.log(`  mcq_questions table:        ${c.has_mcq_q}`);
  console.log(`  user_question_history col:  ${c.has_concept_col}`);
  console.log(`  mcq_questions opt_expl col: ${c.has_opt_expl_col}`);
  console.log(`  legacy table removed:       ${c.legacy_gone}`);
  console.log(`  UNIQUE indexes present:     ${c.unique_idxs}/2`);
  if (!c.has_bank || c.unique_idxs !== 2 || !c.has_opt_expl_col) {
    console.error("\nVERIFICATION FAILED");
    process.exitCode = 1;
    return;
  }
  console.log("\nSchema applied successfully.");
  await masterPrisma.$disconnect();
}

main();

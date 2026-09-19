import { prisma } from "../config/prisma";

async function main() {
  console.log("Applying non-destructive schema updates to coding_questions table...");
  
  const queries = [
    `ALTER TABLE "coding_questions" ADD COLUMN IF NOT EXISTS "statement" TEXT;`,
    `ALTER TABLE "coding_questions" ADD COLUMN IF NOT EXISTS "constraints" TEXT;`,
    `ALTER TABLE "coding_questions" ADD COLUMN IF NOT EXISTS "input_format" TEXT;`,
    `ALTER TABLE "coding_questions" ADD COLUMN IF NOT EXISTS "output_format" TEXT;`,
    `ALTER TABLE "coding_questions" ADD COLUMN IF NOT EXISTS "examples" JSONB;`,
    `ALTER TABLE "coding_questions" ADD COLUMN IF NOT EXISTS "visible_test_cases" JSONB;`,
    `ALTER TABLE "coding_questions" ADD COLUMN IF NOT EXISTS "hidden_test_cases" JSONB;`,
    `ALTER TABLE "coding_questions" ADD COLUMN IF NOT EXISTS "time_limit" TEXT DEFAULT '2.0s';`,
    `ALTER TABLE "coding_questions" ADD COLUMN IF NOT EXISTS "memory_limit" TEXT DEFAULT '256 MB';`,
    `ALTER TABLE "coding_questions" ALTER COLUMN "problem_url" DROP NOT NULL;`
  ];

  for (const q of queries) {
    try {
      await prisma.$executeRawUnsafe(q);
      console.log(`Executed: ${q}`);
    } catch (err: any) {
      console.error(`Error executing ${q}:`, err.message);
    }
  }

  console.log("Checking coding_questions columns...");
  const cols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'coding_questions';
  `);
  console.log("Columns in coding_questions:", cols.map((c: any) => c.column_name).join(", "));
  
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});

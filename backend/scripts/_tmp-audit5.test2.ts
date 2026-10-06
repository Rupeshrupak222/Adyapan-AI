import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";

async function main() {
  const p = masterPrisma as any;
  const bank = await p.questionBankEntry.findMany({
    where: { testId: "test-amazon-2" },
    select: { id: true, position: true, source: true, questionText: true },
    orderBy: { position: "asc" },
  });
  console.log(`bank rows for test-amazon-2: ${bank.length}`);
  for (const b of bank.slice(0, 40)) {
    console.log(`  pos=${String(b.position).padStart(3)} src=${b.source} ${b.questionText.slice(0, 70).replace(/\n/g, " ")}`);
  }
  const dist: Record<string, number> = {};
  for (const b of bank) dist[String(b.position)] = (dist[String(b.position)] || 0) + 1;
  const dupes = Object.entries(dist).filter(([, n]) => n > 1);
  console.log("positions used more than once:", dupes.length, dupes.slice(0, 10));

  const live = await p.mcqQuestion.findMany({
    where: { testId: "test-amazon-2" },
    select: { id: true, position: true, question: true },
    orderBy: { position: "asc" },
  });
  console.log(`\nlive mcq questions for test-amazon-2: ${live.length}`);
  for (const q of live.slice(-6)) {
    console.log(`  ${q.id} pos=${q.position} ${q.question.slice(0, 70).replace(/\n/g, " ")}`);
  }
  const bankTexts = new Set(bank.map((b: any) => b.questionText.toLowerCase().replace(/\s+/g, " ").trim()));
  const missing = live.filter((q: any) => !bankTexts.has(q.question.toLowerCase().replace(/\s+/g, " ").trim()));
  console.log(`live questions with no matching bank row: ${missing.length}`);
  for (const q of missing.slice(0, 5)) console.log(`   ${q.id} ${q.question.slice(0, 70).replace(/\n/g, " ")}`);

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

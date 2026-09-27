/**
 * One-off cleanup: the first pilot (before the persistence fix) stored
 * placeholder explanations instead of the model's real ones. The bank does not
 * store explanations, so those rows cannot be repaired — drop them and let the
 * backfill regenerate them properly.
 *
 * Targets only the two known-bad tests by topic + testNumber.
 */
import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";

const TARGETS: { topic: string; testNumber: number }[] = [
  { topic: "Cause and Effect", testNumber: 2 },
  { topic: "Cause and Effect", testNumber: 3 },
];

async function main() {
  for (const t of TARGETS) {
    const test = await masterPrisma.aptitudeTopicTest.findFirst({
      where: { topic: t.topic, testNumber: t.testNumber },
      select: { id: true, questionsJson: true },
    });
    if (!test) {
      console.log(`${t.topic} T${t.testNumber}: not found, skipping`);
      continue;
    }
    const qs = (test.questionsJson as any[]) || [];
    const placeholders = qs.filter((q) =>
      String(q.explanation || "").startsWith("Regenerated to restore")
    ).length;
    const del = await masterPrisma.questionBankEntry.deleteMany({ where: { testId: test.id } });
    await masterPrisma.aptitudeTopicTest.update({
      where: { id: test.id },
      data: { questionsJson: [] as any, totalQuestions: 0 },
    });
    console.log(
      `${t.topic} T${t.testNumber}: cleared ${qs.length} question(s) ` +
        `(${placeholders} had placeholder explanations), removed ${del.count} bank row(s)`
    );
  }
  const total = await masterPrisma.questionBankEntry.count();
  console.log(`\nBank now holds ${total} concepts.`);
  await masterPrisma.$disconnect();
}
main();

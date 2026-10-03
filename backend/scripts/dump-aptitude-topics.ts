/**
 * Read-only dump: existing questions for the verbal topics under repair, so new
 * questions can be authored against what is already banked.
 */
import { masterPrisma } from "../src/utils/prisma";

const TOPICS = ["Sentence Correction", "Synonyms & Antonyms", "Vocabulary"];

async function main() {
  const tests: any[] = await (masterPrisma as any).aptitudeTopicTest.findMany({
    where: { topic: { in: TOPICS } },
    orderBy: [{ topic: "asc" }, { testNumber: "asc" }],
    select: { id: true, category: true, topic: true, testNumber: true, questionsJson: true },
  });

  for (const t of tests) {
    const qs: any[] = Array.isArray(t.questionsJson) ? t.questionsJson : [];
    console.log(`\n===== ${t.topic} - Test ${t.testNumber} (${t.id}) usable=${qs.length} =====`);
    for (const q of qs) console.log(`- ${q.text}`);
  }
}

main()
  .catch((e) => {
    console.error("DUMP FAILED:", e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await (masterPrisma as any).$disconnect();
  });

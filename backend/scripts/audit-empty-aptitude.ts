/**
 * Read-only audit: list aptitude topic tests whose questionsJson is empty or
 * short of the intended size, so backfill work can be targeted.
 */
import { masterPrisma } from "../src/utils/prisma";

async function main() {
  const tests: any[] = await (masterPrisma as any).aptitudeTopicTest.findMany({
    orderBy: [{ category: "asc" }, { topic: "asc" }, { testNumber: "asc" }],
    select: { id: true, category: true, topic: true, testNumber: true, title: true, totalQuestions: true, questionsJson: true },
  });

  const usable = (q: any) =>
    Array.isArray(q) ? q.filter((x: any) => x && typeof x.text === "string" && x.text.trim().length > 0).length : 0;

  let totalUsable = 0;
  const rows: any[] = [];
  for (const t of tests) {
    const have = usable(t.questionsJson);
    totalUsable += have;
    if (have === 0 || have < (t.totalQuestions || 30)) {
      rows.push({ id: t.id, category: t.category, topic: t.topic, testNumber: t.testNumber, target: t.totalQuestions || 30, have, empty: have === 0 });
    }
  }

  console.log(`tests=${tests.length} usableQuestions=${totalUsable} needsBackfill=${rows.length} fullyEmpty=${rows.filter(r => r.empty).length}`);
  for (const r of rows) console.log(JSON.stringify(r));
}

main()
  .catch((e) => {
    console.error("AUDIT FAILED:", e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await (masterPrisma as any).$disconnect();
  });

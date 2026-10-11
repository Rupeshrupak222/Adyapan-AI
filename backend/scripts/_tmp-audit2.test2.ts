import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";

async function main() {
  const mcq = await (masterPrisma as any).mcqTest.findMany({
    select: { id: true, targetName: true, targetType: true, testNumber: true, questionCount: true },
    orderBy: [{ targetName: "asc" }, { testNumber: "asc" }],
  });
  const counts: Record<string, number> = {};
  for (const r of await (masterPrisma as any).mcqQuestion.findMany({ select: { testId: true } })) {
    counts[r.testId] = (counts[r.testId] || 0) + 1;
  }
  console.log("MCQ tests that have a Test #2:");
  for (const t of mcq) {
    if (t.testNumber !== 2) continue;
    console.log(`  ${t.id.padEnd(34)} ${t.targetName} (${t.targetType}) stored=${t.questionCount} actual=${counts[t.id] || 0}`);
  }

  const missingMcq = new Map<string, any>();
  for (const t of mcq) {
    const key = `${t.targetType}:${t.targetId}`;
    if (!missingMcq.has(key)) missingMcq.set(key, { name: t.targetName, type: t.targetType, max: 0, nums: new Set<number>() });
    const e = missingMcq.get(key);
    e.nums.add(t.testNumber);
    e.max = Math.max(e.max, t.testNumber);
  }
  const noT2 = [...missingMcq.values()].filter((e: any) => !e.nums.has(2));
  console.log(`\nMCQ targets without Test #2: ${noT2.length}`);
  console.log("  " + noT2.map((e: any) => e.name).join(", "));

  const apt = await (masterPrisma as any).aptitudeTopicTest.findMany({
    select: { id: true, category: true, topic: true, testNumber: true, totalQuestions: true, questionsJson: true },
    orderBy: [{ category: "asc" }, { topic: "asc" }, { testNumber: "asc" }],
  });
  const g = new Map<string, any>();
  for (const t of apt) {
    const k = `${t.category}::${t.topic}`;
    if (!g.has(k)) g.set(k, { topic: t.topic, category: t.category, nums: new Set<number>(), sizes: new Map<number, number>() });
    const e = g.get(k);
    e.nums.add(t.testNumber);
    e.sizes.set(t.testNumber, Array.isArray(t.questionsJson) ? t.questionsJson.length : 0);
  }
  const aptNoT2 = [...g.values()].filter((e: any) => !e.nums.has(2));
  console.log(`\nAptitude targets without Test #2: ${aptNoT2.length}`);
  for (const e of aptNoT2) console.log(`  ${e.topic} (${e.category}) has tests ${[...e.nums].join(",")}`);
  const short = [...g.values()].filter((e: any) => e.nums.has(2) && e.sizes.get(2) < 30);
  console.log(`\nAptitude Test #2 rows under 30: ${short.length}`);
  for (const e of short) console.log(`  ${e.topic} (${e.category}) = ${e.sizes.get(2)}`);

  await masterPrisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

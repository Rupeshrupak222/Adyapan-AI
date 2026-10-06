import "dotenv/config";
import fs from "fs";
import path from "path";
import { masterPrisma } from "../src/utils/prisma";

async function main() {
  const report = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/test2-generation-report.json"), "utf-8")
  );
  const perTest = new Map<string, number>();
  for (const c of report.collisions) perTest.set(c.testKey, (perTest.get(c.testKey) || 0) + 1);
  const top = [...perTest.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log("report collisions:", report.collisions.length, "papers:", perTest.size);
  for (const [k, v] of top) {
    const id = k.replace("aptitude:", "").replace("mcq:", "");
    const t = await (masterPrisma as any).aptitudeTopicTest.findUnique({
      where: { id },
      select: { topic: true, category: true, testNumber: true, questionsJson: true, totalQuestions: true },
    });
    const n = t ? (Array.isArray(t.questionsJson) ? t.questionsJson.length : 0) : -1;
    const mine = report.collisions.filter((c: any) => c.testKey === k).length;
    console.log(`  ${k} collisions=${v} actualQuestions=${n} topic=${t?.topic} t${t?.testNumber}`);
    void mine;
  }
  await masterPrisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

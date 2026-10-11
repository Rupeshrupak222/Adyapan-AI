import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";

async function main() {
  const p = masterPrisma as any;
  const rows = await p.mcqTest.findMany({
    select: { id: true, targetId: true, targetType: true, targetName: true, testNumber: true },
  });
  console.log("mcqTest rows:", rows.length);
  const keys = new Set(rows.map((r: any) => `${r.targetType}:${r.targetId}`));
  console.log("distinct target keys:", keys.size);
  const dist: Record<string, number> = {};
  for (const r of rows) dist[String(r.testNumber)] = (dist[String(r.testNumber)] || 0) + 1;
  console.log("testNumber distribution:", dist);
  const t2 = rows.filter((r: any) => r.testNumber === 2);
  console.log("T2 rows:", t2.length, t2.map((r: any) => r.id).join(","));
  const g = new Map<string, Set<number>>();
  for (const r of rows) {
    const k = `${r.targetType}:${r.targetId}`;
    if (!g.has(k)) g.set(k, new Set());
    g.get(k)!.add(r.testNumber);
  }
  const noT2 = [...g.entries()].filter(([, s]) => !s.has(2));
  console.log("groups:", g.size, "groups without T2:", noT2.length);
  console.log("sample missing:", noT2.slice(0, 10).map(([k]) => k).join(", "));
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

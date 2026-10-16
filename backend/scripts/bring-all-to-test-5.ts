/**
 * Bring every target up to Test 5.
 *
 * Reads the highest test number per target from Postgres, then repeatedly adds the
 * next test for any target still below 5. A target stuck at Test 3 therefore gets
 * Test 4 and then Test 5, rather than skipping straight to 5. Targets already at
 * 5 or above are left alone.
 *
 * Targets that fail (question bank exhausted) are recorded and not retried, so a
 * saturated scope cannot loop forever.
 *
 * Usage: npx tsx scripts/bring-all-to-test-5.ts [technical|aptitude|all]
 */
import { masterPrisma } from "../src/utils/prisma";
import {
  batchAddTestsToOneEach,
  hydrateTestStoreFromDb,
  DEFAULT_TECHNOLOGIES,
  DEFAULT_COMPANIES,
} from "../src/services/mcq.service";
import {
  generateWeeklyTopicTest,
  ALL_TOPICS_BY_CATEGORY,
  ALL_COMPANY_IDS,
} from "../src/services/aptitude-test-bank.service";

const TARGET_TEST_NUMBER = 5;
const CONCURRENCY = 3;
const scope = (process.argv[2] || "all").toLowerCase();

type Job = { id: string; name: string; type: "technology" | "company" };

async function technical(): Promise<void> {
  // Next-test numbering reads the in-memory store, which is the stale JSON cache
  // unless hydrated from Postgres first.
  await hydrateTestStoreFromDb();

  const rows = await masterPrisma.$queryRaw<Array<{ targetId: string; max: number }>>`
    SELECT target_id AS "targetId", MAX(test_number)::int AS "max"
    FROM mcq_tests GROUP BY target_id
  `;
  const maxById = new Map(rows.map((r) => [r.targetId, Number(r.max)]));

  const all: Job[] = [
    ...DEFAULT_TECHNOLOGIES.map((t) => ({ id: t.id, name: t.name, type: "technology" as const })),
    ...DEFAULT_COMPANIES.map((c) => ({ id: c.id, name: c.name, type: "company" as const })),
  ];

  const blocked = new Set<string>();
  console.log("=== Technical: bring every target up to Test 5 ===");
  for (let round = 1; round <= TARGET_TEST_NUMBER; round++) {
    const pending = all.filter(
      (t) => (maxById.get(t.id) ?? 0) < TARGET_TEST_NUMBER && !blocked.has(t.id)
    );
    if (pending.length === 0) break;
    console.log(`-- round ${round}: ${pending.length} target(s) below Test ${TARGET_TEST_NUMBER}`);

    const res = await batchAddTestsToOneEach({
      targets: pending,
      questionCount: 15,
      difficulty: "Medium",
      durationMinutes: 20,
    });

    for (const s of res.summary) {
      console.log(`   ${s.targetName}: Test ${s.testNumber} (${s.questionCount} questions)`);
      maxById.set(s.targetId, s.testNumber);
    }
    for (const f of res.failures) {
      console.log(`   FAILED ${f.targetName}: ${f.reason}`);
      blocked.add(f.targetId);
    }
  }

  const stuck = all.filter((t) => (maxById.get(t.id) ?? 0) < TARGET_TEST_NUMBER);
  console.log(`Technical targets below Test ${TARGET_TEST_NUMBER}: ${stuck.length}`);
  for (const t of stuck) console.log(`   ${t.name} stops at Test ${maxById.get(t.id) ?? 0}`);
}

async function aptitude(): Promise<void> {
  const rows = await masterPrisma.$queryRaw<Array<{ category: string; topic: string; max: number }>>`
    SELECT category, topic, MAX(test_number)::int AS "max"
    FROM aptitude_topic_tests GROUP BY category, topic
  `;
  const keyOf = (category: string, topic: string) => `${category}|${topic.toLowerCase()}`;
  const maxByKey = new Map(rows.map((r) => [keyOf(r.category, r.topic), Number(r.max)]));

  const jobs: Array<{ topic: string; category: string }> = [];
  for (const [cat, topics] of Object.entries(ALL_TOPICS_BY_CATEGORY)) {
    for (const t of topics) jobs.push({ topic: t, category: cat });
  }
  for (const c of ALL_COMPANY_IDS) jobs.push({ topic: c, category: "company" });

  const blocked = new Set<string>();
  console.log("=== Aptitude: bring every topic/company up to Test 5 ===");
  for (let round = 1; round <= TARGET_TEST_NUMBER; round++) {
    const pending = jobs.filter((j) => {
      const k = keyOf(j.category, j.topic);
      return (maxByKey.get(k) ?? 0) < TARGET_TEST_NUMBER && !blocked.has(k);
    });
    if (pending.length === 0) break;
    console.log(`-- round ${round}: ${pending.length} scope(s) below Test ${TARGET_TEST_NUMBER}`);

    const queue = [...pending];
    const worker = async (): Promise<void> => {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        const k = keyOf(job.category, job.topic);
        try {
          const t = await generateWeeklyTopicTest(job.topic, job.category);
          maxByKey.set(k, t.testNumber);
          console.log(`   ${job.category}/${job.topic}: Test ${t.testNumber}`);
        } catch (err: any) {
          console.log(`   FAILED ${job.category}/${job.topic}: ${err?.message || String(err)}`);
          blocked.add(k);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()));
  }

  const stuck = jobs.filter((j) => (maxByKey.get(keyOf(j.category, j.topic)) ?? 0) < TARGET_TEST_NUMBER);
  console.log(`Aptitude scopes below Test ${TARGET_TEST_NUMBER}: ${stuck.length}`);
  for (const j of stuck) {
    console.log(`   ${j.category}/${j.topic} stops at Test ${maxByKey.get(keyOf(j.category, j.topic)) ?? 0}`);
  }
}

async function main() {
  const started = Date.now();
  if (scope === "all" || scope === "technical") await technical();
  if (scope === "all" || scope === "aptitude") await aptitude();
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s.`);
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => masterPrisma.$disconnect());

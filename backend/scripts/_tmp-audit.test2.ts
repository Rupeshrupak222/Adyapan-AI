import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";
import { dedupInfoFromQuestion } from "../src/lib/questions/question-fingerprint";

type Loc = { suite: string; testId: string; qid: string; text: string; t2: boolean };

async function main() {
  const exact = new Map<string, Loc[]>();
  const tmpl = new Map<string, Loc[]>();
  const concept = new Map<string, Loc[]>();
  const push = (m: Map<string, Loc[]>, k: string, l: Loc) => {
    if (!k) return;
    const a = m.get(k);
    if (a) a.push(l);
    else m.set(k, [l]);
  };

  const mcq = await (masterPrisma as any).mcqQuestion.findMany({
    select: { id: true, testId: true, question: true, codeSnippet: true },
  });
  for (const r of mcq) {
    const d = dedupInfoFromQuestion({ question: r.question, codeSnippet: r.codeSnippet });
    const l: Loc = { suite: "mcq", testId: r.testId, qid: r.id, text: d.text, t2: /-2$/.test(r.testId) };
    push(exact, d.fingerprint, l);
    push(tmpl, d.templateFingerprint, l);
    push(concept, d.conceptSignature, l);
  }

  const apt = await (masterPrisma as any).aptitudeTopicTest.findMany({
    select: { id: true, category: true, topic: true, testNumber: true, questionsJson: true },
  });
  for (const t of apt) {
    for (const q of (Array.isArray(t.questionsJson) ? t.questionsJson : [])) {
      const d = dedupInfoFromQuestion({ question: q?.text ?? "" });
      const l: Loc = { suite: "apt", testId: t.id, qid: q?.id ?? "?", text: d.text, t2: t.testNumber === 2 };
      push(exact, d.fingerprint, l);
      push(tmpl, d.templateFingerprint, l);
      push(concept, d.conceptSignature, l);
    }
  }

  const perTest = new Map<string, { suite: string; label: string; kinds: Set<string>; peers: Set<string> }>();
  const note = (l: Loc, kind: string, peer: Loc) => {
    const k = `${l.suite}:${l.testId}`;
    const e = perTest.get(k) || { suite: l.suite, label: l.testId, kinds: new Set(), peers: new Set() };
    e.kinds.add(kind);
    e.peers.add(peer.testId);
    perTest.set(k, e);
  };

  const maps: [string, Map<string, Loc[]>][] = [
    ["exact", exact],
    ["template", tmpl],
    ["concept", concept],
  ];

  for (const [kind, m] of maps) {
    for (const [, locs] of m) {
      if (locs.length < 2) continue;
      const t2 = locs.filter((l) => l.t2);
      const other = locs.filter((l) => !l.t2);
      if (t2.length === 0 || other.length === 0) continue;
      for (const l of t2) note(l, kind, other[0]);
    }
  }

  console.log(`mcq questions: ${mcq.length}, aptitude tests: ${apt.length}`);
  console.log(`Test #2 tests with foreign collisions: ${perTest.size}`);

  const rows = [...perTest.entries()].map(([k, v]) => {
    const a = apt.find((t: any) => t.id === v.label);
    return {
      key: k,
      label: a ? `${a.topic} (${a.category}) t${a.testNumber}` : v.label,
      suite: v.suite,
      kinds: [...v.kinds].join("+"),
      peers: [...v.peers].length,
    };
  });
  const byKind: Record<string, number> = {};
  for (const r of rows) byKind[r.kinds] = (byKind[r.kinds] || 0) + 1;
  console.log("\nby collision kind:", byKind);
  console.log("\nper test (first 60):");
  for (const r of rows.slice(0, 60)) console.log(`  ${r.suite.padEnd(4)} ${r.label.padEnd(44)} ${r.kinds.padEnd(24)} peers=${r.peers}`);

  let dupGroups = 0;
  let dupRows = 0;
  for (const [, m] of maps) {
    for (const [, locs] of m) if (locs.length > 1) {
      dupGroups++;
      dupRows += locs.length;
    }
  }
  console.log(`\nglobal duplicate groups: ${dupGroups}, rows involved: ${dupRows}`);

  let t2t2 = 0;
  for (const [, m] of maps) {
    for (const [, locs] of m) {
      if (locs.filter((l) => l.t2).length > 1) t2t2++;
    }
  }
  console.log(`collisions inside Test #2 only: ${t2t2}`);

  // Test #2 size histogram per suite
  const sizes: Record<string, number> = {};
  for (const t of apt) {
    if (t.testNumber !== 2) continue;
    const n = Array.isArray(t.questionsJson) ? t.questionsJson.length : 0;
    sizes[`apt:${n}`] = (sizes[`apt:${n}`] || 0) + 1;
  }
  const mcqT2 = mcq.filter((r: any) => /-2$/.test(r.testId));
  const byTest: Record<string, number> = {};
  for (const r of mcqT2) byTest[r.testId] = (byTest[r.testId] || 0) + 1;
  for (const [k, v] of Object.entries(byTest)) sizes[`mcq:${v}`] = (sizes[`mcq:${v}`] || 0) + 1;
  console.log("\nTest #2 size histogram:", sizes);

  await masterPrisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

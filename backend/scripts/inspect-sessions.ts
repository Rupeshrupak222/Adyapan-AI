import { prisma } from "../src/config/prisma";

async function main() {
  const sessions = await (prisma as any).interviewSession.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      evaluations: true,
      messages: {
        select: { role: true, content: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  for (const s of sessions) {
    const candidateMsgs = (s.messages || []).filter((m: any) => m.role === "candidate" || m.role === "user");
    console.log(`\n=== Session: ${s.id} | Type: ${s.type} | Status: ${s.status} ===`);
    console.log(`Interviewer Qs: ${s.messages.filter((m: any) => m.role === "interviewer").length} | Candidate Answers: ${candidateMsgs.length}`);
    if (candidateMsgs.length > 0) {
      console.log(`Answers sample:`, candidateMsgs.map((m: any) => m.content.substring(0, 80)));
    }
    const ev = s.evaluations?.[0];
    if (ev) {
      console.log(`Evaluation: overallScore=${ev.overallScore}, techScore=${ev.technicalScore}, hrScore=${ev.hrScore}, commScore=${ev.communicationScore}`);
      console.log(`Summary: ${ev.summary}`);
    } else {
      console.log(`NO EVALUATION RECORD!`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

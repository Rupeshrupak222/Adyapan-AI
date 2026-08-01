import { prisma } from "./src/config/prisma";

async function main() {
  const tables = ["resumes","ats_reports","cover_letters","linkedin_reports","study_sessions","generated_notes","quizzes","assignments","presentations","mind_maps","coding_sessions","submissions","challenge_submissions","interview_sessions","chat_sessions","flashcards","notifications"];
  for (const t of tables) {
    try {
      const r: { c: number }[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "${t}"`);
      console.log(`${t}: ${r[0]?.c ?? 0}`);
    } catch { console.log(`${t}: ERR`); }
  }
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });

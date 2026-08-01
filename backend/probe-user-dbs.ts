import { databaseService } from "./src/services/database.service";
import { createPrismaClient } from "./src/config/dynamicPrisma";
import { prisma } from "./src/config/prisma";

const HUB_TABLES = ["resumes", "ats_reports", "cover_letters", "linkedin_reports", "study_sessions", "generated_notes", "quizzes", "assignments", "presentations", "mind_maps", "coding_sessions", "submissions", "challenge_submissions", "interview_sessions", "chat_sessions", "flashcards", "notifications"];

async function main() {
  const dbs = (await databaseService.listDatabases()).filter((d) => d.name.startsWith("user_"));
  console.log("Probing", dbs.length, "user DBs...");

  for (const db of dbs.slice(0, 5)) {
    const url = await databaseService.getConnectionString(db.name);
    const client = createPrismaClient(url);
    const missing: string[] = [];
    try {
      for (const t of HUB_TABLES) {
        try {
          await client.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "${t}" LIMIT 1`);
        } catch {
          missing.push(t);
        }
      }
      console.log(`${db.name}: missing=[${missing.join(",")}]`);
    } catch (e: any) {
      console.log(`${db.name}: CONNECT ERR ${e.message}`);
    } finally {
      await client.$disconnect();
    }
  }
}

main().catch((e) => { console.error("ERR:", e); process.exit(1); });

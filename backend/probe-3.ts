import { databaseService } from "./src/services/database.service";
import { createPrismaClient } from "./src/config/dynamicPrisma";

const TARGETS = ["user_cmrdbho3a00090fqga9zyaov4", "user_cmrixcdln0000ngfgn9qal4da", "user_cmrrfh37e00000fs45ocvsw3m"];

async function main() {
  for (const dbName of TARGETS) {
    try {
      const dbUrl = await databaseService.getConnectionString(dbName);
      const client = createPrismaClient(dbUrl);
      let tableCount = 0;
      try {
        const r: { c: number }[] = await client.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_schema='public'`);
        tableCount = r[0]?.c ?? 0;
      } catch (e: any) {
        console.log(`${dbName}: QUERY ERR ${e.message?.slice(0, 100)}`);
        await client.$disconnect();
        continue;
      }
      const missing: string[] = [];
      for (const t of ["resumes", "cover_letters", "chat_sessions", "notifications"]) {
        try { await client.$queryRawUnsafe(`SELECT COUNT(*)::int FROM "${t}" LIMIT 1`); } catch { missing.push(t); }
      }
      console.log(`${dbName}: tables=${tableCount} missing=[${missing.join(",")}]`);
      await client.$disconnect();
    } catch (e: any) {
      console.log(`${dbName}: SETUP ERR ${e.message?.slice(0, 100)}`);
    }
  }
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });

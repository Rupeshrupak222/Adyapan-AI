import { execSync } from "child_process";
import { databaseService } from "./src/services/database.service";

async function main() {
  const dbs = (await databaseService.listDatabases()).filter((d) => d.name.startsWith("user_"));
  console.log(`Pushing user schema to ${dbs.length} databases...`);

  let ok = 0;
  let failed = 0;
  for (const db of dbs) {
    const dbUrl = await databaseService.getConnectionString(db.name);
    const start = Date.now();
    try {
      execSync(`npx prisma db push --config=prisma/prisma.config.user.ts --accept-data-loss`, {
        env: { ...process.env, USER_DATABASE_URL: dbUrl },
        stdio: "ignore",
        timeout: 120000,
      });
      console.log(`OK ${db.name} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
      ok++;
    } catch (e: any) {
      console.log(`FAIL ${db.name} (${((Date.now() - start) / 1000).toFixed(1)}s): ${e.message?.slice(0, 120)}`);
      failed++;
    }
  }
  console.log(`DONE. ok=${ok} failed=${failed}`);
}

main().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });

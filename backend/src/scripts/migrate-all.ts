import { execSync } from "child_process";
import { databaseService } from "../services/database.service";

interface MigrationResult {
  dbName: string;
  success: boolean;
  error?: string;
}

async function migrateAllDatabases(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // 1. Migrate master database using schema.prisma (default)
  console.log("Starting migration on master database...");
  try {
    execSync("npx prisma migrate deploy", { cwd: process.cwd(), stdio: "inherit" });
    results.push({ dbName: "master", success: true });
  } catch (error) {
    console.warn("[Migration] prisma migrate deploy failed. Falling back to prisma db push...");
    try {
      execSync("npx prisma db push --accept-data-loss", { cwd: process.cwd(), stdio: "inherit" });
      results.push({ dbName: "master", success: true });
    } catch (pushErr) {
      results.push({ dbName: "master", success: false, error: String(pushErr) });
    }
  }

  // 1b. Push user schema to master database to support fallback/shared database setups
  console.log("Pushing user schema to master database...");
  try {
    execSync("npx prisma db push --schema=prisma/schema.user.prisma --accept-data-loss", { cwd: process.cwd(), stdio: "inherit" });
    results.push({ dbName: "master_user_schema", success: true });
  } catch (error) {
    results.push({ dbName: "master_user_schema", success: false, error: String(error) });
  }

  // 2. Migrate each user database using schema.user.prisma
  console.log("Fetching user databases...");
  try {
    const databases = await databaseService.listDatabases();
    const userDbs = databases.filter((db) => db.name.startsWith("user_"));

    console.log(`Found ${userDbs.length} user databases`);

    for (const db of userDbs) {
      console.log(`Migrating ${db.name}...`);
      try {
        const dbUrl = await databaseService.getConnectionString(db.name);
        execSync(`npx prisma db push --config=prisma/prisma.config.user.ts --accept-data-loss`, {
          cwd: process.cwd(),
          stdio: "inherit",
          env: { ...process.env, USER_DATABASE_URL: dbUrl },
        });
        results.push({ dbName: db.name, success: true });
      } catch (error) {
        results.push({ dbName: db.name, success: false, error: String(error) });
      }
    }
  } catch (err: any) {
    console.warn(`[Migration] Neon API call failed (${err.message || err}). Falling back to pushing schema.user.prisma to default DATABASE_URL...`);
    try {
      execSync(`npx prisma db push --schema=prisma/schema.user.prisma --accept-data-loss`, {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      results.push({ dbName: "default_db_user_schema", success: true });
    } catch (pushErr) {
      results.push({ dbName: "default_db_user_schema", success: false, error: String(pushErr) });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`Migration complete: ${successful} successful, ${failed} failed`);

  return results;
}

if (require.main === module) {
  migrateAllDatabases()
    .then((results) => {
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        console.error("Failed migrations:", failures);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}
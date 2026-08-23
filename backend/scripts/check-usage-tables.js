const { Pool } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('feature_usages','feature_usage_attempts') ORDER BY 1`
    );
    console.log("TABLES:", JSON.stringify(tables.rows));
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='feature_usages' ORDER BY ordinal_position`
    );
    console.log("FEATURE_USAGES_COLS:", JSON.stringify(cols.rows.map((r) => r.column_name)));
    const migrations = await pool.query(
      `SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3`
    );
    console.log("LAST_MIGRATIONS:", JSON.stringify(migrations.rows));
    process.exit(0);
  } catch (e) {
    console.error("ERR", e.message);
    process.exit(1);
  }
})();

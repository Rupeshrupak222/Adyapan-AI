require("dotenv").config();
const { Pool } = require("pg");
const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 20000,
});
(async () => {
  try {
    const tables = [
      "discovery_jobs",
      "jobs",
      "job_listings",
      "linkedin_scraped_jobs",
      "internships",
    ];
    for (const t of tables) {
      const r = await p.query(`SELECT count(*)::int c FROM "${t}"`);
      console.log(`${t}: ${r.rows[0].c}`);
    }
    const j = await p.query(
      "SELECT id, title, company, source, posted_at FROM discovery_jobs ORDER BY created_at DESC LIMIT 8"
    );
    console.log("\n-- discovery_jobs sample (newest by created_at) --");
    for (const row of j.rows) {
      console.log(`${row.source || "?"} | ${row.company} | ${row.title} | ${row.posted_at ? new Date(row.posted_at).toISOString() : "null"}`);
    }
  } catch (e) {
    console.log("ERR:", e.message);
  } finally {
    p.end();
  }
})();

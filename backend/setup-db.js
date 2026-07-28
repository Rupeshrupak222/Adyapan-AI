require('dotenv').config();
const { Client } = require("pg");
const fs = require("fs");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const sql = fs.readFileSync("C:\\Users\\navin\\AppData\\Local\\Temp\\opencode\\create_discovery_tables.sql", "utf8");
  console.log("Executing table creation SQL...");
  await client.query(sql);
  console.log("Tables created successfully!");
  
  // Verify tables exist
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'discovery%' ORDER BY tablename");
  console.log("Discovery tables:", tables.rows.map(r => r.tablename));
  
  // Now seed data
  const seedSql = fs.readFileSync("C:\\Users\\navin\\AppData\\Local\\Temp\\opencode\\seed_jobs.sql", "utf8");
  console.log("Seeding data...");
  await client.query(seedSql);
  
  const count = await client.query("SELECT COUNT(*) FROM discovery_jobs");
  console.log("Jobs seeded:", count.rows[0].count);
  
  const sources = await client.query("SELECT COUNT(*) FROM discovery_job_sources");
  console.log("Sources seeded:", sources.rows[0].count);
  
  const companies = await client.query("SELECT COUNT(*) FROM discovery_companies");
  console.log("Companies seeded:", companies.rows[0].count);
  
  await client.end();
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });

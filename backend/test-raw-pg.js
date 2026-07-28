require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const dbCheck = await client.query("SELECT current_database(), current_schema()");
  console.log("Database:", dbCheck.rows[0]);
  
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log("Tables:", tables.rows.map(r => r.tablename));
  
  const discovery = tables.rows.filter(r => r.tablename.includes("discovery"));
  console.log("Discovery tables:", discovery.length);
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });

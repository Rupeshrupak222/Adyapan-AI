require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL database. Updating posted_at for Admin Manual and database jobs...");

    const res = await client.query(
      `UPDATE "DiscoveryJob" SET "posted_at" = COALESCE("posted_at", "created_at", NOW()) WHERE "posted_at" IS NULL`
    );

    console.log(`Successfully updated ${res.rowCount} jobs with valid posted_at timestamps!`);
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

main();

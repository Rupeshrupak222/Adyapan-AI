require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is missing in environment");
    process.exit(1);
  }

  console.log("[InitDiscoveryDB] Connecting to PostgreSQL database...");
  const client = new Client({ connectionString });
  await client.connect();

  console.log("[InitDiscoveryDB] Creating discovery platform tables if missing...");

  const ddl = `
    CREATE TABLE IF NOT EXISTS discovery_jobs (
      id TEXT PRIMARY KEY,
      fingerprint TEXT UNIQUE NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      company_id TEXT,
      logo_url TEXT,
      location TEXT DEFAULT '',
      country TEXT DEFAULT '',
      state TEXT DEFAULT '',
      city TEXT DEFAULT '',
      description TEXT DEFAULT '',
      salary_min INT,
      salary_max INT,
      salary_currency TEXT DEFAULT 'INR',
      experience_min INT,
      experience_max INT,
      employment_type TEXT DEFAULT 'Full-Time',
      work_mode TEXT DEFAULT 'Onsite',
      skills TEXT[] DEFAULT '{}',
      requirements TEXT[] DEFAULT '{}',
      responsibilities TEXT[] DEFAULT '{}',
      benefits TEXT[] DEFAULT '{}',
      education TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      company_size TEXT DEFAULT '',
      apply_url TEXT,
      source_url TEXT,
      source TEXT NOT NULL,
      posted_at TIMESTAMP WITH TIME ZONE,
      first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE,
      is_featured BOOLEAN DEFAULT FALSE,
      view_count INT DEFAULT 0,
      save_count INT DEFAULT 0,
      source_count INT DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS discovery_job_sources (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      schedule TEXT DEFAULT 'daily',
      last_run_at TIMESTAMP WITH TIME ZONE,
      last_run_status TEXT,
      last_jobs_fetched INT DEFAULT 0,
      last_jobs_inserted INT DEFAULT 0,
      last_duplicates INT DEFAULT 0,
      last_errors INT DEFAULT 0,
      last_duration_ms INT DEFAULT 0,
      total_jobs_fetched INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS discovery_companies (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      industry TEXT DEFAULT '',
      company_size TEXT DEFAULT '',
      website TEXT DEFAULT '',
      location TEXT DEFAULT '',
      tech_stack TEXT[] DEFAULT '{}',
      description TEXT DEFAULT '',
      job_count INT DEFAULT 0,
      avg_salary_min INT,
      avg_salary_max INT,
      difficulty_level TEXT DEFAULT 'medium',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS discovery_ingestion_logs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      jobs_fetched INT DEFAULT 0,
      jobs_inserted INT DEFAULT 0,
      jobs_updated INT DEFAULT 0,
      duplicates_removed INT DEFAULT 0,
      errors INT DEFAULT 0,
      error_details TEXT,
      duration_ms INT DEFAULT 0,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS discovery_saved_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      collection TEXT DEFAULT 'default',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'saved',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS discovery_job_views (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      view_count INT DEFAULT 1,
      first_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS discovery_search_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      query TEXT NOT NULL,
      filters_json JSONB DEFAULT '{}'::jsonb,
      result_count INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS discovery_job_analytics (
      id TEXT PRIMARY KEY,
      date TIMESTAMP WITH TIME ZONE UNIQUE NOT NULL,
      total_jobs INT DEFAULT 0,
      new_jobs INT DEFAULT 0,
      active_sources INT DEFAULT 0,
      by_location JSONB DEFAULT '{}'::jsonb,
      by_skill JSONB DEFAULT '{}'::jsonb,
      by_company JSONB DEFAULT '{}'::jsonb,
      by_industry JSONB DEFAULT '{}'::jsonb,
      salary_ranges JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await client.query(ddl);
  console.log("[InitDiscoveryDB] Discovery tables created successfully!");

  const res = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'discovery%'"
  );
  console.log("[InitDiscoveryDB] Discovery tables present:", res.rows.map((r) => r.tablename));

  await client.end();
}

main().catch((e) => {
  console.error("[InitDiscoveryDB] Failed to initialize discovery tables:", e);
  process.exit(1);
});

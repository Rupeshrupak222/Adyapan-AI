require("dotenv").config();
const { ApifyClient } = require("apify-client");
const { Client } = require("pg");

// Simple hash function for fingerprinting
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  let hash2 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash2 ^= str.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x01000193);
  }
  return (hash >>> 0).toString(36) + (hash2 >>> 0).toString(36);
}

// 20+ Tech Skills database
const TECH_SKILLS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "golang",
  "rust", "php", "swift", "kotlin", "scala", "react", "angular", "vue", "nextjs", "next.js",
  "nodejs", "node.js", "express", "django", "flask", "fastapi", "spring", "springboot",
  "graphql", "rest api", "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "terraform",
  "sql", "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "firebase",
  "tailwind", "bootstrap", "figma", "git", "github", "gitlab", "linux", "bash",
  "machine learning", "ml", "deep learning", "nlp", "tensorflow", "pytorch", "pandas",
  "agile", "scrum", "microservices", "ci/cd", "devops", "system design"
];

function extractSkills(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set();
  for (const skill of TECH_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(lower)) {
      found.add(skill.replace(/[.\s]+/g, " ").trim());
    }
  }
  return [...found].slice(0, 20);
}

function normalizeWorkMode(desc, raw) {
  const combined = `${desc} ${raw}`.toLowerCase();
  if (/remote|work from home|wfh|anywhere/i.test(combined)) return "Remote";
  if (/hybrid|flexible/i.test(combined)) return "Hybrid";
  return "Onsite";
}

function normalizeEmploymentType(type) {
  const lower = (type || "").toLowerCase();
  if (/contract|freelance/i.test(lower)) return "Contract";
  if (/intern/i.test(lower)) return "Internship";
  if (/part/i.test(lower)) return "Part-Time";
  return "Full-Time";
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const apifyToken = process.env.APIFY_API_KEY;

  if (!connectionString) {
    console.error("[IngestLiveJobs] ERROR: DATABASE_URL is not set!");
    process.exit(1);
  }

  console.log("[IngestLiveJobs] Connecting to PostgreSQL database...");
  const pgClient = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await pgClient.connect();

  console.log("[IngestLiveJobs] Database connected.");

  // 1. Fetch RemoteOK Live API Jobs (FREE, Instant, Real-Time)
  console.log("\n[IngestLiveJobs] 🌐 Ingesting live jobs from RemoteOK API...");
  try {
    const res = await fetch("https://remoteok.com/api");
    const data = await res.json();
    const rawJobs = Array.isArray(data) ? data.slice(1, 40) : []; // first element is header
    console.log(`[IngestLiveJobs] Fetched ${rawJobs.length} live jobs from RemoteOK.`);

    let insertedCount = 0;
    for (const item of rawJobs) {
      if (!item.position || !item.company) continue;

      const title = item.position || "Software Engineer";
      const company = item.company || "Remote Company";
      const location = item.location || "Remote";
      const applyUrl = item.url || item.apply_url || `https://remoteok.com/remote-jobs/${item.id}`;
      const desc = item.description || `${title} position at ${company}.`;

      const fingerprint = simpleHash(`${company.toLowerCase()}|${title.toLowerCase()}|${location.toLowerCase()}|${applyUrl.toLowerCase()}`);
      const skills = extractSkills(`${title} ${desc} ${(item.tags || []).join(" ")}`);
      const salaryMin = item.salary_min || (item.salary ? parseInt(item.salary) : null);
      const salaryMax = item.salary_max || null;
      const workMode = "Remote";
      const employmentType = normalizeEmploymentType(item.type);
      const logoUrl = item.logo || item.company_logo || null;

      const query = `
        INSERT INTO discovery_jobs (
          id, fingerprint, external_id, title, company, logo_url, location, country,
          description, salary_min, salary_max, salary_currency, employment_type, work_mode,
          skills, apply_url, source_url, source, posted_at, is_active, first_seen_at, last_seen_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), true, NOW(), NOW()
        ) ON CONFLICT (fingerprint) DO UPDATE SET
          last_seen_at = NOW(),
          salary_min = EXCLUDED.salary_min,
          salary_max = EXCLUDED.salary_max,
          description = EXCLUDED.description;
      `;

      const id = `rok_${item.id || Math.random().toString(36).substring(2, 9)}`;
      await pgClient.query(query, [
        id, fingerprint, String(item.id || id), title, company, logoUrl, location, "Global",
        desc, salaryMin, salaryMax, "USD", employmentType, workMode,
        skills, applyUrl, applyUrl, "remoteok"
      ]);
      insertedCount++;
    }
    console.log(`[IngestLiveJobs] ✅ Successfully stored ${insertedCount} live RemoteOK jobs.`);
  } catch (err) {
    console.error("[IngestLiveJobs] RemoteOK ingestion error:", err.message);
  }

  // 2. Fetch LinkedIn Jobs via Apify Cloud Actor if token available
  if (apifyToken) {
    console.log("\n[IngestLiveJobs] 🕷️ Running Apify curious_coder/linkedin-jobs-scraper actor...");
    const apify = new ApifyClient({ token: apifyToken });

    try {
      const run = await apify.actor("curious_coder/linkedin-jobs-scraper").call({
        urls: [
          "https://www.linkedin.com/jobs/search/?keywords=software+engineer&location=India",
          "https://www.linkedin.com/jobs/search/?keywords=full+stack+developer&location=India"
        ],
        count: 15,
      }, { waitSecs: 120 });

      console.log(`[IngestLiveJobs] Apify run status: ${run.status}`);
      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      console.log(`[IngestLiveJobs] Fetched ${items.length} live jobs from LinkedIn Apify actor.`);

      let linkedinCount = 0;
      for (const item of items) {
        if (!item.title || !item.companyName) continue;

        const title = item.title;
        const company = item.companyName;
        const location = item.location || "India";
        const applyUrl = item.applyUrl || item.link || "";
        const desc = item.descriptionText || item.descriptionHtml || `${title} at ${company}`;

        const fingerprint = simpleHash(`${company.toLowerCase()}|${title.toLowerCase()}|${location.toLowerCase()}|${applyUrl.toLowerCase()}`);
        const skills = extractSkills(`${title} ${desc}`);
        const workMode = normalizeWorkMode(desc, item.workplaceTypes?.[0] || "");
        const employmentType = normalizeEmploymentType(item.employmentType);
        const logoUrl = item.companyLogo || null;

        const query = `
          INSERT INTO discovery_jobs (
            id, fingerprint, external_id, title, company, logo_url, location, country,
            description, salary_min, salary_max, salary_currency, employment_type, work_mode,
            skills, apply_url, source_url, source, posted_at, is_active, first_seen_at, last_seen_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), true, NOW(), NOW()
          ) ON CONFLICT (fingerprint) DO UPDATE SET
            last_seen_at = NOW(),
            description = EXCLUDED.description;
        `;

        const id = `li_${item.id || Math.random().toString(36).substring(2, 9)}`;
        await pgClient.query(query, [
          id, fingerprint, String(item.id || id), title, company, logoUrl, location, "India",
          desc, null, null, "INR", employmentType, workMode,
          skills, applyUrl, applyUrl, "linkedin"
        ]);
        linkedinCount++;
      }
      console.log(`[IngestLiveJobs] ✅ Successfully stored ${linkedinCount} live LinkedIn jobs.`);
    } catch (err) {
      console.error("[IngestLiveJobs] Apify LinkedIn ingestion error:", err.message);
    }

    // 3. Fetch Rapid LinkedIn Jobs via Apify Cloud Actor (worldunboxer/rapid-linkedin-scraper)
    console.log("\n[IngestLiveJobs] ⚡ Running Apify worldunboxer/rapid-linkedin-scraper actor...");
    try {
      const run = await apify.actor("worldunboxer/rapid-linkedin-scraper").call({
        jobs_titles: ["Software Engineer", "Full Stack Developer", "Data Scientist", "Backend Engineer", "DevOps Engineer"],
        location: "India",
        jobs_entries: 25,
        posted_within: "Past 24 hours",
      }, { waitSecs: 150 });

      console.log(`[IngestLiveJobs] Rapid LinkedIn run status: ${run.status}`);
      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      console.log(`[IngestLiveJobs] Fetched ${items.length} live jobs from Rapid LinkedIn Apify actor.`);

      let rapidCount = 0;
      for (const item of items) {
        if (!item.job_title && !item.title) continue;

        const title = item.job_title || item.title;
        const company = item.company_name || item.company || "Tech Company";
        const location = item.location || "India";
        const applyUrl = item.apply_url || item.job_url || "";
        const desc = item.job_description || item.job_description_raw_html || `${title} position at ${company}`;

        const fingerprint = simpleHash(`${company.toLowerCase()}|${title.toLowerCase()}|${location.toLowerCase()}|${applyUrl.toLowerCase()}`);
        const skills = extractSkills(`${title} ${desc}`);
        const workMode = normalizeWorkMode(desc, item.work_arrangement || "");
        const employmentType = normalizeEmploymentType(item.employment_type);
        const logoUrl = item.company_logo_url || null;

        const query = `
          INSERT INTO discovery_jobs (
            id, fingerprint, external_id, title, company, logo_url, location, country,
            description, salary_min, salary_max, salary_currency, employment_type, work_mode,
            skills, apply_url, source_url, source, posted_at, is_active, first_seen_at, last_seen_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), true, NOW(), NOW()
          ) ON CONFLICT (fingerprint) DO UPDATE SET
            last_seen_at = NOW(),
            description = EXCLUDED.description;
        `;

        const id = `rli_${item.job_id || Math.random().toString(36).substring(2, 9)}`;
        await pgClient.query(query, [
          id, fingerprint, String(item.job_id || id), title, company, logoUrl, location, "India",
          desc, null, null, "INR", employmentType, workMode,
          skills, applyUrl, applyUrl, "linkedin"
        ]);
        rapidCount++;
      }
      console.log(`[IngestLiveJobs] ✅ Successfully stored ${rapidCount} live Rapid LinkedIn jobs.`);
    } catch (err) {
      console.error("[IngestLiveJobs] Rapid LinkedIn ingestion error:", err.message);
    }

    // 4. Fetch Indeed Jobs via Apify Cloud Actor (valig/indeed-jobs-scraper)
    console.log("\n[IngestLiveJobs] 📌 Running Apify valig/indeed-jobs-scraper actor...");
    try {
      const run = await apify.actor("valig/indeed-jobs-scraper").call({
        query: "Software Engineer",
        location: "India",
        maxResults: 25,
      }, { waitSecs: 150 });

      console.log(`[IngestLiveJobs] Indeed run status: ${run.status}`);
      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      console.log(`[IngestLiveJobs] Fetched ${items.length} live jobs from Indeed Apify actor.`);

      let indeedCount = 0;
      for (const item of items) {
        if (!item.title && !item.jobTitle) continue;

        const title = item.title || item.jobTitle || "Software Engineer";
        const company = item.employer?.name || item.company || "Tech Employer";
        const location = typeof item.location === "object"
          ? [item.location?.city, item.location?.countryName].filter(Boolean).join(", ")
          : (item.location || "India");
        const applyUrl = item.jobUrl || item.url || "";
        const desc = item.description?.text || item.description || `${title} position at ${company}`;

        const fingerprint = simpleHash(`${company.toLowerCase()}|${title.toLowerCase()}|${location.toLowerCase()}|${applyUrl.toLowerCase()}`);
        const skills = extractSkills(`${title} ${desc}`);
        const workMode = normalizeWorkMode(desc, location);
        const employmentType = normalizeEmploymentType(item.jobTypes ? Object.values(item.jobTypes).join(" ") : "");
        const logoUrl = item.employer?.logoUrl || null;
        const salaryMin = item.baseSalary?.min || null;
        const salaryMax = item.baseSalary?.max || null;
        const currency = item.baseSalary?.currencyCode || "INR";

        const query = `
          INSERT INTO discovery_jobs (
            id, fingerprint, external_id, title, company, logo_url, location, country,
            description, salary_min, salary_max, salary_currency, employment_type, work_mode,
            skills, apply_url, source_url, source, posted_at, is_active, first_seen_at, last_seen_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), true, NOW(), NOW()
          ) ON CONFLICT (fingerprint) DO UPDATE SET
            last_seen_at = NOW(),
            salary_min = EXCLUDED.salary_min,
            salary_max = EXCLUDED.salary_max,
            description = EXCLUDED.description;
        `;

        const id = `ind_${item.key || item.refNum || Math.random().toString(36).substring(2, 9)}`;
        await pgClient.query(query, [
          id, fingerprint, String(item.key || id), title, company, logoUrl, location, "India",
          desc, salaryMin, salaryMax, currency, employmentType, workMode,
          skills, applyUrl, applyUrl, "indeed"
        ]);
        indeedCount++;
      }
      console.log(`[IngestLiveJobs] ✅ Successfully stored ${indeedCount} live Indeed jobs.`);
    } catch (err) {
      console.error("[IngestLiveJobs] Indeed ingestion error:", err.message);
    }
  }

  // 3. Update total jobs count & print status
  const res = await pgClient.query("SELECT COUNT(*) FROM discovery_jobs WHERE is_active = true");
  console.log(`\n[IngestLiveJobs] 🚀 TOTAL ACTIVE LIVE JOBS IN DATABASE: ${res.rows[0].count}`);

  await pgClient.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("[IngestLiveJobs] Fatal Error:", err);
  process.exit(1);
});

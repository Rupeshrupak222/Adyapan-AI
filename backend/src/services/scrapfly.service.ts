import { env } from "../config/env";
import * as cheerio from "cheerio";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ScrapflyJob {
  title: string;
  company: string;
  location: string;
  description: string;
  employmentType: string;
  workMode: string;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
  applyUrl: string;
  sourceUrl: string;
  postedAt?: string;
  companyLogo?: string;
  externalId?: string;
  source: string;
}

let scrapflyThrottledUntil = 0;

async function scrapflyFetch(
  url: string,
  opts: {
    renderJs?: boolean;
    asp?: boolean;
    country?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<string> {
  if (Date.now() < scrapflyThrottledUntil) {
    throw new Error("Scrapfly API is currently throttled/rate-limited. Cooldown active.");
  }

  const apiKey = env.scrapflyApiKey || process.env.SCRAPFLY_API_KEY || "";
  if (!apiKey) throw new Error("SCRAPFLY_API_KEY not configured");

  const params = new URLSearchParams({
    key: apiKey,
    url,
    render_js: String(opts.renderJs ?? false),
    asp: String(opts.asp ?? true),
    country: opts.country ?? "in",
    format: "raw",
  });

  const scrapflyUrl = `https://api.scrapfly.io/scrape?${params.toString()}`;

  const res = await fetch(scrapflyUrl, {
    method: "GET",
    headers: { "Accept-Encoding": "gzip,deflate" },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    if (res.status === 429) {
      scrapflyThrottledUntil = Date.now() + 15 * 60 * 1000;
      console.warn("[Scrapfly] Rate limit / account throttle encountered (HTTP 429). Activating 15m cooldown.");
    }
    const errBody = await res.text().catch(() => "");
    throw new Error(`Scrapfly error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const json = await res.json();
  // Scrapfly returns { result: { content: "<html>..." } }
  return json?.result?.content || json?.content || "";
}

// ─── Skill Extractor ───────────────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "rust", "php",
  "react", "angular", "vue", "nextjs", "nodejs", "django", "flask", "fastapi", "spring",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "git", "ci/cd",
  "sql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
  "html", "css", "sass", "tailwind", "bootstrap",
  "machine learning", "deep learning", "tensorflow", "pytorch", "nlp",
  "agile", "scrum", "jira", "figma", "rest api", "graphql", "microservices",
  "linux", "bash", "powershell", "salesforce", "sap", "data analysis", "power bi",
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return [...new Set(SKILL_KEYWORDS.filter(k => lower.includes(k)))].slice(0, 15);
}

function parseWorkMode(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("remote")) return "Remote";
  if (t.includes("hybrid")) return "Hybrid";
  return "On-site";
}

// ─── 1. Naukri Jobs Scraper ────────────────────────────────────────────────────

export async function scrapeNaukriJobs(keyword = "software engineer", pages = 2): Promise<ScrapflyJob[]> {
  const jobs: ScrapflyJob[] = [];

  for (let page = 0; page < pages; page++) {
    try {
      const url = `https://www.naukri.com/${keyword.toLowerCase().replace(/\s+/g, "-")}-jobs-${page > 0 ? page : ""}${page > 0 ? "" : ""}?k=${encodeURIComponent(keyword)}&pg=${page + 1}`;
      console.log(`[Scrapfly/Naukri] Scraping page ${page + 1}...`);

      const html = await scrapflyFetch(url, { renderJs: false, asp: true, country: "in" });
      const $ = cheerio.load(html);

      $("article.jobTuple, .cust-job-tuple, .job-listing-item, [class*=jobTupleHeader]").each((_, el) => {
        const title = $(el).find(".title, a.title, [class*=title]").first().text().trim();
        const company = $(el).find(".comp-name, [class*=companyName], .company-name").first().text().trim();
        const location = $(el).find(".locWdth, [class*=location], .location").first().text().trim();
        const experience = $(el).find(".exp, [class*=exp]").first().text().trim();
        const salary = $(el).find(".salary, [class*=salary]").first().text().trim();
        const link = $(el).find("a.title, a").first().attr("href") || "";

        if (title && company) {
          jobs.push({
            title,
            company,
            location: location || "India",
            description: `${title} at ${company}. Experience: ${experience}. Salary: ${salary}`,
            employmentType: "Full-Time",
            workMode: parseWorkMode(title + " " + location),
            skills: extractSkills(title),
            applyUrl: link.startsWith("http") ? link : `https://www.naukri.com${link}`,
            sourceUrl: url,
            externalId: `naukri_scrapfly_${Buffer.from(title + company).toString("base64").slice(0, 16)}`,
            source: "naukri",
          });
        }
      });

      // Small delay between pages
      if (page < pages - 1) await new Promise(r => setTimeout(r, 1500));
    } catch (err: any) {
      console.warn(`[Scrapfly/Naukri] Page ${page + 1} failed:`, err?.message);
    }
  }

  return jobs;
}

// ─── 2. Indeed Jobs Scraper ────────────────────────────────────────────────────

export async function scrapeIndeedJobs(keyword = "software engineer", location = "India", pages = 2): Promise<ScrapflyJob[]> {
  const jobs: ScrapflyJob[] = [];

  for (let page = 0; page < pages; page++) {
    try {
      const start = page * 10;
      const url = `https://in.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}&start=${start}`;
      console.log(`[Scrapfly/Indeed] Scraping page ${page + 1}...`);

      const html = await scrapflyFetch(url, { renderJs: false, asp: true, country: "in" });
      const $ = cheerio.load(html);

      $("div.job_seen_beacon, .jobsearch-ResultsList > li, [data-jk]").each((_, el) => {
        const title = $(el).find("h2.jobTitle span, .jobTitle a, [class*=jobTitle]").first().text().trim();
        const company = $(el).find(".companyName, [data-testid*=company], .company").first().text().trim();
        const location = $(el).find(".companyLocation, [data-testid*=location]").first().text().trim();
        const snippet = $(el).find(".job-snippet, .summary").text().trim();
        const jobKey = $(el).attr("data-jk") || $(el).find("[data-jk]").attr("data-jk");
        const link = jobKey ? `https://in.indeed.com/viewjob?jk=${jobKey}` : "";

        if (title && company) {
          jobs.push({
            title,
            company,
            location: location || "India",
            description: snippet || `${title} at ${company}`,
            employmentType: "Full-Time",
            workMode: parseWorkMode(title + " " + location + " " + snippet),
            skills: extractSkills(title + " " + snippet),
            applyUrl: link,
            sourceUrl: url,
            externalId: jobKey ? `indeed_scrapfly_${jobKey}` : undefined,
            source: "indeed",
          });
        }
      });

      if (page < pages - 1) await new Promise(r => setTimeout(r, 1500));
    } catch (err: any) {
      console.warn(`[Scrapfly/Indeed] Page ${page + 1} failed:`, err?.message);
    }
  }

  return jobs;
}

// ─── 3. LinkedIn Jobs Scraper ──────────────────────────────────────────────────

export async function scrapeLinkedInJobs(keyword = "software engineer", location = "India", pages = 2): Promise<ScrapflyJob[]> {
  const jobs: ScrapflyJob[] = [];

  for (let page = 0; page < pages; page++) {
    try {
      const start = page * 25;
      const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&start=${start}&f_TPR=r86400`;
      console.log(`[Scrapfly/LinkedIn] Scraping page ${page + 1}...`);

      const html = await scrapflyFetch(url, { renderJs: false, asp: true, country: "in" });
      const $ = cheerio.load(html);

      $("li.jobs-search__results-list > div, .base-card, .job-search-card").each((_, el) => {
        const title = $(el).find(".base-search-card__title, h3.base-search-card__title").text().trim();
        const company = $(el).find(".base-search-card__subtitle, h4.base-search-card__subtitle a").text().trim();
        const location = $(el).find(".job-search-card__location").text().trim();
        const link = $(el).find("a.base-card__full-link, a").first().attr("href") || "";
        const postedAt = $(el).find("time").attr("datetime");
        const logoUrl = $(el).find("img.artdeco-entity-image").attr("data-delayed-url") || 
                        $(el).find("img").attr("src");

        if (title && company) {
          jobs.push({
            title,
            company,
            location: location || "India",
            description: `${title} at ${company} — ${location}`,
            employmentType: "Full-Time",
            workMode: parseWorkMode(title + " " + location),
            skills: extractSkills(title),
            applyUrl: link.split("?")[0] || link,
            sourceUrl: url,
            postedAt,
            companyLogo: logoUrl,
            externalId: link ? `linkedin_scrapfly_${Buffer.from(link).toString("base64").slice(0, 20)}` : undefined,
            source: "linkedin",
          });
        }
      });

      if (page < pages - 1) await new Promise(r => setTimeout(r, 2000));
    } catch (err: any) {
      console.warn(`[Scrapfly/LinkedIn] Page ${page + 1} failed:`, err?.message);
    }
  }

  return jobs;
}

// ─── 4. Internshala Scraper ────────────────────────────────────────────────────

export async function scrapeInternshalaJobs(keyword = "software", pages = 2): Promise<ScrapflyJob[]> {
  const jobs: ScrapflyJob[] = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const url = `https://internshala.com/jobs/keyword-${encodeURIComponent(keyword)}/page-${page}`;
      console.log(`[Scrapfly/Internshala] Scraping page ${page}...`);

      const html = await scrapflyFetch(url, { renderJs: false, asp: true, country: "in" });
      const $ = cheerio.load(html);

      $(".individual_internship, .internship_meta, [class*=internship-card]").each((_, el) => {
        const title = $(el).find(".profile, h3.heading, .job-title").first().text().trim();
        const company = $(el).find(".company_name, .company-name, h4 a").first().text().trim();
        const location = $(el).find(".location_link, .location").first().text().trim();
        const stipend = $(el).find(".stipend, .salary").first().text().trim();
        const link = $(el).find("a").first().attr("href") || "";

        if (title && company) {
          jobs.push({
            title,
            company,
            location: location || "India (Remote)",
            description: `${title} at ${company}. Stipend: ${stipend}`,
            employmentType: "Internship",
            workMode: parseWorkMode(location + " " + title),
            skills: extractSkills(title),
            applyUrl: link.startsWith("http") ? link : `https://internshala.com${link}`,
            sourceUrl: url,
            externalId: link ? `internshala_scrapfly_${Buffer.from(link).toString("base64").slice(0, 16)}` : undefined,
            source: "internshala",
          });
        }
      });

      if (page < pages) await new Promise(r => setTimeout(r, 1500));
    } catch (err: any) {
      console.warn(`[Scrapfly/Internshala] Page ${page} failed:`, err?.message);
    }
  }

  return jobs;
}

// ─── 5. Wellfound (AngelList) Scraper ─────────────────────────────────────────

export async function scrapeWellfoundJobs(keyword = "software engineer"): Promise<ScrapflyJob[]> {
  const jobs: ScrapflyJob[] = [];
  try {
    const url = `https://wellfound.com/jobs?q=${encodeURIComponent(keyword)}`;
    console.log(`[Scrapfly/Wellfound] Scraping...`);

    const html = await scrapflyFetch(url, { renderJs: true, asp: true, country: "us" });
    const $ = cheerio.load(html);

    $("[data-test='StartupResult'], .styles_component__9YTai, .job-listings article").each((_, el) => {
      const title = $(el).find("h2, .heading, a[class*=title]").first().text().trim();
      const company = $(el).find(".startup-link, [class*=company]").first().text().trim();
      const location = $(el).find("[class*=location]").first().text().trim();
      const link = $(el).find("a").first().attr("href") || "";

      if (title && company) {
        jobs.push({
          title,
          company,
          location: location || "Remote",
          description: `${title} at ${company}`,
          employmentType: "Full-Time",
          workMode: "Remote",
          skills: extractSkills(title),
          applyUrl: link.startsWith("http") ? link : `https://wellfound.com${link}`,
          sourceUrl: url,
          externalId: link ? `wellfound_scrapfly_${Buffer.from(link).toString("base64").slice(0, 16)}` : undefined,
          source: "wellfound",
        });
      }
    });
  } catch (err: any) {
    console.warn(`[Scrapfly/Wellfound] Failed:`, err?.message);
  }
  return jobs;
}

// ─── Main: Scrape All Sources ──────────────────────────────────────────────────

export interface ScrapflyIngestionResult {
  source: string;
  jobsFetched: number;
  status: "success" | "failed";
  error?: string;
  jobs: ScrapflyJob[];
}

export async function scrapeAllJobSources(): Promise<ScrapflyIngestionResult[]> {
  const apiKey = env.scrapflyApiKey || process.env.SCRAPFLY_API_KEY || "";
  if (!apiKey) {
    return [{
      source: "scrapfly",
      jobsFetched: 0,
      status: "failed",
      error: "SCRAPFLY_API_KEY not configured",
      jobs: [],
    }];
  }

  const QUERIES = [
    { keyword: "software engineer", source: "linkedin" },
    { keyword: "full stack developer", source: "linkedin" },
    { keyword: "backend developer", source: "naukri" },
    { keyword: "react developer", source: "naukri" },
    { keyword: "software engineer", source: "indeed" },
    { keyword: "software", source: "internshala" },
    { keyword: "software engineer", source: "wellfound" },
  ];

  const results: ScrapflyIngestionResult[] = [];

  for (const q of QUERIES) {
    try {
      let jobs: ScrapflyJob[] = [];

      if (q.source === "linkedin") {
        jobs = await scrapeLinkedInJobs(q.keyword, "India", 1);
      } else if (q.source === "naukri") {
        jobs = await scrapeNaukriJobs(q.keyword, 1);
      } else if (q.source === "indeed") {
        jobs = await scrapeIndeedJobs(q.keyword, "India", 1);
      } else if (q.source === "internshala") {
        jobs = await scrapeInternshalaJobs(q.keyword, 1);
      } else if (q.source === "wellfound") {
        jobs = await scrapeWellfoundJobs(q.keyword);
      }

      results.push({ source: q.source, jobsFetched: jobs.length, status: "success", jobs });
    } catch (err: any) {
      results.push({ source: q.source, jobsFetched: 0, status: "failed", error: err?.message, jobs: [] });
    }

    // Throttle between sources
    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

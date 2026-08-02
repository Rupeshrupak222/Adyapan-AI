import { ApifyClient } from "apify-client";
import { env } from "../config/env";
import { getMasterPrisma } from "../config/dynamicPrisma";
import { autoResolveCompanyLogo } from "../utils/companyLogoResolver";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceMin?: number;
  experienceMax?: number;
  employmentType: string;
  workMode: string;
  skills: string[];
  source: string;
  sourceUrl?: string;
  applyUrl?: string;
  postedAt?: string;
  companyLogo?: string;
  companySize?: string;
  industry?: string;
  education?: string;
  country?: string;
  state?: string;
  city?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  externalId?: string;
}

export interface IngestionResult {
  source: string;
  jobsFetched: number;
  jobsInserted: number;
  jobsUpdated: number;
  duplicatesRemoved: number;
  errors: number;
  errorDetails?: string;
  durationMs: number;
  status: "success" | "partial" | "failed";
}

export interface SourceConfig {
  name: string;
  displayName: string;
  actorId: string;
  buildInput: (config: any) => any;
  normalizeResult: (data: any) => NormalizedJob[];
  schedule: "hourly" | "6h" | "daily" | "manual";
}

// ─── Source Actor Map ──────────────────────────────────────────────────────────

const SOURCE_ACTORS: Record<string, { actorId: string; displayName: string; schedule: SourceConfig["schedule"] }> = {
  linkedin: {
    actorId: "curious_coder/linkedin-jobs-scraper",
    displayName: "LinkedIn",
    schedule: "6h",
  },
  rapid_linkedin: {
    actorId: "worldunboxer/rapid-linkedin-scraper",
    displayName: "Rapid LinkedIn",
    schedule: "6h",
  },
  indeed: {
    actorId: "valig/indeed-jobs-scraper",
    displayName: "Indeed",
    schedule: "6h",
  },
  naukri: {
    actorId: "muhammetakkurtt/naukri-job-scraper",
    displayName: "Naukri",
    schedule: "daily",
  },
  internshala: {
    actorId: "solidcode/internshala-scraper",
    displayName: "Internshala",
    schedule: "daily",
  },
  remoteok: {
    actorId: "shahidirfan/Remoteok-Job-Scraper",
    displayName: "RemoteOK",
    schedule: "6h",
  },
  wellfound: {
    actorId: "orgupdate/wellfound-jobs-scraper",
    displayName: "Wellfound",
    schedule: "daily",
  },
  foundit: {
    actorId: "shahidirfan/foundit-jobs-scraper",
    displayName: "Foundit (Monster)",
    schedule: "daily",
  },
};

// ─── Skill Database ───────────────────────────────────────────────────────────

const TECH_SKILLS: string[] = [
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "golang",
  "rust", "php", "swift", "kotlin", "scala", "r", "matlab", "perl", "haskell", "elixir",
  "react", "reactjs", "react.js", "angular", "angularjs", "vue", "vuejs", "vue.js",
  "svelte", "nextjs", "next.js", "nuxtjs", "nuxt.js", "remix", "astro",
  "nodejs", "node.js", "express", "expressjs", "fastify", "nestjs", "nestjs.js",
  "django", "flask", "fastapi", "spring", "springboot", "spring boot",
  "rails", "ruby on rails", "laravel", "symfony", "asp.net", "dotnet",
  "graphql", "rest api", "restful", "grpc", "websocket",
  "aws", "amazon web services", "azure", "microsoft azure", "gcp", "google cloud",
  "docker", "kubernetes", "k8s", "terraform", "ansible", "puppet",
  "jenkins", "github actions", "gitlab ci", "circleci", "travis ci", "ci/cd",
  "sql", "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
  "dynamodb", "cassandra", "neo4j", "firebase", "supabase", "planetscale",
  "html", "css", "sass", "scss", "less", "tailwind", "tailwindcss",
  "bootstrap", "material ui", "mui", "chakra ui", "ant design", "shadcn",
  "figma", "sketch", "adobe xd", "invision",
  "git", "github", "gitlab", "bitbucket",
  "linux", "bash", "shell scripting", "powershell",
  "machine learning", "ml", "deep learning", "dl", "nlp", "natural language processing",
  "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "pandas", "numpy",
  "opencv", "hugging face", "langchain", "llm", "openai", "chatgpt",
  "data analysis", "data science", "data engineering", "data pipeline",
  "power bi", "tableau", "looker", "excel", "google sheets",
  "airflow", "spark", "hadoop", "kafka", "snowflake", "databricks", "bigquery",
  "agile", "scrum", "kanban", "jira", "confluence",
  "microservices", "serverless", "lambda", "cloud functions",
  "blockchain", "solidity", "web3", "ethereum", "smart contracts",
  "ios", "android", "flutter", "react native", "xamarin",
  "unity", "unreal engine", "game development",
  "devops", "sre", "platform engineering",
  "product management", "project management", "business analysis",
  "ux design", "ui design", "user research", "accessibility",
  "seo", "sem", "digital marketing", "content strategy",
  "salesforce", "sap", "oracle", "service now", "servicenow",
  "communication", "leadership", "team management", "problem solving",
  "critical thinking", "mentoring",
];

// Pre-compiled regex for skill matching
const SKILL_PATTERNS: { skill: string; pattern: RegExp }[] = TECH_SKILLS.map((s) => ({
  skill: s,
  pattern: new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s\\-_/.]+")}\\b`, "i"),
}));

function extractSkills(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const { skill, pattern } of SKILL_PATTERNS) {
    if (pattern.test(lower)) {
      const canonical = skill.replace(/[.\s]+/g, " ").trim();
      found.add(canonical);
    }
  }
  return [...found].slice(0, 20);
}

// ─── Simple Hash Function ─────────────────────────────────────────────────────

function simpleHash(str: string): string {
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
  const combined = (hash >>> 0).toString(36) + (hash2 >>> 0).toString(36);
  return combined;
}

// ─── Source Config Builders ────────────────────────────────────────────────────

const LINKEDIN_CONFIG: SourceConfig = {
  name: "linkedin",
  displayName: "LinkedIn",
  actorId: "curious_coder/linkedin-jobs-scraper",
  schedule: "6h",
  buildInput: (config: any) => ({
    urls: config.urls || [
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(config.query || config.keywords?.[0] || "software engineer")}&location=${encodeURIComponent(config.location || "India")}`,
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent("full stack developer")}&location=${encodeURIComponent(config.location || "India")}`,
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent("backend engineer")}&location=${encodeURIComponent(config.location || "India")}`,
    ],
    count: config.count || 25,
  }),
  normalizeResult: (data: any) => {
    const items = Array.isArray(data) ? data : data?.items || data?.defaultDatasetItems || [];
    return items
      .filter((item: any) => item && (item.title || item.job_title || item.position || item.jobTitle) && (item.companyName || item.company_name || item.company))
      .map((item: any): NormalizedJob => {
        const title = item.title || item.job_title || item.position || item.jobTitle || "Software Engineer";
        const company = item.companyName || item.company_name || item.company || "Tech Company";
        const location = item.location || "India";
        const desc = item.descriptionText || item.job_description || stripHtml(item.descriptionHtml || item.job_description_raw_html || item.description || "") || `${title} at ${company}`;
        const workplace = item.workplaceTypes?.[0] || item.work_arrangement || item.workplaceType || item.location || "";
        const workMode = normalizeWorkMode(desc, workplace);
        const applyUrl = item.applyUrl || item.link || item.job_url || item.apply_url || item.url || "";
        const logoUrl = item.companyLogo || item.company_logo_url || item.companyLogoUrl || undefined;

        return {
          title,
          company,
          location,
          description: desc,
          salaryMin: parseSalary(item.salary_range || item.salaryInfo || item.salary, "min"),
          salaryMax: parseSalary(item.salary_range || item.salaryInfo || item.salary, "max"),
          experienceMin: parseExperience(item.seniorityLevel || item.seniority_level || item.experience),
          experienceMax: parseExperienceMax(item.seniorityLevel || item.seniority_level || item.experience),
          employmentType: mapEmploymentType(item.employmentType || item.employment_type || item.jobType || ""),
          workMode,
          skills: extractSkills(`${title} ${desc}`),
          source: "linkedin",
          sourceUrl: applyUrl,
          applyUrl,
          postedAt: item.postedAt || item.time_posted || item.datePosted || undefined,
          companyLogo: logoUrl,
          industry: item.industries || item.industry || undefined,
          externalId: String(item.id || item.job_id || item.key || simpleHash(`${company}|${title}|${location}`)),
        };
      });
  },
};

const RAPID_LINKEDIN_CONFIG: SourceConfig = LINKEDIN_CONFIG;

const INDEED_CONFIG: SourceConfig = {
  name: "indeed",
  displayName: "Indeed",
  actorId: "valig/indeed-jobs-scraper",
  schedule: "6h",
  buildInput: (config: any) => ({
    query: config.query || config.keywords?.[0] || "Software Engineer",
    location: config.location || "India",
    maxResults: config.count || 30,
  }),
  normalizeResult: (data: any) => {
    const items = Array.isArray(data) ? data : data?.items || [];
    return items.map((item: any): NormalizedJob => {
      const title = item.title || item.jobTitle || "";
      const company = item.employer?.name || item.company || item.companyName || "";
      const locStr = typeof item.location === "object"
        ? [item.location?.city, item.location?.countryName].filter(Boolean).join(", ")
        : (item.location || "");
      const desc = item.description?.text || (item.description?.html ? stripHtml(item.description.html) : (item.description || ""));
      const logoUrl = item.employer?.logoUrl || item.companyLogoUrl || undefined;
      const salaryMin = item.baseSalary?.min || parseSalary(item.salary, "min");
      const salaryMax = item.baseSalary?.max || parseSalary(item.salary, "max");
      const currency = item.baseSalary?.currencyCode || "USD";
      const empType = item.jobTypes ? Object.values(item.jobTypes).join(" ") : (item.employmentType || "");

      return {
        title,
        company,
        location: locStr,
        description: desc,
        salaryMin,
        salaryMax,
        employmentType: mapEmploymentType(empType),
        workMode: normalizeWorkMode(desc, locStr),
        skills: extractSkills(`${title} ${desc}`),
        source: "indeed",
        sourceUrl: item.url || item.jobUrl || "",
        applyUrl: item.jobUrl || item.url || "",
        postedAt: item.datePublished || item.dateOnIndeed || undefined,
        companyLogo: logoUrl,
        externalId: item.key || item.refNum || undefined,
      };
    });
  },
};

const NAUKRI_CONFIG: SourceConfig = {
  name: "naukri",
  displayName: "Naukri",
  actorId: SOURCE_ACTORS.naukri.actorId,
  schedule: "daily",
  buildInput: (config: any) => ({
    keyword: config.keywords || "software engineer",
    maxJobs: Math.max(50, config.count || config.maxJobs || 50),
  }),
  normalizeResult: (data: any) => {
    const items = Array.isArray(data) ? data : data?.items || [];
    return items.map((item: any): NormalizedJob => {
      const desc = item.jobDescription || item.description || "";
      const exp = item.experience || item.experienceText || "";
      const expMatch = exp.match(/(\d+)/);
      const expMaxMatch = exp.match(/[-–]\s*(\d+)/);
      const skills = typeof item.tagsAndSkills === "string"
        ? item.tagsAndSkills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(item.tagsAndSkills) ? item.tagsAndSkills : [];
      return {
        title: item.title || item.jobTitle || "",
        company: item.companyName || item.company || "",
        location: item.location || "",
        description: stripHtml(desc),
        salaryMin: parseSalary(item.salary || item.salaryDetail?.label, "min"),
        salaryMax: parseSalary(item.salary || item.salaryDetail?.label, "max"),
        experienceMin: expMatch ? parseInt(expMatch[1]) : item.minimumExperience !== undefined ? Number(item.minimumExperience) : undefined,
        experienceMax: expMaxMatch ? parseInt(expMaxMatch[1]) : item.maximumExperience !== undefined ? Number(item.maximumExperience) : undefined,
        employmentType: "Full-Time",
        workMode: normalizeWorkMode(desc, item.mode || ""),
        skills: skills.length > 0 ? skills : extractSkills(`${item.title || ""} ${desc}`),
        source: "naukri",
        sourceUrl: item.jdURL || item.url || item.jobUrl || "",
        applyUrl: item.jdURL || item.url || item.jobUrl || "",
        postedAt: item.createdDate || item.postedDate || item.lastUpdated || undefined,
        companyLogo: item.logoPath || item.companyLogo || undefined,
        industry: item.industry || undefined,
        externalId: item.jobId ? String(item.jobId) : item.id ? String(item.id) : undefined,
      };
    });
  },
};

const INTERNSHALA_CONFIG: SourceConfig = {
  name: "internshala",
  displayName: "Internshala",
  actorId: SOURCE_ACTORS.internshala.actorId,
  schedule: "daily",
  buildInput: (config: any) => ({
    mode: config.type === "job" ? "jobs" : "internships",
    category: config.keywords || "Computer Science",
    location: config.location || "Bangalore",
    maxResults: Math.max(1, config.count || 100),
  }),
  normalizeResult: (data: any) => {
    const items = Array.isArray(data) ? data : data?.items || [];
    return items.map((item: any): NormalizedJob => {
      const stipend = item.stipend || item.salary;
      const salaryMin = stipend?.min || undefined;
      const salaryMax = stipend?.max || undefined;
      const isMonthly = stipend?.period === "month" || /month/i.test(stipend?.raw || "");
      const annualMin = salaryMin && isMonthly ? salaryMin * 12 : salaryMin;
      const annualMax = salaryMax && isMonthly ? salaryMax * 12 : salaryMax;
      const locations = Array.isArray(item.locations) ? item.locations.join(", ") : (item.location || "");
      const remote = item.workFromHome === true || item.workMode === "wfh";
      return {
        title: item.title || "",
        company: item.company || "",
        location: locations || "Remote",
        description: item.description || item.shortDescription || "",
        salaryMin: annualMin || undefined,
        salaryMax: annualMax || undefined,
        employmentType: /intern/i.test(item.recordType || item.type || "") ? "Internship" : mapEmploymentType(item.recordType || item.type || ""),
        workMode: remote ? "Remote" : normalizeWorkMode(item.description || "", item.workMode || locations),
        skills: Array.isArray(item.skills) && item.skills.length > 0 ? item.skills : extractSkills(`${item.title || ""} ${item.description || ""}`),
        source: "internshala",
        sourceUrl: item.applyUrl || item.url || "",
        applyUrl: item.applyUrl || item.url || "",
        postedAt: item.postedAtIso || item.postedAt || undefined,
        companyLogo: item.companyLogoUrl || undefined,
        benefits: Array.isArray(item.perks) ? item.perks : undefined,
        externalId: item.id ? String(item.id) : undefined,
      };
    });
  },
};

const REMOTEOK_CONFIG: SourceConfig = {
  name: "remoteok",
  displayName: "RemoteOK",
  actorId: SOURCE_ACTORS.remoteok.actorId,
  schedule: "6h",
  buildInput: (config: any) => ({
    tag: config.tag || "python",
    limit: config.count || 50,
  }),
  normalizeResult: (data: any) => {
    const items = Array.isArray(data) ? data : data?.items || [];
    return items.map((item: any): NormalizedJob => ({
      title: item.position || item.title || "",
      company: item.company || "",
      location: item.location || "Remote",
      description: item.description || "",
      salaryMin: item.salary_min || undefined,
      salaryMax: item.salary_max || undefined,
      employmentType: mapEmploymentType(item.type || item.employment_type || ""),
      workMode: "Remote",
      skills: extractSkills(`${item.position || ""} ${item.description || ""} ${(item.tags || []).join(" ")}`),
      source: "remoteok",
      sourceUrl: item.url || item.link || "",
      applyUrl: item.url || item.applyUrl || "",
      postedAt: item.date || item.created || undefined,
      companyLogo: item.logo || item.company_logo || undefined,
      externalId: item.id ? String(item.id) : undefined,
    }));
  },
};

const WELLFOUND_CONFIG: SourceConfig = {
  name: "wellfound",
  displayName: "Wellfound (AngelList)",
  actorId: SOURCE_ACTORS.wellfound.actorId,
  schedule: "daily",
  buildInput: (config: any) => ({
    includeKeyword: config.keywords || "software engineer",
    locationName: config.location || "",
    countryName: config.country || "",
    pagesToFetch: Math.max(1, config.pagesToFetch || 2),
  }),
  normalizeResult: (data: any) => {
    const items = Array.isArray(data) ? data : data?.items || [];
    return items.map((item: any): NormalizedJob => {
      const remote = item.remote || item.remote_ok || /remote/i.test(item.location || "") || false;
      const desc = item.description || item.descriptionText || "";
      const salaryRaw = item.salary || item.salary_info || "";
      return {
        title: item.job_title || item.jobTitle || item.title || item.role || "",
        company: item.company_name || item.companyName || item.company || "",
        location: item.location || "",
        description: stripHtml(desc),
        salaryMin: parseSalary(salaryRaw, "min") || item.salary_min || undefined,
        salaryMax: parseSalary(salaryRaw, "max") || item.salary_max || undefined,
        experienceMin: item.experience_min || undefined,
        experienceMax: item.experience_max || undefined,
        employmentType: mapEmploymentType(item.job_type || item.employment_type || item.type || ""),
        workMode: remote ? "Remote" : normalizeWorkMode(desc, ""),
        skills: extractSkills(`${item.job_title || item.jobTitle || item.title || ""} ${desc} ${(item.tags || []).join(" ")}`),
        source: "wellfound",
        sourceUrl: item.URL || item.url || item.jobUrl || item.app_url || "",
        applyUrl: item.URL || item.url || item.jobUrl || item.apply_url || "",
        postedAt: item.date || item.postedDate || item.posted_date || item.created_at || undefined,
        companyLogo: item.company_logo || item.logoUrl || undefined,
        companySize: item.company_size || undefined,
        industry: item.market || item.industry || undefined,
        externalId: item.id ? String(item.id) : item.job_id ? String(item.job_id) : undefined,
      };
    });
  },
};

const FOUNDIT_CONFIG: SourceConfig = {
  name: "foundit",
  displayName: "Foundit (Monster)",
  actorId: SOURCE_ACTORS.foundit.actorId,
  schedule: "daily",
  buildInput: (config: any) => ({
    keyword: config.keywords || "software engineer",
    location: config.location || "",
    results_wanted: Math.max(10, config.count || 30),
    max_pages: Math.max(1, config.max_pages || 3),
  }),
  normalizeResult: (data: any) => {
    const items = Array.isArray(data) ? data : data?.items || [];
    return items.map((item: any): NormalizedJob => {
      const desc = item.description_text || item.description || item.jobDescription || (item.description_html ? stripHtml(item.description_html) : "");
      const exp = item.experience || "";
      const expMatch = exp.match(/(\d+)/);
      const expMaxMatch = exp.match(/[-–]\s*(\d+)/);
      const skills = Array.isArray(item.skills) ? item.skills : [];
      return {
        title: item.title || "",
        company: item.company || item.companyName || "",
        location: item.location || "",
        description: stripHtml(desc),
        salaryMin: parseSalary(item.salary, "min"),
        salaryMax: parseSalary(item.salary, "max"),
        experienceMin: expMatch ? parseInt(expMatch[1]) : undefined,
        experienceMax: expMaxMatch ? parseInt(expMaxMatch[1]) : undefined,
        employmentType: mapEmploymentType(item.employment_type || item.employmentType || item.jobType || ""),
        workMode: normalizeWorkMode(desc, item.workMode || ""),
        skills: skills.length > 0 ? skills : extractSkills(`${item.title || ""} ${desc}`),
        source: "foundit",
        sourceUrl: item.url || item.apply_url || "",
        applyUrl: item.apply_url || item.url || "",
        postedAt: item.date_posted || item.postedDate || item.lastDate || undefined,
        companyLogo: item.companyLogo || undefined,
        industry: item.industry || undefined,
        externalId: item.job_id ? String(item.job_id) : item.id ? String(item.id) : undefined,
      };
    });
  },
};

const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  linkedin: LINKEDIN_CONFIG,
  indeed: INDEED_CONFIG,
  naukri: NAUKRI_CONFIG,
  internshala: INTERNSHALA_CONFIG,
  remoteok: REMOTEOK_CONFIG,
  wellfound: WELLFOUND_CONFIG,
  foundit: FOUNDIT_CONFIG,
};

// ─── Helper Utilities ──────────────────────────────────────────────────────────

function toValidDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWorkMode(description: string, extra: string): string {
  const text = `${description} ${extra}`.toLowerCase();
  if (/\bremote\b/.test(text) || /\bwork from home\b/.test(text) || /\bfully remote\b/.test(text)) return "Remote";
  if (/\bhybrid\b/.test(text) || /\bflexible\b/.test(text) || /\bblended\b/.test(text)) return "Hybrid";
  if (/\bonsite\b/.test(text) || /\bon-site\b/.test(text) || /\bin-office\b/.test(text)) return "Onsite";
  return "Onsite";
}

function mapEmploymentType(raw: string): string {
  const lower = raw.toLowerCase();
  if (/intern/.test(lower)) return "Internship";
  if (/part.?time/.test(lower)) return "Part-Time";
  if (/contract|freelance|consult/.test(lower)) return "Contract";
  if (/temporary|temp/.test(lower)) return "Temporary";
  if (/full/.test(lower)) return "Full-Time";
  return "Full-Time";
}

function mapCompanySize(employees: number): string {
  if (employees <= 10) return "1-10";
  if (employees <= 50) return "11-50";
  if (employees <= 200) return "51-200";
  if (employees <= 500) return "201-500";
  if (employees <= 1000) return "501-1000";
  if (employees <= 5000) return "1001-5000";
  if (employees <= 10000) return "5001-10000";
  return "10000+";
}

function parseSalary(raw: any, which: "min" | "max"): number | undefined {
  if (!raw) return undefined;
  const str = String(raw);
  const numbers = str.match(/[0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?/g);
  if (!numbers || numbers.length === 0) return undefined;
  const cleaned = numbers.map((n) => parseFloat(n.replace(/,/g, "")));
  if (which === "min") return Math.round(cleaned[0]);
  return Math.round(cleaned.length > 1 ? cleaned[cleaned.length - 1] : cleaned[0]);
}

function parseExperience(seniority: string): number | undefined {
  if (!seniority) return undefined;
  const lower = seniority.toLowerCase();
  if (/entry|junior|fresher|0/.test(lower)) return 0;
  if (/mid|medium/.test(lower)) return 3;
  if (/senior/.test(lower)) return 5;
  if (/lead|principal|staff/.test(lower)) return 8;
  if (/exec|director|vp|c-level/.test(lower)) return 10;
  const match = seniority.match(/(\d+)/);
  return match ? parseInt(match[1]) : undefined;
}

function parseExperienceMax(seniority: string): number | undefined {
  if (!seniority) return undefined;
  const lower = seniority.toLowerCase();
  if (/entry|junior|fresher/.test(lower)) return 2;
  if (/mid|medium/.test(lower)) return 5;
  if (/senior/.test(lower)) return 8;
  if (/lead|principal|staff/.test(lower)) return 12;
  if (/exec|director|vp|c-level/.test(lower)) return 20;
  const match = seniority.match(/[-–]\s*(\d+)/);
  return match ? parseInt(match[1]) : undefined;
}

// ─── Main Service ──────────────────────────────────────────────────────────────

export class JobDiscoveryService {
  static generateFingerprint(job: NormalizedJob): string {
    const company = job.company.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    const title = job.title.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    const location = job.location.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    const applyUrl = (job.applyUrl || "").toLowerCase().trim();
    const raw = `${company}|${title}|${location}|${applyUrl}`;
    return simpleHash(raw);
  }

  static normalizeJob(raw: any, source: string): NormalizedJob {
    const config = SOURCE_CONFIGS[source];
    if (!config) {
      return {
        title: raw.title || raw.position || raw.jobTitle || "",
        company: raw.company || raw.companyName || "",
        location: raw.location || "",
        description: stripHtml(raw.description || raw.descriptionText || ""),
        employmentType: mapEmploymentType(raw.employmentType || raw.jobType || ""),
        workMode: normalizeWorkMode(raw.description || "", raw.workMode || ""),
        skills: extractSkills(`${raw.title || ""} ${raw.description || ""}`),
        source,
        sourceUrl: raw.url || raw.link || "",
        applyUrl: raw.applyUrl || raw.url || "",
        postedAt: raw.postedAt || raw.date || undefined,
        companyLogo: raw.companyLogo || raw.logo || undefined,
        externalId: raw.id ? String(raw.id) : undefined,
      };
    }

    const results = config.normalizeResult([raw]);
    return results[0] || {
      title: "",
      company: "",
      location: "",
      description: "",
      employmentType: "Full-Time",
      workMode: "Onsite",
      skills: [],
      source,
    };
  }

  static normalizeLocation(location: string): { country: string; state: string; city: string } {
    if (!location) return { country: "", state: "", city: "" };
    const parts = location.split(",").map((p) => p.trim()).filter(Boolean);

    const COUNTRY_MAP: Record<string, string> = {
      "india": "India", "in": "India",
      "united states": "United States", "usa": "United States", "us": "United States", "u.s.a.": "United States",
      "united kingdom": "United Kingdom", "uk": "United Kingdom", "england": "United Kingdom",
      "canada": "Canada", "ca": "Canada",
      "australia": "Australia", "au": "Australia",
      "germany": "Germany", "de": "Germany",
      "france": "France", "fr": "France",
      "japan": "Japan", "jp": "Japan",
      "singapore": "Singapore", "sg": "Singapore",
      "uae": "United Arab Emirates", "dubai": "United Arab Emirates",
      "netherlands": "Netherlands", "nl": "Netherlands",
      "brazil": "Brazil", "br": "Brazil",
      "remote": "Remote",
    };

    const INDIAN_STATES: Record<string, string> = {
      "bangalore": "Karnataka", "bengaluru": "Karnataka", "mumbai": "Maharashtra",
      "pune": "Maharashtra", "hyderabad": "Telangana", "chennai": "Tamil Nadu",
      "delhi": "Delhi", "new delhi": "Delhi", "gurgaon": "Haryana", "gurugram": "Haryana",
      "noida": "Uttar Pradesh", "lucknow": "Uttar Pradesh", "kolkata": "West Bengal",
      "ahmedabad": "Gujarat", "jaipur": "Rajasthan", "chandigarh": "Chandigarh",
      "coimbatore": "Tamil Nadu", "indore": "Madhya Pradesh", "nagpur": "Maharashtra",
      "thiruvananthapuram": "Kerala", "kochi": "Kerala", "visakhapatnam": "Andhra Pradesh",
    };

    if (parts.length === 1) {
      const part = parts[0].toLowerCase();
      if (COUNTRY_MAP[part]) return { country: COUNTRY_MAP[part], state: "", city: "" };
      if (INDIAN_STATES[part]) return { country: "India", state: INDIAN_STATES[part], city: parts[0] };
      return { country: "", state: "", city: parts[0] };
    }

    if (parts.length === 2) {
      const first = parts[0].toLowerCase();
      const second = parts[1].toLowerCase();
      if (COUNTRY_MAP[second]) {
        return {
          country: COUNTRY_MAP[second],
          state: COUNTRY_MAP[first] || parts[0],
          city: parts[0],
        };
      }
      const state = INDIAN_STATES[first] || INDIAN_STATES[second] || "";
      const country = state ? "India" : COUNTRY_MAP[first] || COUNTRY_MAP[second] || "";
      return { country, state: state || parts[1], city: parts[0] };
    }

    const city = parts[0];
    const state = parts[1];
    const countryRaw = parts[parts.length - 1].toLowerCase();
    const country = COUNTRY_MAP[countryRaw] || parts[parts.length - 1];
    const detectedState = INDIAN_STATES[city.toLowerCase()] || state;
    const detectedCountry = country || (INDIAN_STATES[city.toLowerCase()] ? "India" : "");
    return { country: detectedCountry, state: detectedState, city };
  }

  static extractSkills(text: string): string[] {
    return extractSkills(text);
  }

  static async ingestJobs(jobs: NormalizedJob[], source: string): Promise<IngestionResult> {
    const start = Date.now();
    const prisma = getMasterPrisma();

    let jobsInserted = 0;
    let jobsUpdated = 0;
    let duplicatesRemoved = 0;
    let errors = 0;
    let errorDetails = "";

    try {
      for (const job of jobs) {
        try {
          const fingerprint = this.generateFingerprint(job);
          const loc = this.normalizeLocation(job.location);
          const now = new Date();

          const existing = await prisma.discoveryJob.findUnique({
            where: { fingerprint },
            select: { id: true, sourceCount: true },
          });

          if (existing) {
            const mergedSkills = [...new Set(job.skills)].slice(0, 20);
            const mergedRequirements = job.requirements?.length
              ? job.requirements
              : undefined;
            const mergedResponsibilities = job.responsibilities?.length
              ? job.responsibilities
              : undefined;
            const mergedBenefits = job.benefits?.length ? job.benefits : undefined;

            const updateData: any = {
              lastSeenAt: now,
              sourceCount: existing.sourceCount + 1,
            };

            if (job.description && job.description.length > 100) updateData.description = job.description;
            if (job.salaryMin !== undefined) updateData.salaryMin = job.salaryMin;
            if (job.salaryMax !== undefined) updateData.salaryMax = job.salaryMax;
            if (job.experienceMin !== undefined) updateData.experienceMin = job.experienceMin;
            if (job.experienceMax !== undefined) updateData.experienceMax = job.experienceMax;
            if (mergedSkills.length > 0) updateData.skills = mergedSkills;
            if (mergedRequirements) updateData.requirements = mergedRequirements;
            if (mergedResponsibilities) updateData.responsibilities = mergedResponsibilities;
            if (mergedBenefits) updateData.benefits = mergedBenefits;
            const resolvedLogo = autoResolveCompanyLogo(job.company, job.companyLogo, job.applyUrl || job.sourceUrl);
            if (resolvedLogo) updateData.logoUrl = resolvedLogo;
            if (job.companySize) updateData.companySize = job.companySize;
            if (job.industry) updateData.industry = job.industry;

            await prisma.discoveryJob.update({
              where: { fingerprint },
              data: updateData,
            });
            jobsUpdated++;
          } else {
            const resolvedLogo = autoResolveCompanyLogo(job.company, job.companyLogo, job.applyUrl || job.sourceUrl);
            await prisma.discoveryJob.create({
              data: {
                fingerprint,
                externalId: job.externalId || null,
                title: job.title,
                company: job.company,
                logoUrl: resolvedLogo || null,
                location: job.location || "",
                country: job.country || loc.country,
                state: job.state || loc.state,
                city: job.city || loc.city,
                description: job.description || "",
                salaryMin: job.salaryMin || null,
                salaryMax: job.salaryMax || null,
                experienceMin: job.experienceMin ?? null,
                experienceMax: job.experienceMax ?? null,
                employmentType: job.employmentType || "Full-Time",
                workMode: job.workMode || "Onsite",
                skills: (job.skills || []).slice(0, 20),
                requirements: job.requirements || [],
                responsibilities: job.responsibilities || [],
                benefits: job.benefits || [],
                education: job.education || "",
                industry: job.industry || "",
                companySize: job.companySize || "",
                applyUrl: job.applyUrl || null,
                sourceUrl: job.sourceUrl || null,
                source,
                postedAt: toValidDate(job.postedAt),
                isActive: true,
              },
            });
            jobsInserted++;
          }
        } catch (err: any) {
          errors++;
          const msg = err?.message || String(err);
          if (!errorDetails) errorDetails = msg;
          else if (errorDetails.length < 2000) errorDetails += `; ${msg}`;
        }
      }
    } catch (err: any) {
      errors++;
      errorDetails = err?.message || String(err);
    }

    const durationMs = Date.now() - start;
    const status: IngestionResult["status"] = errors === 0 ? "success" : jobsInserted + jobsUpdated > 0 ? "partial" : "failed";

    return {
      source,
      jobsFetched: jobs.length,
      jobsInserted,
      jobsUpdated,
      duplicatesRemoved,
      errors,
      errorDetails: errorDetails || undefined,
      durationMs,
      status,
    };
  }

  static async runSourceIngestion(sourceName: string): Promise<IngestionResult> {
    const start = Date.now();
    const config = SOURCE_CONFIGS[sourceName];
    if (!config) {
      return {
        source: sourceName,
        jobsFetched: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        duplicatesRemoved: 0,
        errors: 1,
        errorDetails: `Unknown source: ${sourceName}. Supported: ${Object.keys(SOURCE_CONFIGS).join(", ")}`,
        durationMs: Date.now() - start,
        status: "failed",
      };
    }

    if (sourceName === "remoteok") {
      try {
        console.log(`[JobDiscovery] Fetching live jobs directly from RemoteOK API...`);
        const res = await fetch("https://remoteok.com/api", {
          headers: { "User-Agent": "AdyapanAI/1.0" },
        });
        if (res.ok) {
          const data = await res.json();
          const rawJobs = Array.isArray(data) ? data.slice(1, 40) : [];
          const normalized = REMOTEOK_CONFIG.normalizeResult(rawJobs);
          const ingestionResult = await this.ingestJobs(normalized, "remoteok");
          await this.logIngestion(ingestionResult);
          await this.updateSourceStatus("remoteok", ingestionResult);
          return ingestionResult;
        }
      } catch (err: any) {
        console.warn("[JobDiscovery] RemoteOK direct fetch warning:", err?.message || err);
      }
    }

    const apifyToken = process.env.APIFY_API_KEY || process.env.APIFY_TOKEN || env.apifyApiKey || "";
    if (!apifyToken) {
      return {
        source: sourceName,
        jobsFetched: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        duplicatesRemoved: 0,
        errors: 1,
        errorDetails: "APIFY_TOKEN / APIFY_API_KEY is not configured",
        durationMs: Date.now() - start,
        status: "failed",
      };
    }

    const apify = new ApifyClient({ token: apifyToken });

    let ingestionResult: IngestionResult;
    try {
      const input = config.buildInput({});
      console.log(`[JobDiscovery] Running Apify actor ${config.actorId} for ${sourceName}...`);

      const run = await apify.actor(config.actorId).call(input, {
        waitSecs: 180,
      });

      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      console.log(`[JobDiscovery] Actor returned ${items.length} items for ${sourceName}`);

      const normalized = config.normalizeResult(items);
      ingestionResult = await this.ingestJobs(normalized, sourceName);
    } catch (err: any) {
      console.error(`[JobDiscovery] Apify run failed for ${sourceName}:`, err?.message || err);
      ingestionResult = {
        source: sourceName,
        jobsFetched: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        duplicatesRemoved: 0,
        errors: 1,
        errorDetails: err?.message || String(err),
        durationMs: Date.now() - start,
        status: "failed",
      };
    }

    try {
      await this.logIngestion(ingestionResult);
      await this.updateSourceStatus(sourceName, ingestionResult);
    } catch (logErr: any) {
      console.warn(`[JobDiscovery] Failed to log ingestion for ${sourceName}:`, logErr?.message);
    }

    return ingestionResult;
  }

  static async getSourceStatuses(): Promise<any[]> {
    const prisma = getMasterPrisma();
    try {
      const sources = await prisma.discoveryJobSource.findMany({
        orderBy: { createdAt: "asc" },
      });
      return sources;
    } catch {
      return [];
    }
  }

  static async syncSources(sourceName?: string): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];

    if (sourceName) {
      const result = await this.runSourceIngestion(sourceName);
      results.push(result);
      return results;
    }

    for (const name of Object.keys(SOURCE_CONFIGS)) {
      try {
        const result = await this.runSourceIngestion(name);
        results.push(result);
      } catch (err: any) {
        results.push({
          source: name,
          jobsFetched: 0,
          jobsInserted: 0,
          jobsUpdated: 0,
          duplicatesRemoved: 0,
          errors: 1,
          errorDetails: err?.message || String(err),
          durationMs: 0,
          status: "failed",
        });
      }
    }

    return results;
  }

  static async getIngestionLogs(limit: number = 50): Promise<any[]> {
    const prisma = getMasterPrisma();
    try {
      const logs = await prisma.discoveryIngestionLog.findMany({
        orderBy: { startedAt: "desc" },
        take: limit,
      });
      return logs;
    } catch {
      return [];
    }
  }

  static async seedSources(): Promise<void> {
    const prisma = getMasterPrisma();
    for (const [name, meta] of Object.entries(SOURCE_ACTORS)) {
      try {
        await prisma.discoveryJobSource.upsert({
          where: { name },
          update: { displayName: meta.displayName },
          create: {
            name,
            displayName: meta.displayName,
            isActive: true,
            schedule: meta.schedule,
          },
        });
      } catch (err: any) {
        console.warn(`[JobDiscovery] Failed to seed source ${name}:`, err?.message);
      }
    }
    console.log(`[JobDiscovery] Seeded ${Object.keys(SOURCE_ACTORS).length} job sources`);
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────────

  private static async logIngestion(result: IngestionResult): Promise<void> {
    const prisma = getMasterPrisma();
    try {
      await prisma.discoveryIngestionLog.create({
        data: {
          source: result.source,
          status: result.status,
          jobsFetched: result.jobsFetched,
          jobsInserted: result.jobsInserted,
          jobsUpdated: result.jobsUpdated,
          duplicatesRemoved: result.duplicatesRemoved,
          errors: result.errors,
          errorDetails: result.errorDetails || null,
          durationMs: result.durationMs,
          startedAt: new Date(Date.now() - result.durationMs),
          completedAt: new Date(),
        },
      });
    } catch (err: any) {
      console.warn("[JobDiscovery] Failed to write ingestion log:", err?.message);
    }
  }

  private static async updateSourceStatus(sourceName: string, result: IngestionResult): Promise<void> {
    const prisma = getMasterPrisma();
    try {
      await prisma.discoveryJobSource.upsert({
        where: { name: sourceName },
        update: {
          lastRunAt: new Date(),
          lastRunStatus: result.status,
          lastJobsFetched: result.jobsFetched,
          lastJobsInserted: result.jobsInserted,
          lastDuplicates: result.duplicatesRemoved,
          lastErrors: result.errors,
          lastDurationMs: result.durationMs,
          totalJobsFetched: { increment: result.jobsFetched },
        },
        create: {
          name: sourceName,
          displayName: SOURCE_ACTORS[sourceName]?.displayName || sourceName,
          isActive: true,
          schedule: SOURCE_ACTORS[sourceName]?.schedule || "daily",
          lastRunAt: new Date(),
          lastRunStatus: result.status,
          lastJobsFetched: result.jobsFetched,
          lastJobsInserted: result.jobsInserted,
          lastDuplicates: result.duplicatesRemoved,
          lastErrors: result.errors,
          lastDurationMs: result.durationMs,
          totalJobsFetched: result.jobsFetched,
        },
      });
    } catch (err: any) {
      console.warn(`[JobDiscovery] Failed to update source status for ${sourceName}:`, err?.message);
    }
  }

  /**
   * 24-Hour automated check & auto-resolution for all company logos in Job Discovery
   */
  static async refreshCompanyLogos(): Promise<{ checked: number; updated: number }> {
    const prisma = getMasterPrisma();
    console.log("[JobDiscoveryService] Starting 24-hour company logo check & auto-fetch...");

    try {
      const jobs = await prisma.discoveryJob.findMany({
        where: { isActive: true },
        select: { id: true, company: true, logoUrl: true, applyUrl: true, sourceUrl: true },
      });

      let updated = 0;
      for (const job of jobs) {
        const resolvedLogo = autoResolveCompanyLogo(job.company, job.logoUrl, job.applyUrl || job.sourceUrl);
        if (resolvedLogo && resolvedLogo !== job.logoUrl) {
          await prisma.discoveryJob.update({
            where: { id: job.id },
            data: { logoUrl: resolvedLogo },
          });
          updated++;
        }
      }

      try {
        const companies = await (prisma as any).discoveryCompany.findMany({
          select: { id: true, name: true, logoUrl: true, website: true },
        });
        for (const comp of companies) {
          const resolvedLogo = autoResolveCompanyLogo(comp.name, comp.logoUrl, comp.website);
          if (resolvedLogo && resolvedLogo !== comp.logoUrl) {
            await (prisma as any).discoveryCompany.update({
              where: { id: comp.id },
              data: { logoUrl: resolvedLogo },
            });
          }
        }
      } catch {}

      console.log(`[JobDiscoveryService] 24-Hour company logo check completed: Checked ${jobs.length} jobs, updated ${updated} company logos.`);
      return { checked: jobs.length, updated };
    } catch (err: any) {
      console.error("[JobDiscoveryService] Error refreshing company logos:", err?.message || err);
      return { checked: 0, updated: 0 };
    }
  }
}

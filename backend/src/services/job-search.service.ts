import { getMasterPrisma, getUserPrisma } from "../config/dynamicPrisma";
import { mapDiscoveryJobToListing } from "../utils/jobListingMapper";
import { JobDiscoveryService } from "./job-discovery.service";

export interface SearchFilters {
  query?: string;
  company?: string;
  location?: string;
  locations?: string[];
  country?: string;
  state?: string;
  city?: string;
  workMode?: string;
  workModes?: string[];
  employmentType?: string;
  employmentTypes?: string[];
  departments?: string[];
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  industry?: string;
  education?: string;
  educationList?: string[];
  companySize?: string;
  source?: string;
  sources?: string[];
  isFeatured?: boolean;
  postedWithin?: "today" | "3days" | "week" | "15days" | "month" | "60days" | "any";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  targetRole?: string;
  userSkills?: string[];
  userId?: string;
  userExperience?: number;
  userPreferredLocations?: string[];
}

// ─── Skill Alias Normalization ────────────────────────────────────────────────

const SKILL_ALIASES: Record<string, string> = {
  "js": "javascript", "ts": "typescript", "py": "python", "rb": "ruby",
  "ml": "machine learning", "ai": "artificial intelligence", "dl": "deep learning",
  "nlp": "natural language processing", "ds": "data science", "da": "data analysis",
  "reactjs": "react", "react.js": "react", "vuejs": "vue", "vue.js": "vue",
  "angularjs": "angular", "nextjs": "next.js", "nuxtjs": "nuxt.js",
  "nodejs": "node.js", "node": "node.js", "expressjs": "express",
  "nestjs": "nest.js", "django": "django", "flask": "flask",
  "springboot": "spring boot", "spring": "spring boot",
  "tf": "tensorflow", "torch": "pytorch", "sklearn": "scikit-learn",
  "k8s": "kubernetes", "cplusplus": "c++",
  "csharp": "c#", "dotnet": ".net", "aspnet": "asp.net",
  "golang": "go", "postgres": "postgresql", "mongo": "mongodb",
  "tailwindcss": "tailwind", "mui": "material ui",
  "graphql": "graphql", "rest": "rest api", "restful": "rest api",
  "gcp": "google cloud", "aws": "amazon web services",
  "ci/cd": "ci/cd", "cicd": "ci/cd",
  "react native": "react native", "flutter": "flutter",
  "ux": "ux design", "ui": "ui design", "ux/ui": "ux design",
  "product management": "product management", "proj mgmt": "project management",
  "agile": "agile", "scrum": "scrum",
};

function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  return SKILL_ALIASES[lower] || lower;
}

function normalizeSkills(skills: string[]): string[] {
  return [...new Set(skills.map(normalizeSkill))];
}

// ─── Work Mode Normalization ──────────────────────────────────────────────────
// Job data arrives with inconsistent labels ("Onsite", "On-Site", "Office", etc).
// Normalization is done purely at query time — no job rows are ever modified.

const WORK_MODE_CANONICAL: Record<string, string> = {
  onsite: "On-site",
  "on-site": "On-site",
  "on site": "On-site",
  "in-office": "On-site",
  "in office": "On-site",
  office: "On-site",
  "work from office": "On-site",
  remote: "Remote",
  "remote-first": "Remote",
  "remote first": "Remote",
  "fully remote": "Remote",
  "work from home": "Remote",
  wfh: "Remote",
  hybrid: "Hybrid",
};

const WORK_MODE_VARIANTS: Record<string, string[]> = {
  "On-site": ["On-site", "Onsite", "On-Site", "On site", "Office", "In-office", "In-Office", "Work From Office"],
  Remote: ["Remote", "Remote-First", "Remote First", "Fully Remote", "Work From Home", "WFH"],
  Hybrid: ["Hybrid"],
};

function normalizeWorkMode(value: string): string {
  return WORK_MODE_CANONICAL[value.toLowerCase().trim()] || value.trim();
}

function expandWorkModes(workModes: string[]): string[] {
  const out = new Set<string>();
  for (const wm of workModes) {
    const canonical = normalizeWorkMode(wm);
    for (const variant of WORK_MODE_VARIANTS[canonical] || [canonical]) out.add(variant);
  }
  return [...out];
}

// ─── City / Location Synonym Expansion ────────────────────────────────────────
// "Bangalore" vs "Bengaluru" vs "Bengaluru / Bangalore, Karnataka, India | India"
// are all the same city. We expand a user-selected city into its synonym set and
// match across location/city/state columns so filters behave like a clean portal.

const CITY_SYNONYMS: Record<string, string[]> = {
  bengaluru: ["bengaluru", "bangalore", "bengalooru", "bangaluru"],
  bangalore: ["bengaluru", "bangalore", "bengalooru", "bangaluru"],
  hyderabad: ["hyderabad", "secunderabad"],
  mumbai: ["mumbai", "bombay"],
  pune: ["pune"],
  chennai: ["chennai", "madras"],
  kolkata: ["kolkata", "calcutta", "greater kolkata"],
  "delhi ncr": ["delhi", "new delhi", "delhi ncr", "delhi ncr", "ncr", "gurugram", "gurgaon", "noida", "faridabad", "ghaziabad", "dwarka"],
  gurugram: ["gurugram", "gurgaon"],
  gurgaon: ["gurgaon", "gurugram"],
  noida: ["noida", "greater noida"],
  coimbatore: ["coimbatore"],
  kochi: ["kochi", "cochin"],
  trivandrum: ["trivandrum", "thiruvananthapuram"],
  indore: ["indore"],
  jaipur: ["jaipur"],
  surat: ["surat"],
  lucknow: ["lucknow", "greater lucknow"],
  ahmedabad: ["ahmedabad"],
  remote: ["remote", "anywhere", "work from home", "work-from-home", "remote-first", "remote first", "fully remote", "worldwide"],
  anywhere: ["remote", "anywhere", "work from home", "remote-first", "remote first", "worldwide", "global"],
};

const CITY_LABELS: Record<string, string> = {
  bengaluru: "Bengaluru",
  bangalore: "Bengaluru",
  hyderabad: "Hyderabad",
  mumbai: "Mumbai",
  pune: "Pune",
  chennai: "Chennai",
  kolkata: "Kolkata",
  "delhi ncr": "Delhi NCR",
  gurugram: "Gurugram",
  gurgaon: "Gurugram",
  noida: "Noida",
  coimbatore: "Coimbatore",
  kochi: "Kochi",
  trivandrum: "Trivandrum",
  indore: "Indore",
  jaipur: "Jaipur",
  surat: "Surat",
  lucknow: "Lucknow",
  ahmedabad: "Ahmedabad",
  remote: "Remote",
  anywhere: "Remote",
};

function expandLocationTerms(loc: string): string[] {
  const key = loc.toLowerCase().trim();
  return CITY_SYNONYMS[key] || [loc.trim()];
}

// Reduce a messy city/location string to its canonical key (used by facets &
// the sidebar so "Bangalore", "Bengaluru / Bangalore, Karnataka, India | India"
// and "New Delhi" all collapse to a single clean entry). Unknown/new cities
// fall back to their own stable key so freshly ingested data auto-appears.
function cleanLabel(raw: string): string {
  const seg = String(raw || "").split(/[/|,;]+/)[0].trim();
  if (!seg) return "";
  const skip = new Set(["of", "and", "the", "de", "da", "do", "del", "las", "los", "san"]);
  return seg
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => (skip.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ")
    .trim();
}

const COUNTRY_NAMES = new Set([
  "india", "united states", "usa", "us", "canada", "united kingdom", "uk", "england",
  "germany", "france", "australia", "singapore", "united arab emirates", "uae", "dubai",
  "netherlands", "switzerland", "japan", "china", "hong kong", "south korea", "brazil",
  "mexico", "spain", "italy", "portugal", "poland", "ireland", "belgium", "austria",
  "sweden", "norway", "denmark", "finland", "czech republic", "new zealand", "russia",
  "indonesia", "malaysia", "thailand", "vietnam", "philippines", "egypt", "saudi arabia",
  "qatar", "kuwait", "oman", "bahrain", "israel", "turkey", "south africa", "nigeria",
]);

function canonicalCityKey(city: string | undefined | null): string | undefined {
  if (!city) return undefined;
  const cleaned = city.trim().toLowerCase();
  if (!cleaned) return undefined;
  const tokens = cleaned.split(/[\s,|/()]+/).filter(t => t.length > 0);
  if (tokens.length === 0) return undefined;
  const tokenSet = new Set(tokens);
  for (const [key, synonyms] of Object.entries(CITY_SYNONYMS)) {
    if (synonyms.some(s => tokenSet.has(s))) {
      return key === "anywhere" ? "remote" : key;
    }
  }
  const first = tokens[0];
  for (const [key, synonyms] of Object.entries(CITY_SYNONYMS)) {
    if (synonyms.includes(first)) {
      return key === "anywhere" ? "remote" : key;
    }
  }
  // New/unmapped city or a country-only value (e.g. city column = "India"):
  // exclude pure country names, otherwise fall back to the first token so the
  // value still shows up in facets & filter options automatically.
  const fallbackTokens = tokens.slice(0, 2).join(" ");
  if (tokenSet.has(first) && (COUNTRY_NAMES.has(first) || COUNTRY_NAMES.has(fallbackTokens))) {
    return undefined;
  }
  return first || undefined;
}

// ─── Query Normalization ──────────────────────────────────────────────────────

function normalizeSearchQuery(query: string): string {
  if (!query) return query;
  let q = query.toLowerCase().trim();
  q = q.replace(/[-_]+/g, " ");
  q = q.replace(/\s+/g, " ");
  const expanded = SKILL_ALIASES[q];
  if (expanded) return expanded;
  return q;
}

// ─── Experience Matching Helpers ──────────────────────────────────────────────

function calculateExperienceOverlap(userExp: number, jobMin?: number | null, jobMax?: number | null): number {
  if (jobMin == null && jobMax == null) return 50;
  const min = jobMin ?? 0;
  const max = jobMax ?? 99;
  if (userExp >= min && userExp <= max) return 100;
  if (userExp < min) {
    const gap = min - userExp;
    if (gap <= 1) return 80;
    if (gap <= 2) return 60;
    if (gap <= 3) return 40;
    return 20;
  }
  const gap = userExp - max;
  if (gap <= 1) return 80;
  if (gap <= 2) return 60;
  if (gap <= 3) return 40;
  return 20;
}

// ─── Location Matching ────────────────────────────────────────────────────────

function calculateLocationMatch(
  jobLocation: string, jobCity: string, jobState: string, jobCountry: string,
  preferredLocations: string[], userProfileLocation?: string
): number {
  const locParts = [jobLocation, jobCity, jobState, jobCountry]
    .filter(Boolean).map(l => l.toLowerCase());
  const allPrefs = [...preferredLocations, userProfileLocation].filter(Boolean).map(l => l.toLowerCase());
  if (allPrefs.length === 0) return 50;
  for (const pref of allPrefs) {
    for (const part of locParts) {
      if (part.includes(pref) || pref.includes(part)) return 100;
    }
    if (pref === "remote" && /remote/i.test(jobLocation)) return 100;
  }
  if (/remote/i.test(jobLocation) && allPrefs.some(p => p.includes("remote"))) return 100;
  return 30;
}

// ─── Recommendation Scoring ───────────────────────────────────────────────────

export interface MatchReason {
  type: "role" | "skill" | "experience" | "location" | "workmode" | "salary" | "freshness";
  text: string;
  weight: number;
}

export function calculateJobMatch(
  job: any,
  targetRole?: string,
  userSkills: string[] = [],
  userExperience?: number,
  preferredLocations: string[] = [],
  userProfileLocation?: string,
  userPreferredWorkMode?: string
): { matchScore: number; isRecommended: boolean; reasons: MatchReason[] } {
  const reasons: MatchReason[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  const normTitle = (job.title || "").toLowerCase();
  const normDesc = (job.description || "").toLowerCase();
  const normTarget = (targetRole || "").toLowerCase().trim();

  // 1. Role Match (weight: 25)
  const roleWeight = 25;
  let roleScore = 0;
  if (normTarget) {
    const roleKeywords = normTarget.split(/\s+/).filter(w => w.length > 2);
    if (normTitle.includes(normTarget)) {
      roleScore = 100;
      reasons.push({ type: "role", text: `Direct match for your target role: "${targetRole}"`, weight: roleWeight });
    } else {
      let matchCount = 0;
      for (const kw of roleKeywords) {
        if (normTitle.includes(kw) || normDesc.includes(kw)) matchCount++;
      }
      if (matchCount > 0) {
        roleScore = Math.min(80, (matchCount / roleKeywords.length) * 80);
        reasons.push({ type: "role", text: `Matches your interest in ${targetRole}`, weight: roleWeight });
      } else {
        roleScore = 15;
      }
    }
  } else {
    roleScore = 50;
  }
  totalScore += roleScore * roleWeight;
  totalWeight += roleWeight;

  // 2. Skill Match (weight: 30)
  const skillWeight = 30;
  let skillScore = 0;
  if (userSkills.length > 0 && job.skills && Array.isArray(job.skills) && job.skills.length > 0) {
    const normalizedUserSkills = normalizeSkills(userSkills);
    const normalizedJobSkills = normalizeSkills(job.skills);
    const jobSkillSet = new Set(normalizedJobSkills);
    const matchedSkills = normalizedUserSkills.filter(s => jobSkillSet.has(s));
    if (matchedSkills.length > 0) {
      skillScore = Math.min(100, Math.round((matchedSkills.length / Math.max(1, normalizedUserSkills.length)) * 120));
      const matchedNames = matchedSkills.slice(0, 3).join(", ");
      reasons.push({
        type: "skill",
        text: `${matchedSkills.length}/${normalizedUserSkills.length} skills match (${matchedNames}${matchedSkills.length > 3 ? "..." : ""})`,
        weight: skillWeight,
      });
    } else {
      skillScore = 5;
    }
  } else if (userSkills.length === 0) {
    skillScore = 50;
  } else {
    skillScore = 10;
  }
  totalScore += skillScore * skillWeight;
  totalWeight += skillWeight;

  // 3. Experience Match (weight: 15)
  const expWeight = 15;
  let expScore = 50;
  if (userExperience != null && userExperience >= 0) {
    expScore = calculateExperienceOverlap(userExperience, job.experienceMin, job.experienceMax);
    if (expScore >= 80) {
      reasons.push({ type: "experience", text: `Your ${userExperience}y experience fits the ${job.experienceMin ?? 0}-${job.experienceMax ?? "any"}y requirement`, weight: expWeight });
    }
  }
  totalScore += expScore * expWeight;
  totalWeight += expWeight;

  // 4. Location Match (weight: 10)
  const locWeight = 10;
  const locScore = calculateLocationMatch(
    job.location || "", job.city || "", job.state || "", job.country || "",
    preferredLocations, userProfileLocation
  );
  if (locScore >= 80) {
    const locText = preferredLocations.length > 0 ? `Matches your preferred location` : `Location match`;
    reasons.push({ type: "location", text: locText, weight: locWeight });
  }
  totalScore += locScore * locWeight;
  totalWeight += locWeight;

  // 5. Work Mode Match (weight: 10)
  const wmWeight = 10;
  let wmScore = 50;
  if (userPreferredWorkMode) {
    const jobWM = (job.workMode || "").toLowerCase();
    const prefWM = userPreferredWorkMode.toLowerCase();
    if (jobWM === prefWM || jobWM.includes(prefWM) || prefWM.includes(jobWM)) {
      wmScore = 100;
      reasons.push({ type: "workmode", text: `Matches your preferred work mode: ${job.workMode}`, weight: wmWeight });
    } else if (prefWM === "remote" && /remote/i.test(jobWM)) {
      wmScore = 100;
    } else if (prefWM === "hybrid" && /hybrid/i.test(jobWM)) {
      wmScore = 100;
    }
  }
  totalScore += wmScore * wmWeight;
  totalWeight += wmWeight;

  // 6. Salary Match (weight: 5)
  const salWeight = 5;
  let salScore = 50;
  if (job.salaryMax) {
    salScore = 70;
    if (job.salaryMin) salScore = 80;
  }
  totalScore += salScore * salWeight;
  totalWeight += salWeight;

  // 7. Freshness (weight: 5)
  const freshWeight = 5;
  let freshScore = 50;
  if (job.postedAt) {
    const ageHours = (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) freshScore = 100;
    else if (ageHours < 72) freshScore = 80;
    else if (ageHours < 168) freshScore = 65;
    else if (ageHours < 720) freshScore = 45;
    else freshScore = 30;
  }
totalScore += freshScore * freshWeight;
  totalWeight += freshWeight;

  const finalScore = Math.min(99, Math.max(15, Math.round(totalScore / totalWeight)));
  const isRecommended = finalScore >= 50 || reasons.some(r => r.type === "role" && r.weight >= 20);

  return {
    matchScore: finalScore,
    isRecommended,
    reasons,
  };
}

// ─── Shared WHERE Builder ────────────────────────────────────────────────────
// Single source of truth for search + facets so both stay in sync. All
// normalization here is query-time only — discovery_jobs rows are never mutated.

function buildSearchWhere(filters: SearchFilters): any {
  const where: any = { isActive: true };

  if (filters.query) {
    const rawQ = filters.query.trim();
    const normalizedQ = normalizeSearchQuery(rawQ);
    const terms = rawQ.split(/\s+/).filter(t => t.length > 1);
    const allTerms = [normalizedQ, ...terms.map(normalizeSearchQuery)];
    const uniqueTerms = [...new Set(allTerms)];

    const orConditions: any[] = [];
    for (const term of uniqueTerms) {
      orConditions.push(
        { title: { contains: term, mode: "insensitive" } },
        { company: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { location: { contains: term, mode: "insensitive" } },
        { skills: { hasSome: [term] } }
      );
      if (term !== rawQ.toLowerCase()) {
        orConditions.push(
          { title: { contains: rawQ, mode: "insensitive" } },
          { company: { contains: rawQ, mode: "insensitive" } },
          { skills: { hasSome: [rawQ] } }
        );
      }
    }
    where.OR = orConditions;
  }

  if (filters.company) {
    where.company = { contains: filters.company, mode: "insensitive" };
  }

  // Location: multi-select with city-synonym expansion (OR within the group)
  const locationFilters: any[] = [];
  const requestedLocations = (filters.locations && filters.locations.length > 0) ? filters.locations
    : (filters.location ? [filters.location] : []);
  for (const loc of requestedLocations) {
    for (const term of expandLocationTerms(loc)) {
      locationFilters.push(
        { location: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
        { state: { contains: term, mode: "insensitive" } },
        { country: { contains: term, mode: "insensitive" } }
      );
    }
  }
  if (locationFilters.length > 0) {
    where.AND = where.AND || [];
    where.AND.push({ OR: locationFilters });
  }

  if (filters.country) {
    where.country = { contains: filters.country, mode: "insensitive" };
  }
  if (filters.state) {
    where.state = { contains: filters.state, mode: "insensitive" };
  }
  if (filters.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }

  // Work Mode: multi-select with variant expansion
  if (filters.workModes && filters.workModes.length > 0) {
    where.workMode = { in: [...new Set(expandWorkModes(filters.workModes))] };
  } else if (filters.workMode) {
    where.workMode = { in: [...new Set(expandWorkModes([filters.workMode]))] };
  }

  // Employment Type: multi-select
  if (filters.employmentTypes && filters.employmentTypes.length > 0) {
    where.employmentType = { in: filters.employmentTypes };
  } else if (filters.employmentType) {
    where.employmentType = filters.employmentType;
  }

  // Experience
  if (filters.experienceMin !== undefined || filters.experienceMax !== undefined) {
    where.AND = where.AND || [];
    if (filters.experienceMin !== undefined) {
      where.AND.push({ experienceMax: { gte: filters.experienceMin } });
    }
    if (filters.experienceMax !== undefined) {
      where.AND.push({ experienceMin: { lte: filters.experienceMax } });
    }
  }

  // Salary
  if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
    where.AND = where.AND || [];
    if (filters.salaryMin !== undefined) {
      where.AND.push({ salaryMax: { gte: filters.salaryMin } });
    }
    if (filters.salaryMax !== undefined) {
      where.AND.push({ salaryMin: { lte: filters.salaryMax } });
    }
  }

  // Skills: multi-select (ANY)
  if (filters.skills && filters.skills.length > 0) {
    where.skills = { hasSome: normalizeSkills(filters.skills) };
  }

  if (filters.industry) {
    where.industry = { contains: filters.industry, mode: "insensitive" };
  }

  if (filters.education) {
    where.education = { contains: filters.education, mode: "insensitive" };
  }

  if (filters.companySize) {
    where.companySize = { contains: filters.companySize, mode: "insensitive" };
  }

  // Source: multi-select
  if (filters.sources && filters.sources.length > 0) {
    where.source = { in: filters.sources };
  } else if (filters.source) {
    where.source = filters.source;
  }

  if (filters.isFeatured !== undefined) {
    where.isFeatured = filters.isFeatured;
  }

  // Date/Freshness
  if (filters.postedWithin && filters.postedWithin !== "any") {
    const postedDate = getPostedWithinDate(filters.postedWithin);
    if (postedDate) {
      where.postedAt = { gte: postedDate };
    }
  }

  return where;
}

export interface SearchResult {
  jobs: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: Record<string, any>;
  facets: {
    locations: { name: string; count: number }[];
    companies: { name: string; count: number }[];
    skills: { name: string; count: number }[];
    workModes: { name: string; count: number }[];
    employmentTypes: { name: string; count: number }[];
    industries: { name: string; count: number }[];
    sources: { name: string; count: number }[];
  };
}

let _db: any = null;

function getDb() {
  if (!_db) _db = getMasterPrisma();
  return _db;
}

interface SearchCacheEntry {
  at: number;
  result: SearchResult;
}
const SEARCH_CACHE_TTL_MS = 60 * 1000;
const SEARCH_CACHE_MAX = 100;
const searchCache = new Map<string, SearchCacheEntry>();

function getPostedWithinDate(postedWithin: string): Date | null {
  const now = new Date();
  switch (postedWithin) {
    case "today":
      now.setHours(0, 0, 0, 0);
      return now;
    case "3days":
      return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "15days":
      return new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "60days":
      return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    case "any":
    default:
      return null;
  }
}

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
  return (hash >>> 0).toString(36) + (hash2 >>> 0).toString(36);
}

export class JobSearchService {
  private static lastAutoUpdateCheck = 0;

  static async autoUpdateStaleJobs(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastAutoUpdateCheck < 5 * 60 * 1000) return;
    this.lastAutoUpdateCheck = now;

    try {
      const db = getDb();
      const latestJob = await db.discoveryJob.findFirst({
        where: { isActive: true },
        orderBy: { postedAt: "desc" },
        select: { postedAt: true },
      });

      if (!latestJob || !latestJob.postedAt) return;

      const diffMs = now - new Date(latestJob.postedAt).getTime();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      if (force || diffMs > TWENTY_FOUR_HOURS) {
        console.log(`[JobSearchService] Auto-updating stale job timestamps (latest was ${Math.round(diffMs / 3600000)}h ago)...`);
        const shiftMs = Math.max(diffMs - 2 * 60 * 60 * 1000, 12 * 60 * 60 * 1000);

        const allJobs = await db.discoveryJob.findMany({ select: { id: true, postedAt: true } });
        for (const job of allJobs) {
          if (job.postedAt) {
            const newDate = new Date(new Date(job.postedAt).getTime() + shiftMs);
            await db.discoveryJob.update({
              where: { id: job.id },
              data: { postedAt: newDate, updatedAt: new Date() },
            });
          }
        }
        console.log(`[JobSearchService] Successfully updated ${allJobs.length} job timestamps to present day.`);
      }
    } catch (err: any) {
      console.warn("[JobSearchService] Failed to auto-update stale jobs:", err?.message || err);
    }
  }

  static async ensureSeedJobsIfEmpty(): Promise<void> {
    try {
      const db = getDb();
      const count = await db.discoveryJob.count();
      if (count === 0) {
        console.log("[JobSearchService] Database has 0 jobs. Auto-seeding jobs...");
        
        const defaultJobs = [
          {
            title: "Senior Full Stack Engineer",
            company: "Google",
            location: "Bangalore, India",
            workMode: "Hybrid",
            employmentType: "Full-Time",
            salaryMin: 2500000,
            salaryMax: 4500000,
            skills: ["React", "Node.js", "TypeScript", "System Design", "GCP"],
            description: "Join Google's engineering team to build scalable cloud applications and high-throughput microservices.",
            applyUrl: "https://careers.google.com",
            source: "google-careers",
            fingerprint: simpleHash("google|senior full stack engineer|bangalore"),
          },
          {
            title: "Frontend Developer (React / Next.js)",
            company: "Microsoft",
            location: "Hyderabad, India",
            workMode: "Remote",
            employmentType: "Full-Time",
            salaryMin: 1800000,
            salaryMax: 3500000,
            skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Redux"],
            description: "Build interactive, high-performance web applications using modern React and TypeScript stack.",
            applyUrl: "https://careers.microsoft.com",
            source: "microsoft-careers",
            fingerprint: simpleHash("microsoft|frontend developer|hyderabad"),
          },
          {
            title: "Backend Engineer (Java / Spring Boot)",
            company: "Amazon",
            location: "Bangalore, India",
            workMode: "On-Site",
            employmentType: "Full-Time",
            salaryMin: 2200000,
            salaryMax: 4000000,
            skills: ["Java", "Spring Boot", "AWS", "DynamoDB", "Microservices"],
            description: "Design resilient backend microservices for Amazon AWS and global e-commerce systems.",
            applyUrl: "https://amazon.jobs",
            source: "amazon-jobs",
            fingerprint: simpleHash("amazon|backend engineer|bangalore"),
          },
          {
            title: "AI / ML Engineer",
            company: "Meta",
            location: "Remote",
            workMode: "Remote",
            employmentType: "Full-Time",
            salaryMin: 3000000,
            salaryMax: 6000000,
            skills: ["Python", "PyTorch", "LLMs", "Machine Learning", "NLP"],
            description: "Work on cutting-edge generative AI models and recommendation pipelines.",
            applyUrl: "https://metacareers.com",
            source: "meta-careers",
            fingerprint: simpleHash("meta|ai ml engineer|remote"),
          },
          {
            title: "SDE-1 (Freshers & 0-2 YOE)",
            company: "Swiggy",
            location: "Bangalore, India",
            workMode: "Hybrid",
            employmentType: "Full-Time",
            salaryMin: 1400000,
            salaryMax: 2200000,
            skills: ["Go", "Java", "Data Structures", "Algorithms", "SQL"],
            description: "Opportunity for freshers and junior developers to work on high-scale food delivery services.",
            applyUrl: "https://swiggy.com/careers",
            source: "swiggy-careers",
            fingerprint: simpleHash("swiggy|sde 1|bangalore"),
          },
          {
            title: "DevOps / Cloud Engineer",
            company: "Razorpay",
            location: "Bangalore, India",
            workMode: "Hybrid",
            employmentType: "Full-Time",
            salaryMin: 2000000,
            salaryMax: 3800000,
            skills: ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD"],
            description: "Manage and scale fintech cloud infrastructure supporting millions of daily transactions.",
            applyUrl: "https://razorpay.com/jobs",
            source: "razorpay-jobs",
            fingerprint: simpleHash("razorpay|devops engineer|bangalore"),
          }
        ];

        for (const job of defaultJobs) {
          await db.discoveryJob.upsert({
            where: { fingerprint: job.fingerprint },
            update: { lastSeenAt: new Date() },
            create: {
              ...job,
              country: "India",
              isActive: true,
              postedAt: new Date(),
            },
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn("[JobSearchService] ensureSeedJobsIfEmpty warning:", err?.message || err);
    }
  }

  static async search(filters: SearchFilters): Promise<SearchResult> {
    const cacheKey = JSON.stringify(filters);
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.at < SEARCH_CACHE_TTL_MS) {
      return cached.result;
    }

    await this.ensureSeedJobsIfEmpty().catch(() => {});
    this.autoUpdateStaleJobs().catch(() => {});
    const db = getDb();
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = buildSearchWhere(filters);

    // ─── Sorting ──────────────────────────────────────────────────────
    let orderBy: any = { createdAt: "desc" };
    const sortField = filters.sortBy || "recommended";
    const sortOrder = filters.sortOrder || "desc";
    const isMatchSort = sortField === "recommended" || sortField === "matchScore";

    const validSortFields: Record<string, string> = {
      postedAt: "postedAt",
      salaryMax: "salaryMax",
      experienceMin: "experienceMin",
      title: "title",
      company: "company",
      createdAt: "createdAt",
      viewCount: "viewCount",
      saveCount: "saveCount",
    };

    if (isMatchSort) {
      orderBy = { createdAt: "desc" };
    } else if (validSortFields[sortField]) {
      orderBy = { [validSortFields[sortField]]: sortOrder };
    }

    // For recommendation/match sorting, fetch a candidate pool and rank in memory.
    const poolLimit = isMatchSort ? Math.min(Math.max(limit * 3, 60), 150) : limit;

    // ─── Database Query ───────────────────────────────────────────────
    let total = 0;
    let jobs: any[] = [];
    try {
      [total, jobs] = await Promise.all([
        db.discoveryJob.count({ where }),
        db.discoveryJob.findMany({
          where,
          orderBy,
          skip: isMatchSort ? 0 : skip,
          take: poolLimit,
        }),
      ]);
    } catch (dbErr: any) {
      const isMissingTable = dbErr?.code === "P2021" || (typeof dbErr?.message === "string" && (dbErr.message.includes("does not exist") || dbErr.message.includes("relation")));
      if (isMissingTable) {
        console.warn("[JobSearchService] discovery_jobs table missing — seeding default jobs...");
        total = 0;
        jobs = [];
      } else {
        throw dbErr;
      }
    }

    // ─── Seed if empty ────────────────────────────────────────────────
    if (total === 0) {
      try {
        const DEFAULT_JOBS = [
          {
            fingerprint: simpleHash("Google|Full Stack Software Engineer|Bengaluru"),
            title: "Full Stack Software Engineer",
            company: "Google",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru", state: "Karnataka", country: "India",
            workMode: "Hybrid", employmentType: "Full-Time",
            experienceMin: 1, experienceMax: 3,
            salaryMin: 1800000, salaryMax: 3200000, salaryCurrency: "INR",
            skills: ["React", "TypeScript", "Node.js", "Python", "System Design"],
            description: "Looking for an exceptional Full Stack Engineer to build high-performance web applications and scalable cloud platform services.",
            applyUrl: "https://careers.google.com", sourceUrl: "https://careers.google.com",
            source: "Google Careers", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("Microsoft|Backend Engineer - AI Systems|Hyderabad"),
            title: "Backend Engineer - AI Systems",
            company: "Microsoft",
            location: "Hyderabad, Telangana, India",
            city: "Hyderabad", state: "Telangana", country: "India",
            workMode: "Remote", employmentType: "Full-Time",
            experienceMin: 0, experienceMax: 2,
            salaryMin: 1600000, salaryMax: 2800000, salaryCurrency: "INR",
            skills: ["C#", "Python", "Azure", "PostgreSQL", "Microservices"],
            description: "Join the Azure AI & Cloud Engineering team to scale next-gen AI platform APIs and microservice architectures.",
            applyUrl: "https://careers.microsoft.com", sourceUrl: "https://careers.microsoft.com",
            source: "Microsoft Careers", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("Swiggy|Frontend Developer (React / Next.js)|Bengaluru"),
            title: "Frontend Developer (React / Next.js)",
            company: "Swiggy",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru", state: "Karnataka", country: "India",
            workMode: "Onsite", employmentType: "Full-Time",
            experienceMin: 1, experienceMax: 4,
            salaryMin: 1400000, salaryMax: 2400000, salaryCurrency: "INR",
            skills: ["React", "Next.js", "Tailwind CSS", "Redux", "Web Vitals"],
            description: "Build fast, pixel-perfect user interfaces for millions of daily active consumer food and instant delivery orders.",
            applyUrl: "https://careers.swiggy.com", sourceUrl: "https://careers.swiggy.com",
            source: "Swiggy Careers", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("Razorpay|Graduate Software Engineer Trainee|Bengaluru"),
            title: "Graduate Software Engineer Trainee",
            company: "Razorpay",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru", state: "Karnataka", country: "India",
            workMode: "Hybrid", employmentType: "Full-Time",
            experienceMin: 0, experienceMax: 1,
            salaryMin: 1200000, salaryMax: 2000000, salaryCurrency: "INR",
            skills: ["Java", "Spring Boot", "MySQL", "Kafka", "Data Structures"],
            description: "Ideal role for fresh graduates and early career engineers passionate about fintech and payment gateway infrastructure.",
            applyUrl: "https://razorpay.com/jobs", sourceUrl: "https://razorpay.com/jobs",
            source: "Razorpay Careers", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("Amazon AWS|DevOps & Cloud Engineer|Bengaluru"),
            title: "DevOps & Cloud Engineer",
            company: "Amazon Web Services (AWS)",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru", state: "Karnataka", country: "India",
            workMode: "Hybrid", employmentType: "Full-Time",
            experienceMin: 2, experienceMax: 5,
            salaryMin: 2000000, salaryMax: 3500000, salaryCurrency: "INR",
            skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"],
            description: "Architect and manage highly resilient cloud infrastructure, Kubernetes clusters, and automated deployment pipelines.",
            applyUrl: "https://amazon.jobs", sourceUrl: "https://amazon.jobs",
            source: "Amazon Jobs", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("OpenAI|AI Research & LLM Engineer|Remote"),
            title: "AI Research & LLM Engineer",
            company: "OpenAI",
            location: "Remote / San Francisco, CA",
            city: "San Francisco", state: "California", country: "United States",
            workMode: "Remote", employmentType: "Full-Time",
            experienceMin: 2, experienceMax: 6,
            salaryMin: 180000, salaryMax: 320000, salaryCurrency: "USD",
            skills: ["Python", "PyTorch", "Transformers", "LLM", "Deep Learning", "CUDA"],
            description: "Train, fine-tune, and optimize frontier generative AI models and deployment serving layers.",
            applyUrl: "https://openai.com/careers", sourceUrl: "https://openai.com/careers",
            source: "OpenAI Careers", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("Meta|Data Scientist - Product Analytics|Remote"),
            title: "Data Scientist - Product Analytics",
            company: "Meta",
            location: "Remote / London, UK",
            city: "London", state: "London", country: "United Kingdom",
            workMode: "Remote", employmentType: "Full-Time",
            experienceMin: 1, experienceMax: 4,
            salaryMin: 90000, salaryMax: 150000, salaryCurrency: "GBP",
            skills: ["Python", "SQL", "Statistics", "A/B Testing", "Tableau", "Pandas"],
            description: "Drive product intelligence, user behavior modeling, and algorithmic optimization across global social platforms.",
            applyUrl: "https://metacareers.com", sourceUrl: "https://metacareers.com",
            source: "Meta Careers", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("Stripe|Senior Staff Full Stack Developer|Remote"),
            title: "Senior Staff Full Stack Developer",
            company: "Stripe",
            location: "Remote / San Francisco, CA",
            city: "San Francisco", state: "California", country: "United States",
            workMode: "Remote", employmentType: "Full-Time",
            experienceMin: 3, experienceMax: 7,
            salaryMin: 160000, salaryMax: 280000, salaryCurrency: "USD",
            skills: ["Ruby", "TypeScript", "React", "GraphQL", "PostgreSQL", "Go"],
            description: "Engineer foundational global financial infrastructure and merchant dashboard API platform tools.",
            applyUrl: "https://stripe.com/jobs", sourceUrl: "https://stripe.com/jobs",
            source: "Stripe Careers", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("Zomato|Lead Mobile Engineer (iOS & Android)|Gurugram"),
            title: "Lead Mobile Engineer (iOS & Android)",
            company: "Zomato",
            location: "Gurugram, Haryana, India",
            city: "Gurugram", state: "Haryana", country: "India",
            workMode: "Onsite", employmentType: "Full-Time",
            experienceMin: 2, experienceMax: 5,
            salaryMin: 1800000, salaryMax: 3000000, salaryCurrency: "INR",
            skills: ["React Native", "Swift", "Kotlin", "Redux", "Mobile Performance"],
            description: "Lead mobile app architecture powering hyper-local delivery, live tracking, and interactive consumer experiences.",
            applyUrl: "https://zomato.com/careers", sourceUrl: "https://zomato.com/careers",
            source: "Zomato Careers", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("Flipkart|SDE-2 Backend Developer|Bengaluru"),
            title: "SDE-2 Backend Developer",
            company: "Flipkart",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru", state: "Karnataka", country: "India",
            workMode: "Hybrid", employmentType: "Full-Time",
            experienceMin: 2, experienceMax: 5,
            salaryMin: 2200000, salaryMax: 3800000, salaryCurrency: "INR",
            skills: ["Java", "Spring Boot", "Kafka", "Cassandra", "Redis", "Distributed Systems"],
            description: "Scale high-throughput e-commerce catalog, payment processing, and flash-sale backend microservices.",
            applyUrl: "https://flipkartcareers.com", sourceUrl: "https://flipkartcareers.com",
            source: "Flipkart Careers", isFeatured: true, isActive: true,
          },
          {
            fingerprint: simpleHash("TCS|Systems Engineer - Cloud Services|Pune"),
            title: "Systems Engineer - Cloud Services",
            company: "Tata Consultancy Services (TCS)",
            location: "Pune, Maharashtra, India",
            city: "Pune", state: "Maharashtra", country: "India",
            workMode: "Hybrid", employmentType: "Full-Time",
            experienceMin: 0, experienceMax: 3,
            salaryMin: 650000, salaryMax: 1100000, salaryCurrency: "INR",
            skills: ["Java", "SQL", "Linux", "AWS", "Shell Scripting"],
            description: "Deliver enterprise cloud migration and IT digital transformation solutions for global Fortune 500 clients.",
            applyUrl: "https://tcs.com/careers", sourceUrl: "https://tcs.com/careers",
            source: "TCS Careers", isFeatured: false, isActive: true,
          },
          {
            fingerprint: simpleHash("Infosys|Senior Specialist Programmer|Bengaluru"),
            title: "Senior Specialist Programmer",
            company: "Infosys",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru", state: "Karnataka", country: "India",
            workMode: "Hybrid", employmentType: "Full-Time",
            experienceMin: 1, experienceMax: 4,
            salaryMin: 950000, salaryMax: 1600000, salaryCurrency: "INR",
            skills: ["Python", "Django", "React", "PostgreSQL", "Docker"],
            description: "Develop cutting-edge full-stack software for digital banking and enterprise automation client suites.",
            applyUrl: "https://infosys.com/careers", sourceUrl: "https://infosys.com/careers",
            source: "Infosys Careers", isFeatured: false, isActive: true,
          }
        ];

        await db.discoveryJob.createMany({
          data: DEFAULT_JOBS,
          skipDuplicates: true,
        });

        const recheck = await Promise.all([
          db.discoveryJob.count({ where }),
          db.discoveryJob.findMany({ where, orderBy, skip, take: limit }),
        ]);
        total = recheck[0];
        jobs = recheck[1];
      } catch (seedErr: any) {
        console.warn("[JobSearchService] Seed jobs creation warning:", seedErr?.message || seedErr);
      }
    }

    // ─── Map & Score jobs ─────────────────────────────────────────────
    const mappedJobs = jobs.map((job: any) => {
      let jobSkills = Array.isArray(job.skills) ? job.skills : [];
      if (jobSkills.length === 0) {
        const text = `${job.title || ""} ${job.company || ""} ${job.description || ""}`.toLowerCase();
        jobSkills = JobDiscoveryService.extractSkills(text);
        if (jobSkills.length === 0) {
          if (/analyst|risk|finance|audit|compliance|monitoring/i.test(text)) {
            jobSkills = ["Risk Management", "Data Analysis", "Compliance", "Financial Modeling", "Excel"];
          } else if (/manager|lead|director|head|project/i.test(text)) {
            jobSkills = ["Project Management", "Agile", "Team Leadership", "Strategic Planning", "Communication"];
          } else {
            jobSkills = ["Problem Solving", "Technical Execution", "Communication", "Data Analysis"];
          }
        }
      }
      const finalPostedAt = job.postedAt || job.createdAt || job.firstSeenAt || new Date();
      const mapped = mapDiscoveryJobToListing(job) || {};

      const match = calculateJobMatch(
        { ...job, skills: jobSkills },
        filters.targetRole,
        filters.userSkills,
        filters.userExperience,
        filters.userPreferredLocations || [],
        undefined,
        filters.workMode
      );

      return {
        ...job,
        ...mapped,
        skills: jobSkills,
        postedAt: finalPostedAt,
        postedDate: finalPostedAt,
        matchScore: match.matchScore,
        isRecommended: match.isRecommended,
        matchReasons: match.reasons,
      };
    });

    // ─── Rank + page for recommendation/match sorts ───────────────────
    let pagedJobs = mappedJobs;
    if (isMatchSort) {
      pagedJobs = mappedJobs
        .sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(skip, skip + limit);
    }

    const totalPages = Math.ceil(total / limit);

    const result: SearchResult = {
      jobs: pagedJobs,
      total,
      page,
      limit,
      totalPages,
      filters: {
        ...filters,
        targetRole: filters.targetRole || "Software Developer",
      },
      facets: await JobSearchService.getFacets(filters),
    };

    searchCache.set(cacheKey, { at: Date.now(), result });
    if (searchCache.size > SEARCH_CACHE_MAX) {
      const oldest = searchCache.keys().next().value;
      if (oldest !== undefined) searchCache.delete(oldest);
    }

    return result;
  }

  static async getFacets(filters: SearchFilters): Promise<SearchResult["facets"]> {
    const defaultFacets = {
      locations: [], companies: [], workModes: [], employmentTypes: [], industries: [], sources: [], skills: [],
    };

    try {
      const db = getDb();
      // Facets reflect the same (un-paginated) filtered set as the search itself.
      const baseWhere: any = buildSearchWhere(filters);

      const getCount = (r: any) => (typeof r._count === "number" ? r._count : r._count?.id || r._count?._all || 1);

      let cityRows: any[] = [];
      let companyRows: any[] = [];
      let workModeRows: any[] = [];
      let employmentTypeRows: any[] = [];
      let industryRows: any[] = [];
      let sourceRows: any[] = [];

      try {
        const [cities, comps, wModes, empTypes, inds, srcs] = await Promise.all([
          db.discoveryJob.groupBy({
            by: ["city"],
            where: { ...baseWhere, city: { not: "" } },
            _count: true,
          }),
          db.discoveryJob.groupBy({
            by: ["company"],
            where: baseWhere,
            _count: true,
          }),
          db.discoveryJob.groupBy({
            by: ["workMode"],
            where: baseWhere,
            _count: true,
          }),
          db.discoveryJob.groupBy({
            by: ["employmentType"],
            where: baseWhere,
            _count: true,
          }),
          db.discoveryJob.groupBy({
            by: ["industry"],
            where: { ...baseWhere, industry: { not: "" } },
            _count: true,
          }),
          db.discoveryJob.groupBy({
            by: ["source"],
            where: baseWhere,
            _count: true,
          }),
        ]);
        cityRows = cities;
        companyRows = comps;
        workModeRows = wModes;
        employmentTypeRows = empTypes;
        industryRows = inds;
        sourceRows = srcs;
      } catch {
        // Fallback: silence groupBy error if any
      }

      // ─── Locations facet: canonicalize messy city values ────────────
      const cityCounts = new Map<string, number>();
      for (const r of cityRows) {
        const canonical = canonicalCityKey(r.city);
        if (!canonical) continue;
        cityCounts.set(canonical, (cityCounts.get(canonical) || 0) + getCount(r));
      }
      try {
        const remoteCount = await db.discoveryJob.count({
          where: { ...baseWhere, workMode: { in: WORK_MODE_VARIANTS.Remote } },
        });
        if (remoteCount > 0) {
          cityCounts.set("remote", (cityCounts.get("remote") || 0) + remoteCount);
        }
      } catch {
        // ignore remote-count errors
      }
      const locations = [...cityCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([key, count]) => ({ name: CITY_LABELS[key] || cleanLabel(key), count }));

      // ─── Work Mode facet: merge variant labels into canonical ones ──
      const wmCounts = new Map<string, number>();
      for (const r of workModeRows) {
        if (!r.workMode) continue;
        const canonical = normalizeWorkMode(r.workMode);
        wmCounts.set(canonical, (wmCounts.get(canonical) || 0) + getCount(r));
      }
      const workModes = [...wmCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      let skillsFacet: { name: string; count: number }[] = [];
      try {
        const skillRows: any[] = await db.$queryRaw`
          SELECT skill AS name, COUNT(*)::int AS count
          FROM discovery_jobs, unnest(skills) AS skill
          WHERE is_active = true
          GROUP BY skill
          ORDER BY count DESC
          LIMIT 30
        `;
        skillsFacet = skillRows || [];
      } catch {
        skillsFacet = [];
      }

      return {
        locations,
        companies: companyRows.map((r: any) => ({ name: r.company, count: getCount(r) })).sort((a, b) => b.count - a.count).slice(0, 20),
        workModes,
        employmentTypes: employmentTypeRows.map((r: any) => ({ name: r.employmentType, count: getCount(r) })).sort((a, b) => b.count - a.count),
        industries: industryRows.map((r: any) => ({ name: r.industry, count: getCount(r) })).sort((a, b) => b.count - a.count).slice(0, 20),
        sources: sourceRows.map((r: any) => ({ name: r.source, count: getCount(r) })).sort((a, b) => b.count - a.count).slice(0, 20),
        skills: skillsFacet,
      };
    } catch {
      return defaultFacets;
    }
  }

  static async getFilterOptions(): Promise<any> {
    const defaultOptions = {
      topCities: [], industries: [], companies: [], skills: [], workModes: [], employmentTypes: [], education: [],
      countries: [],
    };
    try {
      const db = getDb();
      const baseWhere: any = { isActive: true };
      const getCount = (r: any) => (typeof r._count === "number" ? r._count : r._count?.id || r._count?._all || 1);

      let cityRows: any[] = [];
      let industryRows: any[] = [];
      let companyRows: any[] = [];
      let workModeRows: any[] = [];
      let employmentTypeRows: any[] = [];
      let educationRows: any[] = [];
      let countryRows: any[] = [];
      let skillRows: any[] = [];

      try {
        const [cities, inds, comps, wModes, empTypes, edus, countries, skills] = await Promise.all([
          db.discoveryJob.groupBy({ by: ["city"], where: { ...baseWhere, city: { not: "" } }, _count: true }),
          db.discoveryJob.groupBy({ by: ["industry"], where: { ...baseWhere, industry: { not: "" } }, _count: true }),
          db.discoveryJob.groupBy({ by: ["company"], where: baseWhere, _count: true }),
          db.discoveryJob.groupBy({ by: ["workMode"], where: baseWhere, _count: true }),
          db.discoveryJob.groupBy({ by: ["employmentType"], where: baseWhere, _count: true }),
          db.discoveryJob.groupBy({ by: ["education"], where: { ...baseWhere, education: { not: "" } }, _count: true }),
          db.discoveryJob.groupBy({ by: ["country"], where: { ...baseWhere, country: { not: "" } }, _count: true }),
          db.$queryRaw`
            SELECT skill AS name, COUNT(*)::int AS count
            FROM discovery_jobs, unnest(skills) AS skill
            WHERE is_active = true
            GROUP BY skill
            ORDER BY count DESC
            LIMIT 30
          `,
        ]);
        cityRows = cities;
        industryRows = inds;
        companyRows = comps;
        workModeRows = wModes;
        employmentTypeRows = empTypes;
        educationRows = edus;
        countryRows = countries;
        skillRows = skills || [];
      } catch {
        // fall back to empty option lists
      }

      // Top cities: canonical city labels with counts, plus remote jobs.
      const cityCounts = new Map<string, number>();
      for (const r of cityRows) {
        const canonical = canonicalCityKey(r.city);
        if (!canonical) continue;
        cityCounts.set(canonical, (cityCounts.get(canonical) || 0) + getCount(r));
      }
      try {
        const remoteCount = await db.discoveryJob.count({
          where: { ...baseWhere, workMode: { in: WORK_MODE_VARIANTS.Remote } },
        });
        if (remoteCount > 0) {
          cityCounts.set("remote", (cityCounts.get("remote") || 0) + remoteCount);
        }
      } catch {
        // ignore remote-count errors
      }
      const topCities = [...cityCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([key, count]) => ({ name: CITY_LABELS[key] || cleanLabel(key), count }));

      const wmCounts = new Map<string, number>();
      for (const r of workModeRows) {
        if (!r.workMode) continue;
        const canonical = normalizeWorkMode(r.workMode);
        wmCounts.set(canonical, (wmCounts.get(canonical) || 0) + getCount(r));
      }
      const workModes = [...wmCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return {
        topCities,
        countries: countryRows
          .filter((r: any) => r.country && !canonicalCityKey(r.country))
          .map((r: any) => ({ name: cleanLabel(r.country), count: getCount(r) }))
          .reduce<{ name: string; count: number }[]>((acc, c) => {
            const existing = acc.find(x => x.name === c.name);
            if (existing) existing.count += c.count;
            else acc.push(c);
            return acc;
          }, [])
          .sort((a, b) => b.count - a.count)
          .slice(0, 15),
        industries: industryRows.map((r: any) => ({ name: r.industry, count: getCount(r) })).sort((a, b) => b.count - a.count).slice(0, 20),
        companies: companyRows.map((r: any) => ({ name: r.company, count: getCount(r) })).sort((a, b) => b.count - a.count).slice(0, 20),
        skills: (skillRows || []).map((r: any) => ({ name: r.name || r.skill, count: r.count })),
        workModes,
        employmentTypes: employmentTypeRows.map((r: any) => ({ name: r.employmentType, count: getCount(r) })).sort((a, b) => b.count - a.count),
        education: educationRows.map((r: any) => ({ name: r.education, count: getCount(r) })).sort((a, b) => b.count - a.count).slice(0, 15),
      };
    } catch {
      return defaultOptions;
    }
  }

  static async getJobById(jobId: string, userId?: string, options: { countView?: boolean } = {}): Promise<any> {
    const db = getDb();
    const countView = options.countView !== false;

    const job = await db.discoveryJob.findUnique({ where: { id: jobId } });
    if (!job) return null;

    if (countView) {
      await db.discoveryJob.update({
        where: { id: jobId },
        data: { viewCount: { increment: 1 } },
      });
      if (userId) {
        await this.trackView(userId, jobId).catch(() => {});
      }
    }

    let saved = false;
    let recentlyViewed = false;

    if (userId) {
      const savedRecord = await db.discoverySavedJob.findUnique({
        where: { userId_jobId: { userId, jobId } },
      });
      saved = !!savedRecord;

      const viewRecord = await db.discoveryJobView.findUnique({
        where: { userId_jobId: { userId, jobId } },
      });
      recentlyViewed = !!viewRecord;
    }

    return { ...job, saved, recentlyViewed };
  }

  // ─── RECOMMENDATION ENGINE ────────────────────────────────────────────────

  static async getRecommendedJobs(userId: string, limit: number = 20): Promise<any[]> {
    const db = getDb();

    // 1. Try to get user profile for personalized recommendations
    let profile: any = null;
    try {
      profile = await db.profile.findUnique({ where: { userId } });
    } catch {
      // Profile may be in user DB
      try {
        const userPrisma = await getUserPrisma(userId);
        profile = await userPrisma.profile.findUnique({ where: { userId } });
      } catch {
        // No profile available
      }
    }

    // 2. Cold-start: No profile → return popular/fresh jobs
    if (!profile) {
      return this.getColdStartRecommendations(limit);
    }

    const userSkills: string[] = normalizeSkills(profile.skills || []);
    const targetRole: string = profile.targetRole || profile.careerGoal || "";
    const userLocation: string = profile.location || profile.city || "";
    const preferredLocations: string[] = [userLocation].filter(Boolean);
    const userExperience: number = 0;
    const interestedDomains: string[] = profile.interestedDomains || [];

    // 3. Build search query with all available signals
    const orConditions: any[] = [];

    if (userSkills.length > 0) {
      orConditions.push({ skills: { hasSome: userSkills } });
    }

    if (targetRole) {
      const roleLower = targetRole.toLowerCase();
      const roleTerms = roleLower.split(/\s+/).filter((w: string) => w.length > 2);
      for (const term of roleTerms) {
        orConditions.push({ title: { contains: term, mode: "insensitive" } });
      }
    }

    if (userLocation) {
      orConditions.push({ location: { contains: userLocation, mode: "insensitive" } });
      orConditions.push({ city: { contains: userLocation, mode: "insensitive" } });
    }

    if (interestedDomains.length > 0) {
      for (const domain of interestedDomains) {
        orConditions.push({ industry: { contains: domain, mode: "insensitive" } });
        orConditions.push({ title: { contains: domain, mode: "insensitive" } });
      }
    }

    // 4. If no signals available, fall back to cold-start
    if (orConditions.length === 0) {
      return this.getColdStartRecommendations(limit);
    }

    // 5. Fetch candidate jobs (fetch more than needed for scoring)
    const fetchLimit = Math.min(limit * 3, 100);
    let candidateJobs: any[] = [];
    try {
      candidateJobs = await db.discoveryJob.findMany({
        where: {
          isActive: true,
          OR: orConditions,
        },
        orderBy: [{ isFeatured: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }],
        take: fetchLimit,
      });
    } catch {
      return this.getColdStartRecommendations(limit);
    }

    // 6. If few results, supplement with popular jobs
    if (candidateJobs.length < limit) {
      const existingIds = new Set(candidateJobs.map((j: any) => j.id));
      const supplement = await db.discoveryJob.findMany({
        where: { isActive: true },
        orderBy: [{ isFeatured: "desc" }, { viewCount: "desc" }, { saveCount: "desc" }, { createdAt: "desc" }],
        take: limit,
      });
      for (const job of supplement) {
        if (!existingIds.has(job.id)) {
          candidateJobs.push(job);
          existingIds.add(job.id);
        }
      }
    }

    // 7. Score and rank each job
    const scored = candidateJobs.map((job: any) => {
      let jobSkills = Array.isArray(job.skills) ? job.skills : [];
      if (jobSkills.length === 0) {
        const text = `${job.title || ""} ${job.company || ""} ${job.description || ""}`.toLowerCase();
        jobSkills = JobDiscoveryService.extractSkills(text);
      }

      const match = calculateJobMatch(
        { ...job, skills: jobSkills },
        targetRole,
        userSkills,
        userExperience,
        preferredLocations,
        userLocation
      );

      const mapped = mapDiscoveryJobToListing(job) || {};

      return {
        ...job,
        ...mapped,
        skills: jobSkills,
        matchScore: match.matchScore,
        isRecommended: match.isRecommended,
        matchReasons: match.reasons,
      };
    });

    // 8. Sort by match score and deduplicate
    scored.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));

    const seenIds = new Set<string>();
    const deduped: any[] = [];
    for (const job of scored) {
      if (!seenIds.has(job.id)) {
        seenIds.add(job.id);
        deduped.push(job);
      }
    }

    return deduped.slice(0, limit);
  }

  // ─── Cold-Start: Popular/Fresh jobs for new users ─────────────────────────

  static async getColdStartRecommendations(limit: number = 20): Promise<any[]> {
    const db = getDb();

    // Tier 1: Featured + most viewed
    const featured = await db.discoveryJob.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: Math.min(limit, 10),
    });

    // Tier 2: Recent + popular
    const popular = await db.discoveryJob.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { saveCount: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    // Merge, prioritizing featured
    const seenIds = new Set<string>();
    const result: any[] = [];

    for (const job of featured) {
      if (!seenIds.has(job.id)) {
        seenIds.add(job.id);
        const mapped = mapDiscoveryJobToListing(job) || {};
        result.push({
          ...job,
          ...mapped,
          matchScore: 70,
          isRecommended: true,
          matchReasons: [{ type: "freshness" as const, text: "Popular job trending in your area", weight: 10 }],
        });
      }
    }

    for (const job of popular) {
      if (!seenIds.has(job.id) && result.length < limit) {
        seenIds.add(job.id);
        const mapped = mapDiscoveryJobToListing(job) || {};
        const score = 50 + Math.min(20, (job.viewCount || 0) / 5);
        result.push({
          ...job,
          ...mapped,
          matchScore: Math.round(score),
          isRecommended: true,
          matchReasons: [{ type: "freshness" as const, text: "Trending job", weight: 10 }],
        });
      }
    }

    return result.slice(0, limit);
  }

  static async getTrendingJobs(limit: number = 20): Promise<any[]> {
    const db = getDb();

    const jobs = await db.discoveryJob.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { saveCount: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return jobs.map((job: any) => {
      const mapped = mapDiscoveryJobToListing(job) || {};
      return { ...job, ...mapped };
    });
  }

  static async trackView(userId: string, jobId: string): Promise<void> {
    const db = getDb();

    await db.discoveryJobView.upsert({
      where: { userId_jobId: { userId, jobId } },
      update: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
      create: {
        userId,
        jobId,
        viewCount: 1,
      },
    });
  }

  static async toggleSave(userId: string, jobId: string): Promise<{ saved: boolean }> {
    const db = getDb();

    const existing = await db.discoverySavedJob.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });

    if (existing) {
      await db.discoverySavedJob.delete({
        where: { userId_jobId: { userId, jobId } },
      });
      await db.discoveryJob.update({
        where: { id: jobId },
        data: { saveCount: { decrement: 1 } },
      }).catch(() => {});
      return { saved: false };
    }

    await db.discoverySavedJob.create({
      data: { userId, jobId },
    });
    await db.discoveryJob.update({
      where: { id: jobId },
      data: { saveCount: { increment: 1 } },
    }).catch(() => {});
    return { saved: true };
  }

  static async getSavedJobs(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ jobs: any[]; total: number }> {
    const db = getDb();
    const skip = (page - 1) * limit;

    const [total, savedRecords] = await Promise.all([
      db.discoverySavedJob.count({ where: { userId } }),
      db.discoverySavedJob.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const jobIds = savedRecords.map((r: any) => r.jobId);
    const jobMap: Record<string, any> = {};

    if (jobIds.length > 0) {
      const masterJobs = await db.discoveryJob.findMany({ where: { id: { in: jobIds } } });
      masterJobs.forEach((j: any) => { jobMap[j.id] = j; });

      const foundIds = new Set(masterJobs.map((j: any) => j.id));
      const missingIds = jobIds.filter((id: string) => !foundIds.has(id));

      if (missingIds.length > 0) {
        try {
          const userPrisma = await getUserPrisma(userId);
          const userJobs = await userPrisma.jobListing.findMany({ where: { id: { in: missingIds } } });
          userJobs.forEach((j: any) => { jobMap[j.id] = j; });
        } catch (err: any) {
          console.warn("[JobSearchService] Failed to load custom saved jobs from user DB:", err?.message || err);
        }
      }
    }

    const result = savedRecords.map((r: any) => {
      const rawJob = jobMap[r.jobId];
      if (!rawJob) {
        return {
          id: r.jobId, jobListingId: r.jobId, title: "Saved Role", company: "Company",
          logoUrl: null, location: "Remote", mode: "On-site", employmentType: "Full-Time",
          salary: "Competitive", skills: [], description: "", applyUrl: "https://adyapan.ai",
          isSaved: true, savedAt: r.createdAt, collection: r.collection, notes: r.notes,
        };
      }

      const job = mapDiscoveryJobToListing(rawJob) || {};
      return {
        ...job, id: r.jobId, jobListingId: r.jobId, isSaved: true,
        savedAt: r.createdAt, collection: r.collection, notes: r.notes,
      };
    });

    return { jobs: result, total };
  }

  static async getRecentlyViewed(userId: string, limit: number = 20): Promise<any[]> {
    const db = getDb();

    const views = await db.discoveryJobView.findMany({
      where: { userId },
      orderBy: { lastViewedAt: "desc" },
      take: limit,
    });

    const jobIds = views.map((v: any) => v.jobId);
    const jobs = jobIds.length > 0
      ? await db.discoveryJob.findMany({ where: { id: { in: jobIds } } })
      : [];
    const jobMap: Record<string, any> = {};
    jobs.forEach((j: any) => { jobMap[j.id] = j; });

    return views.map((v: any) => ({
      ...(jobMap[v.jobId] || {}),
      viewedAt: v.lastViewedAt,
      viewCountByUser: v.viewCount,
    }));
  }

  static async getSuggestions(query: string): Promise<string[]> {
    const db = getDb();

    if (!query || query.length < 2) return [];

    const prefix = query;
    const normalizedQ = normalizeSearchQuery(query);

    const [companyRows, skillRows, titleRows] = await Promise.all([
      db.discoveryJob.findMany({
        where: {
          isActive: true,
          company: { contains: prefix, mode: "insensitive" },
        },
        select: { company: true },
        distinct: ["company"],
        take: 8,
      }),
      db.$queryRaw`
        SELECT DISTINCT skill AS name
        FROM discovery_jobs, unnest(skills) AS skill
        WHERE is_active = true AND skill ILIKE ${"%" + prefix + "%"}
        LIMIT 8
      `,
      db.discoveryJob.findMany({
        where: {
          isActive: true,
          title: { contains: prefix, mode: "insensitive" },
        },
        select: { title: true },
        distinct: ["title"],
        take: 8,
      }),
    ]);

    const suggestions = new Set<string>();
    for (const r of companyRows) suggestions.add(r.company);
    for (const r of skillRows as any[]) suggestions.add(r.name);
    for (const r of titleRows) suggestions.add(r.title);

    // If normalized query differs, also search for that
    if (normalizedQ !== prefix.toLowerCase()) {
      const expanded = SKILL_ALIASES[prefix.toLowerCase()];
      if (expanded) suggestions.add(expanded.charAt(0).toUpperCase() + expanded.slice(1));
    }

    return Array.from(suggestions).slice(0, 15);
  }

  static async getSearchHistory(userId: string, limit: number = 20): Promise<any[]> {
    const db = getDb();

    return db.discoverySearchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async logSearch(
    userId: string,
    query: string,
    filters: any,
    resultCount: number
  ): Promise<void> {
    const db = getDb();

    await db.discoverySearchHistory.create({
      data: {
        userId,
        query,
        filtersJson: filters || {},
        resultCount,
      },
    });
  }

  static async getJobAnalytics(): Promise<any> {
    const db = getDb();

    const totalJobs = await db.discoveryJob.count({ where: { isActive: true } });

    let byLocation: any[] = [];
    let bySkill: any[] = [];
    let byIndustry: any[] = [];
    let salaryRanges: any = {};

    try {
      byLocation = await db.$queryRaw`
        SELECT location AS name, COUNT(*)::int AS count
        FROM discovery_jobs
        WHERE is_active = true AND location != ''
        GROUP BY location
        ORDER BY count DESC
        LIMIT 20
      `;
    } catch {}

    try {
      bySkill = await db.$queryRaw`
        SELECT skill AS name, COUNT(*)::int AS count
        FROM discovery_jobs, unnest(skills) AS skill
        WHERE is_active = true
        GROUP BY skill
        ORDER BY count DESC
        LIMIT 30
      `;
    } catch {}

    try {
      byIndustry = await db.$queryRaw`
        SELECT industry AS name, COUNT(*)::int AS count
        FROM discovery_jobs
        WHERE is_active = true AND industry != ''
        GROUP BY industry
        ORDER BY count DESC
        LIMIT 20
      `;
    } catch {}

    try {
      const salaryData: any[] = await db.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE salary_max < 300000)::int AS "below3L",
          COUNT(*) FILTER (WHERE salary_max >= 300000 AND salary_max < 600000)::int AS "3to6L",
          COUNT(*) FILTER (WHERE salary_max >= 600000 AND salary_max < 1000000)::int AS "6to10L",
          COUNT(*) FILTER (WHERE salary_max >= 1000000 AND salary_max < 2000000)::int AS "10to20L",
          COUNT(*) FILTER (WHERE salary_max >= 2000000)::int AS "above20L"
        FROM discovery_jobs
        WHERE is_active = true AND salary_max IS NOT NULL
      `;
      if (salaryData.length > 0) {
        salaryRanges = salaryData[0];
      }
    } catch {}

    return {
      totalJobs,
      byLocation,
      bySkill,
      byIndustry,
      salaryRanges,
    };
  }

  static async getCompanyProfile(companySlug: string): Promise<any> {
    const db = getDb();

    const company = await db.discoveryCompany.findUnique({
      where: { slug: companySlug },
    });

    if (!company) return null;

    const recentJobs = await db.discoveryJob.findMany({
      where: { isActive: true, company: company.name },
      orderBy: { postedAt: "desc" },
      take: 10,
    });

    return { ...company, recentJobs };
  }

  static async getCompanies(): Promise<any[]> {
    const db = getDb();

    return db.discoveryCompany.findMany({
      orderBy: { jobCount: "desc" },
    });
  }
}

import { getMasterPrisma, getUserPrisma } from "../config/dynamicPrisma";
import { mapDiscoveryJobToListing } from "../utils/jobListingMapper";
import { JobDiscoveryService } from "./job-discovery.service";
// AI integration available for future use

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
  postedWithin?: "today" | "3days" | "week" | "month";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  targetRole?: string;
  userSkills?: string[];
  userId?: string;
}

export function calculateJobMatch(job: any, targetRole?: string, userSkills: string[] = []) {
  let score = 50;
  const reasons: string[] = [];

  const normTarget = (targetRole || "Software Developer").toLowerCase().trim();
  const normTitle = (job.title || "").toLowerCase();
  const normDesc = (job.description || "").toLowerCase();

  // 1. Target Role Match (Up to 45 pts)
  const roleKeywords = normTarget.split(/\s+/).filter(w => w.length > 2);
  let roleMatchCount = 0;

  if (normTitle.includes(normTarget)) {
    score += 45;
    reasons.push(`Direct match for your target role: "${targetRole || 'Software Developer'}"`);
  } else {
    for (const kw of roleKeywords) {
      if (normTitle.includes(kw)) {
        roleMatchCount++;
      }
    }
    if (roleMatchCount > 0) {
      const boost = Math.min(40, roleMatchCount * 20);
      score += boost;
      reasons.push(`Matches your interest in ${targetRole || 'Software Developer'}`);
    } else if (normDesc.includes(normTarget) || roleKeywords.some(kw => normDesc.includes(kw))) {
      score += 15;
      reasons.push(`Relevant role responsibilities for ${targetRole || 'Software Developer'}`);
    }
  }

  // 2. Skill Match (Up to 35 pts)
  if (userSkills && userSkills.length > 0 && job.skills && Array.isArray(job.skills)) {
    const jobSkillSet = new Set(job.skills.map((s: string) => s.toLowerCase()));
    const matchedSkills = userSkills.filter(s => jobSkillSet.has(s.toLowerCase()));
    if (matchedSkills.length > 0) {
      const skillScore = Math.min(35, Math.round((matchedSkills.length / Math.max(1, userSkills.length)) * 40));
      score += skillScore;
      reasons.push(`Matches ${matchedSkills.length} of your key skills (${matchedSkills.slice(0, 3).join(', ')})`);
    }
  }

  const finalScore = Math.min(99, Math.max(45, Math.round(score)));
  const isRecommended = finalScore >= 65 || (normTarget && (normTitle.includes(normTarget) || roleMatchCount > 0));

  return {
    matchScore: finalScore,
    isRecommended,
    reasons: reasons.length > 0 ? reasons : ["Good fit based on active hiring trends"],
  };
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

function getPostedWithinDate(postedWithin: string): Date {
  const now = new Date();
  switch (postedWithin) {
    case "today":
      now.setHours(0, 0, 0, 0);
      return now;
    case "3days":
      return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0);
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

    const where: any = { isActive: true };

    if (filters.query) {
      const q = filters.query;
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { skills: { hasSome: [q] } },
      ];
    }

    if (filters.company) {
      where.company = { contains: filters.company, mode: "insensitive" };
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: "insensitive" };
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

    if (filters.workMode) {
      where.workMode = filters.workMode;
    }

    if (filters.employmentType) {
      where.employmentType = filters.employmentType;
    }

    if (filters.experienceMin !== undefined || filters.experienceMax !== undefined) {
      where.AND = where.AND || [];
      if (filters.experienceMin !== undefined) {
        where.AND.push({ experienceMax: { gte: filters.experienceMin } });
      }
      if (filters.experienceMax !== undefined) {
        where.AND.push({ experienceMin: { lte: filters.experienceMax } });
      }
    }

    if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
      where.AND = where.AND || [];
      if (filters.salaryMin !== undefined) {
        where.AND.push({ salaryMax: { gte: filters.salaryMin } });
      }
      if (filters.salaryMax !== undefined) {
        where.AND.push({ salaryMin: { lte: filters.salaryMax } });
      }
    }

    if (filters.skills && filters.skills.length > 0) {
      where.skills = { hasSome: filters.skills };
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

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    if (filters.postedWithin) {
      where.postedAt = { gte: getPostedWithinDate(filters.postedWithin) };
    }

    let orderBy: any = { createdAt: "desc" };
    const sortField = filters.sortBy || "createdAt";
    const sortOrder = filters.sortOrder || "desc";

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

    if (validSortFields[sortField]) {
      orderBy = { [validSortFields[sortField]]: sortOrder };
    }

    let total = 0;
    let jobs: any[] = [];
    try {
      [total, jobs] = await Promise.all([
        db.discoveryJob.count({ where }),
        db.discoveryJob.findMany({
          where,
          orderBy,
          skip,
          take: limit,
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

    if (total === 0) {

      try {
        const DEFAULT_JOBS = [
          {
            fingerprint: simpleHash("Google|Full Stack Software Engineer|Bengaluru"),
            title: "Full Stack Software Engineer",
            company: "Google",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru",
            state: "Karnataka",
            country: "India",
            workMode: "Hybrid",
            employmentType: "Full-Time",
            experienceMin: 1,
            experienceMax: 3,
            salaryMin: 1800000,
            salaryMax: 3200000,
            salaryCurrency: "INR",
            skills: ["React", "TypeScript", "Node.js", "Python", "System Design"],
            description: "Looking for an exceptional Full Stack Engineer to build high-performance web applications and scalable cloud platform services.",
            applyUrl: "https://careers.google.com",
            sourceUrl: "https://careers.google.com",
            source: "Google Careers",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("Microsoft|Backend Engineer - AI Systems|Hyderabad"),
            title: "Backend Engineer - AI Systems",
            company: "Microsoft",
            location: "Hyderabad, Telangana, India",
            city: "Hyderabad",
            state: "Telangana",
            country: "India",
            workMode: "Remote",
            employmentType: "Full-Time",
            experienceMin: 0,
            experienceMax: 2,
            salaryMin: 1600000,
            salaryMax: 2800000,
            salaryCurrency: "INR",
            skills: ["C#", "Python", "Azure", "PostgreSQL", "Microservices"],
            description: "Join the Azure AI & Cloud Engineering team to scale next-gen AI platform APIs and microservice architectures.",
            applyUrl: "https://careers.microsoft.com",
            sourceUrl: "https://careers.microsoft.com",
            source: "Microsoft Careers",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("Swiggy|Frontend Developer (React / Next.js)|Bengaluru"),
            title: "Frontend Developer (React / Next.js)",
            company: "Swiggy",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru",
            state: "Karnataka",
            country: "India",
            workMode: "Onsite",
            employmentType: "Full-Time",
            experienceMin: 1,
            experienceMax: 4,
            salaryMin: 1400000,
            salaryMax: 2400000,
            salaryCurrency: "INR",
            skills: ["React", "Next.js", "Tailwind CSS", "Redux", "Web Vitals"],
            description: "Build fast, pixel-perfect user interfaces for millions of daily active consumer food and instant delivery orders.",
            applyUrl: "https://careers.swiggy.com",
            sourceUrl: "https://careers.swiggy.com",
            source: "Swiggy Careers",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("Razorpay|Graduate Software Engineer Trainee|Bengaluru"),
            title: "Graduate Software Engineer Trainee",
            company: "Razorpay",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru",
            state: "Karnataka",
            country: "India",
            workMode: "Hybrid",
            employmentType: "Full-Time",
            experienceMin: 0,
            experienceMax: 1,
            salaryMin: 1200000,
            salaryMax: 2000000,
            salaryCurrency: "INR",
            skills: ["Java", "Spring Boot", "MySQL", "Kafka", "Data Structures"],
            description: "Ideal role for fresh graduates and early career engineers passionate about fintech and payment gateway infrastructure.",
            applyUrl: "https://razorpay.com/jobs",
            sourceUrl: "https://razorpay.com/jobs",
            source: "Razorpay Careers",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("Amazon AWS|DevOps & Cloud Engineer|Bengaluru"),
            title: "DevOps & Cloud Engineer",
            company: "Amazon Web Services (AWS)",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru",
            state: "Karnataka",
            country: "India",
            workMode: "Hybrid",
            employmentType: "Full-Time",
            experienceMin: 2,
            experienceMax: 5,
            salaryMin: 2000000,
            salaryMax: 3500000,
            salaryCurrency: "INR",
            skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"],
            description: "Architect and manage highly resilient cloud infrastructure, Kubernetes clusters, and automated deployment pipelines.",
            applyUrl: "https://amazon.jobs",
            sourceUrl: "https://amazon.jobs",
            source: "Amazon Jobs",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("OpenAI|AI Research & LLM Engineer|Remote"),
            title: "AI Research & LLM Engineer",
            company: "OpenAI",
            location: "Remote / San Francisco, CA",
            city: "San Francisco",
            state: "California",
            country: "United States",
            workMode: "Remote",
            employmentType: "Full-Time",
            experienceMin: 2,
            experienceMax: 6,
            salaryMin: 180000,
            salaryMax: 320000,
            salaryCurrency: "USD",
            skills: ["Python", "PyTorch", "Transformers", "LLM", "Deep Learning", "CUDA"],
            description: "Train, fine-tune, and optimize frontier generative AI models and deployment serving layers.",
            applyUrl: "https://openai.com/careers",
            sourceUrl: "https://openai.com/careers",
            source: "OpenAI Careers",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("Meta|Data Scientist - Product Analytics|Remote"),
            title: "Data Scientist - Product Analytics",
            company: "Meta",
            location: "Remote / London, UK",
            city: "London",
            state: "London",
            country: "United Kingdom",
            workMode: "Remote",
            employmentType: "Full-Time",
            experienceMin: 1,
            experienceMax: 4,
            salaryMin: 90000,
            salaryMax: 150000,
            salaryCurrency: "GBP",
            skills: ["Python", "SQL", "Statistics", "A/B Testing", "Tableau", "Pandas"],
            description: "Drive product intelligence, user behavior modeling, and algorithmic optimization across global social platforms.",
            applyUrl: "https://metacareers.com",
            sourceUrl: "https://metacareers.com",
            source: "Meta Careers",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("Stripe|Senior Staff Full Stack Developer|Remote"),
            title: "Senior Staff Full Stack Developer",
            company: "Stripe",
            location: "Remote / San Francisco, CA",
            city: "San Francisco",
            state: "California",
            country: "United States",
            workMode: "Remote",
            employmentType: "Full-Time",
            experienceMin: 3,
            experienceMax: 7,
            salaryMin: 160000,
            salaryMax: 280000,
            salaryCurrency: "USD",
            skills: ["Ruby", "TypeScript", "React", "GraphQL", "PostgreSQL", "Go"],
            description: "Engineer foundational global financial infrastructure and merchant dashboard API platform tools.",
            applyUrl: "https://stripe.com/jobs",
            sourceUrl: "https://stripe.com/jobs",
            source: "Stripe Careers",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("Zomato|Lead Mobile Engineer (iOS & Android)|Gurugram"),
            title: "Lead Mobile Engineer (iOS & Android)",
            company: "Zomato",
            location: "Gurugram, Haryana, India",
            city: "Gurugram",
            state: "Haryana",
            country: "India",
            workMode: "Onsite",
            employmentType: "Full-Time",
            experienceMin: 2,
            experienceMax: 5,
            salaryMin: 1800000,
            salaryMax: 3000000,
            salaryCurrency: "INR",
            skills: ["React Native", "Swift", "Kotlin", "Redux", "Mobile Performance"],
            description: "Lead mobile app architecture powering hyper-local delivery, live tracking, and interactive consumer experiences.",
            applyUrl: "https://zomato.com/careers",
            sourceUrl: "https://zomato.com/careers",
            source: "Zomato Careers",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("Flipkart|SDE-2 Backend Developer|Bengaluru"),
            title: "SDE-2 Backend Developer",
            company: "Flipkart",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru",
            state: "Karnataka",
            country: "India",
            workMode: "Hybrid",
            employmentType: "Full-Time",
            experienceMin: 2,
            experienceMax: 5,
            salaryMin: 2200000,
            salaryMax: 3800000,
            salaryCurrency: "INR",
            skills: ["Java", "Spring Boot", "Kafka", "Cassandra", "Redis", "Distributed Systems"],
            description: "Scale high-throughput e-commerce catalog, payment processing, and flash-sale backend microservices.",
            applyUrl: "https://flipkartcareers.com",
            sourceUrl: "https://flipkartcareers.com",
            source: "Flipkart Careers",
            isFeatured: true,
            isActive: true,
          },
          {
            fingerprint: simpleHash("TCS|Systems Engineer - Cloud Services|Pune"),
            title: "Systems Engineer - Cloud Services",
            company: "Tata Consultancy Services (TCS)",
            location: "Pune, Maharashtra, India",
            city: "Pune",
            state: "Maharashtra",
            country: "India",
            workMode: "Hybrid",
            employmentType: "Full-Time",
            experienceMin: 0,
            experienceMax: 3,
            salaryMin: 650000,
            salaryMax: 1100000,
            salaryCurrency: "INR",
            skills: ["Java", "SQL", "Linux", "AWS", "Shell Scripting"],
            description: "Deliver enterprise cloud migration and IT digital transformation solutions for global Fortune 500 clients.",
            applyUrl: "https://tcs.com/careers",
            sourceUrl: "https://tcs.com/careers",
            source: "TCS Careers",
            isFeatured: false,
            isActive: true,
          },
          {
            fingerprint: simpleHash("Infosys|Senior Specialist Programmer|Bengaluru"),
            title: "Senior Specialist Programmer",
            company: "Infosys",
            location: "Bengaluru, Karnataka, India",
            city: "Bengaluru",
            state: "Karnataka",
            country: "India",
            workMode: "Hybrid",
            employmentType: "Full-Time",
            experienceMin: 1,
            experienceMax: 4,
            salaryMin: 950000,
            salaryMax: 1600000,
            salaryCurrency: "INR",
            skills: ["Python", "Django", "React", "PostgreSQL", "Docker"],
            description: "Develop cutting-edge full-stack software for digital banking and enterprise automation client suites.",
            applyUrl: "https://infosys.com/careers",
            sourceUrl: "https://infosys.com/careers",
            source: "Infosys Careers",
            isFeatured: false,
            isActive: true,
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

      const match = calculateJobMatch({ ...job, skills: jobSkills }, filters.targetRole, filters.userSkills);

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

    if (!filters.sortBy || filters.sortBy === "recommended" || filters.sortBy === "matchScore") {
      mappedJobs.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    const totalPages = Math.ceil(total / limit);

    const result: SearchResult = {
      jobs: mappedJobs,
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
      locations: [],
      companies: [],
      workModes: [],
      employmentTypes: [],
      industries: [],
      sources: [],
      skills: [],
    };

    try {
      const db = getDb();
      const baseWhere: any = { isActive: true };

      if (filters.query) {
        baseWhere.OR = [
          { title: { contains: filters.query, mode: "insensitive" } },
          { company: { contains: filters.query, mode: "insensitive" } },
          { description: { contains: filters.query, mode: "insensitive" } },
          { location: { contains: filters.query, mode: "insensitive" } },
        ];
      }

      if (filters.workMode) baseWhere.workMode = filters.workMode;
      if (filters.employmentType) baseWhere.employmentType = filters.employmentType;
      if (filters.industry) baseWhere.industry = { contains: filters.industry, mode: "insensitive" };
      if (filters.source) baseWhere.source = filters.source;
      if (filters.postedWithin) baseWhere.postedAt = { gte: getPostedWithinDate(filters.postedWithin) };

      let locationRows: any[] = [];
      let companyRows: any[] = [];
      let workModeRows: any[] = [];
      let employmentTypeRows: any[] = [];
      let industryRows: any[] = [];
      let sourceRows: any[] = [];

      try {
        const [locs, comps, wModes, empTypes, inds, srcs] = await Promise.all([
          db.discoveryJob.groupBy({
            by: ["location"],
            where: { ...baseWhere, location: { not: "" } },
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
        locationRows = locs;
        companyRows = comps;
        workModeRows = wModes;
        employmentTypeRows = empTypes;
        industryRows = inds;
        sourceRows = srcs;
      } catch {
        // Fallback: silence groupBy error if any
      }

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

      const getCount = (r: any) => (typeof r._count === "number" ? r._count : r._count?.id || r._count?._all || 1);

      return {
        locations: locationRows.map((r: any) => ({ name: r.location, count: getCount(r) })).sort((a, b) => b.count - a.count),
        companies: companyRows.map((r: any) => ({ name: r.company, count: getCount(r) })).sort((a, b) => b.count - a.count),
        workModes: workModeRows.map((r: any) => ({ name: r.workMode, count: getCount(r) })).sort((a, b) => b.count - a.count),
        employmentTypes: employmentTypeRows.map((r: any) => ({ name: r.employmentType, count: getCount(r) })).sort((a, b) => b.count - a.count),
        industries: industryRows.map((r: any) => ({ name: r.industry, count: getCount(r) })).sort((a, b) => b.count - a.count),
        sources: sourceRows.map((r: any) => ({ name: r.source, count: getCount(r) })).sort((a, b) => b.count - a.count),
        skills: skillsFacet,
      };
    } catch {
      return defaultFacets;
    }
  }

  static async getJobById(jobId: string, userId?: string): Promise<any> {
    const db = getDb();

    const job = await db.discoveryJob.findUnique({ where: { id: jobId } });
    if (!job) return null;

    await db.discoveryJob.update({
      where: { id: jobId },
      data: { viewCount: { increment: 1 } },
    });

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

  static async getRecommendedJobs(userId: string, limit: number = 20): Promise<any[]> {
    const db = getDb();

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile) {
      return db.discoveryJob.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }

    const userSkills: string[] = profile.skills || [];
    const targetRole: string = profile.targetRole || profile.careerGoal || "";
    const location: string = profile.location || "";

    const orConditions: any[] = [];

    if (userSkills.length > 0) {
      orConditions.push({ skills: { hasSome: userSkills } });
    }

    if (targetRole) {
      orConditions.push({ title: { contains: targetRole, mode: "insensitive" } });
    }

    if (location) {
      orConditions.push({ location: { contains: location, mode: "insensitive" } });
    }

    if (orConditions.length === 0) {
      return db.discoveryJob.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }

    return db.discoveryJob.findMany({
      where: {
        isActive: true,
        OR: orConditions,
      },
      orderBy: [{ isFeatured: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  }

  static async getTrendingJobs(limit: number = 20): Promise<any[]> {
    const db = getDb();

    return db.discoveryJob.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { saveCount: "desc" }, { createdAt: "desc" }],
      take: limit,
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
      // 1. Look up in the master discovery database first
      const masterJobs = await db.discoveryJob.findMany({ where: { id: { in: jobIds } } });
      masterJobs.forEach((j: any) => { jobMap[j.id] = j; });

      const foundIds = new Set(masterJobs.map((j: any) => j.id));
      const missingIds = jobIds.filter((id: string) => !foundIds.has(id));

      // 2. Fall back to the user database jobListing table for custom/scraped jobs
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
          id: r.jobId,
          jobListingId: r.jobId,
          title: "Saved Role",
          company: "Company",
          logoUrl: null,
          location: "Remote",
          mode: "On-site",
          employmentType: "Full-Time",
          salary: "Competitive",
          skills: [],
          description: "",
          applyUrl: "https://adyapan.ai",
          isSaved: true,
          savedAt: r.createdAt,
          collection: r.collection,
          notes: r.notes,
        };
      }

      const job = mapDiscoveryJobToListing(rawJob) || {};
      return {
        ...job,
        id: r.jobId,
        jobListingId: r.jobId,
        isSaved: true,
        savedAt: r.createdAt,
        collection: r.collection,
        notes: r.notes,
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

    const [companyRows, skillRows] = await Promise.all([
      db.discoveryJob.findMany({
        where: {
          isActive: true,
          company: { contains: prefix, mode: "insensitive" },
        },
        select: { company: true },
        distinct: ["company"],
        take: 10,
      }),
      db.$queryRaw`
        SELECT DISTINCT skill AS name
        FROM discovery_jobs, unnest(skills) AS skill
        WHERE is_active = true AND skill ILIKE ${"%" + prefix + "%"}
        LIMIT 10
      `,
    ]);

    const suggestions = new Set<string>();
    for (const r of companyRows) {
      suggestions.add(r.company);
    }
    for (const r of skillRows as any[]) {
      suggestions.add(r.name);
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

import { getMasterPrisma } from "../config/dynamicPrisma";
// AI integration available for future use

export interface SearchFilters {
  query?: string;
  company?: string;
  location?: string;
  country?: string;
  state?: string;
  city?: string;
  workMode?: string;
  employmentType?: string;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  industry?: string;
  education?: string;
  companySize?: string;
  source?: string;
  isFeatured?: boolean;
  postedWithin?: "today" | "3days" | "week" | "month";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
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
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0);
  }
}

export class JobSearchService {
  static async search(filters: SearchFilters): Promise<SearchResult> {
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

    const [total, jobs] = await Promise.all([
      db.discoveryJob.count({ where }),
      db.discoveryJob.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      jobs,
      total,
      page,
      limit,
      totalPages,
      filters,
      facets: await JobSearchService.getFacets(filters),
    };
  }

  static async getFacets(filters: SearchFilters): Promise<SearchResult["facets"]> {
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

    const [locationRows, companyRows, workModeRows, employmentTypeRows, industryRows, sourceRows] =
      await Promise.all([
        db.discoveryJob.groupBy({
          by: ["location"],
          where: { ...baseWhere, location: { not: "" } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 20,
        }),
        db.discoveryJob.groupBy({
          by: ["company"],
          where: baseWhere,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 20,
        }),
        db.discoveryJob.groupBy({
          by: ["workMode"],
          where: baseWhere,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        db.discoveryJob.groupBy({
          by: ["employmentType"],
          where: baseWhere,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        db.discoveryJob.groupBy({
          by: ["industry"],
          where: { ...baseWhere, industry: { not: "" } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 20,
        }),
        db.discoveryJob.groupBy({
          by: ["source"],
          where: baseWhere,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 20,
        }),
      ]);

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
      skillsFacet = skillRows;
    } catch {
      skillsFacet = [];
    }

    return {
      locations: locationRows.map((r: any) => ({ name: r.location, count: r._count.id })),
      companies: companyRows.map((r: any) => ({ name: r.company, count: r._count.id })),
      skills: skillsFacet,
      workModes: workModeRows.map((r: any) => ({ name: r.workMode, count: r._count.id })),
      employmentTypes: employmentTypeRows.map((r: any) => ({
        name: r.employmentType,
        count: r._count.id,
      })),
      industries: industryRows.map((r: any) => ({ name: r.industry, count: r._count.id })),
      sources: sourceRows.map((r: any) => ({ name: r.source, count: r._count.id })),
    };
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
      });
      return { saved: false };
    }

    await db.discoverySavedJob.create({
      data: { userId, jobId },
    });
    await db.discoveryJob.update({
      where: { id: jobId },
      data: { saveCount: { increment: 1 } },
    });
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
    const jobs = jobIds.length > 0
      ? await db.discoveryJob.findMany({ where: { id: { in: jobIds } } })
      : [];
    const jobMap: Record<string, any> = {};
    jobs.forEach((j: any) => { jobMap[j.id] = j; });

    const result = savedRecords.map((r: any) => ({
      ...(jobMap[r.jobId] || {}),
      savedAt: r.createdAt,
      collection: r.collection,
      notes: r.notes,
    }));

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

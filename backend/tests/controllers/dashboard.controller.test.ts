import { getDashboardStats } from "../../src/controllers/dashboard.controller";
import * as prismaUtil from "../../src/utils/prisma";
import * as profileService from "../../src/services/profile.service";
import { DsaProgressService } from "../../src/services/dsa-progress.service";

jest.mock("../../src/services/profile.service");
jest.mock("../../src/services/dsa-progress.service");

describe("Dashboard Controller - Feature Scores", () => {
  let req: any;
  let res: any;
  let next: any;
  let mockUserPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { userId: "user-123" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    mockUserPrisma = {
      candidateProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      resume: {
        count: jest.fn().mockResolvedValue(2),
      },
      uploadedResume: {
        count: jest.fn().mockResolvedValue(1),
      },
      aTSReport: {
        findMany: jest.fn().mockResolvedValue([
          { score: 85, overallScore: 85 },
          { score: 95, overallScore: 95 },
        ]),
      },
      linkedInReport: {
        findMany: jest.fn().mockResolvedValue([
          { score: 70, visibilityScore: 70 },
          { score: 80, visibilityScore: 80 },
        ]),
      },
      coverLetter: {
        count: jest.fn().mockResolvedValue(3),
      },
      generatedNote: {
        count: jest.fn().mockResolvedValue(5),
      },
      quiz: {
        count: jest.fn().mockResolvedValue(4),
      },
      assignment: {
        count: jest.fn().mockResolvedValue(1),
      },
      presentation: {
        count: jest.fn().mockResolvedValue(2),
      },
      mindMap: {
        count: jest.fn().mockResolvedValue(3),
      },
      studySession: {
        count: jest.fn().mockResolvedValue(6),
      },
      uploadedDocument: {
        count: jest.fn().mockResolvedValue(2),
      },
      codingSession: {
        count: jest.fn().mockResolvedValue(8),
      },
      challenge: {
        count: jest.fn().mockResolvedValue(25),
      },
    };

    jest.spyOn(prismaUtil, "getUserPrismaFromRequest").mockResolvedValue(mockUserPrisma as any);
    (profileService.getProfile as jest.Mock).mockResolvedValue({ targetRole: "Full Stack Engineer" });
    (DsaProgressService.calculateAndSyncProgress as jest.Mock).mockResolvedValue({
      solved: 12,
      accuracy: 88,
      streak: 5,
      challengesSolved: 3,
    });
  });

  it("fetches every feature score accurately and synchronizes correctly", async () => {
    await getDashboardStats(req, res, next);

    expect(res.json).toHaveBeenCalledTimes(1);
    const response = res.json.mock.calls[0][0];

    expect(response.success).toBe(true);
    expect(response.stats).toBeDefined();

    // Resumes count: 2 created + 1 uploaded = 3
    expect(response.stats.resumesCount).toBe(3);

    // ATS Score: average of 85 and 95 = 90
    expect(response.stats.avgAtsScore).toBe(90);

    // LinkedIn Score: average of 70 and 80 = 75
    expect(response.stats.avgLinkedinScore).toBe(75);

    // DSA stats
    expect(response.stats.dsaSolved).toBe(12);
    expect(response.stats.dsaAccuracy).toBe(88);
    expect(response.stats.dsaStreak).toBe(5);
    expect(response.stats.challengesCount).toBe(3);
  });

  it("falls back to candidateProfile strengthScore when atsReports is empty", async () => {
    mockUserPrisma.aTSReport.findMany.mockResolvedValue([]);
    mockUserPrisma.candidateProfile.findFirst.mockResolvedValue({ strengthScore: 78 });

    await getDashboardStats(req, res, next);

    const response = res.json.mock.calls[0][0];
    expect(response.stats.avgAtsScore).toBe(78);
  });
});

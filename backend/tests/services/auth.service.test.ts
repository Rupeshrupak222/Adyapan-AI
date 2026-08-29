import { registerUser } from "../../src/services/auth.service";
import { prisma } from "../../src/config/prisma";

jest.mock("../../src/config/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    profile: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../src/services/database.service", () => ({
  databaseService: {
    createDatabase: jest.fn().mockResolvedValue(true),
    getConnectionString: jest.fn().mockResolvedValue("postgresql://test"),
  },
}));

jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

function createTx() {
  const tx: Record<string, any> = {
    user: prisma.user,
    profile: prisma.profile,
    organization: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "org-id", country: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    universityDepartment: {
      upsert: jest.fn().mockResolvedValue({ registrationCount: 1 }),
    },
    universityCourse: {
      upsert: jest.fn().mockResolvedValue({ registrationCount: 1 }),
    },
    universityBranch: {
      upsert: jest.fn().mockResolvedValue({ registrationCount: 1 }),
    },
    userSettings: { create: jest.fn().mockResolvedValue({}) },
    aiPreference: { create: jest.fn().mockResolvedValue({}) },
    notificationPreference: { create: jest.fn().mockResolvedValue({}) },
    learningPreference: { create: jest.fn().mockResolvedValue({}) },
    storageUsage: { create: jest.fn().mockResolvedValue({}) },
    aiUsage: { create: jest.fn().mockResolvedValue({}) },
    subscription: {
      create: jest.fn().mockResolvedValue({
        planCode: "free",
        status: "active",
        billingCycle: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      }),
    },
    session: { create: jest.fn().mockResolvedValue({}) },
    activityLog: { create: jest.fn().mockResolvedValue({}) },
    registrationDailyMetric: { upsert: jest.fn().mockResolvedValue({}) },
  };
  return tx;
}

let tx: ReturnType<typeof createTx>;

beforeEach(() => {
  jest.clearAllMocks();
  tx = createTx();
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.user.create as jest.Mock).mockImplementation(({ data }) =>
    Promise.resolve({
      id: "test-user-id",
      name: data.name,
      email: data.email,
      role: data.role,
      createdAt: new Date(),
    })
  );
  // Route the explicit transaction so tx.user proxies the mocked prisma.user.
  (prisma.$transaction as jest.Mock).mockImplementation(
    async (cb: (t: unknown) => Promise<unknown>) => cb(tx as any)
  );
});

describe("registerUser role handling", () => {
  it("creates user with ADMIN role when role is ADMIN", async () => {
    const res = await registerUser({
      name: "Admin User",
      email: "admin@example.com",
      password: "Password123!",
      role: "ADMIN",
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "ADMIN",
        }),
      })
    );
    expect(res.user.role).toBe("ADMIN");
  });

  it("creates user with USER role when role is not ADMIN or omitted", async () => {
    const res = await registerUser({
      name: "Regular User",
      email: "user@example.com",
      password: "Password123!",
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "USER",
        }),
      })
    );
    expect(res.user.role).toBe("USER");
  });
});

describe("registerUser duplicate email validation", () => {
  it("rejects with 409 EMAIL_ALREADY_EXISTS when the email is already taken", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing", email: "taken@example.com" });

    await expect(
      registerUser({
        name: "New User",
        email: "taken@example.com",
        password: "Password123!",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "EMAIL_ALREADY_EXISTS",
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("does not create the user when the email is a duplicate", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing", email: "dup@example.com" });

    await expect(
      registerUser({
        name: "New User",
        email: "dup@example.com",
        password: "Password123!",
      })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("detects duplicates case-insensitively (uppercase input)", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing", email: "user@example.com" });

    await expect(
      registerUser({
        name: "New User",
        email: "USER@EXAMPLE.COM",
        password: "Password123!",
      })
    ).rejects.toMatchObject({ statusCode: 409, code: "EMAIL_ALREADY_EXISTS" });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "user@example.com" } });
  });

  it("detects duplicates with mixed-case and surrounding whitespace", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing", email: "mixed@example.com" });

    await expect(
      registerUser({
        name: "New User",
        email: "  Mixed@Example.COM  ",
        password: "Password123!",
      })
    ).rejects.toMatchObject({ statusCode: 409, code: "EMAIL_ALREADY_EXISTS" });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "mixed@example.com" } });
  });

  it("stores a normalized (trimmed, lowercased) email on successful registration", async () => {
    await registerUser({
      name: "New User",
      email: "  New.User@Example.COM  ",
      password: "Password123!",
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new.user@example.com",
        }),
      })
    );
  });

  it("maps a concurrent unique-constraint violation (P2002) to a friendly 409", async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue({ code: "P2002" });

    await expect(
      registerUser({
        name: "New User",
        email: "race@example.com",
        password: "Password123!",
      })
    ).rejects.toMatchObject({ statusCode: 409, code: "EMAIL_ALREADY_EXISTS" });
  });

  it("does not expose non-constraint transaction errors as duplicate errors", async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error("db down"));

    await expect(
      registerUser({
        name: "New User",
        email: "error@example.com",
        password: "Password123!",
      })
    ).rejects.toThrow("db down");
  });
});

describe("registerUser input validation", () => {
  it("rejects an invalid email format with 400", async () => {
    await expect(
      registerUser({
        name: "New User",
        email: "not-an-email",
        password: "Password123!",
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid phone format with 400", async () => {
    await expect(
      registerUser({
        name: "New User",
        email: "phone@example.com",
        password: "Password123!",
        phone: "not-a-phone",
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("accepts a valid phone number", async () => {
    await registerUser({
      name: "New User",
      email: "validphone@example.com",
      password: "Password123!",
      phone: "+91 98765 43210",
    });

    expect(prisma.profile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: "+91 98765 43210" }),
      })
    );
  });
});

describe("registerUser atomic registration workflow", () => {
  it("creates every per-user default inside the single transaction", async () => {
    await registerUser({
      name: "New User",
      email: "defaults@example.com",
      password: "Password123!",
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: "free", subscriptionStatus: "free" }),
      })
    );
    expect(tx.profile.create).toHaveBeenCalled();
    expect(tx.userSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "test-user-id" }) })
    );
    expect(tx.aiPreference.create).toHaveBeenCalled();
    expect(tx.notificationPreference.create).toHaveBeenCalled();
    expect(tx.learningPreference.create).toHaveBeenCalled();
    expect(tx.storageUsage.create).toHaveBeenCalled();
    expect(tx.aiUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: "free", subscriptionStatus: "free" }) })
    );
    expect(tx.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planCode: "free", status: "free", price: 0 }),
      })
    );
    expect(tx.session.create).toHaveBeenCalled();
    expect(tx.activityLog.create).toHaveBeenCalledTimes(4);
    expect(tx.registrationDailyMetric.upsert).toHaveBeenCalled();
  });

  it("records the verification email step in the activity log", async () => {
    const res = await registerUser({
      name: "New User",
      email: "verify@example.com",
      password: "Password123!",
    });

    expect(res.verificationEmail).toEqual(
      expect.objectContaining({ delivered: false, reason: "email_verification_disabled" })
    );
    const verificationCalls = (tx.activityLog.create as jest.Mock).mock.calls.filter(
      (call) => call[0].data.action === "Verification Email"
    );
    expect(verificationCalls).toHaveLength(1);
  });

  it("returns the extended registration response shape", async () => {
    const res = await registerUser({
      name: "New User",
      email: "shape@example.com",
      password: "Password123!",
    });

    expect(res).toHaveProperty("profile");
    expect(res).toHaveProperty("subscription");
    expect(res).toHaveProperty("settings");
    expect(res.settings).toHaveProperty("userSettings");
    expect(res.settings).toHaveProperty("aiPreference");
    expect(res.settings).toHaveProperty("notificationPreference");
    expect(res.settings).toHaveProperty("learningPreference");
    expect(res).toHaveProperty("verificationEmail");
    expect(res).toHaveProperty("token");
    expect(res).toHaveProperty("refreshToken");
  });

  it("stores hashed session tokens with request metadata", async () => {
    await registerUser({
      name: "New User",
      email: "session@example.com",
      password: "Password123!",
      userAgent: "jest-agent",
      ipAddress: "127.0.0.1",
    });

    expect(tx.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          refreshTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          userAgent: "jest-agent",
          ipAddress: "127.0.0.1",
        }),
      })
    );
  });

  it("computes profile completion from captured fields", async () => {
    await registerUser({
      name: "New User",
      email: "complete@example.com",
      password: "Password123!",
      college: "IIT Bombay",
      branch: "CSE",
      country: "India",
      state: "Maharashtra",
      city: "Mumbai",
      phone: "+91 90000 00000",
    });

    const call = (prisma.profile.create as jest.Mock).mock.calls[0][0];
    expect(call.data.profileCompletion).toBeGreaterThan(0);
  });

  it("upserts the university and increments department/course/branch counters", async () => {
    await registerUser({
      name: "New User",
      email: "uni@example.com",
      password: "Password123!",
      college: "IIT Bombay",
      department: "CSE",
      course: "B.Tech",
      branch: "Computer Science",
      country: "India",
    });

    expect(tx.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "IIT Bombay", type: "UNIVERSITY", country: "India" }),
      })
    );
    expect(tx.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentCount: { increment: 1 },
          activeStudents: { increment: 1 },
          registrationCount: { increment: 1 },
        }),
      })
    );
    expect(tx.universityDepartment.upsert).toHaveBeenCalled();
    expect(tx.universityCourse.upsert).toHaveBeenCalled();
    expect(tx.universityBranch.upsert).toHaveBeenCalled();
    expect(tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "University Assigned" }),
      })
    );
    expect(tx.registrationDailyMetric.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          registrations: 1,
          newUniversities: 1,
          newDepartments: 1,
          newCourses: 1,
          newBranches: 1,
          newCountries: 1,
        }),
      })
    );
  });

  it("skips university upserts when no college is provided", async () => {
    await registerUser({
      name: "New User",
      email: "nocollege@example.com",
      password: "Password123!",
    });

    expect(tx.organization.create).not.toHaveBeenCalled();
    expect(tx.universityDepartment.upsert).not.toHaveBeenCalled();
    expect(tx.universityCourse.upsert).not.toHaveBeenCalled();
    expect(tx.universityBranch.upsert).not.toHaveBeenCalled();
  });

  it("rejects when a transaction step fails, leaving no registration", async () => {
    (tx.subscription.create as jest.Mock).mockRejectedValue(new Error("subscription provider down"));

    await expect(
      registerUser({
        name: "New User",
        email: "fail@example.com",
        password: "Password123!",
      })
    ).rejects.toThrow("subscription provider down");
  });
});

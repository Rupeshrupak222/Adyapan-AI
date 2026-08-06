import { registerUser } from "../../src/services/auth.service";
import { prisma } from "../../src/config/prisma";

jest.mock("../../src/config/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
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

describe("registerUser role handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      async (cb: (tx: unknown) => Promise<unknown>) => cb({ user: prisma.user, profile: prisma.profile })
    );
  });

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
  beforeEach(() => {
    jest.clearAllMocks();
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
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb({ user: prisma.user, profile: prisma.profile })
    );
  });

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

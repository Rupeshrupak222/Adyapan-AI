import { registerUser } from "../../src/services/auth.service";
import { prisma } from "../../src/config/prisma";

jest.mock("../../src/config/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
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

/**
 * Security hardening tests — validates fixes applied during the security audit.
 *
 * Covers:
 *  1. env.ts: privileged emails, production secret guard
 *  2. requirePremium: case-insensitive subscriptionStatus, env-based privileged emails
 *  3. adminAuth: HS256 algorithm pinning
 *  4. auth.controller logout: token blacklisting
 *  5. payment.controller: replay guard (double-verify)
 *  6. piston.service: env sandbox isolation
 *  7. auth.service OTP: CSPRNG via randomInt
 */

jest.mock("dotenv/config", () => {});

/* -------------------------------------------------------------------------- */
/*  1. env.ts — privileged emails & production guard                           */
/* -------------------------------------------------------------------------- */
describe("env config security hardening", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.OWNER_EMAILS;
    delete process.env.PRIVILEGED_EMAILS;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("defaults privilegedEmails to empty array when OWNER_EMAILS not set", () => {
    delete process.env.OWNER_EMAILS;
    delete process.env.PRIVILEGED_EMAILS;
    const { env } = require("../../src/config/env");
    expect(env.privilegedEmails).toEqual([]);
  });

  it("parses comma-separated OWNER_EMAILS to lowercase array", () => {
    process.env.OWNER_EMAILS = "Admin@Example.com, Owner@test.org";
    const { env } = require("../../src/config/env");
    expect(env.privilegedEmails).toEqual(["admin@example.com", "owner@test.org"]);
  });

  it("falls back to PRIVILEGED_EMAILS if OWNER_EMAILS not set", () => {
    process.env.PRIVILEGED_EMAILS = "Legacy@Old.com";
    const { env } = require("../../src/config/env");
    expect(env.privilegedEmails).toEqual(["legacy@old.com"]);
  });

  it("does not have hardcoded admin secret as default", () => {
    delete process.env.ADMIN_REGISTER_SECRET;
    const { env } = require("../../src/config/env");
    expect(env.adminRegisterSecret).toBe("");
  });

  it("defaults Google OAuth credentials to empty strings (not hardcoded)", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    const { env } = require("../../src/config/env");
    expect(env.google.clientId).toBe("");
    expect(env.google.clientSecret).toBe("");
  });

  it("throws in production when ADMIN_REGISTER_SECRET is the legacy default", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "production-secret";
    process.env.ADMIN_REGISTER_SECRET = "adyapan-admin-secret-2026";
    expect(() => require("../../src/config/env")).toThrow(/ADMIN_REGISTER_SECRET must be set/);
  });

  it("throws in production when ADMIN_REGISTER_SECRET is empty", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "production-secret";
    delete process.env.ADMIN_REGISTER_SECRET;
    expect(() => require("../../src/config/env")).toThrow(/ADMIN_REGISTER_SECRET must be set/);
  });

  it("does not throw in production when ADMIN_REGISTER_SECRET is a unique value", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "production-secret";
    process.env.ADMIN_REGISTER_SECRET = "unique-production-secret-xyz";
    expect(() => require("../../src/config/env")).not.toThrow();
  });
});

/* -------------------------------------------------------------------------- */
/*  2. requirePremium — subscriptionStatus case-insensitivity                   */
/* -------------------------------------------------------------------------- */
describe("requirePremiumEntitlement subscriptionStatus case-insensitivity", () => {
  const mockFindUnique = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.mock("../../src/config/prisma", () => ({
      prisma: {
        user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
      },
    }));
    process.env.JWT_SECRET = "test-secret";
    process.env.OWNER_EMAILS = "";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("allows premium access when DB has lowercase 'active' status", async () => {
    mockFindUnique.mockResolvedValue({ plan: "premium", subscriptionStatus: "active" });
    const { requirePremiumEntitlement } = require("../../src/middleware/requirePremium");

    const req = {
      method: "POST",
      baseUrl: "/engine",
      path: "/submit",
      user: { userId: "u1", email: "test@example.com", role: "USER" },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await requirePremiumEntitlement(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("allows premium access when DB has uppercase 'ACTIVE' status", async () => {
    mockFindUnique.mockResolvedValue({ plan: "premium", subscriptionStatus: "ACTIVE" });
    const { requirePremiumEntitlement } = require("../../src/middleware/requirePremium");

    const req = {
      method: "POST",
      baseUrl: "/engine",
      path: "/submit",
      user: { userId: "u1", email: "test@example.com", role: "USER" },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await requirePremiumEntitlement(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("allows premium access when DB has mixed case 'Active' status", async () => {
    mockFindUnique.mockResolvedValue({ plan: "premium", subscriptionStatus: "Active" });
    const { requirePremiumEntitlement } = require("../../src/middleware/requirePremium");

    const req = {
      method: "POST",
      baseUrl: "/engine",
      path: "/submit",
      user: { userId: "u1", email: "test@example.com", role: "USER" },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await requirePremiumEntitlement(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("blocks free user with no subscription", async () => {
    mockFindUnique.mockResolvedValue({ plan: "free", subscriptionStatus: null });
    const { requirePremiumEntitlement } = require("../../src/middleware/requirePremium");

    const req = {
      method: "POST",
      baseUrl: "/engine",
      path: "/submit",
      user: { userId: "u1", email: "test@example.com", role: "USER" },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await requirePremiumEntitlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "PREMIUM_REQUIRED" })
    );
  });
});

/* -------------------------------------------------------------------------- */
/*  3. requirePremium — privileged email bypass via OWNER_EMAILS                */
/* -------------------------------------------------------------------------- */
describe("requirePremiumEntitlement privileged email bypass", () => {
  const mockFindUnique = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.mock("../../src/config/prisma", () => ({
      prisma: {
        user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
      },
    }));
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("allows access for USER role when email is on OWNER_EMAILS list", async () => {
    process.env.OWNER_EMAILS = "owner@test.com";
    const { requirePremiumEntitlement } = require("../../src/middleware/requirePremium");

    const req = {
      method: "POST",
      baseUrl: "/engine",
      path: "/submit",
      user: { userId: "u1", email: "owner@test.com", role: "USER" },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await requirePremiumEntitlement(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("does NOT allow access for emails merely containing 'admin' or 'ashish'", async () => {
    process.env.OWNER_EMAILS = "";
    const { requirePremiumEntitlement } = require("../../src/middleware/requirePremium");

    const req = {
      method: "POST",
      baseUrl: "/engine",
      path: "/submit",
      user: { userId: "u1", email: "admin@attacker.com", role: "USER" },
    } as any;
    mockFindUnique.mockResolvedValue({ plan: "free", subscriptionStatus: null });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await requirePremiumEntitlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows ADMIN role regardless of OWNER_EMAILS config", async () => {
    process.env.OWNER_EMAILS = "";
    const { requirePremiumEntitlement } = require("../../src/middleware/requirePremium");

    const req = {
      method: "POST",
      baseUrl: "/engine",
      path: "/submit",
      user: { userId: "u1", email: "random-admin@test.com", role: "ADMIN" },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await requirePremiumEntitlement(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/*  4. adminAuth — HS256 algorithm pinning                                     */
/* -------------------------------------------------------------------------- */
describe("adminAuth algorithm pinning", () => {
  const mockBlacklisted = jest.fn();
  const mockAdminUserFindUnique = jest.fn();
  const mockUserFindUnique = jest.fn();
  const mockAdminUserUpsert = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = "test-admin-secret";
    jest.mock("../../src/config/env", () => ({
      env: { jwtSecret: "test-admin-secret", nodeEnv: "test" },
    }));
    jest.mock("../../src/config/prisma", () => ({
      prisma: {
        blacklistedToken: { findUnique: (...args: unknown[]) => mockBlacklisted(...args) },
        user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
        adminUser: {
          findUnique: (...args: unknown[]) => mockAdminUserFindUnique(...args),
          upsert: (...args: unknown[]) => mockAdminUserUpsert(...args),
        },
        adminRole: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      },
    }));
    mockBlacklisted.mockResolvedValue(null);
    mockAdminUserFindUnique.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({
      id: "admin1",
      name: "Admin",
      email: "admin@test.com",
      role: "ADMIN",
    });
    mockAdminUserUpsert.mockResolvedValue({
      id: "admin1",
      name: "Admin",
      email: "admin@test.com",
      roleId: null,
      status: "ACTIVE",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("accepts a token signed with HS256", async () => {
    const jwt = require("jsonwebtoken");
    const { requireAdminAuth } = require("../../src/middleware/adminAuth");

    const token = jwt.sign(
      { userId: "admin1", email: "admin@test.com" },
      "test-admin-secret",
      { algorithm: "HS256" }
    );

    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    const res = {} as any;
    const next = jest.fn();

    await requireAdminAuth(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a token signed with a different algorithm (e.g. none)", async () => {
    const jwt = require("jsonwebtoken");
    const { requireAdminAuth } = require("../../src/middleware/adminAuth");

    // Attempt to forge a token with algorithm "none"
    const token = jwt.sign(
      { userId: "admin1", email: "admin@test.com" },
      "test-admin-secret",
      { algorithm: "HS256" }
    );
    // Tamper with header to set alg to "none"
    const parts = token.split(".");
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    header.alg = "none";
    parts[0] = Buffer.from(JSON.stringify(header)).toString("base64url");

    const req = { headers: { authorization: `Bearer ${parts.join(".")}` } } as any;
    const res = {} as any;
    const next = jest.fn();

    await requireAdminAuth(req, res, next);
    const err = next.mock.calls[0]?.[0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(401);
  });
});

/* -------------------------------------------------------------------------- */
/*  5. auth.controller logout — token blacklisting                             */
/* -------------------------------------------------------------------------- */
describe("auth.controller logout blacklists token", () => {
  let logoutMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    logoutMock = jest.fn().mockResolvedValue(undefined);
    jest.mock("../../src/services/auth.service", () => ({
      logout: (...args: unknown[]) => logoutMock(...args),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls logoutService with the Bearer token", async () => {
    const { logout } = require("../../src/controllers/auth.controller");

    const req = {
      headers: { authorization: "Bearer test-jwt-token-here" },
    } as any;
    const res = { json: jest.fn() } as any;

    await logout(req, res);
    expect(logoutMock).toHaveBeenCalledWith("test-jwt-token-here");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("handles logout gracefully when no token is provided", async () => {
    const { logout } = require("../../src/controllers/auth.controller");

    const req = { headers: {} } as any;
    const res = { json: jest.fn() } as any;

    await logout(req, res);
    expect(logoutMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});

/* -------------------------------------------------------------------------- */
/*  6. payment.controller — replay guard                                       */
/* -------------------------------------------------------------------------- */
describe("payment verification replay guard", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("rejects verification when payment is already marked as paid", async () => {
    const mockFindUnique = jest.fn().mockResolvedValue({
      orderId: "order_123",
      userId: "user1",
      status: "paid",
      plan: "pro_monthly",
    });
    const mockUpdate = jest.fn();

    jest.mock("../../src/config/prisma", () => ({
      prisma: {
        payment: {
          findUnique: (...args: unknown[]) => mockFindUnique(...args),
          update: (...args: unknown[]) => mockUpdate(...args),
        },
        user: { update: jest.fn() },
      },
    }));
    jest.mock("../../src/services/subscription.service", () => ({
      activateSubscription: jest.fn(),
    }));

    // Mock env with a valid razorpay secret for HMAC check
    jest.mock("../../src/config/env", () => ({
      env: {
        razorpay: { keySecret: "test-razorpay-secret" },
      },
    }));

    const crypto = require("crypto");
    const orderId = "order_123";
    const paymentId = "pay_abc";
    const signature = crypto
      .createHmac("sha256", "test-razorpay-secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const { verifyPayment } = require("../../src/controllers/payment.controller");

    const req = {
      body: { orderId, paymentId, signature },
      user: { userId: "user1" },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await verifyPayment(req, res, next);

    const err = next.mock.calls[0]?.[0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain("already verified");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/*  7. piston.service — env sandbox does not leak secrets                       */
/* -------------------------------------------------------------------------- */
describe("piston.service env sandbox", () => {
  it("SANDBOX_ENV does not include sensitive env vars", () => {
    // Read the source to verify the allowlist
    const fs = require("fs");
    const src = fs.readFileSync(
      "F:/Adyapan AI/backend/src/services/piston.service.ts",
      "utf8"
    );

    // Verify the SANDBOX_ENV does NOT include these keys
    const forbiddenKeys = [
      "DATABASE_URL",
      "JWT_SECRET",
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "OPENROUTER_API_KEY",
      "CLOUDINARY_API_SECRET",
      "RAZORPAY_KEY_SECRET",
      "DIRECT_URL",
      "MASTER_DATABASE_URL",
    ];

    for (const key of forbiddenKeys) {
      expect(src).not.toMatch(new RegExp(`\\b${key}\\s*:\\s*process\\.env\\.${key}`));
    }
  });

  it("SANDBOX_ENV includes only minimal system vars", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      "F:/Adyapan AI/backend/src/services/piston.service.ts",
      "utf8"
    );

    // Verify the allowlist contains the expected safe vars
    const expectedKeys = ["PATH", "SYSTEMROOT", "TEMP", "COMSPEC"];
    for (const key of expectedKeys) {
      expect(src).toContain(key);
    }
  });

  it("has output byte cap to prevent OOM", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      "F:/Adyapan AI/backend/src/services/piston.service.ts",
      "utf8"
    );
    expect(src).toContain("MAX_OUTPUT_BYTES");
    expect(src).toContain("64");
  });

  it("uses windowsHide to prevent console windows on Windows", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      "F:/Adyapan AI/backend/src/services/piston.service.ts",
      "utf8"
    );
    expect(src).toContain("windowsHide: true");
  });
});

/* -------------------------------------------------------------------------- */
/*  8. auth.service — OTP uses CSPRNG                                          */
/* -------------------------------------------------------------------------- */
describe("auth.service OTP generation", () => {
  it("generateOtp uses crypto.randomInt (CSPRNG), not Math.random", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      "F:/Adyapan AI/backend/src/services/auth.service.ts",
      "utf8"
    );
    // Verify the OTP function uses randomInt from crypto module
    expect(src).toMatch(/randomInt\(100000,\s*1000000\)/);
    // Verify Math.random() is NOT called for OTP generation (only in comments elsewhere)
    const otpFn = src.substring(
      src.indexOf("function generateOtp"),
      src.indexOf("}", src.indexOf("function generateOtp") + 1) + 1
    );
    // The function body should not contain Math.random as a call (only in a comment is ok)
    expect(otpFn).not.toMatch(/Math\.random\s*\(/);
  });

  it("devOtp is only returned in development mode", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      "F:/Adyapan AI/backend/src/services/auth.service.ts",
      "utf8"
    );
    // Verify devOtp is gated to development only
    expect(src).toMatch(/env\.nodeEnv\s*===\s*"development"/);
  });
});

/* -------------------------------------------------------------------------- */
/*  9. CORS — tightened patterns                                               */
/* -------------------------------------------------------------------------- */
describe("CORS origin tightening", () => {
  it("CORS patterns use anchored regexes, not broad wildcards", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      "F:/Adyapan AI/backend/src/app.ts",
      "utf8"
    );

    // Verify no broad patterns like /.vercel.app$/ or origin.includes()
    expect(src).not.toContain("origin.includes");
    expect(src).not.toMatch(/\/\.vercel\.app\$\//);
    expect(src).not.toMatch(/\/\.railway\.\(app\|internal\)\$\//);
    expect(src).not.toMatch(/\.onrender\.com\$/);

    // Verify anchored patterns exist
    expect(src).toContain("adyapan-ai-");
    expect(src).toContain("\\.up\\.railway\\.app");
  });
});

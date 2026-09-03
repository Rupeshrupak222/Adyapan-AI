import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const mockIsTokenBlacklisted = jest.fn();

jest.mock("../../src/services/auth.service", () => ({
  isTokenBlacklisted: (...args: unknown[]) => mockIsTokenBlacklisted(...args),
}));

jest.mock("../../src/services/session.service", () => ({
  checkForceLogout: () => null,
  checkUserForceLogout: () => null,
  recordActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../src/config/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockImplementation(({ where, select }: any) => {
        if (select?.activeSessionId) {
          return Promise.resolve({ activeSessionId: "a".repeat(48) });
        }
        return Promise.resolve(null);
      }),
    },
  },
}));

// Deterministic secret for signing test tokens.
process.env.JWT_SECRET = "test-secret";

import { requireAuth, requireRole, securityHeaders, AuthUser } from "../../src/middleware/auth";
import type { HttpError } from "../../src/utils/httpError";

const SECRET = "test-secret";

function createResponse() {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: jest.fn((k: string, v: string) => {
      headers[k] = v;
    }),
    headers,
  };
  return res as unknown as Response & { headers: Record<string, string> };
}

describe("requireAuth", () => {
  beforeEach(() => {
    mockIsTokenBlacklisted.mockResolvedValue(false);
  });

  it("rejects requests without an Authorization header", async () => {
    const next = jest.fn();
    await requireAuth({ headers: {} } as Request, {} as Response, next as NextFunction);
    const err = next.mock.calls[0][0] as HttpError;
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/token is required/);
  });

  it("rejects a malformed (non-Bearer) header", async () => {
    const next = jest.fn();
    await requireAuth(
      { headers: { authorization: "Basic abc" } } as Request,
      {} as Response,
      next as NextFunction
    );
    expect((next.mock.calls[0][0] as HttpError).statusCode).toBe(401);
  });

  it("attaches the decoded user and calls next on a valid token", async () => {
    const user: AuthUser = { userId: "u1", email: "a@b.com", role: "USER" };
    const token = jwt.sign(user, SECRET, { algorithm: "HS256" });
    const sessionId = "a".repeat(48); // 48-char hex session ID
    const req = { headers: { authorization: `Bearer ${token}`, "x-session-id": sessionId } } as Request;
    const next = jest.fn();

    await requireAuth(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.userId).toBe("u1");
    expect(req.user?.role).toBe("USER");
  });

  it("rejects an invalid token signature", async () => {
    const token = jwt.sign({ userId: "u1" }, "wrong-secret", { algorithm: "HS256" });
    const next = jest.fn();
    await requireAuth(
      { headers: { authorization: `Bearer ${token}` } } as Request,
      {} as Response,
      next as NextFunction
    );
    expect((next.mock.calls[0][0] as HttpError).statusCode).toBe(401);
  });

  it("rejects a blacklisted token", async () => {
    mockIsTokenBlacklisted.mockResolvedValue(true);
    const token = jwt.sign({ userId: "u1" }, SECRET, { algorithm: "HS256" });
    const next = jest.fn();
    await requireAuth(
      { headers: { authorization: `Bearer ${token}` } } as Request,
      {} as Response,
      next as NextFunction
    );
    expect(mockIsTokenBlacklisted).toHaveBeenCalledWith(token);
    expect((next.mock.calls[0][0] as HttpError).statusCode).toBe(401);
  });
});

describe("requireRole", () => {
  it("returns 401 when there is no authenticated user", () => {
    const next = jest.fn();
    requireRole("ADMIN")({} as Request, {} as Response, next as NextFunction);
    expect((next.mock.calls[0][0] as HttpError).statusCode).toBe(401);
  });

  it("returns 403 when the role does not match", () => {
    const next = jest.fn();
    const req = { user: { userId: "u", email: "e", role: "USER" } } as Request;
    requireRole("ADMIN")(req, {} as Response, next as NextFunction);
    expect((next.mock.calls[0][0] as HttpError).statusCode).toBe(403);
  });

  it("calls next() when the role matches", () => {
    const next = jest.fn();
    const req = { user: { userId: "u", email: "e", role: "ADMIN" } } as Request;
    requireRole("ADMIN")(req, {} as Response, next as NextFunction);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("securityHeaders", () => {
  it("sets the expected hardening headers and calls next", () => {
    const res = createResponse();
    const next = jest.fn();

    securityHeaders({} as Request, res, next as NextFunction);

    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(res.headers["X-Frame-Options"]).toBe("DENY");
    expect(res.headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    // CSP is intentionally NOT set on backend API responses — it is a JSON API,
    // not a browser-rendered page. CSP is handled by the frontend (next.config.ts).
    expect(res.headers["Content-Security-Policy"]).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

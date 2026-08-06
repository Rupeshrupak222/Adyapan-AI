import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { exec } from "child_process";
import type { User } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { httpError, type HttpError } from "../utils/httpError";
import type { AuthRole } from "../middleware/auth";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { databaseService } from "./database.service";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const TOKEN_SHORT = "15m";
const TOKEN_LONG = "7d";
const REFRESH_TOKEN_EXPIRY = "30d";

// Rate limiter for auth endpoints (10 attempts per IP per 15 minutes)
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 15 * 60,
});

function getTokenOptions(rememberMe?: boolean): SignOptions {
  return { expiresIn: rememberMe ? TOKEN_LONG : TOKEN_SHORT };
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: (user as any).plan || "free",
    createdAt: user.createdAt,
  };
}

function signToken(user: Pick<User, "id" | "email" | "role">, rememberMe?: boolean) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    {
      ...getTokenOptions(rememberMe),
      algorithm: "HS256",
    },
  );
}

function signRefreshToken(userId: string) {
  return jwt.sign(
    { userId },
    env.jwtSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: "HS256" }
  );
}

function validatePasswordStrength(password: string) {
  if (!password || password.length < 6) {
    throw httpError(400, "Password must be at least 6 characters long");
  }
}

export const EMAIL_ALREADY_EXISTS_CODE = "EMAIL_ALREADY_EXISTS";

const DUPLICATE_EMAIL_MESSAGE =
  "This email is already registered. Please sign in or use another email address.";

function duplicateEmailError(): HttpError {
  return httpError(409, DUPLICATE_EMAIL_MESSAGE, EMAIL_ALREADY_EXISTS_CODE);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw duplicateEmailError();
  }

  validatePasswordStrength(input.password);
  const password = await bcrypt.hash(input.password, 12);

  // Use explicit transaction so the pg driver adapter handles user + profile
  // creation atomically without relying on implicit nested-write transactions.
  let user: User;
  try {
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: input.name,
          email,
          password,
          role: input.role === "ADMIN" ? "ADMIN" : "USER",
        },
      });
      await tx.profile.create({
        data: { userId: newUser.id },
      });
      return newUser;
    });
  } catch (error) {
    // A concurrent registration can slip past the findUnique check and hit the
    // unique email constraint (P2002). Surface the same friendly 409 instead of
    // leaking a raw Prisma error to the client.
    if (isUniqueConstraintError(error)) {
      throw duplicateEmailError();
    }
    throw error;
  }

  // Provision per-user database completely asynchronously — never block or
  // fail registration if the Neon API is slow or rate-limits.
  setImmediate(() => {
    const userDbName = `user_${user.id}`;
    databaseService.createDatabase(userDbName)
      .then(() => databaseService.getConnectionString(userDbName))
      .then((dbUrl) => {
        exec(`npx prisma db push --config=prisma/prisma.config.user.ts --accept-data-loss`, {
          cwd: process.cwd(),
          env: { ...process.env, USER_DATABASE_URL: dbUrl },
        }, (error) => {
          if (error) console.warn(`[Register] User DB schema push failed for ${user.id}:`, error.message);
        });
      })
      .catch((err) => {
        console.warn(`[Register] User DB provisioning skipped for ${user.id}:`, err?.message || err);
      });
  });

  return {
    user: publicUser(user),
    token: signToken(user, false),
    refreshToken: signRefreshToken(user.id),
  };
}

export async function loginUser(input: LoginInput & { rememberMe?: boolean }) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw httpError(401, "Invalid email or password");
  }

  if (!user.password) {
    throw httpError(401, "This account was created via GitHub login. Please use GitHub to sign in.");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);

  if (!isPasswordValid) {
    throw httpError(401, "Invalid email or password");
  }

  return {
    user: publicUser(user),
    token: signToken(user, input.rememberMe),
    refreshToken: signRefreshToken(user.id),
  };
}

export async function refreshToken(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.jwtSecret, { algorithms: ["HS256"] }) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      throw httpError(404, "User not found");
    }

    return {
      token: signToken(user, false),
      refreshToken: signRefreshToken(user.id),
    };
  } catch (err) {
    throw httpError(401, "Invalid or expired refresh token");
  }
}

export async function logout(token: string) {
  tokenBlacklistCache.delete(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.blacklistedToken.create({
    data: {
      token,
      expiresAt,
    },
  });
}

// Negative cache for blacklist checks: the vast majority of tokens are never
// blacklisted, and checking the master DB on every request adds a roundtrip to
// each one. `logout` evicts the token so the 60s TTL cannot keep a just-logged
// out token alive. Bounded, lazily evicted.
const BLACKLIST_CACHE_TTL_MS = 60_000;
const BLACKLIST_CACHE_MAX = 10_000;
const tokenBlacklistCache = new Map<string, number>();

function cacheNotBlacklisted(token: string): void {
  tokenBlacklistCache.set(token, Date.now());
  if (tokenBlacklistCache.size <= BLACKLIST_CACHE_MAX) return;
  const now = Date.now();
  for (const [cachedToken, ts] of tokenBlacklistCache) {
    if (now - ts >= BLACKLIST_CACHE_TTL_MS) tokenBlacklistCache.delete(cachedToken);
  }
  if (tokenBlacklistCache.size > BLACKLIST_CACHE_MAX) {
    const oldestToken = tokenBlacklistCache.keys().next().value as string | undefined;
    if (oldestToken !== undefined) tokenBlacklistCache.delete(oldestToken);
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const cached = tokenBlacklistCache.get(token);
  if (cached !== undefined) {
    if (Date.now() - cached < BLACKLIST_CACHE_TTL_MS) return false;
    tokenBlacklistCache.delete(token);
  }

  try {
    const blacklisted = await prisma.blacklistedToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
    });

    if (!blacklisted) {
      cacheNotBlacklisted(token);
    }
    return !!blacklisted;
  } catch {
    return false;
  }
}

export async function rateLimitAuthRequest(ip: string) {
  try {
    await rateLimiter.consume(ip);
  } catch (err) {
    throw httpError(429, "Too many requests");
  }
}

const OTP_TTL_MS = 10 * 60 * 1000;

const memoryPasswordResetTokens: Array<{
  id: string;
  email: string;
  otpHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}> = [];

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestPasswordReset(email: string): Promise<{ devOtp?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    // Do not reveal whether an account exists
    return {};
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  memoryPasswordResetTokens.push({
    id: Math.random().toString(36).substring(2, 9),
    email: normalizedEmail,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    used: false,
    createdAt: new Date(),
  });

  // No email provider is configured; surface the OTP via the API response in
  // non-production environments and log it in production for operators.
  if (env.nodeEnv !== "production") {
    return { devOtp: otp };
  }
  console.log(`[PasswordReset] OTP for ${normalizedEmail}: ${otp}`);
  return {};
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  const normalizedEmail = email.toLowerCase().trim();
  validatePasswordStrength(newPassword);

  if (!otp || !/^\d{6}$/.test(otp)) {
    throw httpError(400, "Invalid OTP. Please enter the 6-digit code.");
  }

  const tokenRecord = memoryPasswordResetTokens
    .filter((t) => t.email === normalizedEmail && !t.used && t.expiresAt > new Date())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  if (!tokenRecord) {
    throw httpError(400, "Invalid or expired OTP. Please request a new one.");
  }

  const isValidOtp = await bcrypt.compare(otp, tokenRecord.otpHash);
  if (!isValidOtp) {
    throw httpError(400, "Invalid OTP.");
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw httpError(404, "Account not found.");
  }
  if (!user.password) {
    throw httpError(400, "This account was created via GitHub login and has no password. Please use GitHub to sign in.");
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  tokenRecord.used = true;

  return { message: "Password reset successful. Please sign in with your new password." };
}

type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  email: string;
  avatar_url: string;
};

export function getGitHubRedirectUrl(): string {
  const params = new URLSearchParams({
    client_id: env.github.clientId,
    redirect_uri: env.github.callbackUrl,
    scope: "read:user user:email",
    state: "adyapan_ai",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGitHubCode(code: string): Promise<GitHubUser> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.github.clientId,
      client_secret: env.github.clientSecret,
      code,
      redirect_uri: env.github.callbackUrl,
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw httpError(401, "GitHub OAuth failed: " + (tokenData.error || "No access token"));
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/json",
    },
  });

  const githubUser = (await userRes.json()) as GitHubUser;

  if (!githubUser.email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });
    const emails = (await emailsRes.json()) as { email: string; primary: boolean }[];
    const primary = emails.find((e) => e.primary);
    if (primary) {
      githubUser.email = primary.email;
    } else if (emails.length > 0) {
      githubUser.email = emails[0].email;
    }
  }

  if (!githubUser.email) {
    throw httpError(400, "GitHub account has no public email. Please add one to your GitHub profile.");
  }

  return githubUser;
}

export async function handleGitHubUser(githubUser: GitHubUser, rememberMe?: boolean) {
  const githubId = String(githubUser.id);
  const email = githubUser.email.toLowerCase();

  let user = await prisma.user.findFirst({
    where: { OR: [{ githubId }, { email }] },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        githubId,
        avatarUrl: githubUser.avatar_url,
        name: user.name || githubUser.name || githubUser.login,
      } as any,
    });
  } else {
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: githubUser.name || githubUser.login,
          email,
          githubId,
          avatarUrl: githubUser.avatar_url,
          role: "USER",
        } as any,
      });
      await tx.profile.create({
        data: {
          userId: newUser.id,
          github: githubUser.login,
        },
      });
      return newUser;
    });

    // Fire-and-forget user DB provisioning
    setImmediate(() => {
      const userDbName = `user_${user!.id}`;
      databaseService.createDatabase(userDbName)
        .then(() => databaseService.getConnectionString(userDbName))
        .then((dbUrl) => {
          exec(`npx prisma db push --config=prisma/prisma.config.user.ts --accept-data-loss`, {
            cwd: process.cwd(),
            env: { ...process.env, USER_DATABASE_URL: dbUrl },
          }, (error) => {
            if (error) console.warn(`[GitHub] User DB schema push failed for ${user!.id}:`, error.message);
          });
        })
        .catch((err) => {
          console.warn(`[GitHub] User DB provisioning skipped for ${user!.id}:`, err?.message || err);
        });
    });
  }

  return {
    user: publicUser(user),
    token: signToken(user, rememberMe),
    refreshToken: signRefreshToken(user.id),
  };
}

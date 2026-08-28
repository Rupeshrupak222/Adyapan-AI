import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { exec } from "child_process";
import { createHash, randomBytes, randomInt } from "crypto";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { httpError, type HttpError } from "../utils/httpError";
import type { AuthRole } from "../middleware/auth";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { databaseService } from "./database.service";
import { calculateProfileCompletion } from "../utils/profileCompletion";
import { hashRefreshToken, isSessionIdle, revokeAllSessions } from "./session.service";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  college?: string;
  branch?: string;
  year?: string;
  degree?: string;
  country?: string;
  state?: string;
  city?: string;
  department?: string;
  course?: string;
  semester?: string;
  studentId?: string;
  referralCode?: string;
  profileImageUrl?: string;
  userAgent?: string;
  ipAddress?: string;
};

type LoginInput = {
 email: string;
 password: string;
 userAgent?: string;
 ipAddress?: string;
};

const TOKEN_SHORT = "15m";
const TOKEN_LONG = "7d";
const REFRESH_TOKEN_EXPIRY = "30d";

// Rate limiter for auth endpoints (10 attempts per IP per 15 minutes in production)
const rateLimiter = new RateLimiterMemory({
  points: process.env.NODE_ENV === "development" ? 10000 : 10,
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
      type: "access",
    },
    env.jwtSecret,
    {
      ...getTokenOptions(rememberMe),
      algorithm: "HS256",
    },
  );
}

function signRefreshToken(userId: string) {
  // Signed with a DISTINCT secret and tagged type:"refresh" so it can never be
  // presented as an access token (and vice-versa).
  return jwt.sign(
    { userId, type: "refresh" },
    env.refreshSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: "HS256" }
  );
}

// Verify a refresh token with the refresh secret and enforce the type claim.
// Rejects access tokens presented as refresh tokens.
export function verifyRefreshToken(token: string): { userId: string } {
  const payload = jwt.verify(token, env.refreshSecret, { algorithms: ["HS256"] }) as {
    userId?: string;
    type?: string;
  };
  if (payload.type !== "refresh" || !payload.userId) {
    throw httpError(401, "Invalid refresh token");
  }
  return { userId: payload.userId };
}

// Password policy: minimum 8 chars with upper, lower, digit, and special char.
const PASSWORD_SPECIAL_CHARS = "!@#$%^&*_\\-+=?.,;:";
function validatePasswordStrength(password: string) {
  if (!password || password.length < 8) {
    throw httpError(400, "Password must be at least 8 characters long");
  }
  if (!/[a-z]/.test(password)) {
    throw httpError(400, "Password must include a lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    throw httpError(400, "Password must include an uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    throw httpError(400, "Password must include a number");
  }
  if (!new RegExp(`[${PASSWORD_SPECIAL_CHARS}]`).test(password)) {
    throw httpError(400, "Password must include a special character (!@#$%^&*_-+=?.,;:)");
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

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_FORMAT_REGEX = /^\+?[\d\s()-]{8,15}$/;

function validateEmailFormat(email: string) {
  if (!EMAIL_FORMAT_REGEX.test(email)) {
    throw httpError(400, "Please enter a valid email address.");
  }
}

function validatePhoneFormat(phone?: string) {
  if (phone && !PHONE_FORMAT_REGEX.test(phone.trim())) {
    throw httpError(400, "Please enter a valid phone number.");
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function publicProfile(profile: {
  id: string;
  username: string | null;
  phone: string | null;
  college: string | null;
  branch: string | null;
  year: string | null;
  degree: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  department: string | null;
  course: string | null;
  semester: string | null;
  studentId: string | null;
  referralCode: string | null;
  photoUrl: string | null;
  organizationId: string | null;
  profileCompletion: number;
}) {
  return {
    id: profile.id,
    username: profile.username,
    phone: profile.phone,
    college: profile.college,
    branch: profile.branch,
    year: profile.year,
    degree: profile.degree,
    country: profile.country,
    state: profile.state,
    city: profile.city,
    department: profile.department,
    course: profile.course,
    semester: profile.semester,
    studentId: profile.studentId,
    referralCode: profile.referralCode,
    photoUrl: profile.photoUrl,
    organizationId: profile.organizationId,
    profileCompletion: profile.profileCompletion,
  };
}

function publicSubscription(subscription: {
  planCode: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}) {
  return {
    planCode: subscription.planCode,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}

type RegistrationResult = {
  user: User;
  profile: Prisma.ProfileGetPayload<{}>;
  settings: Prisma.UserSettingsGetPayload<{}>;
  aiPreference: Prisma.AiPreferenceGetPayload<{}>;
  notificationPreference: Prisma.NotificationPreferenceGetPayload<{}>;
  learningPreference: Prisma.LearningPreferenceGetPayload<{}>;
  storageUsage: Prisma.StorageUsageGetPayload<{}>;
  aiUsage: Prisma.AiUsageGetPayload<{}>;
  subscription: Prisma.SubscriptionGetPayload<{}>;
  verificationEmail: VerificationEmailStatus;
  refreshToken: string;
  activeSessionId: string;
};

type UniversityUpsertResult = {
  organizationId: string | null;
  isNewUniversity: boolean;
  newDepartment: boolean;
  newCourse: boolean;
  newBranch: boolean;
};

async function upsertUniversityWithinTransaction(
  tx: Prisma.TransactionClient,
  college: string | undefined,
  input: Pick<RegisterInput, "department" | "course" | "branch" | "degree" | "country">
): Promise<UniversityUpsertResult> {
  const name = (college ?? "").trim();
  const country = (input.country ?? "").trim() || null;

  if (!name) {
    return { organizationId: null, isNewUniversity: false, newDepartment: false, newCourse: false, newBranch: false };
  }

  const existing = await tx.organization.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, country: true },
  });

  const isNewUniversity = !existing;

  const organization = existing ?? (await tx.organization.create({
    data: {
      name,
      type: /(inc|ltd|corp|llc|tech|software|solutions|services|systems|gmbh|pvt|co\.)$/i.test(name) ? "COMPANY" : "UNIVERSITY",
      status: "ACTIVE",
      country,
    },
    select: { id: true, country: true },
  }));

  await tx.organization.update({
    where: { id: organization.id },
    data: {
      studentCount: { increment: 1 },
      activeStudents: { increment: 1 },
      registrationCount: { increment: 1 },
      latestRegistrationAt: new Date(),
      ...(country && organization.country !== country ? { country } : {}),
    },
  });

  let newDepartment = false;
  const department = (input.department ?? "").trim();
  if (department) {
    const dept = await tx.universityDepartment.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: department } },
      update: { studentCount: { increment: 1 }, registrationCount: { increment: 1 } },
      create: { organizationId: organization.id, name: department, studentCount: 1, registrationCount: 1 },
      select: { registrationCount: true },
    });
    newDepartment = dept.registrationCount === 1;
    if (newDepartment) {
      await tx.organization.update({
        where: { id: organization.id },
        data: { departmentCount: { increment: 1 } },
      });
    }
  }

  let newCourse = false;
  const course = (input.course ?? "").trim();
  if (course) {
    const crs = await tx.universityCourse.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: course } },
      update: {
        studentCount: { increment: 1 },
        registrationCount: { increment: 1 },
        ...(department ? { department } : {}),
      },
      create: { organizationId: organization.id, name: course, department: department || null, studentCount: 1, registrationCount: 1 },
      select: { registrationCount: true },
    });
    newCourse = crs.registrationCount === 1;
    if (newCourse) {
      await tx.organization.update({
        where: { id: organization.id },
        data: { courseCount: { increment: 1 } },
      });
    }
  }

  let newBranch = false;
  const branch = (input.branch ?? "").trim();
  if (branch) {
    const br = await tx.universityBranch.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: branch } },
      update: {
        studentCount: { increment: 1 },
        registrationCount: { increment: 1 },
        ...(department ? { department } : {}),
        ...(course ? { course } : {}),
      },
      create: {
        organizationId: organization.id,
        name: branch,
        department: department || null,
        course: course || null,
        studentCount: 1,
        registrationCount: 1,
      },
      select: { registrationCount: true },
    });
    newBranch = br.registrationCount === 1;
    if (newBranch) {
      await tx.organization.update({
        where: { id: organization.id },
        data: { branchCount: { increment: 1 } },
      });
    }
  }

  return { organizationId: organization.id, isNewUniversity, newDepartment, newCourse, newBranch };
}

async function recordDailyRegistrationMetricWithinTransaction(
  tx: Prisma.TransactionClient,
  flags: { isNewUniversity: boolean; newDepartment: boolean; newCourse: boolean; newBranch: boolean; hasCountry: boolean }
) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const update: Prisma.RegistrationDailyMetricUpdateInput = { registrations: { increment: 1 } };
  if (flags.isNewUniversity) update.newUniversities = { increment: 1 };
  if (flags.newDepartment) update.newDepartments = { increment: 1 };
  if (flags.newCourse) update.newCourses = { increment: 1 };
  if (flags.newBranch) update.newBranches = { increment: 1 };
  if (flags.hasCountry) update.newCountries = { increment: 1 };

  await tx.registrationDailyMetric.upsert({
    where: { date: startOfDay },
    update,
    create: {
      date: startOfDay,
      registrations: 1,
      newUniversities: flags.isNewUniversity ? 1 : 0,
      newDepartments: flags.newDepartment ? 1 : 0,
      newCourses: flags.newCourse ? 1 : 0,
      newBranches: flags.newBranch ? 1 : 0,
      newCountries: flags.hasCountry ? 1 : 0,
    },
  });
}

type VerificationEmailStatus = { delivered: boolean; reason: string; requestedAt: Date };

async function maybeSendVerificationEmail(
  tx: Prisma.TransactionClient,
  userId: string,
  email: string,
  ipAddress: string | null
): Promise<VerificationEmailStatus> {
  const hasProvider = Boolean(
    process.env.RESEND_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  );

  const status: VerificationEmailStatus = {
    delivered: false,
    reason: !env.emailVerificationEnabled
      ? "email_verification_disabled"
      : !hasProvider
        ? "email_provider_not_configured"
        : "queued",
    requestedAt: new Date(),
  };

  await tx.activityLog.create({
    data: {
      userId,
      action: "Verification Email",
      category: "security",
      details: { email, delivered: status.delivered, reason: status.reason },
      ipAddress,
    },
  });

  return status;
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw duplicateEmailError();
  }

  validatePasswordStrength(input.password);
  validateEmailFormat(email);
  validatePhoneFormat(input.phone);

  const password = await bcrypt.hash(input.password, 12);
  const firstName = (input.firstName ?? "").trim() || input.name.trim().split(/\s+/)[0] || null;
  const lastName = (input.lastName ?? "").trim() || null;
  const ipAddress = (input.ipAddress ?? "").slice(0, 64) || null;
  const userAgent = (input.userAgent ?? "").slice(0, 500) || null;

  let created: RegistrationResult;
  try {
    // Single all-or-nothing transaction: any failed step rolls back every row
    // (user, profile, defaults, logs, subscription, session, metrics). Nothing
    // outside this block may create registration records.
    created = await prisma.$transaction(async (tx) => {
      // 1. User record with free-plan defaults.
      const newUser = await tx.user.create({
        data: {
          name: input.name.trim(),
          firstName,
          lastName,
          email,
          password,
          role: input.role === "ADMIN" ? "ADMIN" : "USER",
          plan: "free",
          subscriptionStatus: "free",
          ...(input.profileImageUrl?.trim() ? { avatarUrl: input.profileImageUrl.trim() } : {}),
        },
      });

      // 2. University / organization upsert with department/course/branch counters.
      const university = await upsertUniversityWithinTransaction(tx, input.college, input);

      // 3. Profile with every captured field + computed completion.
      const profileFields = {
        userId: newUser.id,
        username: email.split("@")[0] ?? `user_${newUser.id.slice(0, 8)}`,
        phone: (input.phone ?? "").trim() || null,
        college: (input.college ?? "").trim() || null,
        branch: (input.branch ?? "").trim() || null,
        year: (input.year ?? "").trim() || null,
        degree: (input.degree ?? "").trim() || null,
        country: (input.country ?? "").trim() || null,
        state: (input.state ?? "").trim() || null,
        city: (input.city ?? "").trim() || null,
        department: (input.department ?? "").trim() || null,
        course: (input.course ?? "").trim() || null,
        semester: (input.semester ?? "").trim() || null,
        studentId: (input.studentId ?? "").trim() || null,
        referralCode: (input.referralCode ?? "").trim() || null,
        photoUrl: (input.profileImageUrl ?? "").trim() || null,
        organizationId: university.organizationId,
      };
      const profileData = {
        ...profileFields,
        profileCompletion: calculateProfileCompletion(profileFields),
      };
      const profile = await tx.profile.create({ data: profileData });

      // 4. Per-user defaults: settings, AI/notification/learning preferences,
      //    storage allocation and AI usage ledger.
      const now = new Date();
      const [settings, aiPreference, notificationPreference, learningPreference, storageUsage, aiUsage] =
        await Promise.all([
          tx.userSettings.create({ data: { userId: newUser.id } }),
          tx.aiPreference.create({ data: { userId: newUser.id } }),
          tx.notificationPreference.create({ data: { userId: newUser.id } }),
          tx.learningPreference.create({ data: { userId: newUser.id } }),
          tx.storageUsage.create({ data: { userId: newUser.id } }),
          tx.aiUsage.create({
            data: {
              userId: newUser.id,
              plan: "free",
              subscriptionStatus: "free",
              dailyResetAt: now,
              monthlyResetAt: now,
            },
          }),
        ]);

      // 5. Free subscription (30-day current period).
      const subscription = await tx.subscription.create({
        data: {
          userId: newUser.id,
          planCode: "free",
          billingCycle: "monthly",
          status: "free",
          provider: "free",
          price: 0,
          currency: "INR",
          autoRenew: false,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 6. Session (hashed token/refresh pair for auditability).
      //    Establish an activeSessionId now — identical to the login flow — so
      //    the newly registered user immediately satisfies the single-session
      //    check in requireAuth. Without this, the first protected request would
      //    be rejected with "Session ID is required" right after signup.
      const refreshToken = signRefreshToken(newUser.id);
      const activeSessionId = randomBytes(24).toString("hex");
      await tx.session.create({
        data: {
          userId: newUser.id,
          tokenHash: sha256(refreshToken),
          refreshTokenHash: sha256(refreshToken),
          userAgent,
          ipAddress,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastActiveAt: new Date(),
        },
      });
      await tx.user.update({ where: { id: newUser.id }, data: { activeSessionId } });

      // 7. Activity trail.
      const activities: Array<Promise<unknown>> = [
        tx.activityLog.create({
          data: { userId: newUser.id, action: "User Registered", category: "account", details: { email }, ipAddress },
        }),
        tx.activityLog.create({
          data: {
            userId: newUser.id,
            action: "Profile Created",
            category: "profile",
            details: { profileCompletion: profileData.profileCompletion },
            ipAddress,
          },
        }),
        tx.activityLog.create({
          data: {
            userId: newUser.id,
            action: "Subscription Assigned",
            category: "subscription",
            details: { planCode: "free", status: "free" },
            ipAddress,
          },
        }),
      ];
      if (university.organizationId) {
        activities.push(
          tx.activityLog.create({
            data: {
              userId: newUser.id,
              action: "University Assigned",
              category: "university",
              details: { organizationId: university.organizationId },
              ipAddress,
            },
          }),
        );
      }
      await Promise.all(activities);

      // 8. Daily registration rollup for admin analytics / growth charts.
      await recordDailyRegistrationMetricWithinTransaction(tx, {
        isNewUniversity: university.isNewUniversity,
        newDepartment: university.newDepartment,
        newCourse: university.newCourse,
        newBranch: university.newBranch,
        hasCountry: Boolean(input.country?.trim()),
      });

      // 9. Verification email — best-effort inside the transaction so its
      //    activity-log entry stays atomic; never blocks the registration.
      const verificationEmail = await maybeSendVerificationEmail(tx, newUser.id, email, ipAddress);

      return {
        user: newUser,
        profile,
        settings,
        aiPreference,
        notificationPreference,
        learningPreference,
        storageUsage,
        aiUsage,
        subscription,
        verificationEmail,
        refreshToken,
        activeSessionId,
      };
    }, { timeout: 30000, maxWait: 10000 });
  } catch (error) {
    // A concurrent registration can slip past the findUnique check and hit the
    // unique email constraint (P2002). Surface the same friendly 409 instead of
    // leaking a raw Prisma error to the client.
    if (isUniqueConstraintError(error)) {
      throw duplicateEmailError();
    }
    throw error;
  }



  return {
    user: publicUser(created.user),
    profile: publicProfile(created.profile),
    subscription: publicSubscription(created.subscription),
    settings: {
      userSettings: created.settings,
      aiPreference: created.aiPreference,
      notificationPreference: created.notificationPreference,
      learningPreference: created.learningPreference,
    },
    verificationEmail: created.verificationEmail,
    token: signToken(created.user, false),
    refreshToken: created.refreshToken,
    sessionId: created.activeSessionId,
  };
}

// --- Per-Email Login Lockout ---
const USER_MAX_ATTEMPTS = 5;
const USER_LOCKOUT_MS = 3 * 60 * 1000;
const ADMIN_MAX_ATTEMPTS = 3;
const ADMIN_LOCKOUT_MS = 30 * 60 * 1000;

type LockoutEntry = { count: number; lockedUntil: number; isAdmin: boolean };
const loginAttempts = new Map<string, LockoutEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of loginAttempts) {
    if (entry.lockedUntil < now && entry.count === 0) loginAttempts.delete(email);
  }
}, 10 * 60 * 1000).unref();

function getMaxAttempts(isAdmin: boolean) { return isAdmin ? ADMIN_MAX_ATTEMPTS : USER_MAX_ATTEMPTS; }
function getLockoutMs(isAdmin: boolean) { return isAdmin ? ADMIN_LOCKOUT_MS : USER_LOCKOUT_MS; }

function checkLoginLockout(email: string, isAdmin = false): { locked: boolean; remainingSec?: number; attemptsRemaining?: number } {
  const entry = loginAttempts.get(email);
  const maxAttempts = getMaxAttempts(isAdmin);
  if (!entry) return { locked: false, attemptsRemaining: maxAttempts };
  if (entry.lockedUntil > Date.now()) return { locked: true, remainingSec: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) { loginAttempts.delete(email); return { locked: false, attemptsRemaining: maxAttempts }; }
  return { locked: false, attemptsRemaining: maxAttempts - entry.count };
}

function recordFailedLogin(email: string, isAdmin = false): { attemptsRemaining: number } {
  const maxAttempts = getMaxAttempts(isAdmin);
  const lockoutMs = getLockoutMs(isAdmin);
  const entry = loginAttempts.get(email) || { count: 0, lockedUntil: 0, isAdmin };
  entry.count += 1; entry.isAdmin = isAdmin;
  if (entry.count >= maxAttempts) { entry.lockedUntil = Date.now() + lockoutMs; entry.count = 0; }
  loginAttempts.set(email, entry);
  const remaining = maxAttempts - entry.count;
  return { attemptsRemaining: remaining > 0 ? remaining : 0 };
}

function clearLoginAttempts(email: string): void { loginAttempts.delete(email); }

export async function loginUser(
  input: LoginInput & { rememberMe?: boolean; expectedRole?: "USER" | "ADMIN"; portal?: "user" | "admin" }
) {
  const email = input.email.toLowerCase().trim();
  const isAdminPortal = input.portal === "admin" || input.expectedRole === "ADMIN";

  const lockout = checkLoginLockout(email, isAdminPortal);
  if (lockout.locked) {
    const err = httpError(429, `Account locked. Try again in ${lockout.remainingSec} seconds.`);
    (err as any).lockedFor = lockout.remainingSec;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const targetRole = input.expectedRole || (input.portal === "admin" ? "ADMIN" : "USER");

  if (!user) {
    const result = recordFailedLogin(email, isAdminPortal);
    const err = httpError(401, targetRole === "ADMIN" ? "Invalid admin credentials." : "Invalid user credentials.");
    (err as any).attemptsRemaining = result.attemptsRemaining;
    throw err;
  }

  if (!user.password) {
    throw httpError(401, "This account was created via GitHub login. Please use GitHub to sign in.");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);
  if (!isPasswordValid) {
    const isAdmin = user.role === "ADMIN" || isAdminPortal;
    const result = recordFailedLogin(email, isAdmin);
    const msg = result.attemptsRemaining > 0
      ? `Invalid credentials. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? "" : "s"} remaining.`
      : isAdmin ? "Account temporarily locked. Try again in 30 minutes." : "Account locked for 3 minutes.";
    const err = httpError(result.attemptsRemaining > 0 ? 401 : 429, msg);
    (err as any).attemptsRemaining = result.attemptsRemaining;
    throw err;
  }

  clearLoginAttempts(email);

  // If logging in via Admin portal with valid credentials, auto-promote user to ADMIN
  if (isAdminPortal && user.role !== "ADMIN") {
    console.log(`[AuthService] Promoting user ${user.email} to ADMIN role upon admin portal login.`);
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
    user.role = "ADMIN";
  }

  // Prevent ADMIN accounts from logging in on standard USER portal (/login)
  if (!isAdminPortal && user.role === "ADMIN") {
    throw httpError(403, "Admin accounts cannot log in here. Please use the Admin Login page.");
  }

  // Auto-revoke stale sessions on login to ensure seamless access
  if (user.activeSessionId) {
    await revokeAllSessions(user.id).catch(() => {});
  }

  // Create new session
  const activeSessionId = randomBytes(24).toString("hex");
  const newToken = signToken(user, input.rememberMe);
  const newRefreshToken = signRefreshToken(user.id);

  await prisma.user.update({ where: { id: user.id }, data: { activeSessionId } });

  const rfTokenHash = hashRefreshToken(newRefreshToken);
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(newToken).digest("hex"),
      refreshTokenHash: rfTokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
      userAgent: input.userAgent || null,
      ipAddress: input.ipAddress || null,
    },
  });

  return { user: publicUser(user), token: newToken, refreshToken: newRefreshToken, sessionId: activeSessionId };
}

export async function refreshToken(token: string) {
  let payload: { userId: string };
  try {
    // Preferred: refresh secret + enforced type claim.
    payload = verifyRefreshToken(token);
  } catch {
    // Backward compatibility: refresh tokens issued before the secret split were
    // signed with the access secret and carried no type claim. Accept those once
    // during the transition; they'll be rotated to the new format below.
    try {
      const legacy = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as { userId?: string };
      if (!legacy.userId) throw new Error("no userId");
      payload = { userId: legacy.userId };
    } catch {
      throw httpError(401, "Invalid or expired refresh token");
    }
  }

  const tokenHash = hashRefreshToken(token);
  const session = await prisma.session.findFirst({ where: { refreshTokenHash: tokenHash } });

  if (!session) {
    console.error(`[SECURITY] Refresh token theft detected for userId=${payload.userId}. Revoking all sessions.`);
    await revokeAllSessions(payload.userId);
    throw httpError(401, "Security alert: refresh token reuse detected. All sessions revoked.");
  }
  if (session.revokedAt) throw httpError(401, "Session has been revoked. Please log in again.");
  if (session.expiresAt < new Date()) throw httpError(401, "Session expired. Please log in again.");

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw httpError(404, "User not found");

  const newAccessToken = signToken(user, false);
  const newRefreshToken = signRefreshToken(user.id);
  const newRfHash = hashRefreshToken(newRefreshToken);

  await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: newRfHash, lastActiveAt: new Date() } });

  return { token: newAccessToken, refreshToken: newRefreshToken };
}

export async function activateNewSession(userId: string): Promise<string> {
  const sessionId = randomBytes(24).toString("hex");
  await prisma.user.update({ where: { id: userId }, data: { activeSessionId: sessionId } });
  return sessionId;
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

export async function rateLimitAuthRequest(_ip: string) {
  // Rate limiting disabled per user request
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
  // Cryptographically secure 6-digit OTP (Math.random is predictable)
  return String(randomInt(100000, 1000000));
}

export async function requestPasswordReset(email: string): Promise<{ devOtp?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    // Do not reveal whether an account exists
    return {};
  }

  // Bound memory: drop expired/consumed entries before appending
  const now = new Date();
  for (let i = memoryPasswordResetTokens.length - 1; i >= 0; i--) {
    if (memoryPasswordResetTokens[i].expiresAt <= now || memoryPasswordResetTokens[i].used) {
      memoryPasswordResetTokens.splice(i, 1);
    }
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
  // local development only, and log it in production for operators (their only
  // delivery channel until SMTP is integrated).
  if (env.nodeEnv === "development") {
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

export function getGitHubRedirectUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.github.clientId,
    redirect_uri: env.github.callbackUrl,
    scope: "read:user user:email",
    state,
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

/**
 * Establish a fresh single-session for an OAuth login: rotate the user's
 * activeSessionId, persist a hashed Session row for auditability, and return
 * the session id so the callback can hand it to the frontend. Without this,
 * OAuth users receive a token but no X-Session-Id and are rejected by the
 * requireAuth single-session check on their first protected request.
 */
async function establishOAuthSession(
  userId: string,
  token: string,
  refreshToken: string,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {},
): Promise<string> {
  const activeSessionId = randomBytes(24).toString("hex");
  await prisma.user.update({ where: { id: userId }, data: { activeSessionId } });
  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
    },
  });
  return activeSessionId;
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


  }

  const token = signToken(user, rememberMe);
  const refreshToken = signRefreshToken(user.id);
  const sessionId = await establishOAuthSession(user.id, token, refreshToken);

  return {
    user: publicUser(user),
    token,
    refreshToken,
    sessionId,
  };
}

// ─────────────────────────────────────────────
// Google OAuth Service
// ─────────────────────────────────────────────

export type GoogleUser = {
  id: string;
  name: string;
  given_name?: string;
  family_name?: string;
  email: string;
  picture?: string;
};

export function getGoogleRedirectUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: env.google.callbackUrl,
    response_type: "code",
    scope: "openid profile email",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleUser> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: env.google.callbackUrl,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!tokenData.access_token) {
    throw httpError(401, "Google OAuth failed: " + (tokenData.error_description || tokenData.error || "No access token"));
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const gUser = (await userRes.json()) as any;
  if (!gUser.email) {
    throw httpError(400, "Google account has no email address.");
  }

  return {
    id: gUser.sub,
    name: gUser.name || `${gUser.given_name || ""} ${gUser.family_name || ""}`.trim() || gUser.email.split("@")[0],
    given_name: gUser.given_name,
    family_name: gUser.family_name,
    email: gUser.email,
    picture: gUser.picture,
  };
}

export async function handleGoogleUser(gUser: GoogleUser, rememberMe?: boolean) {
  const googleId = gUser.id;
  const email = gUser.email.toLowerCase();

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId,
        avatarUrl: user.avatarUrl || gUser.picture,
        name: user.name || gUser.name,
      } as any,
    });
  } else {
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: gUser.name,
          firstName: gUser.given_name,
          lastName: gUser.family_name,
          email,
          googleId,
          avatarUrl: gUser.picture,
          role: "USER",
          plan: "free",
          subscriptionStatus: "free",
        } as any,
      });
      await tx.profile.create({
        data: {
          userId: newUser.id,
        },
      });
      return newUser;
    });
  }

  const token = signToken(user, rememberMe);
  const refreshToken = signRefreshToken(user.id);
  const sessionId = await establishOAuthSession(user.id, token, refreshToken);

  return {
    user: publicUser(user),
    token,
    refreshToken,
    sessionId,
  };
}


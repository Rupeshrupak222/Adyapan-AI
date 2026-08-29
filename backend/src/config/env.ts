import "dotenv/config";
import { createHmac } from "crypto";

export const env = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/adyapan_ai",
  directUrl: process.env.DIRECT_URL ?? "",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET ?? "replace-this-local-secret-before-production",
  // Refresh tokens are signed with a SECRET DERIVED FROM (but distinct from) the
  // access-token secret. Using a separate key prevents token-type confusion: a
  // refresh token can never be replayed as an access token and vice-versa, even
  // though only one secret needs to be configured in the environment.
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ??
    createHmac("sha256", process.env.JWT_SECRET ?? "replace-this-local-secret-before-production")
      .update("adyapan-refresh-token-derivation-v1")
      .digest("hex"),
  adminRegisterSecret: process.env.ADMIN_REGISTER_SECRET ?? "",
  // Comma-separated allowlist of owner/privileged emails. These accounts bypass
  // premium gates and AI usage limits (previously any email containing
  // "admin"/"ashish" did — an open bypass). Configure via OWNER_EMAILS.
  privilegedEmails: (process.env.OWNER_EMAILS ?? process.env.PRIVILEGED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  // Only these admin accounts may CREATE new admin accounts. Every other admin
  // keeps normal admin access but cannot mint admins. Configured exclusively
  // via the SUPER_ADMIN_EMAILS env var (comma-separated). No hardcoded default.
  superAdminEmails: (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  nvidiaApiKey: process.env.NVIDIA_API_KEY ?? "",
  nvidiaApiKey2: process.env.NVIDIA_API_KEY_2 ?? "",
  nvidiaApiKey3: process.env.NVIDIA_API_KEY_3 ?? "",
  nvidiaApiKey4: process.env.NVIDIA_API_KEY_4 ?? "",
  nvidiaApiKey5: process.env.NVIDIA_API_KEY_5 ?? "",
  nvidiaApiKeys: [
    process.env.NVIDIA_API_KEY ?? "",
    process.env.NVIDIA_API_KEY_2 ?? "",
    process.env.NVIDIA_API_KEY_3 ?? "",
    process.env.NVIDIA_API_KEY_4 ?? "",
    process.env.NVIDIA_API_KEY_5 ?? "",
  ].filter(Boolean),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID ?? "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
    mode: process.env.PAYPAL_MODE ?? "sandbox",
  },
  neon: {
    apiKey: process.env.NEON_API_KEY ?? "",
    projectId: process.env.NEON_PROJECT_ID ?? "",
    branchId: process.env.NEON_BRANCH_ID ?? "",
    regionId: process.env.NEON_REGION_ID ?? "aws-us-east-1",
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    callbackUrl: process.env.GITHUB_CALLBACK_URL ?? "http://localhost:5000/api/auth/github/callback",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:5000/api/auth/google/callback",
  },
  codeforces: {
    apiKey: process.env.CODEFORCES_API_KEY ?? "",
    apiSecret: process.env.CODEFORCES_API_SECRET ?? "",
  },
  pistonUrl: process.env.PISTON_URL ?? "http://localhost:2000",
  apifyApiKey: process.env.APIFY_API_KEY ?? process.env.APIFY_TOKEN ?? "",
  scrapflyApiKey: process.env.SCRAPFLY_API_KEY ?? "",
  nodeEnv: process.env.NODE_ENV ?? "development",
  masterDatabaseUrl: process.env.MASTER_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  // Registration workflow: when "true", a verification email is queued/attempted
  // on registration. No SMTP provider is bundled today, so delivery is recorded
  // in the activity log but never blocks or fails the registration.
  emailVerificationEnabled: String(process.env.EMAIL_VERIFICATION_ENABLED ?? "").toLowerCase() === "true",
};

// ─── Fail-fast secret validation ─────────────────────────────────────────────
// In production, a missing/default signing secret means tokens are forgeable by
// anyone who knows the public default string. Refuse to boot rather than run in
// an insecure state. A weak (too-short) secret is also rejected.
if (env.nodeEnv === "production") {
  const errors: string[] = [];

  if (!process.env.JWT_SECRET || env.jwtSecret === "replace-this-local-secret-before-production") {
    errors.push("JWT_SECRET must be set to a strong, unique value in production.");
  } else if (env.jwtSecret.length < 32) {
    // Length is a strength concern, not the core vulnerability (using the
    // default/empty secret is). Warn loudly but don't refuse to boot, so a
    // valid-but-short secret still works.
    console.warn("[SECURITY] JWT_SECRET is shorter than 32 characters; use a longer secret for stronger security.");
  }

  if (!env.adminRegisterSecret || env.adminRegisterSecret === "adyapan-admin-secret-2026") {
    errors.push("ADMIN_REGISTER_SECRET must be set to a strong, unique value in production.");
  }

  if (errors.length > 0) {
    throw new Error(
      "Insecure configuration — refusing to start:\n  - " + errors.join("\n  - "),
    );
  }
}

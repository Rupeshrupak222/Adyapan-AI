import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/adyapan_ai",
  directUrl: process.env.DIRECT_URL ?? "",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET ?? "replace-this-local-secret-before-production",
  adminRegisterSecret: process.env.ADMIN_REGISTER_SECRET ?? "adyapan-admin-secret-2026",
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
  codeforces: {
    apiKey: process.env.CODEFORCES_API_KEY ?? "",
    apiSecret: process.env.CODEFORCES_API_SECRET ?? "",
  },
  pistonUrl: process.env.PISTON_URL ?? "http://localhost:2000",
  adzuna: {
    appId: process.env.ADZUNA_APP_ID ?? "",
    appKey: process.env.ADZUNA_APP_KEY ?? "",
  },
  apifyApiKey: process.env.APIFY_API_KEY ?? process.env.APIFY_TOKEN ?? "",
  nodeEnv: process.env.NODE_ENV ?? "development",
  masterDatabaseUrl: process.env.MASTER_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
};

if (env.nodeEnv === "production" && env.jwtSecret === "replace-this-local-secret-before-production") {
  throw new Error("JWT_SECRET must be set in production");
}

if (env.nodeEnv === "production" && !env.adminRegisterSecret) {
  throw new Error("ADMIN_REGISTER_SECRET must be set in production");
}

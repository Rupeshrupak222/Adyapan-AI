import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

console.log("🔍 Checking Environment Variables for Production Deployment\n");

interface EnvCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  category: string;
  isValid: boolean;
  issue?: string;
}

const checks: EnvCheck[] = [
  // SMTP Configuration
  {
    name: "SMTP_HOST",
    value: process.env.SMTP_HOST,
    required: true,
    category: "Email",
    isValid: Boolean(process.env.SMTP_HOST),
  },
  {
    name: "SMTP_PORT",
    value: process.env.SMTP_PORT,
    required: true,
    category: "Email",
    isValid: Boolean(process.env.SMTP_PORT),
  },
  {
    name: "SMTP_USER",
    value: process.env.SMTP_USER,
    required: true,
    category: "Email",
    isValid: Boolean(process.env.SMTP_USER),
  },
  {
    name: "SMTP_PASS",
    value: process.env.SMTP_PASS ? "***" + process.env.SMTP_PASS.slice(-4) : undefined,
    required: true,
    category: "Email",
    isValid: Boolean(
      process.env.SMTP_PASS && 
      process.env.SMTP_PASS !== "your_gmail_app_password_here"
    ),
    issue: process.env.SMTP_PASS === "your_gmail_app_password_here" 
      ? "Using placeholder value" 
      : !process.env.SMTP_PASS 
      ? "Not set" 
      : undefined,
  },
  {
    name: "ADMIN_EMAIL",
    value: process.env.ADMIN_EMAIL,
    required: true,
    category: "Email",
    isValid: Boolean(process.env.ADMIN_EMAIL),
  },

  // Database
  {
    name: "DATABASE_URL",
    value: process.env.DATABASE_URL ? "***" : undefined,
    required: true,
    category: "Database",
    isValid: Boolean(process.env.DATABASE_URL),
  },

  // JWT
  {
    name: "JWT_SECRET",
    value: process.env.JWT_SECRET ? "***" : undefined,
    required: true,
    category: "Auth",
    isValid: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32),
    issue: process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32 
      ? "JWT_SECRET should be at least 32 characters" 
      : undefined,
  },

  // Application
  {
    name: "FRONTEND_URL",
    value: process.env.FRONTEND_URL,
    required: true,
    category: "App",
    isValid: Boolean(process.env.FRONTEND_URL),
  },
  {
    name: "NODE_ENV",
    value: process.env.NODE_ENV,
    required: false,
    category: "App",
    isValid: true,
  },
  {
    name: "PORT",
    value: process.env.PORT,
    required: false,
    category: "App",
    isValid: true,
  },

  // OAuth
  {
    name: "GOOGLE_CLIENT_ID",
    value: process.env.GOOGLE_CLIENT_ID ? "***" : undefined,
    required: false,
    category: "OAuth",
    isValid: Boolean(process.env.GOOGLE_CLIENT_ID),
  },
  {
    name: "GITHUB_CLIENT_ID",
    value: process.env.GITHUB_CLIENT_ID ? "***" : undefined,
    required: false,
    category: "OAuth",
    isValid: Boolean(process.env.GITHUB_CLIENT_ID),
  },

  // AI Services
  {
    name: "GROQ_API_KEY",
    value: process.env.GROQ_API_KEY ? "***" : undefined,
    required: false,
    category: "AI",
    isValid: Boolean(process.env.GROQ_API_KEY),
  },
  {
    name: "GEMINI_API_KEY",
    value: process.env.GEMINI_API_KEY ? "***" : undefined,
    required: false,
    category: "AI",
    isValid: Boolean(process.env.GEMINI_API_KEY),
  },
];

// Group by category
const categories = [...new Set(checks.map(c => c.category))];
let hasErrors = false;

categories.forEach(category => {
  console.log(`\n📦 ${category} Configuration:`);
  console.log("─".repeat(60));
  
  const categoryChecks = checks.filter(c => c.category === category);
  
  categoryChecks.forEach(check => {
    const status = check.isValid ? "✅" : (check.required ? "❌" : "⚠️ ");
    const requiredLabel = check.required ? "(Required)" : "(Optional)";
    
    console.log(`${status} ${check.name.padEnd(25)} ${requiredLabel.padEnd(12)} ${check.value || "NOT SET"}`);
    
    if (check.issue) {
      console.log(`   └─ Issue: ${check.issue}`);
    }
    
    if (!check.isValid && check.required) {
      hasErrors = true;
    }
  });
});

// Summary
console.log("\n" + "═".repeat(60));
console.log("📊 Summary");
console.log("═".repeat(60));

const totalChecks = checks.filter(c => c.required).length;
const passedChecks = checks.filter(c => c.required && c.isValid).length;

console.log(`✓ Passed: ${passedChecks}/${totalChecks} required checks`);

if (hasErrors) {
  console.log("\n❌ Configuration Errors Found!");
  console.log("\n⚠️  Action Required:");
  console.log("   1. Set missing environment variables in your deployment platform");
  console.log("   2. For Vercel: Go to Project Settings → Environment Variables");
  console.log("   3. Add all required variables with their production values");
  console.log("   4. Redeploy the application\n");
  
  console.log("📝 SMTP Setup Guide:");
  console.log("   1. Create Gmail App Password: https://myaccount.google.com/apppasswords");
  console.log("   2. Set these in Vercel:");
  console.log("      - SMTP_HOST=smtp.gmail.com");
  console.log("      - SMTP_PORT=465");
  console.log("      - SMTP_USER=your-email@gmail.com");
  console.log("      - SMTP_PASS=your-16-char-app-password");
  console.log("      - ADMIN_EMAIL=your-email@gmail.com\n");
  
  process.exit(1);
} else {
  console.log("\n✅ All required environment variables are configured!");
  console.log("🚀 Ready for deployment\n");
  process.exit(0);
}

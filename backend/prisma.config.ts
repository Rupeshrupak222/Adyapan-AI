import "dotenv/config";
import { defineConfig } from "prisma/config";

const SUPABASE_DB_URL = "postgresql://postgres.pyxhmsvmjzlvibhhjygd:wwAfpRjEfPfUkuvS@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const SUPABASE_DIRECT_URL = "postgresql://postgres.pyxhmsvmjzlvibhhjygd:wwAfpRjEfPfUkuvS@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? SUPABASE_DB_URL,
    directUrl: process.env["DIRECT_URL"] ?? SUPABASE_DIRECT_URL,
  },
});

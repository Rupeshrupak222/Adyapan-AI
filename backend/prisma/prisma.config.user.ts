import "dotenv/config";
import { defineConfig } from "prisma/config";

const SUPABASE_DB_URL = "postgresql://postgres.pyxhmsvmjzlvibhhjygd:wwAfpRjEfPfUkuvS@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

export default defineConfig({
  schema: "schema.user.prisma",
  datasource: {
    url: process.env["USER_DATABASE_URL"] ?? process.env["DATABASE_URL"] ?? SUPABASE_DB_URL,
  },
});

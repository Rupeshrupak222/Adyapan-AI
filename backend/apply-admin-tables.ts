import { readFileSync } from "fs";
import { prisma } from "./src/config/prisma";

async function main() {
  const raw = readFileSync("admin-tables.sql", "utf-8");
  const statements = raw
    .split(/;\s*\r?\n/)
    .map((s) =>
      s
        .split(/\r?\n/)
        .filter((l) => !l.trim().startsWith("--") && l.trim() !== "")
        .join("\n")
        .trim()
    )
    .filter(Boolean);

  console.log("Statements to execute:", statements.length);

  const ok: string[] = [];
  const failed: string[] = [];
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      const m = stmt.match(/CREATE TABLE "?(\w+)"?/i) || stmt.match(/CREATE (?:UNIQUE )?INDEX "?(\w+)"?/i) || stmt.match(/ALTER TABLE "?(\w+)"?/i);
      ok.push(m ? m[1] : stmt.slice(0, 60));
    } catch (e: any) {
      failed.push(`${stmt.slice(0, 80)} :: ${e.message}`);
    }
  }
  console.log("OK:", ok.length);
  ok.forEach((s) => console.log("  +", s));
  console.log("FAILED:", failed.length);
  failed.forEach((s) => console.log("  !", s));
}

main().catch((e) => { console.error("SCRIPT ERROR:", e); process.exit(1); });

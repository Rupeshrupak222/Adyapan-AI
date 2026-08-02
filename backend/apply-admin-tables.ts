import { readFileSync } from "fs";
import { prisma } from "./src/config/prisma";

function makeIdempotent(stmt: string): string {
  const singleLine = stmt.replace(/\s+/g, " ").trim();

  if (/^CREATE TABLE\b/i.test(singleLine)) {
    return singleLine.replace(/^CREATE TABLE\b/i, "CREATE TABLE IF NOT EXISTS");
  }

  if (/^CREATE UNIQUE INDEX\b/i.test(singleLine)) {
    return singleLine.replace(/^CREATE UNIQUE INDEX\b/i, "CREATE UNIQUE INDEX IF NOT EXISTS");
  }

  if (/^CREATE INDEX\b/i.test(singleLine)) {
    return singleLine.replace(/^CREATE INDEX\b/i, "CREATE INDEX IF NOT EXISTS");
  }

  const alterMatch = singleLine.match(/^ALTER TABLE "?(\w+)"? ADD CONSTRAINT "?(\w+)"?(.*)$/i);
  if (alterMatch) {
    const [, table, constraint, rest] = alterMatch;
    return `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraint}') THEN ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}"${rest}; END IF; END $$;`;
  }

  return stmt;
}

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
    .filter(Boolean)
    .map(makeIdempotent);

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

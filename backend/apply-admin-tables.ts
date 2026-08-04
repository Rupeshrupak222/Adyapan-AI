import { readFileSync } from "fs";
import { prisma } from "./src/config/prisma";

function makeIdempotent(stmt: string): string {
  const singleLine = stmt.replace(/\s+/g, " ").trim();

  // Pass through dollar-quoted DO blocks unchanged (already safe)
  if (/^DO\s*\$\$/i.test(singleLine)) {
    return stmt.trim();
  }

  if (/^CREATE TABLE IF NOT EXISTS\b/i.test(singleLine)) {
    return singleLine;
  }

  if (/^CREATE TABLE\b/i.test(singleLine)) {
    return singleLine.replace(/^CREATE TABLE\b/i, "CREATE TABLE IF NOT EXISTS");
  }

  if (/^CREATE UNIQUE INDEX IF NOT EXISTS\b/i.test(singleLine)) {
    return singleLine;
  }

  if (/^CREATE UNIQUE INDEX\b/i.test(singleLine)) {
    return singleLine.replace(/^CREATE UNIQUE INDEX\b/i, "CREATE UNIQUE INDEX IF NOT EXISTS");
  }

  if (/^CREATE INDEX IF NOT EXISTS\b/i.test(singleLine)) {
    return singleLine;
  }

  if (/^CREATE INDEX\b/i.test(singleLine)) {
    return singleLine.replace(/^CREATE INDEX\b/i, "CREATE INDEX IF NOT EXISTS");
  }

  // ALTER TABLE ... ADD CONSTRAINT -> plain single statement (extended query
  // protocol rejects DO blocks); idempotency handled in main() by treating
  // "already exists" as success
  const alterConstraintMatch = singleLine.match(/^ALTER TABLE "?(\w+)"? ADD CONSTRAINT "?(\w+)"?(.*)$/i);
  if (alterConstraintMatch) {
    const [, table, constraint, rest] = alterConstraintMatch;
    return `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}"${rest.replace(/;\s*$/, "")}`;
  }

  // ALTER TABLE ... ADD COLUMN -> use IF NOT EXISTS (PostgreSQL 9.6+)
  if (/^ALTER TABLE .+ ADD COLUMN IF NOT EXISTS\b/i.test(singleLine)) {
    return singleLine;
  }

  if (/^ALTER TABLE .+ ADD COLUMN\b/i.test(singleLine)) {
    return singleLine.replace(/^(ALTER TABLE .+ ADD COLUMN)\b/i, "$1 IF NOT EXISTS");
  }

  return singleLine;
}

/**
 * Parse SQL file into individual statements, correctly handling:
 * - Dollar-quoted blocks (DO $$ ... $$)
 * - Regular semicolon-terminated statements
 * - Comments
 */
function parseStatements(sql: string): string[] {
  const results: string[] = [];
  let current = "";
  let inDollarQuote = false;
  const lines = sql.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comment-only lines when NOT inside a dollar-quote block
    if (!inDollarQuote && trimmed.startsWith("--")) {
      continue;
    }

    if (!inDollarQuote) {
      // Check if this line contains $$ (entering a dollar-quote block)
      if (/\$\$/.test(line)) {
        const matches = (line.match(/\$\$/g) || []).length;
        if (matches % 2 !== 0) {
          // Odd number means we're entering a dollar-quote
          inDollarQuote = true;
          current += line + "\n";
          continue;
        }
      }
      // Regular line
      current += line + "\n";
      if (trimmed.endsWith(";")) {
        const stmt = current
          .split("\n")
          .filter((l) => !l.trim().startsWith("--") && l.trim() !== "")
          .join("\n")
          .trim();
        if (stmt) results.push(stmt);
        current = "";
      }
    } else {
      current += line + "\n";
      // Check if this line closes the dollar-quote
      if (/\$\$/.test(trimmed)) {
        const count = (line.match(/\$\$/g) || []).length;
        if (count % 2 !== 0) {
          // Odd number means we're closing the dollar-quote
          inDollarQuote = false;
          const stmt = current.trim().replace(/;$/, "");
          if (stmt) results.push(stmt);
          current = "";
        }
      }
    }
  }

  // Flush any remaining content
  if (current.trim()) {
    const stmt = current
      .split("\n")
      .filter((l) => !l.trim().startsWith("--") && l.trim() !== "")
      .join("\n")
      .trim();
    if (stmt) results.push(stmt);
  }

  return results.filter(Boolean);
}

async function main() {
  const raw = readFileSync("admin-tables.sql", "utf-8") + "\n" + readFileSync("usage-tables.sql", "utf-8");
  const statements = parseStatements(raw).map(makeIdempotent);

  console.log("Statements to execute:", statements.length);

  const ok: string[] = [];
  const failed: string[] = [];
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      const m =
        stmt.match(/CREATE TABLE\s+"?(\w+)"?/i) ||
        stmt.match(/CREATE (?:UNIQUE )?INDEX\s+"?(\w+)"?/i) ||
        stmt.match(/ALTER TABLE\s+"?(\w+)"?/i) ||
        stmt.match(/DO\s*\$\$/i);
      ok.push(m ? (m[1] || "DO block") : stmt.slice(0, 60));
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (/already exists/i.test(msg)) {
        ok.push(`${stmt.slice(0, 60)} (already exists)`);
      } else {
        failed.push(`${stmt.slice(0, 80)} :: ${msg}`);
      }
    }
  }
  console.log("OK:", ok.length);
  ok.forEach((s) => console.log("  +", s));
  console.log("FAILED:", failed.length);
  failed.forEach((s) => console.log("  !", s));
}

main().catch((e) => { console.error("SCRIPT ERROR:", e); process.exit(1); });

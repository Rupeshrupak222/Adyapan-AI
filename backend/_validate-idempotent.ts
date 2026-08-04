import { readFileSync } from "fs";
import { makeIdempotent, parseStatements } from "./apply-admin-tables";

const raw = readFileSync("admin-tables.sql", "utf-8") + "\n" + readFileSync("usage-tables.sql", "utf-8");
const statements = parseStatements(raw).map(makeIdempotent);

console.log("total:", statements.length);

const doBlocks = statements.filter((s) => /DO\s*\$\$/i.test(s));
console.log("DO-block statements:", doBlocks.length);

const doubled = statements.filter((s) => /IF NOT EXISTS IF NOT EXISTS/i.test(s));
console.log("doubled IF NOT EXISTS:", doubled.length);

const trailing = statements.filter((s) => /;\s*$/.test(s));
console.log("trailing-semicolon statements:", trailing.length);

const constraints = statements.filter((s) => /ADD CONSTRAINT/i.test(s));
console.log("constraint statements:", constraints.length);
constraints.forEach((c) => console.log("  -", c.slice(0, 110)));

process.exit(0);

/**
 * One-off backfill: normalise salary units on discovery_jobs rows ingested
 * before parseSalary() learned the unit suffixes.
 *
 * Two sources stored the printed figure instead of an absolute annual amount:
 *   - naukri quotes    "₹10-14 Lacs" -> the scraper stored 10 / 14   (rupees, x100000)
 *   - wellfound quotes "$130K - $175K" -> the scraper stored 130 / 175 (USD thousands)
 *
 * Wellfound pays in USD, but every other board here pays in rupees and the CTC
 * filter presets are rupees ("3-6 LPA" = 300000..600000). Storing raw USD would
 * put a ~1.1 crore job in the "0-3 LPA" band, so wellfound rows are converted to
 * the rupee equivalent. Rate is fixed below — edit it before applying.
 *
 * Never deletes anything. Prints a plan by default; writes only with --apply.
 *
 *   node scripts/backfill-job-salary-units.js            # dry run (safe)
 *   node scripts/backfill-job-salary-units.js --apply    # perform the update
 */
require("dotenv").config();
const { Client } = require("pg");

// shortcut: fixed conversion rate, update when accuracy matters
const USD_TO_INR = 85;

const notBothNull = `(salary_min IS NOT NULL OR salary_max IS NOT NULL)`;
// max < min means the source text could not be parsed (e.g. "600 - 1"); left alone.
const saneRange = `(salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max)`;

const RULES = [
  {
    name: `wellfound: USD figures -> absolute INR (x${USD_TO_INR})`,
    select: `SELECT id, company, salary_min, salary_max FROM discovery_jobs
              WHERE source = 'wellfound' AND ${notBothNull} AND ${saneRange}
              ORDER BY salary_min ASC`,
    // The actor reports USD; "130" means $130K, but one row already holds an
    // absolute amount (92,820), so the scale is decided per row, not per column.
    convert: ({ salary_min: lo, salary_max: hi }) => {
      const inThousands = (lo !== null && lo < 1000) || (hi !== null && hi < 1000);
      const toInr = (v) => (v === null ? null : Math.round((inThousands ? v * 1000 : v) * USD_TO_INR));
      return { min: toInr(lo), max: toInr(hi) };
    },
  },
  {
    name: "naukri: Lacs figures -> absolute rupees (x100000)",
    select: `SELECT id, company, salary_min, salary_max FROM discovery_jobs
              WHERE source = 'naukri' AND ${notBothNull} AND ${saneRange}
              ORDER BY salary_min ASC`,
    convert: ({ salary_min: lo, salary_max: hi }) => ({
      min: lo === null ? null : lo * 100000,
      max: hi === null ? null : hi * 100000,
    }),
  },
];

// Deliberately untouched, reported so a human can decide: other boards print a
// bare rupee amount (₹60,000 could be a monthly stipend or an annual figure).
const UNTOUCHED_SQL = `SELECT company, source, salary_min, salary_max FROM discovery_jobs
  WHERE source NOT IN ('wellfound', 'naukri') AND ${notBothNull}
    AND ((salary_min IS NOT NULL AND salary_min < 100000) OR (salary_max IS NOT NULL AND salary_max < 100000))
  ORDER BY coalesce(salary_min, 0) ASC`;
const JUNK_SQL = `SELECT company, source, salary_min, salary_max FROM discovery_jobs
  WHERE ${notBothNull} AND salary_min IS NOT NULL AND salary_max IS NOT NULL AND salary_min > salary_max`;
const FOREIGN_SQL = `SELECT company, source, salary_currency, salary_min, salary_max FROM discovery_jobs
  WHERE salary_currency <> 'INR' AND ${notBothNull}`;

const show = (v) => (v === null ? "null" : String(v));

(async () => {
  const apply = process.argv.includes("--apply");
  const unknown = process.argv.slice(2).filter((a) => a !== "--apply");
  if (unknown.length) {
    console.error(`Unknown argument(s): ${unknown.join(", ")}. Use --apply to write.`);
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  console.log(`Target database host: ${(connectionString.match(/@([^/:]+)/) || [])[1] || "unknown"}`);
  console.log(apply ? "Mode: APPLY (will write)" : "Mode: DRY RUN (no writes)");

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false }, statementTimeout: 60000 });
  await client.connect();

  try {
    const plan = [];
    for (const rule of RULES) {
      const { rows } = await client.query(rule.select);
      const changes = rows.map((r) => ({ id: r.id, company: r.company, before: r, after: rule.convert(r) }));
      plan.push({ rule, changes });

      console.log(`\n[${rule.name}]  ${changes.length} row(s)`);
      for (const c of changes.slice(0, 10)) {
        console.log(`  ${String(c.company).padEnd(32)} ${show(c.before.salary_min)}-${show(c.before.salary_max)}  ->  ${show(c.after.min)}-${show(c.after.max)}`);
      }
      if (changes.length > 10) console.log(`  ... and ${changes.length - 10} more`);
    }

    for (const [label, sql] of [
      ["bare rupee amount, no stated period", UNTOUCHED_SQL],
      ["max < min (unparseable, fix by hand)", JUNK_SQL],
      ["non-INR currency (displayed with its own symbol, filtered as rupees)", FOREIGN_SQL],
    ]) {
      const { rows } = await client.query(sql);
      console.log(`\n[not touched: ${label}] ${rows.length} row(s)`);
      for (const r of rows.slice(0, 5)) console.log(`  ${r.source}: ${r.company} ${r.salary_currency || ""} ${show(r.salary_min)}-${show(r.salary_max)}`);
      if (rows.length > 5) console.log(`  ... and ${rows.length - 5} more`);
    }

    const total = plan.reduce((n, p) => n + p.changes.length, 0);
    if (!apply) {
      console.log(`\nDry run: ${total} row(s) would be updated. Re-run with --apply to write.`);
      return;
    }

    for (const { rule, changes } of plan) {
      if (!changes.length) continue;
      // Values are computed once, above, so what was printed is exactly what is written.
      await client.query("BEGIN");
      await client.query(
        `UPDATE discovery_jobs AS d SET salary_min = v.min, salary_max = v.max
           FROM unnest($1::text[], $2::int[], $3::int[]) AS v(id, min, max)
          WHERE d.id::text = v.id`,
        [changes.map((c) => c.id), changes.map((c) => c.after.min), changes.map((c) => c.after.max)],
      );
      await client.query("COMMIT");
      console.log(`[${rule.name}] updated ${changes.length} row(s)`);
    }

    // Self-check: every planned row must now read back exactly as planned.
    const ids = plan.flatMap((p) => p.changes.map((c) => c.id));
    const expected = new Map(plan.flatMap((p) => p.changes.map((c) => [c.id, c.after])));
    const { rows } = await client.query(
      `SELECT id, company, salary_min, salary_max FROM discovery_jobs WHERE id::text = ANY($1::text[])`,
      [ids],
    );
    const wrong = rows.filter((r) => r.salary_min !== expected.get(r.id).min || r.salary_max !== expected.get(r.id).max);
    for (const r of wrong) console.log(`  MISMATCH ${r.company}: ${show(r.salary_min)}-${show(r.salary_max)} (expected ${show(expected.get(r.id).min)}-${show(expected.get(r.id).max)})`);
    console.log(wrong.length === 0 ? `\nOK: ${rows.length} row(s) normalised and verified.` : `\nFAIL: ${wrong.length} row(s) did not match the plan.`);
    process.exitCode = wrong.length === 0 ? 0 : 1;
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});

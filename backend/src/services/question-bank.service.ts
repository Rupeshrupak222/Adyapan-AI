import { masterPrisma } from "../utils/prisma";
import {
  DEFAULT_RECENT_TEXT_CAP,
  SIMILARITY_THRESHOLD,
  conceptSignature,
  dedupInfoFromQuestion,
  dedupeQuestionsWithReasons,
  fingerprint,
  jaccard,
  stripBracketedPrefix,
  templateFingerprint,
  tokenize,
  type DedupeOptions,
  type SeenRegistry,
} from "../lib/questions/question-fingerprint";

export const SOURCE_MCQ = "mcq";
export const SOURCE_APTITUDE = "aptitude";

/**
 * Maximum number of concept summaries injected into an LLM prompt. Beyond this
 * the prompt stops helping (the model cannot reliably avoid hundreds of
 * items) and we fall back to post-hoc rejection, which is authoritative anyway.
 */
const MAX_PROMPT_CONCEPTS = 60;

function resolveDb(db?: any) {
  return db || masterPrisma;
}

/**
 * Thrown when a topic/target genuinely has no unused concepts left. Callers must
 * let this propagate rather than substituting filler questions — that is the
 * whole point of the strict uniqueness rule.
 *
 * Carries a 409 so the admin panel receives an actionable report instead of a
 * generic 500.
 */
export class QuestionPoolExhaustedError extends Error {
  readonly status = 409;
  readonly statusCode = 409;
  readonly scope: string;
  readonly requested: number;
  readonly uniqueAvailable: number;
  readonly exhaustedConcepts: string[];
  readonly details: Record<string, unknown>;

  constructor(
    scope: string,
    requested: number,
    uniqueAvailable: number,
    exhaustedConcepts: string[] = []
  ) {
    super(
      `Question pool exhausted for "${scope}": requested ${requested}, ` +
        `only ${uniqueAvailable} unused unique concept(s) remain. ` +
        `No duplicates were written. Add more source content for this scope.`
    );
    this.name = "QuestionPoolExhaustedError";
    this.scope = scope;
    this.requested = requested;
    this.uniqueAvailable = uniqueAvailable;
    this.exhaustedConcepts = exhaustedConcepts;
    this.details = {
      reason: "question_pool_exhausted",
      scope,
      requested,
      uniqueAvailable,
      exhaustedConcepts,
    };
  }
}

export interface QuestionBankScope {
  /** Omit for a genuinely global load (no source/topic/company filtering). */
  source?: string;
  topic?: string;
  company?: string;
  category?: string;
  /**
   * When false, raw texts are not loaded for Jaccard similarity checks. Set
   * false for large scopes where the fingerprint/template sets are sufficient
   * and the text list would be costly.
   */
  includeTexts?: boolean;
}

export interface BankSnapshot extends SeenRegistry {
  /** Truncated concept summaries suitable for injecting into a prompt. */
  promptConcepts: string[];
  totalEntries: number;
  /** Set when the concept list was truncated for the prompt. */
  conceptsTruncated: boolean;
}

function emptySnapshot(): BankSnapshot {
  return {
    fingerprints: new Set(),
    templates: new Set(),
    conceptSignatures: new Set(),
    recentTexts: [],
    promptConcepts: [],
    totalEntries: 0,
    conceptsTruncated: false,
  };
}

/**
 * Load every concept that already exists in the bank. Unlike the old
 * in-memory registry this is not capped at 300 texts, so similarity is judged
 * against the whole database.
 */
export async function loadBank(db?: any, scope: QuestionBankScope = {}): Promise<BankSnapshot> {
  const client = resolveDb(db);
  const snap = emptySnapshot();

  const where: any = {};
  if (scope.source) where.source = scope.source;
  if (scope.topic) where.topic = scope.topic;
  if (scope.company) where.company = scope.company;
  if (scope.category) where.category = scope.category;

  const select = {
    fingerprint: true,
    templateFingerprint: true,
    conceptSignature: true,
    questionText: true,
  };

  let rows: any[] = [];
  try {
    rows = await client.questionBankEntry.findMany({ where, select });
  } catch (err) {
    console.warn(
      "[QuestionBank] loadBank failed (has the migration been applied?):",
      (err as Error)?.message || err
    );
    return snap;
  }

  const includeTexts = scope.includeTexts !== false;
  const summaries: string[] = [];

  for (const r of rows) {
    if (r.fingerprint) snap.fingerprints.add(r.fingerprint);
    if (r.templateFingerprint) snap.templates.add(r.templateFingerprint);
    if (r.conceptSignature) snap.conceptSignatures.add(r.conceptSignature);
    if (includeTexts && r.questionText) {
      snap.recentTexts.push(stripBracketedPrefix(r.questionText).toLowerCase());
    }
    if (summaries.length < MAX_PROMPT_CONCEPTS && r.questionText) {
      summaries.push(stripBracketedPrefix(r.questionText).slice(0, 110));
    }
  }

  snap.recentTexts = Array.from(new Set(snap.recentTexts));
  snap.promptConcepts = summaries;
  snap.conceptsTruncated = rows.length > summaries.length;
  snap.totalEntries = rows.length;
  return snap;
}

/**
 * Build the "already used, do not repeat" block for a generation prompt.
 * Returns an empty string when the bank is empty so prompts stay clean.
 */
export function buildAvoidanceBlock(snap: BankSnapshot, label = "this platform"): string {
  // Fall back to recentTexts if promptConcepts was not populated, so a
  // hand-built snapshot can never silently disable the prompt-side warning.
  const concepts =
    snap.promptConcepts.length > 0
      ? snap.promptConcepts
      : snap.recentTexts.slice(0, MAX_PROMPT_CONCEPTS).map((t) => t.slice(0, 110));

  if (concepts.length === 0 && snap.totalEntries === 0) return "";

  const total = Math.max(snap.totalEntries, concepts.length);
  const shown = concepts.map((c, i) => `${i + 1}. ${c}${c.length >= 110 ? "..." : ""}`).join("\n");
  return (
    `\n\n=== ABSOLUTE UNIQUENESS REQUIREMENT ===\n` +
    `${total} question concept(s) already exist in ${label}. ` +
    `Every one of them is BANNED. Your output is checked automatically against a ` +
    `global registry and any question matching an existing concept — including one ` +
    `that differs only in its NUMBERS, UNITS, or the NAME of the person in the ` +
    `scenario — is rejected and the whole batch is discarded.\n\n` +
    `Concepts already used (showing ${concepts.length}${total > concepts.length ? " of " + total : ""}):\n` +
    `${shown}\n\n` +
    `Rules:\n` +
    `- Test a genuinely different underlying idea, not a reworded or renumbered version.\n` +
    `- Changing only the numbers, the units, or the person's name is NOT a new question.\n` +
    `- Do not reuse the phrasing, scenario shape, or distractor style of anything listed above.\n` +
    `- Prefer an angle nobody has covered yet: edge cases, alternative approaches, ` +
    `contrarian cases, or a different sub-topic entirely.`
  );
}

export interface RejectOptions extends DedupeOptions {
  threshold?: number;
  /** Extra raw texts (e.g. from earlier batches of this same run) to compare against. */
  extraTexts?: string[];
}

/**
 * Reject any candidate that already exists in the bank, or that duplicates an
 * earlier candidate in the same batch. This is the single gate every generation
 * path must pass. Returns only the survivors plus the rejection reasons (which
 * the caller feeds back into the next attempt).
 */
export function rejectAgainstBank<T extends { question?: string; text?: string; codeSnippet?: string }>(
  candidates: T[],
  snap: BankSnapshot,
  options: RejectOptions = {}
): { kept: T[]; rejected: { question: T; reason: string }[] } {
  const threshold = options.threshold ?? SIMILARITY_THRESHOLD;
  const rejected: { question: T; reason: string }[] = [];

  // Extend the snapshot with anything produced earlier in this same run.
  const live: BankSnapshot =
    options.extraTexts && options.extraTexts.length > 0
      ? mergeSnapshot(snap, options.extraTexts)
      : snap;

  const { kept, rejected: batchRejected } = dedupeQuestionsWithReasons(
    candidates,
    live.fingerprints,
    {
      strict: options.strict ?? true,
      excludeTemplates: live.templates,
      excludeConcepts: live.conceptSignatures,
    }
  );
  for (const r of batchRejected) rejected.push({ question: r.question, reason: r.reason });

  // Final semantic sweep over the full text list. The sets above are exact
  // matches only; this catches reworded near-duplicates.
  const survivors: T[] = [];
  for (const q of kept) {
    const d = dedupInfoFromQuestion(q);
    let hit: string | null = null;
    if (live.conceptSignatures.has(d.conceptSignature)) hit = "concept";
    else if (!hit) {
      for (const t of live.recentTexts) {
        if (t && jaccard(d.tokens, tokenize(t)) >= threshold) {
          hit = "near-duplicate";
          break;
        }
      }
    }
    if (hit) {
      rejected.push({ question: q, reason: hit });
      continue;
    }
    survivors.push(q);
  }

  return { kept: survivors, rejected };
}

function mergeSnapshot(snap: BankSnapshot, extraTexts: string[]): BankSnapshot {
  const out: BankSnapshot = {
    fingerprints: new Set(snap.fingerprints),
    templates: new Set(snap.templates),
    conceptSignatures: new Set(snap.conceptSignatures),
    recentTexts: snap.recentTexts.slice(),
    promptConcepts: snap.promptConcepts,
    totalEntries: snap.totalEntries,
    conceptsTruncated: snap.conceptsTruncated,
  };
  for (const raw of extraTexts) {
    const d = dedupInfoFromQuestion({ question: raw });
    if (d.fingerprint) out.fingerprints.add(d.fingerprint);
    if (d.templateFingerprint) out.templates.add(d.templateFingerprint);
    if (d.conceptSignature) out.conceptSignatures.add(d.conceptSignature);
    if (raw) out.recentTexts.push(stripBracketedPrefix(raw).toLowerCase());
  }
  return out;
}

export interface BankEntryInput {
  question: string;
  codeSnippet?: string;
  options?: string[];
  correctIdx?: number;
  source: string;
  topic?: string | null;
  category?: string | null;
  company?: string | null;
  difficulty?: string | null;
  testId?: string | null;
  position?: number | null;
}

export interface CommitResult {
  inserted: number;
  /** Entries rejected by the database UNIQUE constraints (lost a race). */
  rejectedAsDuplicate: number;
}

/**
 * Persist questions into the global bank. The UNIQUE constraints on
 * `fingerprint` and `templateFingerprint` are the authoritative gate: if two
 * concurrent generations pick the same concept, exactly one insert wins and the
 * other is reported as rejected rather than silently duplicating.
 */
export async function commitToBank(
  entries: BankEntryInput[],
  db?: any
): Promise<CommitResult> {
  const client = resolveDb(db);
  if (!Array.isArray(entries) || entries.length === 0) {
    return { inserted: 0, rejectedAsDuplicate: 0 };
  }

  const data = entries
    .map((e) => {
      const d = dedupInfoFromQuestion({ question: e.question, codeSnippet: e.codeSnippet });
      if (!d.fingerprint) return null;
      return {
        fingerprint: d.fingerprint,
        templateFingerprint: d.templateFingerprint,
        conceptSignature: d.conceptSignature,
        source: e.source,
        topic: e.topic ?? null,
        category: e.category ?? null,
        company: e.company ?? null,
        difficulty: e.difficulty ?? null,
        questionText: d.text.slice(0, 4000),
        optionsJson: Array.isArray(e.options) && e.options.length > 0 ? e.options : undefined,
        correctIdx: typeof e.correctIdx === "number" ? e.correctIdx : null,
        testId: e.testId ?? null,
        position: typeof e.position === "number" ? e.position : null,
      };
    })
    .filter(Boolean) as any[];

  if (data.length === 0) return { inserted: 0, rejectedAsDuplicate: 0 };

  let inserted = 0;
  let rejected = 0;
  // createMany skipDuplicates maps onto ON CONFLICT DO NOTHING, which is the
  // correct semantics here: a losing racer is skipped, not an error.
  try {
    const res = await client.questionBankEntry.createMany({ data, skipDuplicates: true });
    inserted = res?.count ?? 0;
    rejected = data.length - inserted;
  } catch (err) {
    // Fallback for providers/versions without skipDuplicates support: insert
    // one at a time and treat unique violations as duplicate rejections.
    for (const row of data) {
      try {
        await client.questionBankEntry.create({ data: row });
        inserted++;
      } catch (e: any) {
        const code = e?.code || e?.meta?.code;
        if (code === "P2002" || /unique|duplicate/i.test(String(e?.message || ""))) {
          rejected++;
        } else {
          throw e;
        }
      }
    }
  }

  if (rejected > 0) {
    console.warn(
      `[QuestionBank] ${rejected} question(s) rejected as duplicates at commit time ` +
        `(concurrent generation race).`
    );
  }
  return { inserted, rejectedAsDuplicate: rejected };
}

/**
 * Global duplication audit. Returns the exact and value-change duplicate groups
 * currently present in the bank. Acceptance criterion after a backfill: both
 * counts must be 0.
 */
export async function auditBank(
  db?: any,
  scope: QuestionBankScope = {}
): Promise<{
  totalEntries: number;
  exactDuplicateGroups: { fingerprint: string; count: number; samples: string[] }[];
  templateDuplicateGroups: { templateFingerprint: string; count: number; samples: string[] }[];
  conceptDuplicateGroups: { conceptSignature: string; count: number; samples: string[] }[];
}> {
  const client = resolveDb(db);
  const where: any = {};
  if (scope.source) where.source = scope.source;

  const rows = await client.questionBankEntry.findMany({
    where,
    select: {
      id: true,
      fingerprint: true,
      templateFingerprint: true,
      conceptSignature: true,
      questionText: true,
      testId: true,
    },
  });

  const group = (key: "fingerprint" | "templateFingerprint" | "conceptSignature") => {
    const map = new Map<string, { count: number; samples: string[] }>();
    for (const r of rows as any[]) {
      const k = r[key];
      if (!k) continue;
      const cur = map.get(k) || { count: 0, samples: [] };
      cur.count++;
      if (cur.samples.length < 3) cur.samples.push(stripBracketedPrefix(r.questionText).slice(0, 100));
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .filter(([, v]) => v.count > 1)
      .map(([k, v]) => ({ [key]: k, ...v }));
  };

  return {
    totalEntries: rows.length,
    exactDuplicateGroups: group("fingerprint") as any,
    templateDuplicateGroups: group("templateFingerprint") as any,
    conceptDuplicateGroups: group("conceptSignature") as any,
  };
}

export const QUESTION_BANK_RECENT_CAP = DEFAULT_RECENT_TEXT_CAP;
export { fingerprint, templateFingerprint, conceptSignature };

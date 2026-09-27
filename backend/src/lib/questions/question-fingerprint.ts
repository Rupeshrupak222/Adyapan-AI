import { createHash } from "node:crypto";

export const SIMILARITY_THRESHOLD = 0.7;

/**
 * Cap on raw texts retained for Jaccard similarity checks in the PER-USER path.
 * Admin/generation paths pass Infinity via SeenRegistryOptions.recentTextCap so
 * similarity is judged against the whole bank.
 */
export const DEFAULT_RECENT_TEXT_CAP = 300;

const LEADING_PREFIX_RE = /^\s*(?:\[[^\]]*\]\s*)+/;
const HTML_TAG_RE = /<[^>]+>/g;
const FENCE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`([^`]*)`/g;
const BULLET_RE = /[•·●∘]/g;
const WHITESPACE_RE = /\s+/g;
const NON_ALNUM_RE = /[^a-z0-9]+/g;
const DIGITS_RE = /\d+/g;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "is", "are", "and", "for", "in", "on", "with",
  "what", "which", "how", "does", "do", "each", "that", "this", "it", "be",
  "by", "at", "as", "or", "if", "from", "than", "then", "when", "was", "were",
  "will", "would", "can", "should", "its", "their", "his", "her", "has",
  "have", "not", "no", "so", "all", "any", "answer", "question", "options",
  "option", "following", "choose", "select", "find", "calculate", "whats",
  "value", "number", "numbers", "result", "below", "above", "using", "use",
  "used", "given", "per", "each", "between", "after", "before", "into",
  "about", "over", "under", "more", "most", "less", "least", "same", "other",
]);

/**
 * Units, currency and measure words carry no identifying information about a
 * question's concept, so they are stripped when building a concept signature.
 * This is what lets "Ravi buys 5 apples for Rs 40" and "Sita buys 8 mangoes for
 * Rs 64" be recognised as the same underlying concept.
 */
const UNIT_TOKENS = [
  "rupees", "rupee", "rs", "inr", "₹", "dollars", "dollar", "usd", "euros", "euro",
  "paise", "cents", "percent", "percentage", "percentile", "pc", "rs.", "rs/",
  "kg", "kgs", "kilogram", "kilograms", "gm", "grams", "gram", "mg",
  "km", "kms", "kilometre", "kilometres", "kilometer", "kilometers", "kmph",
  "m", "metre", "metres", "meter", "meters", "cm", "mm", "mile", "miles",
  "sec", "secs", "second", "seconds", "min", "mins", "minute", "minutes",
  "hour", "hours", "hr", "hrs", "day", "days", "week", "weeks", "month",
  "months", "year", "years", "yr", "yrs", "litre", "litres", "liter", "liters",
  "ml", "l", "tonne", "tonnes", "ton", "dozen", "times", "people", "students",
  "items", "units", "apples", "mangoes", "books", "chairs",
];

/**
 * Very common person/place names used in word problems. Stripped so that two
 * problems differing only in the protagonist collapse to one concept.
 */
const ENTITY_TOKENS = [
  "ravi", "sita", "geeta", "rama", "amit", "anita", "suresh", "priya",
  "rahul", "neha", "amara", "vikram", "kavita", "arjun", "meena", "raj",
  "mohan", "sohan", "john", "alice", "bob", "carol", "dave", "emma",
  "maria", "ahmed", "sara", "luis", "elena", "shop", "shopkeeper", "vendor",
  "seller", "buyer", "trainer", "coach", "student", "teacher",
];

const UNIT_RE = new RegExp(`\\b(${UNIT_TOKENS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
const ENTITY_RE = new RegExp(`\\b(${ENTITY_TOKENS.join("|")})\\b`, "g");

export function stripBracketedPrefix(text: string): string {
  return (text || "").replace(LEADING_PREFIX_RE, "").trim();
}

export function normalizeQuestionText(text: string, extra: string[] = []): string {
  let t = stripBracketedPrefix(text || "");
  t = t.replace(HTML_TAG_RE, " ");
  t = t.replace(FENCE_RE, " ");
  t = t.replace(INLINE_CODE_RE, " $1 ");
  t = t.replace(BULLET_RE, " ");
  t = t.replace(/[^\p{L}\p{N}\s₹$%.,:;?'"()-]/gu, " ");
  t = t.toLowerCase();
  t = t.replace(WHITESPACE_RE, " ");
  for (const e of extra) {
    const clean = (e || "").trim().toLowerCase();
    if (clean) {
      t = t.split(clean).join(" ");
    }
  }
  return t.trim();
}

function coreChars(text: string, maskDigits: boolean): string {
  let s = maskDigits ? text.replace(DIGITS_RE, "#") : text;
  return s.replace(NON_ALNUM_RE, "");
}

export function fingerprint(text: string, extra: string[] = []): string {
  const core = coreChars(normalizeQuestionText(text, extra), false);
  if (!core) return "";
  return createHash("sha256").update(core, "utf8").digest("hex").slice(0, 32);
}

export function templateFingerprint(text: string, extra: string[] = []): string {
  const core = coreChars(normalizeQuestionText(text, extra), true);
  if (!core) return "";
  return "t" + createHash("sha256").update(core, "utf8").digest("hex").slice(0, 32);
}

/**
 * Hardest normal form: digits masked, units/currency stripped, common word-problem
 * entity names stripped, stopwords removed, remaining content words sorted.
 *
 * Two questions that differ ONLY in their numbers, units, or the name of the
 * protagonist produce the same signature. This is intentionally NOT a database
 * unique constraint (it can over-collapse legitimate variants) — it is used as a
 * grouping signal for reporting and as an extra strict-mode rejection signal.
 */
export function conceptSignature(text: string, extra: string[] = []): string {
  let t = normalizeQuestionText(text, extra);
  t = t.replace(DIGITS_RE, " ");
  t = t.replace(UNIT_RE, " ");
  t = t.replace(ENTITY_RE, " ");
  t = t.replace(/[%$]/g, " ");
  const words = t
    .split(NON_ALNUM_RE)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !UNIT_TOKENS.includes(w));
  const uniq = Array.from(new Set(words)).sort();
  const core = uniq.join(" ");
  if (!core) return "";
  return "c" + createHash("sha256").update(core, "utf8").digest("hex").slice(0, 32);
}

export function tokenize(text: string, extra: string[] = []): Set<string> {
  const words = normalizeQuestionText(text, extra).split(NON_ALNUM_RE);
  const out = new Set<string>();
  for (const w of words) {
    if (w.length > 1 && !STOPWORDS.has(w)) out.add(w);
  }
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function similarityScore(textA: string, textB: string, extra: string[] = []): number {
  const fa = fingerprint(textA, extra);
  const fb = fingerprint(textB, extra);
  if (fa && fa === fb) return 1;
  const ta = templateFingerprint(textA, extra);
  const tb = templateFingerprint(textB, extra);
  if (ta && ta === tb) return 1;
  return jaccard(tokenize(textA, extra), tokenize(textB, extra));
}

export function areSimilar(
  textA: string,
  textB: string,
  threshold: number = SIMILARITY_THRESHOLD,
  extra: string[] = []
): boolean {
  return similarityScore(textA, textB, extra) >= threshold;
}

export interface QuestionDedupInfo {
  text: string;
  normalized: string;
  fingerprint: string;
  templateFingerprint: string;
  conceptSignature: string;
  tokens: Set<string>;
}

export function dedupInfoFromQuestion(
  q: { question?: string; text?: string; codeSnippet?: string } | null | undefined,
  extra: string[] = []
): QuestionDedupInfo {
  const base = q?.question ?? q?.text ?? "";
  const text = [stripBracketedPrefix(base), q?.codeSnippet ?? ""].filter(Boolean).join(" ");
  const normalized = normalizeQuestionText(text, extra);
  const fingerprintHash = fingerprint(text, extra);
  const template = templateFingerprint(text, extra);
  const signature = conceptSignature(text, extra);
  const tokens = tokenize(text, extra);
  return {
    text,
    normalized,
    fingerprint: fingerprintHash,
    templateFingerprint: template,
    conceptSignature: signature,
    tokens,
  };
}

export interface SeenRegistry {
  fingerprints: Set<string>;
  templates: Set<string>;
  conceptSignatures: Set<string>;
  recentTexts: string[];
}

export interface SeenRegistryOptions {
  /**
   * How many raw texts to retain for Jaccard similarity checks. The per-user
   * path keeps a small cap for memory; the admin/generation path passes
   * Infinity so similarity is evaluated against the ENTIRE bank rather than
   * only the most recent N questions.
   */
  recentTextCap?: number;
}

export function seenRegistryFromTexts(
  texts: Iterable<string>,
  extra: string[] = [],
  options: SeenRegistryOptions = {}
): SeenRegistry {
  const cap = options.recentTextCap ?? DEFAULT_RECENT_TEXT_CAP;
  const seen: SeenRegistry = {
    fingerprints: new Set(),
    templates: new Set(),
    conceptSignatures: new Set(),
    recentTexts: [],
  };
  for (const raw of texts) {
    const d = dedupInfoFromQuestion({ question: raw }, extra);
    if (d.fingerprint) seen.fingerprints.add(d.fingerprint);
    if (d.templateFingerprint) seen.templates.add(d.templateFingerprint);
    if (d.conceptSignature) seen.conceptSignatures.add(d.conceptSignature);
    seen.recentTexts.push(stripBracketedPrefix(raw).toLowerCase());
    if (seen.recentTexts.length > cap) seen.recentTexts.shift();
  }
  return seen;
}

export function isTextSeen(
  text: string,
  seen: SeenRegistry,
  threshold: number = SIMILARITY_THRESHOLD,
  extra: string[] = []
): boolean {
  if (!text) return false;
  const d = dedupInfoFromQuestion({ question: text }, extra);
  if (d.fingerprint && seen.fingerprints.has(d.fingerprint)) return true;
  if (d.templateFingerprint && seen.templates.has(d.templateFingerprint)) return true;
  if (d.conceptSignature && seen.conceptSignatures.has(d.conceptSignature)) return true;
  for (const s of seen.recentTexts) {
    if (areSimilar(text, s, threshold, extra)) return true;
  }
  return false;
}

/**
 * Within-assessment deduplication.
 *
 * NON-STRICT (default): drops only byte-identical (normalized) duplicates.
 *   Numeric/scenario variants of the same template survive.
 *
 * STRICT: additionally drops any question whose digits-masked TEMPLATE matches
 *   an already-kept question, i.e. the same concept with different numbers
 *   ("train 60% for 3h" vs "train 75% for 5h"). This is the mode every admin
 *   generation path must use — the old non-strict behaviour was the direct
 *   cause of value-change duplicates in the bank.
 *
 * An optional exclusion set of already-banked fingerprints/templates is respected
 * in both modes.
 */
export interface DedupeOptions {
  strict?: boolean;
  excludeTemplates?: Set<string>;
  excludeConcepts?: Set<string>;
}

export interface DedupeOutcome<T> {
  kept: T[];
  /** Kept questions that were dropped, with the reason — surfaced to the retry loop. */
  rejected: { question: T; reason: "exact" | "template" | "concept" }[];
}

export function dedupeQuestionsWithReasons<T extends { question?: string; text?: string; codeSnippet?: string }>(
  pool: T[],
  excludeFingerprints: Set<string> = new Set(),
  options: DedupeOptions = {}
): DedupeOutcome<T> {
  const strict = options.strict ?? false;
  const seen = new Set<string>(excludeFingerprints);
  const seenTemplates = new Set<string>(options.excludeTemplates ?? []);
  const seenConcepts = new Set<string>(options.excludeConcepts ?? []);
  const kept: T[] = [];
  const rejected: { question: T; reason: "exact" | "template" | "concept" }[] = [];

  for (const q of pool) {
    const d = dedupInfoFromQuestion(q);
    if (!d.fingerprint) continue;
    if (seen.has(d.fingerprint)) {
      rejected.push({ question: q, reason: "exact" });
      continue;
    }
    if (strict && d.templateFingerprint && seenTemplates.has(d.templateFingerprint)) {
      rejected.push({ question: q, reason: "template" });
      continue;
    }
    if (strict && d.conceptSignature && seenConcepts.has(d.conceptSignature)) {
      rejected.push({ question: q, reason: "concept" });
      continue;
    }
    seen.add(d.fingerprint);
    if (d.templateFingerprint) seenTemplates.add(d.templateFingerprint);
    if (d.conceptSignature) seenConcepts.add(d.conceptSignature);
    kept.push(q);
  }
  return { kept, rejected };
}

export function dedupeQuestions<T extends { question?: string; text?: string; codeSnippet?: string }>(
  pool: T[],
  excludeFingerprints: Set<string> = new Set(),
  options: DedupeOptions = {}
): T[] {
  return dedupeQuestionsWithReasons(pool, excludeFingerprints, options).kept;
}

/**
 * Cross-assessment (history/bank) filter: drops anything already present in the
 * registry — exact fingerprints, digits-masked template variants, concept
 * signatures, and similar rewrites. It never collapses a fresh batch against
 * itself (that is dedupeQuestions' job).
 */
export function filterQuestionsAgainstSeen<T extends { question?: string; text?: string; codeSnippet?: string }>(
  pool: T[],
  seen: SeenRegistry,
  threshold: number = SIMILARITY_THRESHOLD,
  extra: string[] = [],
  options: DedupeOptions = {}
): T[] {
  const strict = options.strict ?? false;
  const kept: T[] = [];
  for (const q of pool) {
    const d = dedupInfoFromQuestion(q, extra);
    if (!d.fingerprint) continue;
    if (seen.fingerprints.has(d.fingerprint) || seen.templates.has(d.templateFingerprint)) continue;
    if (strict && d.conceptSignature && seen.conceptSignatures.has(d.conceptSignature)) continue;
    let similar = false;
    for (const s of seen.recentTexts) {
      if (areSimilar(d.text, s, threshold, extra)) {
        similar = true;
        break;
      }
    }
    if (!similar) kept.push(q);
  }
  return kept;
}

export interface QuestionQualityError {
  index: number;
  reasons: string[];
}

export function isPlaceholderText(text: string): boolean {
  return /temporarily busy|no explanation available|system unavailable|service temporarily/i.test(text || "");
}

export function validateGeneratedQuestion(q: any, index: number): QuestionQualityError | null {
  const reasons: string[] = [];
  const text = (q?.question ?? q?.text ?? "").trim();
  if (!text) {
    reasons.push("empty question text");
  } else if (text.length < 15) {
    reasons.push("question text too short");
  }
  if (isPlaceholderText(text)) reasons.push("placeholder/question fallback text");
  const options = Array.isArray(q?.options) ? q?.options : [];
  if (options.length !== 4) {
    reasons.push(`expected 4 options, got ${options.length}`);
  } else {
    const uniq = new Set(options.map((o: any) => String(o).trim().toLowerCase()));
    if (uniq.size < 3) reasons.push("options are not distinct enough");
    const correctIdx = Number(q?.correctIdx);
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx > 3) {
      reasons.push("correctIdx out of range");
    } else if (!String(options[correctIdx] ?? "").trim()) {
      reasons.push("correct option is empty");
    }
  }
  if (reasons.length === 0) return null;
  return { index, reasons };
}

export function sanitizeGeneratedQuestions(questions: any[]): { valid: any[]; rejected: QuestionQualityError[] } {
  const valid: any[] = [];
  const rejected: QuestionQualityError[] = [];
  questions.forEach((q, i) => {
    const err = validateGeneratedQuestion(q, i);
    if (err) rejected.push(err);
    else valid.push(q);
  });
  return { valid, rejected };
}
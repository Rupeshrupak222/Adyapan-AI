import { createHash } from "node:crypto";

export const SIMILARITY_THRESHOLD = 0.7;

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
  const tokens = tokenize(text, extra);
  return {
    text,
    normalized,
    fingerprint: fingerprintHash,
    templateFingerprint: template,
    tokens,
  };
}

export interface SeenRegistry {
  fingerprints: Set<string>;
  templates: Set<string>;
  recentTexts: string[];
}

export function seenRegistryFromTexts(texts: Iterable<string>, extra: string[] = []): SeenRegistry {
  const seen: SeenRegistry = { fingerprints: new Set(), templates: new Set(), recentTexts: [] };
  for (const raw of texts) {
    const d = dedupInfoFromQuestion({ question: raw }, extra);
    if (d.fingerprint) seen.fingerprints.add(d.fingerprint);
    if (d.templateFingerprint) seen.templates.add(d.templateFingerprint);
    seen.recentTexts.push(stripBracketedPrefix(raw).toLowerCase());
    if (seen.recentTexts.length > 300) seen.recentTexts.shift();
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
  for (const s of seen.recentTexts) {
    if (areSimilar(text, s, threshold, extra)) return true;
  }
  return false;
}

/**
 * Within-assessment deduplication: removes only byte-identical (normalized)
 * duplicates. Numeric/scenario variants of the same template are distinct
 * questions and are kept so a batch is never collapsed to a single variant.
 * An optional exclusion set of already-served/history fingerprints is respected.
 */
export function dedupeQuestions<T extends { question?: string; text?: string; codeSnippet?: string }>(
  pool: T[],
  excludeFingerprints: Set<string> = new Set()
): T[] {
  const seen = new Set<string>(excludeFingerprints);
  const kept: T[] = [];
  for (const q of pool) {
    const d = dedupInfoFromQuestion(q);
    if (!d.fingerprint || seen.has(d.fingerprint)) continue;
    seen.add(d.fingerprint);
    kept.push(q);
  }
  return kept;
}

/**
 * Cross-assessment (history) filter: drops anything the user has ALREADY seen —
 * exact fingerprints, renumbered template variants, and similar rewrites.
 * It never collapses a fresh batch against itself (that is the job of
 * dedupeQuestions within an assessment).
 */
export function filterQuestionsAgainstSeen<T extends { question?: string; text?: string; codeSnippet?: string }>(
  pool: T[],
  seen: SeenRegistry,
  threshold: number = SIMILARITY_THRESHOLD,
  extra: string[] = []
): T[] {
  const kept: T[] = [];
  for (const q of pool) {
    const d = dedupInfoFromQuestion(q, extra);
    if (!d.fingerprint) continue;
    if (seen.fingerprints.has(d.fingerprint) || seen.templates.has(d.templateFingerprint)) continue;
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
/**
 * Lightweight client-side question dedup helpers. These are a safety net on top
 * of server-side anti-repetition: they mirror the backend's normalization rules
 * (bracketed-prefix stripping, alnum-only keys) without needing a hash, so a
 * session never displays an identical question twice even if the server somehow
 * returns one. Within a single assessment only byte-identical questions are
 * duplicates; numeric scenario variants are distinct questions and are kept.
 */

const LEADING_PREFIX_RE = /^\s*(?:\[[^\]]*\]\s*)+/;
const HTML_TAG_RE = /<[^>]+>/g;
const WHITESPACE_RE = /\s+/g;
const NON_ALNUM_RE = /[^a-z0-9]+/g;
const DIGITS_RE = /\d+/g;

export function stripBracketPrefix(text: string): string {
  return (text || "").replace(LEADING_PREFIX_RE, "").trim();
}

/** Stable lowercase alnum key; collapses whitespace/punctuation. */
export function normalizeQuestionKey(text: string): string {
  return stripBracketPrefix(text || "")
    .replace(HTML_TAG_RE, " ")
    .toLowerCase()
    .replace(WHITESPACE_RE, " ")
    .trim()
    .replace(NON_ALNUM_RE, "");
}

/** Same as the normalize key, but digit values are masked. */
export function templateQuestionKey(text: string): string {
  return normalizeQuestionKey(text).replace(DIGITS_RE, "#");
}

export function questionTextFrom(q: { question?: string; text?: string } | null | undefined): string {
  return q?.question ?? q?.text ?? "";
}

/**
 * Removes any question whose normalized text already appeared earlier in the
 * list (keeps first wins). Numeric scenario variants are kept — they are
 * distinct questions within an assessment.
 */
export function dedupeSessionQuestions<T extends { question?: string; text?: string }>(list: T[]): T[] {
  const normalized = new Set<string>();
  const kept: T[] = [];
  for (const q of list) {
    const text = questionTextFrom(q);
    if (!text) continue;
    const key = normalizeQuestionKey(text);
    if (!key || normalized.has(key)) continue;
    normalized.add(key);
    kept.push(q);
  }
  return kept;
}

/** Counts duplicates (identical normalized text) inside a session list. */
export function countSessionDuplicates<T extends { question?: string; text?: string }>(list: T[]): number {
  return list.length - dedupeSessionQuestions(list).length;
}
/**
 * Lightweight client-side question dedup helpers. These are a safety net on top
 * of server-side anti-repetition: they mirror the backend's normalization rules
 * (bracketed-prefix stripping, alnum-only tokens, digit masking) without needing
 * a hash, so a session never displays an exact or re-numbered duplicate even if
 * the server somehow returns one.
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

/** Same as the fingerprint key, but digit values are masked. */
export function templateQuestionKey(text: string): string {
  return normalizeQuestionKey(text).replace(DIGITS_RE, "#");
}

export function questionTextFrom(q: { question?: string; text?: string } | null | undefined): string {
  return q?.question ?? q?.text ?? "";
}

/**
 * Removes any question whose normalized text (exact) or digit-masked form
 * (re-numbered copy) already appeared earlier in the list. Keeps first wins.
 */
export function dedupeSessionQuestions<T extends { question?: string; text?: string }>(list: T[]): T[] {
  const normalized = new Set<string>();
  const templates = new Set<string>();
  const kept: T[] = [];
  for (const q of list) {
    const text = questionTextFrom(q);
    if (!text) continue;
    const key = normalizeQuestionKey(text);
    const tkey = templateQuestionKey(text);
    if (!key || normalized.has(key) || templates.has(tkey)) continue;
    normalized.add(key);
    templates.add(tkey);
    kept.push(q);
  }
  return kept;
}

/** Counts duplicate (exact or renumbered) questions inside a session list. */
export function countSessionDuplicates<T extends { question?: string; text?: string }>(list: T[]): number {
  return list.length - dedupeSessionQuestions(list).length;
}
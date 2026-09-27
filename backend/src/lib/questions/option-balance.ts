/**
 * Correct-answer position balancing.
 *
 * LLMs have a strong positional bias toward option A. A regenerated 30-question
 * test came back with 21 of 30 correct answers at index 0, which is trivially
 * gameable and makes the test a poor measure of ability.
 *
 * These helpers move options around so the correct answer is spread evenly
 * across the available positions. Only the option ORDER changes - the question
 * text, the option values and the explanation are never touched, so nothing
 * about the question's difficulty or meaning is altered.
 *
 * Safe to run after duplicate detection: `dedupInfoFromQuestion` derives the
 * fingerprint, template fingerprint and concept signature from the question
 * text and code snippet only, never from the options. Reordering therefore
 * cannot change a question's identity in the global bank.
 */

export interface BalancableQuestion {
  options: string[];
  correctIdx: number;
}

/**
 * Reorder one question's options so the correct answer lands on `targetIdx`.
 * Other options keep their relative order, which keeps the change predictable.
 */
export function moveCorrectOptionTo<T extends BalancableQuestion>(q: T, targetIdx: number): T {
  const n = q.options?.length ?? 0;
  if (n < 2) return q;
  if (q.correctIdx < 0 || q.correctIdx >= n) return q;

  const bounded = Math.max(0, Math.min(targetIdx, n - 1));
  if (bounded === q.correctIdx) return q;

  const options = q.options.slice();
  const [correct] = options.splice(q.correctIdx, 1);
  options.splice(bounded, 0, correct);

  return { ...q, options, correctIdx: bounded };
}

/**
 * Spread the correct answer across positions as evenly as possible.
 *
 * With 30 questions and 4 options each position should receive 7 or 8 correct
 * answers. The assignment walks positions round-robin from a rotating offset so
 * consecutive questions in a test do not all land on the same letter.
 *
 * `startOffset` defaults to 1 so the very first question of a test does not
 * present the answer as option A -- readers have a habit of picking A, and a
 * test that opens on a guessable answer wastes a question.
 */
export function balanceCorrectOptionPositions<T extends BalancableQuestion>(
  questions: T[],
  startOffset = 1
): T[] {
  if (!Array.isArray(questions) || questions.length === 0) return questions || [];

  const sizes = questions.map((q) => q.options?.length ?? 0);
  // A test with mixed option counts has no single fair distribution; rotating
  // the first option's range is the best simple approximation.
  const maxOptions = Math.max(...sizes);
  if (maxOptions < 2) return questions;

  const counts = new Array(maxOptions).fill(0);
  let offset = ((startOffset % maxOptions) + maxOptions) % maxOptions;

  return questions.map((q, i) => {
    const n = q.options?.length ?? 0;
    if (n < 2) return q;

    // Pick whichever position this question can use that is currently least
    // used, starting from a rotating offset to avoid a fixed pattern.
    let best = -1;
    let bestCount = Number.POSITIVE_INFINITY;
    for (let k = 0; k < n; k++) {
      const pos = (offset + k) % n;
      if (counts[pos] < bestCount) {
        bestCount = counts[pos];
        best = pos;
      }
    }
    if (best < 0) return q;

    counts[best]++;
    offset = (offset + 1) % maxOptions;
    return moveCorrectOptionTo(q, best);
  });
}

/** Counts how many questions have their correct answer at each index. */
export function correctOptionDistribution(
  questions: BalancableQuestion[]
): Record<number, number> {
  const dist: Record<number, number> = {};
  for (const q of questions || []) {
    const i = q?.correctIdx ?? -1;
    dist[i] = (dist[i] || 0) + 1;
  }
  return dist;
}

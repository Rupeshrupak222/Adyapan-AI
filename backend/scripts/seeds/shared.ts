/**
 * Shared builders for the hand-authored MCQ seed files.
 *
 * The seed data is written in a compact form (stem + correct answer + three
 * distractors) and expanded into the full question shape at load time, so a
 * `correctIdx` slip can never silently desynchronise `options` and `correctIdx`.
 */
import type { AptitudeCategory, Difficulty } from "../../src/services/aptitude-engine.service";

export interface AptitudeSeedSpec {
  /** Full question stem. Must be >= 15 chars and contain the tested content. */
  text: string;
  /** The single correct option. */
  answer: string;
  /** Exactly three plausible wrong options. */
  distractors: [string, string, string];
  explanation: string;
  /** Optional fast-solving cue. */
  shortcut?: string;
  difficulty: Difficulty;
  /** Sub-topic label stored on the question. */
  topic: string;
  commonMistakes?: [string, string];
}

export interface BuiltAptitudeQuestion {
  id: string;
  text: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  shortcut?: string;
  difficulty: Difficulty;
  topic: string;
  category: AptitudeCategory;
  companyTags: string[];
  commonMistakes: string[];
}

/**
 * Deterministic correct-answer position.
 *
 * Modulo 4 alone would place every correct answer at the same index for a fixed
 * multiplier, so the multiplier is coprime with 4 and the stride is odd: the
 * sequence walks all four slots and never repeats a slot twice in a row.
 */
function answerSlot(i: number): number {
  return (i * 7 + 3) % 4;
}

export function buildAptitudeQuestions(
  specs: AptitudeSeedSpec[],
  opts: { category: AptitudeCategory; idPrefix: string; expectCount?: number }
): BuiltAptitudeQuestion[] {
  if (specs.length === 0) throw new Error(`[seed] ${opts.idPrefix}: no questions provided`);
  if (opts.expectCount !== undefined && specs.length !== opts.expectCount) {
    throw new Error(
      `[seed] ${opts.idPrefix}: expected ${opts.expectCount} questions but ${specs.length} were authored`
    );
  }

  return specs.map((spec, i) => {
    const problems: string[] = [];
    if (spec.text.trim().length < 15) problems.push("question text too short");

    const all = [spec.answer, ...spec.distractors];
    const normalized = all.map((o) => o.trim().toLowerCase());
    if (new Set(normalized).size !== 4) {
      problems.push(`options are not 4 distinct values: ${JSON.stringify(all)}`);
    }
    if (normalized.some((o) => o.length === 0)) problems.push("an option is empty");
    if (spec.explanation.trim().length < 20) problems.push("explanation too short");
    if (problems.length > 0) {
      throw new Error(
        `[seed] ${opts.idPrefix} #${i + 1} invalid: ${problems.join("; ")}\n  text: ${spec.text}`
      );
    }

    const correctIdx = answerSlot(i);
    const options: string[] = [];
    let d = 0;
    for (let k = 0; k < 4; k++) {
      if (k === correctIdx) options.push(spec.answer);
      else options.push(spec.distractors[d++]);
    }
    if (options[correctIdx] !== spec.answer) {
      throw new Error(`[seed] ${opts.idPrefix} #${i + 1} answer slot mismatch`);
    }

    return {
      id: `${opts.idPrefix}-q${i + 1}`,
      text: spec.text,
      options,
      correctIdx,
      explanation: spec.explanation,
      shortcut: spec.shortcut,
      difficulty: spec.difficulty,
      estimatedTimeSec: spec.difficulty === "easy" ? 45 : spec.difficulty === "hard" ? 90 : 60,
      topic: spec.topic,
      category: opts.category,
      companyTags: ["Placement"],
      commonMistakes: spec.commonMistakes ?? [
        "Reading only the first clause and missing the error",
        "Choosing an option that sounds plausible but breaks the rule",
      ],
    };
  });
}

// ─── Technical MCQ seed ──────────────────────────────────────────────────────

export type TechDifficulty = "Easy" | "Medium" | "Hard";

export interface TechnicalSeedSpec {
  question: string;
  options: [string, string, string, string];
  /** Index into `options` of the correct answer. */
  correctIdx: number;
  explanation: string;
  hint: string;
  relatedConcept: string;
  difficulty: TechDifficulty;
  codeSnippet?: string;
  language?: string;
  interviewTip?: string;
}

export interface BuiltTechnicalQuestion {
  id: string;
  question: string;
  technology: string;
  difficulty: TechDifficulty;
  codeSnippet?: string;
  language?: string;
  options: string[];
  correctAnswer: string;
  correctIdx: number;
  explanation: string;
  hint: string;
  relatedConcept: string;
  estimatedTime: string;
  interviewTip?: string;
}

export function buildTechnicalQuestions(
  specs: TechnicalSeedSpec[],
  opts: { idPrefix: string; technology: string; expectCount?: number }
): BuiltTechnicalQuestion[] {
  if (specs.length === 0) throw new Error(`[seed] ${opts.idPrefix}: no questions provided`);
  if (opts.expectCount !== undefined && specs.length !== opts.expectCount) {
    throw new Error(
      `[seed] ${opts.idPrefix}: expected ${opts.expectCount} questions but ${specs.length} were authored`
    );
  }

  return specs.map((spec, i) => {
    const n = i + 1;
    const problems: string[] = [];
    const text = spec.question.trim();
    if (text.length < 25) problems.push("question text too short");
    if (/temporarily busy|no explanation available|system unavailable/i.test(text)) {
      problems.push("placeholder text");
    }

    const options = spec.options;
    if (!Array.isArray(options) || options.length !== 4) problems.push("expected 4 options");
    if (new Set(options.map((o) => o.trim().toLowerCase())).size !== 4) {
      problems.push("options are not 4 distinct values");
    }
    if (!Number.isInteger(spec.correctIdx) || spec.correctIdx < 0 || spec.correctIdx > 3) {
      problems.push("correctIdx out of range");
    }
    if (String(options?.[spec.correctIdx] ?? "").trim().length === 0) {
      problems.push("correct option is empty");
    }
    if (spec.explanation.trim().length < 40) problems.push("explanation too short");
    if (spec.hint.trim().length < 10) problems.push("hint too short");
    if (spec.relatedConcept.trim().length < 3) problems.push("relatedConcept missing");
    if (problems.length > 0) {
      throw new Error(`[seed] ${opts.idPrefix} Q${n} invalid: ${problems.join("; ")}\n  ${text}`);
    }

    return {
      id: `${opts.idPrefix}-q${n}`,
      question: text,
      technology: opts.technology,
      difficulty: spec.difficulty,
      codeSnippet: spec.codeSnippet,
      language: spec.language,
      options,
      correctAnswer: options[spec.correctIdx],
      correctIdx: spec.correctIdx,
      explanation: spec.explanation,
      hint: spec.hint,
      relatedConcept: spec.relatedConcept,
      estimatedTime:
        spec.difficulty === "Easy" ? "45 sec" : spec.difficulty === "Hard" ? "90 sec" : "60 sec",
      interviewTip: spec.interviewTip,
    };
  });
}

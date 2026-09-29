/**
 * Bank-gated top-up generator for the technical MCQ tests.
 *
 * The aptitude engine already has a uniqueness-gated generator
 * (generateUniqueTopicQuestions in aptitude-engine.service.ts); the MCQ bank had
 * no equivalent, so every technical test emptied by the global duplicate prune
 * stayed at zero questions with no way to refill it.
 *
 * This mirrors the aptitude generator's contract so the backfill script can drive
 * both sources the same way:
 *   - generate in small batches (fallback providers serve ~1000 output tokens)
 *   - reject every proposal against the global question bank BEFORE it is kept
 *   - report validResponses/parseFailures separately, so a quota outage is never
 *     mistaken for "this topic has no unused concepts left"
 *   - balance the correct-option position across the batch
 */
import { generateJSON, MODELS } from "../lib/ai/openrouter";
import { balanceCorrectOptionPositions } from "../lib/questions/option-balance";
import {
  dedupInfoFromQuestion,
  sanitizeGeneratedQuestions,
  stripBracketedPrefix,
} from "../lib/questions/question-fingerprint";
import { buildAvoidanceBlock, loadBank, rejectAgainstBank } from "./question-bank.service";

export interface McqQuestion {
  id: string;
  question: string;
  technology: string;
  company?: string;
  difficulty: string;
  codeSnippet?: string;
  language?: string;
  options: string[];
  correctAnswer: string;
  correctIdx: number;
  explanation?: string;
  hint?: string;
  relatedConcept?: string;
  estimatedTime?: string;
  interviewTip?: string;
}

export interface McqGenerationResult {
  questions: McqQuestion[];
  attempts: number;
  rejectedConcepts: string[];
  exhausted: boolean;
  diagnostics: {
    parseFailures: number;
    apiErrors: number;
    bankRejections: number;
    validResponses: number;
  };
}

const SYSTEM_PROMPT = `You are a senior technical interviewer writing screening MCQs for an online aptitude platform.
You write precise, unambiguous questions with exactly one defensible correct answer.
Distractors must be plausible and clearly wrong, never "All of the above" filler.
Respond with JSON only.`;

/**
 * Angle rotation. Without it the model converges on the same sub-topic across
 * attempts and every proposal after the first is rejected as a bank duplicate.
 */
const FOCUS_HINTS = [
  "core syntax and semantics",
  "common runtime errors and edge cases",
  "performance and complexity trade-offs",
  "idiomatic patterns a reviewer would flag",
  "memory and resource behaviour",
  "concurrency, ordering and side effects",
  "debugging: what the symptom implies about the cause",
  "API/library behaviour under unusual input",
  "standards, portability and cross-implementation differences",
  "testing, observability and failure diagnosis",
  "security-relevant misuse of an otherwise valid feature",
  "design-level trade-offs a senior engineer would notice",
];

/** Company-flavoured framing so company tests do not read as generic MCQs. */
const COMPANY_FOCUS: Record<string, string> = {
  google: "favour algorithmic depth, complexity analysis and Google-scale system thinking.",
  amazon: "favour scalability, distributed-systems reasoning and Leadership Principles in the framing.",
  microsoft: "favour collaborative tooling, growth mindset and pragmatic engineering judgement.",
  meta: "favour rapid prototyping, data-driven iteration and impact at scale.",
  apple: "favour attention to detail, privacy-first design and performance craft.",
  netflix: "favour high-reliability systems, streaming scale and freedom-with-responsibility.",
  uber: "favour real-time systems, geospatial reasoning and marketplace design.",
  adobe: "favour media-processing pipelines, creative tooling and developer experience.",
  salesforce: "favour multi-tenancy, CRM data modelling and enterprise integration.",
  tcs: "favour foundational CS fundamentals, SDLC awareness and enterprise IT practice.",
  infosys: "favour foundational knowledge, process orientation and client delivery.",
  accenture: "favour consulting mindset, analytics and business process understanding.",
  capgemini: "favour business technology, delivery methodology and enterprise solutions.",
};

export async function generateUniqueMcqQuestions(params: {
  /** Technology name for technology tests, company name for company tests. */
  target: string;
  targetType: "technology" | "company";
  count: number;
  difficulty: string;
  /** Prefix for generated question ids, e.g. "mcq-tech-c-t1". */
  idPrefix: string;
  /**
   * How many questions the test already holds. Ids are numbered idOffset+1
   * upwards so a top-up appends to the existing set instead of renumbering it
   * and colliding with ids that are already in the store.
   */
  idOffset?: number;
  /** Optional snippet of what the test already covers. */
  coveredSummary?: string;
  maxAttempts?: number;
  batchSize?: number;
  throttleMs?: number;
}): Promise<McqGenerationResult> {
  const { target, targetType, count, difficulty, idPrefix } = params;
  const idOffset = params.idOffset ?? 0;
  const maxAttempts = Math.max(1, params.maxAttempts ?? 8);
  const batchSize = Math.max(1, params.batchSize ?? 2);
  const throttleMs = Math.max(0, params.throttleMs ?? 0);

  const bank = await loadBank(undefined, { includeTexts: true });
  const accepted: McqQuestion[] = [];
  const acceptedTexts: string[] = [];
  const rejectedConcepts: string[] = [];
  let attempts = 0;
  let parseFailures = 0;
  let apiErrors = 0;
  let bankRejections = 0;
  let validResponses = 0;

  const focus = COMPANY_FOCUS[target.toLowerCase()];
  const audience =
    targetType === "company"
      ? `screening questions for a ${target} online assessment`
      : `screening questions for a ${target} technical test`;

  for (let attempt = 1; attempt <= maxAttempts && accepted.length < count; attempt++) {
    attempts = attempt;
    if (attempt > 1 && throttleMs > 0) {
      await new Promise((r) => setTimeout(r, throttleMs));
    }
    const needed = Math.min(batchSize, count - accepted.length);
    const angle = FOCUS_HINTS[(attempt - 1) % FOCUS_HINTS.length];
    const entropy = `${Date.now()}_${attempt}_${Math.random().toString(36).slice(2, 9)}`;

    const rejectFeedback =
      rejectedConcepts.length > 0
        ? `\nYou previously proposed concepts that already exist and were REJECTED. Do not reuse them:\n` +
          rejectedConcepts.slice(-15).map((c) => `- ${c}`).join("\n") +
          `\nPick a materially different idea for this question.\n`
        : "";

    const userPrompt = `Generate exactly ${needed} completely new ${difficulty}-difficulty ${audience}.

Entropy token: ${entropy}
Attempt ${attempt} of ${maxAttempts}.${buildAvoidanceBlock(bank, "the global question bank")}${focus ? `\nFraming: ${focus}` : ""}
Sub-topic angle for this attempt: ${angle}${
      params.coveredSummary
        ? `\n\nConcepts this test already covers (pick something else):\n${params.coveredSummary}\n`
        : ""
    }${rejectFeedback}
Return ONLY a JSON object:
{
  "questions": [
    {
      "question": "self-contained question, no reference to 'the code above' unless codeSnippet is provided",
      "codeSnippet": "optional short snippet, or empty string if none is needed",
      "language": "language of the snippet, or empty string",
      "options": ["option1", "option2", "option3", "option4"],
      "correctIdx": 0,
      "explanation": "why the correct answer is right and the closest distractor is wrong",
      "hint": "one-line nudge without giving the answer away",
      "relatedConcept": "the specific concept being tested",
      "estimatedTime": "45 sec",
      "interviewTip": "why an interviewer would ask this"
    }
  ]
}

Rules:
- valid JSON only, matching the structure above
- exactly 4 distinct options
- correctIdx is 0-based and points at the single correct option
- each question must test a distinct, previously unused angle of "${target}"
- changing only the variable names, numbers or the language of an existing question does NOT make it new`;

    let raw: any;
    try {
      raw = await generateJSON<any>(
        SYSTEM_PROMPT,
        userPrompt,
        {
          model: MODELS.CHEAP,
          temperature: 0.95,
          maxTokens: 8000,
          responseFormat: { type: "json_object" },
          skipCache: true,
        },
        null
      );
    } catch (err) {
      apiErrors++;
      console.warn(
        `[McqTopUp] attempt ${attempt} failed for "${target}":`,
        (err as Error)?.message || err
      );
      continue;
    }

    let arr: any[] = [];
    if (Array.isArray(raw)) arr = raw;
    else if (raw && typeof raw === "object") {
      if (Array.isArray(raw.questions)) arr = raw.questions;
      else {
        const found = Object.values(raw).find((v) => Array.isArray(v));
        if (Array.isArray(found)) arr = found;
      }
    }
    if (arr.length === 0) {
      // generateJSON's schema-safety fallback: the model returned unparseable
      // JSON twice (usually a quota or truncation problem), so we got null back
      // rather than an exception.
      parseFailures++;
      console.warn(
        `[McqTopUp] "${target}" attempt ${attempt}: model returned no usable questions.`
      );
      continue;
    }

    const candidates = arr.slice(0, needed).map((q) => ({
      question: q.question || "",
      options: Array.isArray(q.options) ? q.options : [],
      correctIdx: typeof q.correctIdx === "number" ? q.correctIdx : 0,
    }));

    // Cheap structural gate first so the bank only sees well-formed candidates.
    const { valid, rejected: invalid } = sanitizeGeneratedQuestions(candidates);
    if (valid.length === 0) {
      parseFailures++;
      console.warn(
        `[McqTopUp] "${target}" attempt ${attempt}: ${arr.length} question(s) returned but ` +
          `all failed validation. First problem: ${invalid[0]?.reasons?.join(", ") || "unknown"}`
      );
      continue;
    }
    validResponses++;

    const { kept, rejected } = rejectAgainstBank(valid, bank, {
      strict: true,
      extraTexts: acceptedTexts,
    });
    bankRejections += rejected.length;
    for (const r of rejected) {
      rejectedConcepts.push(`${dedupInfoFromQuestion(r.question).text.slice(0, 90)} [${r.reason}]`);
    }
    if (rejected.length > 0) {
      console.log(
        `[McqTopUp] "${target}" attempt ${attempt}: rejected ${rejected.length}/${valid.length} ` +
          `against the bank.`
      );
    }

    // Map the survivors back onto the full model payload. The structural gate
    // only kept question/options/correctIdx, but the store also wants the
    // explanation, hint and related concept, so re-join on the question text
    // rather than carrying the trimmed copy.
    const byText = new Map(
      arr
        .filter((q: any) => typeof q?.question === "string" && q.question.trim())
        .map((q: any) => [q.question.trim(), q])
    );
    for (const k of kept) {
      if (accepted.length >= count) break;
      const full = byText.get(String(k.question).trim());
      const options = k.options.map((o: any) => String(o));
      const correctIdx =
        typeof k.correctIdx === "number" && k.correctIdx >= 0 && k.correctIdx < options.length
          ? k.correctIdx
          : 0;
      accepted.push({
        id: `${idPrefix}-q${idOffset + accepted.length + 1}`,
        question: k.question,
        technology: target,
        company: targetType === "company" ? target : undefined,
        difficulty,
        codeSnippet: typeof full?.codeSnippet === "string" && full.codeSnippet.trim() ? full.codeSnippet : undefined,
        language: typeof full?.language === "string" && full.language.trim() ? full.language : undefined,
        options,
        correctAnswer: options[correctIdx] ?? "",
        correctIdx,
        explanation: full?.explanation || "",
        hint: full?.hint || "",
        relatedConcept: full?.relatedConcept || "",
        estimatedTime: full?.estimatedTime || "45 sec",
        interviewTip: full?.interviewTip || "",
      });
      acceptedTexts.push(dedupInfoFromQuestion(k.question).text);
    }
  }

  // The model has a strong bias toward option A; reordering only (never editing
  // the values) keeps a regenerated test from being guessable.
  const balanced = balanceCorrectOptionPositions(accepted);
  for (const q of balanced) {
    q.correctAnswer = q.options?.[q.correctIdx] ?? q.correctAnswer;
  }

  return {
    questions: balanced,
    rejectedConcepts,
    attempts,
    exhausted: accepted.length < count,
    diagnostics: { parseFailures, apiErrors, bankRejections, validResponses },
  };
}

/** Summarise the concepts a test already holds, for the prompt-side steering. */
export function summarizeCovered(questions: any[], limit = 12): string {
  return (Array.isArray(questions) ? questions : [])
    .slice(0, limit)
    .map((q: any, i: number) => `${i + 1}. ${stripBracketedPrefix(q.question || q.text || "").slice(0, 80)}`)
    .join("\n");
}

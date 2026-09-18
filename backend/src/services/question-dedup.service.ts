import {
  SIMILARITY_THRESHOLD,
  dedupInfoFromQuestion,
  dedupeQuestions,
  filterQuestionsAgainstSeen,
  stripBracketedPrefix,
  type SeenRegistry,
} from "../lib/questions/question-fingerprint";

export const MCQ_SOURCE = "mcq";
export const APTITUDE_SOURCE = "aptitude";

interface HistoryRowShape {
  fingerprint: string;
  templateFingerprint: string;
  timesSeen: number;
  lastSeenAt: Date;
}

export interface UserSeenState extends SeenRegistry {
  rowByFingerprint: Map<string, HistoryRowShape>;
}

function emptyUserSeen(): UserSeenState {
  return {
    fingerprints: new Set(),
    templates: new Set(),
    recentTexts: [],
    rowByFingerprint: new Map(),
  };
}

export interface UserSeenQuery {
  topics?: string[];
  companies?: string[];
  daysBack?: number;
}

export async function getUserSeenState(
  userPrisma: any,
  userId: string,
  source: string,
  query: UserSeenQuery = {}
): Promise<UserSeenState> {
  const empty = emptyUserSeen();
  if (!userPrisma || !userId) return empty;
  try {
    const where: any = { userId, source };
    if (query.topics?.length) where.topic = { in: query.topics };
    if (query.companies?.length) where.company = { in: query.companies };
    if (query.daysBack) where.lastSeenAt = { gte: new Date(Date.now() - query.daysBack * 86400000) };

    const rows = await userPrisma.userQuestionHistory.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      take: 5000,
    });

    const state = empty;
    for (const r of rows) {
      if (r.fingerprint) state.fingerprints.add(r.fingerprint);
      if (r.templateFingerprint) state.templates.add(r.templateFingerprint);
      if (r.questionText) {
        state.recentTexts.push(stripBracketedPrefix(r.questionText).toLowerCase());
        if (state.recentTexts.length > 300) state.recentTexts.shift();
      }
      if (r.fingerprint) {
        state.rowByFingerprint.set(r.fingerprint, {
          fingerprint: r.fingerprint,
          templateFingerprint: r.templateFingerprint,
          timesSeen: r.timesSeen || 1,
          lastSeenAt: r.lastSeenAt,
        });
      }
    }
    return state;
  } catch (err) {
    console.warn("[QuestionDedup] getUserSeenState failed:", (err as Error)?.message || err);
    return empty;
  }
}

export interface RecordQuestionsInput {
  userId: string;
  source: string;
  questions: any[];
  sessionId?: string;
  topic?: string;
  category?: string;
  company?: string;
  difficulty?: string;
}

export async function recordSeenQuestions(userPrisma: any, input: RecordQuestionsInput): Promise<void> {
  if (!userPrisma || !input?.userId || !Array.isArray(input.questions) || input.questions.length === 0) return;
  try {
    const now = new Date();
    const historyRows: any[] = [];
    const sessionRows: any[] = [];

    input.questions.forEach((q, i) => {
      const d = dedupInfoFromQuestion(q);
      if (!d.fingerprint) return;
      const base = {
        fingerprint: d.fingerprint,
        templateFingerprint: d.templateFingerprint,
        questionId: q?.id ?? null,
        topic: q?.topic ?? input.topic ?? null,
        category: q?.category ?? input.category ?? null,
        company: q?.company ?? input.company ?? null,
        difficulty: q?.difficulty ?? input.difficulty ?? null,
      };
      historyRows.push({
        ...base,
        userId: input.userId,
        source: input.source,
        questionText: d.text.slice(0, 1400),
        timesSeen: 1,
        lastSeenAt: now,
      });
      if (input.sessionId) {
        sessionRows.push({
          sessionId: input.sessionId,
          userId: input.userId,
          source: input.source,
          fingerprint: d.fingerprint,
          questionId: q?.id ?? null,
          position: i,
        });
      }
    });

    const ops: any[] = [];
    for (const row of historyRows) {
      ops.push(
        userPrisma.userQuestionHistory.upsert({
          where: {
            userSourceFingerprintUnique: {
              userId: row.userId,
              source: row.source,
              fingerprint: row.fingerprint,
            },
          },
          create: row,
          update: {
            timesSeen: { increment: 1 },
            lastSeenAt: now,
            templateFingerprint: row.templateFingerprint,
            questionText: row.questionText,
            questionId: row.questionId,
          },
        })
      );
    }

    if (sessionRows.length > 0) {
      ops.push(userPrisma.sessionQuestion.createMany({ data: sessionRows, skipDuplicates: true }));
    }

    if (ops.length > 0) await userPrisma.$transaction(ops);
  } catch (err) {
    console.warn("[QuestionDedup] recordSeenQuestions failed:", (err as Error)?.message || err);
  }
}

export async function getSessionSeenState(
  userPrisma: any,
  sessionId: string,
  source: string
): Promise<UserSeenState> {
  const empty = emptyUserSeen();
  if (!userPrisma || !sessionId) return empty;
  try {
    const rows = await userPrisma.sessionQuestion.findMany({ where: { sessionId, source } });
    const state = empty;
    for (const r of rows) {
      if (!r.fingerprint) continue;
      state.fingerprints.add(r.fingerprint);
      state.rowByFingerprint.set(r.fingerprint, {
        fingerprint: r.fingerprint,
        templateFingerprint: "",
        timesSeen: 1,
        lastSeenAt: r.createdAt,
      });
    }
    return state;
  } catch (err) {
    console.warn("[QuestionDedup] getSessionSeenState failed:", (err as Error)?.message || err);
    return empty;
  }
}

export interface SelectionResult<T> {
  questions: T[];
  reuseCount: number;
}

export function selectQuestionsForUser<T extends { question?: string; text?: string; codeSnippet?: string }>(
  pool: T[],
  state: UserSeenState,
  limit: number,
  threshold: number = SIMILARITY_THRESHOLD
): SelectionResult<T> {
  const deduped = dedupeQuestions(pool);
  const unseen = filterQuestionsAgainstSeen(deduped, state, threshold);
  if (unseen.length >= limit) {
    return { questions: unseen.slice(0, limit), reuseCount: 0 };
  }

  const picked = new Set(unseen.map((q) => dedupInfoFromQuestion(q).fingerprint));
  const candidates = deduped.filter((q) => {
    const f = dedupInfoFromQuestion(q).fingerprint;
    if (!f || picked.has(f)) return false;
    picked.add(f);
    return true;
  });

  const scored = candidates
    .map((q) => {
      const r = state.rowByFingerprint.get(dedupInfoFromQuestion(q).fingerprint);
      return {
        q,
        times: r?.timesSeen ?? 0,
        last: r?.lastSeenAt?.getTime?.() ?? 0,
      };
    })
    .sort((a, b) => a.times - b.times || a.last - b.last);

  const fillCount = Math.max(0, limit - unseen.length);
  const filled = scored.slice(0, fillCount).map((s) => s.q);
  return { questions: unseen.concat(filled).slice(0, limit), reuseCount: filled.length };
}
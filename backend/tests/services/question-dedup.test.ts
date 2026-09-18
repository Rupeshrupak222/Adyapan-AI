import { fingerprint, templateFingerprint } from "../../src/lib/questions/question-fingerprint";
import {
  MCQ_SOURCE,
  getSessionSeenState,
  getUserSeenState,
  recordSeenQuestions,
  selectQuestionsForUser,
} from "../../src/services/question-dedup.service";

/**
 * In-memory harness for the per-user Prisma client, mirroring the tables used
 * by the dedup service: user_question_history + session_questions.
 */
function makeUserPrisma() {
  const history: any[] = [];
  const sessions: any[] = [];

  const prisma: any = {
    userQuestionHistory: {
      findMany: jest.fn(async ({ where = {}, orderBy, take }: any = {}) => {
        let rows = history.filter((r) => {
          if (where.userId && r.userId !== where.userId) return false;
          if (where.source && r.source !== where.source) return false;
          if (where.topic?.in && !where.topic.in.includes(r.topic)) return false;
          if (where.company?.in && !where.company.in.includes(r.company)) return false;
          if (where.lastSeenAt?.gte && new Date(r.lastSeenAt) < new Date(where.lastSeenAt.gte)) return false;
          return true;
        });
        if (orderBy?.lastSeenAt === "desc") {
          rows = [...rows].sort(
            (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
          );
        }
        return rows.slice(0, take ?? rows.length).map((r) => ({ ...r }));
      }),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const key = where.userSourceFingerprintUnique;
        const row = history.find(
          (r) =>
            r.userId === key.userId && r.source === key.source && r.fingerprint === key.fingerprint
        );
        if (row) {
          row.timesSeen = (row.timesSeen ?? 1) + (update.timesSeen?.increment ?? 0);
          row.lastSeenAt = update.lastSeenAt ?? row.lastSeenAt;
          if (update.templateFingerprint) row.templateFingerprint = update.templateFingerprint;
          if (update.questionText) row.questionText = update.questionText;
          if (update.questionId !== undefined) row.questionId = update.questionId;
          return { ...row };
        }
        const fresh = { id: `h-${history.length + 1}`, ...create };
        history.push(fresh);
        return { ...fresh };
      }),
    },
    sessionQuestion: {
      createMany: jest.fn(async ({ data, skipDuplicates }: any) => {
        let inserted = 0;
        for (const row of data) {
          if (
            skipDuplicates &&
            sessions.some((s) => s.sessionId === row.sessionId && s.fingerprint === row.fingerprint)
          ) {
            continue;
          }
          sessions.push({ id: `s-${sessions.length + 1}`, createdAt: new Date(), ...row });
          inserted++;
        }
        return { count: inserted };
      }),
      findMany: jest.fn(async ({ where = {} }: any = {}) =>
        sessions
          .filter(
            (s) =>
              (!where.sessionId || s.sessionId === where.sessionId) &&
              (!where.source || s.source === where.source)
          )
          .map((s) => ({ ...s }))
      ),
    },
    $transaction: jest.fn(async (ops: any) => {
      if (Array.isArray(ops)) {
        for (const op of ops) await op();
      } else {
        await ops(prisma);
      }
    }),
  };

  return { prisma, history, sessions };
}

const U = "user-1";

function makeQ(text: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `q-${Math.random().toString(36).slice(2)}`,
    question: text,
    options: ["a", "b", "c", "d"],
    correctIdx: 0,
    ...overrides,
  };
}

describe("getUserSeenState", () => {
  it("returns an empty state when there is no history", async () => {
    const { prisma } = makeUserPrisma();
    const state = await getUserSeenState(prisma, U, MCQ_SOURCE);
    expect(state.fingerprints.size).toBe(0);
    expect(state.templates.size).toBe(0);
    expect(state.recentTexts).toHaveLength(0);
  });

  it("merges rows into fingerprints, templates, recent texts and longest-seen info", async () => {
    const { prisma, history } = makeUserPrisma();
    const t1 = "Which data structure uses FIFO ordering?";
    const t2 = "What is the capital of France?";
    const older = new Date("2026-01-01T00:00:00.000Z");
    const newer = new Date("2026-02-01T00:00:00.000Z");
    history.push(
      {
        userId: U,
        source: MCQ_SOURCE,
        fingerprint: fingerprint(t1),
        templateFingerprint: templateFingerprint(t1),
        questionText: t1,
        timesSeen: 5,
        lastSeenAt: older,
      },
      {
        userId: U,
        source: MCQ_SOURCE,
        fingerprint: fingerprint(t2),
        templateFingerprint: templateFingerprint(t2),
        questionText: `[Company Exam Pattern] ${t2}`,
        timesSeen: 1,
        lastSeenAt: newer,
      }
    );

    const state = await getUserSeenState(prisma, U, MCQ_SOURCE);
    expect(state.fingerprints.size).toBe(2);
    expect(state.templates.size).toBe(2);
    expect(state.recentTexts[0]).toBe(t2.toLowerCase());
    expect(state.recentTexts[0]).not.toContain("[company exam pattern]");
    expect(state.rowByFingerprint.get(fingerprint(t1))?.timesSeen).toBe(5);
  });
});

describe("recordSeenQuestions", () => {
  it("upserts history rows and writes session rows inside a transaction", async () => {
    const { prisma, history, sessions } = makeUserPrisma();
    const q1 = makeQ("Which data structure uses FIFO ordering?");
    const q2 = makeQ("What is the capital of France?");

    await recordSeenQuestions(prisma, {
      userId: U,
      source: MCQ_SOURCE,
      questions: [q1, q2],
      sessionId: "sess-1",
      topic: "Data Structures",
    });

    expect(history).toHaveLength(2);
    expect(sessions).toHaveLength(2);
    expect(history[0]).toMatchObject({
      userId: U,
      source: MCQ_SOURCE,
      fingerprint: fingerprint(q1.question),
      topic: "Data Structures",
      timesSeen: 1,
    });
  });

  it("increments timesSeen when the same fingerprint is recorded again", async () => {
    const { prisma, history } = makeUserPrisma();
    const q = makeQ("What is the time complexity of binary search?");

    await recordSeenQuestions(prisma, { userId: U, source: MCQ_SOURCE, questions: [q] });
    await recordSeenQuestions(prisma, { userId: U, source: MCQ_SOURCE, questions: [q] });

    expect(history).toHaveLength(1);
    expect(history[0].timesSeen).toBe(2);
  });

  it("is a no-op without a prisma client or questions", async () => {
    const { prisma } = makeUserPrisma();
    await recordSeenQuestions(undefined as any, { userId: U, source: MCQ_SOURCE, questions: [makeQ("x")] });
    await recordSeenQuestions(prisma, { userId: U, source: MCQ_SOURCE, questions: [] });
    expect(prisma.userQuestionHistory.upsert).not.toHaveBeenCalled();
  });
});

describe("getSessionSeenState", () => {
  it("returns fingerprints recorded for a session", async () => {
    const { prisma, sessions } = makeUserPrisma();
    const q = makeQ("What is the capital of France?");
    sessions.push({
      sessionId: "sess-9",
      userId: U,
      source: MCQ_SOURCE,
      fingerprint: fingerprint(q.question),
      questionId: q.id,
      position: 0,
      createdAt: new Date(),
    });

    const state = await getSessionSeenState(prisma, "sess-9", MCQ_SOURCE);
    expect(state.fingerprints.has(fingerprint(q.question))).toBe(true);
  });
});

describe("selectQuestionsForUser", () => {
  const Q_A = makeQ("Which data structure uses FIFO ordering?");
  const Q_B = makeQ("What is the capital of France?");
  const Q_C = makeQ("Which sorting algorithm is O(n log n) in the average case?");
  const Q_D = makeQ("What does the this keyword refer to in JavaScript?");

  it("prefers unseen questions and reports reuseCount 0", async () => {
    const { prisma, history } = makeUserPrisma();
    history.push({
      userId: U,
      source: MCQ_SOURCE,
      fingerprint: fingerprint(Q_A.question),
      templateFingerprint: templateFingerprint(Q_A.question),
      questionText: Q_A.question,
      timesSeen: 4,
      lastSeenAt: new Date(),
    });

    const state = await getUserSeenState(prisma, U, MCQ_SOURCE);
    const { questions, reuseCount } = selectQuestionsForUser([Q_A, Q_B, Q_C, Q_D], state, 2);

    expect(reuseCount).toBe(0);
    expect(questions.map((q) => q.id)).toEqual([Q_B.id, Q_C.id]);
  });

  it("fills the batch with least-recently-seen questions once unseen are exhausted", async () => {
    const { prisma } = makeUserPrisma();
    const state = await getUserSeenState(prisma, U, MCQ_SOURCE);
    state.fingerprints.add(fingerprint(Q_A.question));
    state.fingerprints.add(fingerprint(Q_B.question));
    state.rowByFingerprint.set(fingerprint(Q_A.question), {
      fingerprint: fingerprint(Q_A.question),
      templateFingerprint: "",
      timesSeen: 3,
      lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    state.rowByFingerprint.set(fingerprint(Q_B.question), {
      fingerprint: fingerprint(Q_B.question),
      templateFingerprint: "",
      timesSeen: 1,
      lastSeenAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    const { questions, reuseCount } = selectQuestionsForUser([Q_A, Q_B], state, 2);

    expect(reuseCount).toBe(2);
    // Least-recently-seen first: B (timesSeen 1) then A (timesSeen 3)
    expect(questions.map((q) => q.id)).toEqual([Q_B.id, Q_A.id]);
  });

  it("blocks template variants (renumbered copies) of already-seen questions", async () => {
    const { prisma } = makeUserPrisma();
    const seenText = "If a machine produces 12 units per hour, how many units in 8 hours?";
    const state = await getUserSeenState(prisma, U, MCQ_SOURCE);
    state.recentTexts.push(seenText.toLowerCase());
    state.templates.add(templateFingerprint(seenText));

    const variant = makeQ("If a machine produces 45 units per hour, how many units in 5 hours?");

    const { questions, reuseCount } = selectQuestionsForUser([variant], state, 1);
    // Variant is filtered out as unseen; the fill mechanism can still return it
    // but it must come back as a re-served question (reuseCount 1), never a fresh one.
    expect(reuseCount).toBe(1);
    expect(questions).toHaveLength(1);
  });
});
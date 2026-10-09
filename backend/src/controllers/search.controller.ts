import type { Request, Response } from "express";
import { getUserPrismaFromRequest } from "../utils/prisma";

interface SearchResult {
  id: string;
  label: string;
  category: string;
  viewId: string;
  subtitle?: string;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return [] as any;
  }
}

export async function globalSearch(req: Request, res: Response) {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const userPrisma = await getUserPrismaFromRequest(req);
    const userId = (req as any).user?.userId || (req as any).user?.id || null;
    const like = { contains: q, mode: "insensitive" as const };

    const [
      notes,
      quizzes,
      assignments,
      mindMaps,
      chatSessions,
      interviewSessions,
      codingSessions,
      resumes,
      coverLetters,
      flashcards,
      codingQuestions,
      careerRoadmaps,
      researchPapers,
      blogs,
      studySessions,
      jobListings,
    ] = await Promise.all<any[]>([
      // 1. Notes (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.generatedNote.findMany({
              where: { userId, OR: [{ topic: like }, { subject: like }] },
              select: { id: true, topic: true, subject: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 2. Quizzes (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.quiz.findMany({
              where: { userId, topic: like },
              select: { id: true, topic: true, difficulty: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 3. Assignments (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.assignment.findMany({
              where: { userId, topic: like },
              select: { id: true, topic: true, academicLevel: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 4. Mind Maps (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.mindMap.findMany({
              where: { userId, topic: like },
              select: { id: true, topic: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 5. Chat Sessions (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.chatSession.findMany({
              where: { userId, title: like },
              select: { id: true, title: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 6. Interview Sessions (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.interviewSession.findMany({
              where: {
                userId,
                OR: [{ role: like }, { company: like }, { technology: like }],
              },
              select: { id: true, role: true, company: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 7. Coding Sessions (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.codingSession.findMany({
              where: { userId, title: like },
              select: { id: true, title: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 8. Resumes (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.resume.findMany({
              where: {
                userId,
                OR: [{ title: like }, { targetCompany: like }],
              },
              select: { id: true, title: true, template: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 9. Cover Letters (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.coverLetter.findMany({
              where: {
                userId,
                OR: [{ companyName: like }, { role: like }],
              },
              select: { id: true, companyName: true, role: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 10. Flashcards (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.flashcard.findMany({
              where: { userId, OR: [{ topic: like }, { front: like }] },
              select: { id: true, topic: true, front: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 11. Coding Questions (public)
      safeQuery(() =>
        userPrisma.codingQuestion.findMany({
          where: { OR: [{ title: like }, { topic: like }] },
          select: { id: true, title: true, difficulty: true, topic: true },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      ),

      // 12. Career Roadmaps (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.careerRoadmap.findMany({
              where: { userId, OR: [{ title: like }, { targetRole: like }] },
              select: { id: true, title: true, targetRole: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 13. Research Papers (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.researchPaper.findMany({
              where: { userId, OR: [{ title: like }, { domain: like }] },
              select: { id: true, title: true, domain: true, status: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 14. Blogs (public)
      safeQuery(() =>
        userPrisma.blog.findMany({
          where: { OR: [{ title: like }, { content: like }] },
          select: { id: true, title: true, category: true },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      ),

      // 15. Study Sessions (user-scoped)
      userId
        ? safeQuery(() =>
            userPrisma.studySession.findMany({
              where: { userId, OR: [{ topic: like }, { subject: like }] },
              select: { id: true, topic: true, subject: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          )
        : Promise.resolve([]),

      // 16. Job Listings (public)
      safeQuery(() =>
        userPrisma.jobListing.findMany({
          where: {
            OR: [
              { title: like },
              { company: like },
              { location: like },
              { category: like },
            ],
          },
          select: { id: true, title: true, company: true, location: true },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      ),
    ]);

    // ── Map results to SearchResult ─────────────────────────────────────
    const results: SearchResult[] = [];

    const push = (items: any[], mapFn: (item: any) => SearchResult) => {
      for (const item of items) {
        if (item) results.push(mapFn(item));
      }
    };

    push(notes, (n) => ({
      id: `note-${n.id}`,
      label: n.topic || "Untitled Note",
      category: "Notes",
      viewId: "notes-generator",
      subtitle: n.subject || "Generated Study Note",
    }));

    push(quizzes, (q) => ({
      id: `quiz-${q.id}`,
      label: q.topic || "Untitled Quiz",
      category: "Quizzes",
      viewId: "quiz-generator",
      subtitle: q.difficulty ? `${q.difficulty} Difficulty` : "Quiz",
    }));

    push(assignments, (a) => ({
      id: `assignment-${a.id}`,
      label: a.topic || "Untitled Assignment",
      category: "Assignments",
      viewId: "assignment-generator",
      subtitle: a.academicLevel || "Assignment",
    }));

    push(mindMaps, (m) => ({
      id: `mindmap-${m.id}`,
      label: m.topic || "Untitled Mind Map",
      category: "Mind Maps",
      viewId: "mind-maps",
      subtitle: "Visual Concept Map",
    }));

    push(chatSessions, (c) => ({
      id: `chat-${c.id}`,
      label: c.title || "Untitled Chat",
      category: "Ady Chats",
      viewId: "ady-chat",
      subtitle: "AI Conversation History",
    }));

    push(interviewSessions, (i) => ({
      id: `interview-${i.id}`,
      label: `${i.role || "Interview"}${i.company ? ` @ ${i.company}` : ""}`,
      category: "Interviews",
      viewId: "interview-hub",
      subtitle: "Interview Prep Session",
    }));

    push(codingSessions, (s) => ({
      id: `codesess-${s.id}`,
      label: s.title || "Coding Session",
      category: "Coding Sessions",
      viewId: "dsa-practice",
      subtitle: "DSA Coding Workspace",
    }));

    push(resumes, (r) => ({
      id: `resume-${r.id}`,
      label: r.title || "Untitled Resume",
      category: "Resumes",
      viewId: "resume-builder",
      subtitle: r.template ? `${r.template} Template` : "Resume Document",
    }));

    push(coverLetters, (c) => ({
      id: `cl-${c.id}`,
      label: `${c.companyName || "Company"} — ${c.role || "Role"}`,
      category: "Cover Letters",
      viewId: "cover-letter",
      subtitle: "Tailored Cover Letter",
    }));

    push(flashcards, (f) => ({
      id: `flashcard-${f.id}`,
      label: f.topic || "Flashcard",
      category: "Flashcards",
      viewId: "flashcards",
      subtitle: f.front ? f.front.slice(0, 60) : "Flashcard Item",
    }));

    push(codingQuestions, (c) => ({
      id: `problem-${c.id}`,
      label: c.title || "DSA Problem",
      category: "DSA Problems",
      viewId: "dsa-practice",
      subtitle: `${c.difficulty || "Medium"} · ${c.topic || "Algorithm"}`.replace(/^ · | · $/g, ""),
    }));

    push(careerRoadmaps, (r) => ({
      id: `roadmap-${r.id}`,
      label: r.title || "Career Roadmap",
      category: "Career Roadmaps",
      viewId: "career-dashboard",
      subtitle: r.targetRole ? `Goal: ${r.targetRole}` : "Roadmap",
    }));

    push(researchPapers, (p) => ({
      id: `paper-${p.id}`,
      label: p.title || "Research Paper",
      category: "Research Papers",
      viewId: "research-hub",
      subtitle: [p.domain, p.status].filter(Boolean).join(" · ") || "Academic Research",
    }));

    push(blogs, (b) => ({
      id: `blog-${b.id}`,
      label: b.title || "Blog Post",
      category: "Community Blogs",
      viewId: "community-blog",
      subtitle: b.category ? `Category: ${b.category}` : "Community Article",
    }));

    push(studySessions, (s) => ({
      id: `study-${s.id}`,
      label: s.topic || "Study Session",
      category: "Study Sessions",
      viewId: "study-assistant",
      subtitle: s.subject || "Study Assistant Lesson",
    }));

    push(jobListings, (j) => ({
      id: `job-${j.id}`,
      label: `${j.title || "Job"}${j.company ? ` @ ${j.company}` : ""}`,
      category: "Job Listings",
      viewId: "job-discovery",
      subtitle: j.location || "Active Opportunity",
    }));

    res.json({ success: true, data: results });
  } catch (err: any) {
    console.error("[Search] Global search failed:", err?.message || err);
    res.json({ success: true, data: [] });
  }
}

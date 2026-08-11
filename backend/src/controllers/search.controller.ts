import type { Request, Response } from "express";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { prisma as masterPrisma } from "../config/prisma";

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
    const userId = req.user!.userId;
    const opts: any = { mode: "insensitive" };

    const [
      notes,
      quizzes,
      assignments,
      presentations,
      mindMaps,
      chatSessions,
      interviewSessions,
      codingSessions,
      resumes,
      coverLetters,
      linkedinReports,
      jobListings,
      jobs,
      flashcards,
      codingQuestions,
      careerRoadmaps,
      researchPapers,
    ] = await Promise.all<any[]>([
      safeQuery(() =>
        userPrisma.generatedNote.findMany({
          where: { userId, OR: [{ topic: opts }, { subject: opts }] },
          select: { id: true, topic: true, subject: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.quiz.findMany({
          where: { userId, topic: opts },
          select: { id: true, topic: true, difficulty: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.assignment.findMany({
          where: { userId, topic: opts },
          select: { id: true, topic: true, academicLevel: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.presentation.findMany({
          where: { userId, topic: opts },
          select: { id: true, topic: true, slideCount: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.mindMap.findMany({
          where: { userId, topic: opts },
          select: { id: true, topic: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.chatSession.findMany({
          where: { userId, title: opts },
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.interviewSession.findMany({
          where: {
            userId,
            OR: [{ role: opts }, { company: opts }, { technology: opts }],
          },
          select: { id: true, role: true, company: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.codingSession.findMany({
          where: { userId, title: opts },
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.resume.findMany({
          where: {
            userId,
            OR: [{ title: opts }, { targetCompany: opts }],
          },
          select: { id: true, title: true, template: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.coverLetter.findMany({
          where: {
            userId,
            OR: [{ companyName: opts }, { role: opts }],
          },
          select: { id: true, companyName: true, role: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.linkedInReport.findMany({
          where: { userId, headline: opts },
          select: { id: true, headline: true, score: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      ),
      safeQuery(() =>
        userPrisma.jobListing.findMany({
          where: {
            OR: [{ title: opts }, { company: opts }, { location: opts }],
          },
          select: { id: true, title: true, company: true, location: true },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.job.findMany({
          where: {
            OR: [{ role: opts }, { company: opts }, { location: opts }],
          },
          select: { id: true, role: true, company: true, location: true },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.flashcard.findMany({
          where: { userId, topic: opts },
          select: { id: true, topic: true, front: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
      safeQuery(() =>
        masterPrisma.codingQuestion.findMany({
          where: {
            OR: [{ title: opts }, { topic: opts }],
          },
          select: { id: true, title: true, topic: true, difficulty: true },
          take: 5,
        })
      ),
      safeQuery(() =>
        userPrisma.careerRoadmap.findMany({
          where: { userId, targetRole: opts },
          select: { id: true, targetRole: true, timeline: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      ),
      safeQuery(() =>
        masterPrisma.researchPaper.findMany({
          where: {
            userId,
            OR: [{ title: opts }, { domain: opts }],
          },
          select: { id: true, title: true, domain: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      ),
    ]);

    const results: SearchResult[] = [];

    const addItems = (
      items: any[],
      mapFn: (item: any) => SearchResult
    ) => {
      for (const item of items) results.push(mapFn(item));
    };

    addItems(notes, (n) => ({
      id: n.id, label: n.topic, category: "Notes", viewId: "notes-generator",
      subtitle: n.subject || undefined,
    }));
    addItems(quizzes, (q) => ({
      id: q.id, label: q.topic, category: "Quizzes", viewId: "quiz-generator",
      subtitle: q.difficulty || undefined,
    }));
    addItems(assignments, (a) => ({
      id: a.id, label: a.topic, category: "Assignments", viewId: "assignment-generator",
      subtitle: a.academicLevel,
    }));
    addItems(mindMaps, (m) => ({
      id: m.id, label: m.topic, category: "Mind Maps", viewId: "mind-maps",
    }));
    addItems(chatSessions, (c) => ({
      id: c.id, label: c.title, category: "Ady Chats", viewId: "ady-chat",
    }));
    addItems(interviewSessions, (i) => ({
      id: i.id, label: `${i.role}${i.company ? ` @ ${i.company}` : ""}`, category: "Interviews", viewId: "interview-hub",
    }));
    addItems(codingSessions, (s) => ({
      id: s.id, label: s.title, category: "Coding Sessions", viewId: "dsa-practice",
    }));
    addItems(resumes, (r) => ({
      id: r.id, label: r.title, category: "Resumes", viewId: "resume-builder",
      subtitle: r.template,
    }));
    addItems(coverLetters, (c) => ({
      id: c.id, label: `${c.companyName} — ${c.role}`, category: "Cover Letters", viewId: "cover-letter",
    }));
    addItems(linkedinReports, (l) => ({
      id: l.id, label: l.headline, category: "LinkedIn Reports", viewId: "linkedin-optimizer",
      subtitle: `Score: ${l.score}`,
    }));
    addItems(jobListings, (j) => ({
      id: j.id, label: `${j.title} @ ${j.company}`, category: "Job Listings", viewId: "job-hub",
      subtitle: j.location,
    }));
    addItems(jobs, (j) => ({
      id: j.id, label: `${j.role} @ ${j.company}`, category: "Jobs", viewId: "job-hub",
      subtitle: j.location,
    }));
    addItems(flashcards, (f) => ({
      id: f.id, label: f.topic, category: "Flashcards", viewId: "flashcards",
      subtitle: f.front.slice(0, 60),
    }));
    addItems(codingQuestions, (c) => ({
      id: c.id, label: c.title, category: "DSA Problems", viewId: "dsa-practice",
      subtitle: `${c.difficulty} · ${c.topic}`,
    }));
    addItems(researchPapers, (p) => ({
      id: p.id, label: p.title, category: "Research Papers", viewId: "research-hub",
      subtitle: `${p.domain} · ${p.status}`,
    }));

    res.json({ success: true, data: results });
  } catch (err: any) {
    console.error("[Search] Global search failed:", err?.message || err);
    res.json({ success: true, data: [] });
  }
}

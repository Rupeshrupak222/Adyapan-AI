

export type ResumeHubViewType =
  | "dashboard"
  | "profile"
  | "settings"
  | "resume-hub"
  | "resume-builder"
  | "resume-upload"
  | "ats-checker"
  | "resume-improvements"
  | "cover-letter"
  | "linkedin-optimizer"
  | "lesson-view"
  | "study-assistant"
  | "notes-generator"
  | "quiz-generator"
  | "assignment-generator"
  | "ppt-generator"
  | "mind-maps"
  | "coding-assistant"
  | "dsa-practice"
  | "coding-challenges"
  | "github-portfolio"
  | "notifications"
  | "ady-chat"
  | "interview-hub"
  | "interview-hr"
  | "interview-technical"
  | "interview-mock"
  | "flashcards"
  | "job-discovery"
  | "placement-hub"
  | "placement-aptitude"
  | "placement-reasoning"
  | "placement-mcqs"
  | "placement-mocks"
  | "placement-readiness"
  | "productivity-hub"
  | "prod-email"
  | "prod-sop"
  | "prod-linkedin"
  | "prod-content"
  | "analytics-hub"
  | "analytics-learning"
  | "analytics-interview"
  | "analytics-resume"
  | "analytics-skills"
  | "profile"
  | "settings"
  | "profile-learning"
  | "billing"
  | "community-profile"
  | "research-hub"
  | "research-paper-ai"
  | "research-plagiarism"
  | "progress-hub"
  | "study-planner"
  | "career-roadmap";

// ─── JSON Resume Types (https://jsonresume.org/schema/) ─────────────────────

export interface JSONResume {
  $schema?: string;
  basics: JSONResumeBasics;
  work?: JSONResumeWork[];
  volunteer?: JSONResumeVolunteer[];
  education?: JSONResumeEducation[];
  awards?: JSONResumeAward[];
  certificates?: JSONResumeCertificate[];
  publications?: JSONResumePublication[];
  skills?: JSONResumeSkill[];
  languages?: JSONResumeLanguage[];
  interests?: JSONResumeInterest[];
  references?: JSONResumeReference[];
  projects?: JSONResumeProject[];
  meta?: JSONResumeMeta;
}

export interface JSONResumeBasics {
  name?: string;
  label?: string;
  image?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: JSONResumeLocation;
  profiles?: JSONResumeProfile[];
}

export interface JSONResumeLocation {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
}

export interface JSONResumeProfile {
  network?: string;
  username?: string;
  url?: string;
}

export interface JSONResumeWork {
  name?: string;
  location?: string;
  description?: string;
  position?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface JSONResumeVolunteer {
  organization?: string;
  position?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface JSONResumeEducation {
  institution?: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
  courses?: string[];
}

export interface JSONResumeAward {
  title?: string;
  date?: string;
  awarder?: string;
  summary?: string;
}

export interface JSONResumeCertificate {
  name?: string;
  date?: string;
  url?: string;
  issuer?: string;
}

export interface JSONResumePublication {
  name?: string;
  publisher?: string;
  releaseDate?: string;
  url?: string;
  summary?: string;
}

export interface JSONResumeSkill {
  name?: string;
  level?: string;
  keywords?: string[];
}

export interface JSONResumeLanguage {
  language?: string;
  fluency?: string;
}

export interface JSONResumeInterest {
  name?: string;
  keywords?: string[];
}

export interface JSONResumeReference {
  name?: string;
  reference?: string;
}

export interface JSONResumeProject {
  name?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  roles?: string[];
  entity?: string;
  type?: string;
}

export interface JSONResumeMeta {
  canonical?: string;
  version?: string;
  lastModified?: string;
}

// ─── Legacy Types (kept for backward compat with existing components) ───────

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
}

export interface EducationItem {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProjectItem {
  name?: string;
  title?: string;
  techStack: string;
  description: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
}

// ─── Helpers: Convert between JSON Resume and legacy form state ─────────────

export function jsonResumeToFormState(jr: JSONResume): {
  personalInfo: { fullName: string; email: string; phone: string; location: string; website: string; summary: string };
  summary: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: { name: string; techStack: string; description: string }[];
  skills: string[];
  certifications: CertificationItem[];
  achievements: string[];
  languages: string[];
} {
  const b = jr.basics ?? {};
  const profiles = b.profiles ?? [];
  const linkedin = profiles.find((p) => p.network === "LinkedIn")?.url ?? "";
  const github = profiles.find((p) => p.network === "GitHub")?.url ?? "";

  return {
    personalInfo: {
      fullName: b.name ?? "",
      email: b.email ?? "",
      phone: b.phone ?? "",
      location: b.location?.city ?? "",
      website: b.url ?? "",
      summary: b.summary ?? "",
    },
    summary: b.summary ?? "",
    education: (jr.education ?? []).map((e) => ({
      institution: e.institution ?? "",
      degree: e.studyType ?? "",
      fieldOfStudy: e.area ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      grade: e.score ?? "",
    })),
    experience: (jr.work ?? []).map((w) => ({
      company: w.name ?? "",
      role: w.position ?? "",
      startDate: w.startDate ?? "",
      endDate: w.endDate ?? "",
      description: w.summary ?? (w.highlights ?? []).join("\n"),
    })),
    projects: (jr.projects ?? []).map((p) => ({
      name: p.name ?? "",
      title: p.name ?? "",
      techStack: (p.keywords ?? []).join(", "),
      description: p.description ?? "",
    })),
    skills: (jr.skills ?? []).flatMap((s) => s.keywords ?? []),
    certifications: (jr.certificates ?? []).map((c) => ({
      name: c.name ?? "",
      issuer: c.issuer ?? "",
      date: c.date ?? "",
    })),
    achievements: (jr.awards ?? []).map((a) => a.title ?? ""),
    languages: (jr.languages ?? []).map((l) => l.language ?? ""),
  };
}

export function formStateToJSONResume(state: {
  personalInfo: { fullName: string; email: string; phone: string; location: string; linkedin?: string; github?: string; portfolio?: string; website?: string; summary?: string; [key: string]: any };
  summary: string;
  education: { institution: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string; grade: string }[];
  experience: { company: string; role: string; startDate: string; endDate: string; description: string }[];
  projects: { name?: string; title?: string; techStack: string; description: string }[];
  skills: string[];
  certifications: { name: string; issuer: string; date: string }[];
  achievements: string[];
  languages: string[];
}): JSONResume {
  const p = state.personalInfo;

  const profiles: JSONResumeProfile[] = [];
  // linkedin/github are stored in personalInfo by the form but not in the type
  const pi = p as any;
  if (pi.linkedin) profiles.push({ network: "LinkedIn", url: pi.linkedin, username: pi.linkedin.split("/").pop() ?? "" });
  if (pi.github) profiles.push({ network: "GitHub", url: pi.github, username: pi.github.split("/").pop() ?? "" });

  return {
    $schema: "https://raw.githubusercontent.com/jsonresume/jsonresume.org/master/packages/schema/schema.json",
    basics: {
      name: p.fullName,
      email: p.email,
      phone: p.phone,
      url: p.website,
      summary: state.summary || p.summary,
      location: p.location ? { city: p.location } : undefined,
      profiles: profiles.length ? profiles : undefined,
    },
    work: state.experience.length ? state.experience.map((e) => ({
      name: e.company,
      position: e.role,
      startDate: e.startDate,
      endDate: e.endDate,
      summary: e.description,
      highlights: e.description ? e.description.split("\n").filter(Boolean) : [],
    })) : undefined,
    education: state.education.length ? state.education.map((e) => ({
      institution: e.institution,
      area: e.fieldOfStudy,
      studyType: e.degree,
      startDate: e.startDate,
      endDate: e.endDate,
      score: e.grade,
    })) : undefined,
    projects: state.projects.length ? state.projects.map((pr) => ({
      name: pr.name ?? pr.title ?? "",
      description: pr.description,
      keywords: pr.techStack ? pr.techStack.split(",").map((s) => s.trim()).filter(Boolean) : [],
    })) : undefined,
    skills: state.skills.length ? [{
      name: "Technical Skills",
      level: "Professional",
      keywords: state.skills,
    }] : undefined,
    certificates: state.certifications.length ? state.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date,
    })) : undefined,
    awards: state.achievements?.length ? state.achievements.map((a) => ({
      title: a,
    })) : undefined,
    languages: state.languages.length ? state.languages.map((l) => ({
      language: l,
      fluency: "Fluent",
    })) : undefined,
  };
}

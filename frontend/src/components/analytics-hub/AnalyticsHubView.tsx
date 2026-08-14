"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import {
  Search, Calendar, DollarSign, Send, Sparkles, CheckCircle2,
  XCircle, Info, Heart, ArrowRight, Share2, Trash2, Plus, Clock,
  MessageSquare, Award, ArrowLeft, ArrowRightLeft, ChevronRight,
  AlertCircle, FileText, UserCheck, Play, PlusCircle, Check, RefreshCw,
  TrendingUp, Award as BadgeIcon, BookOpen, GraduationCap, Users, Layout
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend, Cell
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

import { InterviewAnalyticsView } from "@/components/interview-hub/InterviewAnalyticsView";
import { api } from "@/services/api";
import type { ResumeHubViewType } from "@/types/resume";

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }),
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnalyticsHubViewProps {
  setView: (v: string) => void;
  activeModule?: string;
  theme?: string;
}

export function AnalyticsHubView({ setView, activeModule = "analytics-hub", theme = "dark" }: AnalyticsHubViewProps) {
  const isDark = theme === "dark";
  const c = {
    bg: isDark ? "#080710" : "#f0f4ff",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    surfaceHover: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#475569",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8",
    primary: "#f59e0b",
    primaryDark: "#d97706",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
  };

  // Tab State: "interview" | "resume" | "skills"
  const [tab, setTab] = useState<"interview" | "resume" | "skills">("interview");

  // AI Assistant panel state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hello! I am your Adyapan AI Performance Coach. Ask me to parse your learning logs, audit interview feedback, or recommend skill paths!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Interview analytics data
  const [engineAnalytics, setEngineAnalytics] = useState<any>(null);
  const [interviewHistory, setInterviewHistory] = useState<any[]>([]);
  const [hrAnalytics, setHrAnalytics] = useState<any>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [resumeStats, setResumeStats] = useState<any>(null);

  // Placement intelligence data (for Resume Score tab)
  const [placementData, setPlacementData] = useState<any>(null);

  // Aptitude analytics data (for Skill Growth tab)
  const [aptitudeAnalytics, setAptitudeAnalytics] = useState<any>(null);

  // Sync tab with activeModule from props
  useEffect(() => {
    if (activeModule === "analytics-interview" || activeModule === "analytics-learning") setTab("interview");
    else if (activeModule === "analytics-resume") setTab("resume");
    else if (activeModule === "analytics-skills") setTab("skills");
  }, [activeModule]);

  // Fetch interview analytics when tab is selected
  useEffect(() => {
    if (tab === "interview") {
      let cancelled = false;
      (async () => {
        setInterviewLoading(true);
        try {
          const [engineRes, historyRes, hrRes] = await Promise.allSettled([
            api.get("/engine/analytics"),
            api.get("/interview/history"),
            api.get("/interview/hr/analytics"),
          ]);
          if (cancelled) return;
          if (engineRes.status === "fulfilled" && engineRes.value.data) {
            setEngineAnalytics(engineRes.value.data);
          }
          if (historyRes.status === "fulfilled" && historyRes.value.data?.sessions) {
            setInterviewHistory(historyRes.value.data.sessions);
          }
          if (hrRes.status === "fulfilled" && hrRes.value.data) {
            setHrAnalytics(hrRes.value.data);
          }
        } catch { /* ignore */ }
        finally { if (!cancelled) setInterviewLoading(false); }
      })();
      return () => { cancelled = true; };
    }
    if (tab === "resume") {
      (async () => {
        try {
          const [atsRes, intelRes] = await Promise.allSettled([
            api.get("/ats/latest"),
            api.get("/placement/intelligence/score"),
          ]);
          if (atsRes.status === "fulfilled" && atsRes.value.data?.success && atsRes.value.data.report) setResumeStats(atsRes.value.data.report);
          if (intelRes.status === "fulfilled" && intelRes.value.data?.success) setPlacementData(intelRes.value.data);
        } catch { /* ignore */ }
      })();
    }
    if (tab === "skills") {
      (async () => {
        try {
          const [aptRes, progressRes] = await Promise.allSettled([
            api.get("/aptitude/analytics"),
            api.get("/progress/dashboard"),
          ]);
          if (aptRes.status === "fulfilled" && aptRes.value.data?.success) setAptitudeAnalytics(aptRes.value.data.analytics);
          if (progressRes.status === "fulfilled" && progressRes.value.data?.success) {
            setAptitudeAnalytics((prev: any) => ({ ...prev, ...progressRes.value.data }));
          }
        } catch { /* ignore */ }
      })();
    }
  }, [tab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleAssistantSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const promptText = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: promptText }]);
    setChatLoading(true);

    try {
      const res = await api.post("/analytics/chat", { query: promptText, tab });
      const data = res.data;
      const responseText = data?.response || "I couldn't process that request. Please try again.";
      setChatMessages(prev => [...prev, { role: "assistant", content: responseText }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col h-full min-h-[calc(100vh-120px)]"
      style={{ color: c.text }}
    >
      <div className="flex-1 flex flex-col gap-4">

        {/* Compact Module Header */}
        <div className="flex justify-between items-center border-b pb-2.5 shrink-0" style={{ borderColor: c.border }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Analytics Workspace</p>
            <h2 className="text-base font-extrabold" style={{ fontFamily: "var(--font-sans)" }}>
              {tab === "interview" && "Interview Progress"}
              {tab === "resume" && "Resume Score"}
              {tab === "skills" && "Skill Growth"}
            </h2>
          </div>
          <motion.button
            onClick={() => setAssistantOpen(!assistantOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 18 }}
            >
              <Sparkles size={12} className="animate-pulse" />
            </motion.div> AI Assistant
          </motion.button>
        </div>

        {/* ==================== 3. CONTENT AREA ==================== */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">

            {/* TAB B: INTERVIEW PROGRESS */}
            {tab === "interview" && (
              <InterviewAnalyticsView setView={setView} />
            )}

            {/* TAB C: RESUME SCORE */}
            {tab === "resume" && (
              <motion.div
                key="resume"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-1 custom-scrollbar"
              >
                {/* Overall Score + Placement Score */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="p-6 border rounded-2xl text-center space-y-2" style={{ borderColor: c.border, background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.04))" }}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">ATS Score</p>
                    <p className="text-4xl font-black text-emerald-500">{resumeStats?.overallScore ?? resumeStats?.score ?? 0}</p>
                    <p className="text-[10px]" style={{ color: c.textMuted }}>{resumeStats?.resume?.title || "Latest Resume"}</p>
                  </motion.div>
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="p-6 border rounded-2xl text-center space-y-2" style={{ borderColor: c.border, background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.04))" }}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Placement Score</p>
                    <p className="text-4xl font-black" style={{ color: c.primary }}>{placementData?.placementScore ?? 0}</p>
                    <p className="text-[10px]" style={{ color: c.textMuted }}>Overall Readiness</p>
                  </motion.div>
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="p-5 border rounded-2xl space-y-3" style={{ borderColor: c.border }}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Sub-Scores</p>
                    {placementData?.subScores && typeof placementData.subScores === "object" ? Object.entries(placementData.subScores).map(([k, v]: [string, any], i: number) => (
                      <div key={k} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold" style={{ color: c.textSec }}>
                          <span className="capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                          <span>{v}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${v}%`, background: `hsl(${i * 45}, 70%, 55%)` }} />
                        </div>
                      </div>
                    )) : <p className="text-xs" style={{ color: c.textMuted }}>Complete an ATS scan to see sub-scores</p>}
                  </motion.div>
                </div>

                {/* Radar chart for section scores */}
                {resumeStats && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="p-5 border rounded-2xl" style={{ borderColor: c.border, background: c.cardBg }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-4">Section Score Breakdown</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={[
                        { subject: "Formatting", score: resumeStats.formattingScore ?? 0 },
                        { subject: "Keywords", score: resumeStats.keywordScore ?? 0 },
                        { subject: "Experience", score: resumeStats.experienceScore ?? 0 },
                        { subject: "Projects", score: resumeStats.projectScore ?? 0 },
                        { subject: "Skills", score: resumeStats.skillsScore ?? 0 },
                        { subject: "Education", score: resumeStats.educationScore ?? 0 },
                        { subject: "Readability", score: resumeStats.readabilityScore ?? 0 },
                      ]}>
                        <PolarGrid stroke={c.border} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: c.textSec }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: c.textMuted }} />
                        <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* Section completions & Missing areas from reportJson */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="p-5 border rounded-2xl space-y-3" style={{ borderColor: c.border, background: c.cardBg }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1"><CheckCircle2 size={14} /> Strengths</h4>
                    <ul className="space-y-1.5 text-xs font-semibold" style={{ color: c.textSec }}>
                      {resumeStats?.reportJson?.strengths?.length > 0
                        ? resumeStats.reportJson.strengths.slice(0, 6).map((s: string, i: number) => <li key={i}>✓ {s}</li>)
                        : resumeStats?.score >= 70
                          ? ["✓ Strong keyword coverage", "✓ Professional formatting", "✓ Relevant experience"]
                          : [<li key="na">Upload a resume to see strengths</li>]
                      }
                    </ul>
                  </motion.div>
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="p-5 border rounded-2xl space-y-3" style={{ borderColor: c.border, background: c.cardBg }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1"><AlertCircle size={14} /> Missing Areas</h4>
                    <ul className="space-y-1.5 text-xs font-semibold" style={{ color: c.textSec }}>
                      {resumeStats?.missingKeywords && Array.isArray(resumeStats.missingKeywords) && resumeStats.missingKeywords.length > 0
                        ? resumeStats.missingKeywords.slice(0, 6).map((kw: string, i: number) => <li key={i}>• {kw}</li>)
                        : resumeStats?.reportJson?.missing?.length > 0
                          ? resumeStats.reportJson.missing.slice(0, 6).map((m: string, i: number) => <li key={i}>• {m}</li>)
                          : [<li key="na">Upload a resume to see missing areas</li>]
                      }
                    </ul>
                  </motion.div>
                </div>

                {!resumeStats && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="p-8 border rounded-2xl text-center space-y-3" style={{ borderColor: c.border }}>
                    <p className="text-sm font-bold" style={{ color: c.text }}>No resume data available</p>
                    <p className="text-xs" style={{ color: c.textMuted }}>Upload or build a resume and run an ATS scan to see your score analytics.</p>
                    <motion.button onClick={() => setView("resume-hub")} className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>Go to Resume Hub</motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* TAB D: SKILL GROWTH */}
            {tab === "skills" && (
              <motion.div
                key="skills"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-1 custom-scrollbar"
              >
                {/* Top Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Topics Mastered", value: (aptitudeAnalytics?.topicMastery ?? []).filter((t: any) => t.accuracy >= 80).length, color: "#10b981" },
                    { label: "Overall Accuracy", value: `${Math.round(aptitudeAnalytics?.overallAccuracy ?? 0)}%`, color: "#f59e0b" },
                    { label: "Questions Solved", value: aptitudeAnalytics?.totalQuestions ?? 0, color: "#3b82f6" },
                    { label: "Placement Readiness", value: `${aptitudeAnalytics?.placementReadiness ?? 0}%`, color: "#8b5cf6" },
                  ].map((s, i) => (
                    <motion.div key={s.label} variants={fadeUp} initial="hidden" animate="visible" custom={i} className="p-4 rounded-2xl border text-center" style={{ borderColor: c.border, background: c.cardBg }}>
                      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>{s.label}</p>
                      <p className="text-xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Topic Mastery Radar */}
                  {aptitudeAnalytics?.topicMastery?.length > 0 && (
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="p-5 border rounded-2xl" style={{ borderColor: c.border, background: c.cardBg }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Skill Mastery Radar</h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={aptitudeAnalytics.topicMastery.slice(0, 8).map((t: any) => ({ subject: t.topic.length > 12 ? t.topic.slice(0, 12) + "…" : t.topic, score: Math.round(t.accuracy) }))}>
                          <PolarGrid stroke={c.border} />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: c.textSec }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: c.textMuted }} />
                          <Radar name="Accuracy" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}

                  {/* Category Scores Bar Chart */}
                  {aptitudeAnalytics?.categoryScores && Object.keys(aptitudeAnalytics.categoryScores).length > 0 && (
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="p-5 border rounded-2xl" style={{ borderColor: c.border, background: c.cardBg }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Category Performance</h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={Object.entries(aptitudeAnalytics.categoryScores).map(([cat, score]: [string, any]) => ({ name: cat.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()), score: Math.round(score) }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: c.textMuted }} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: c.textSec }} />
                          <ReTooltip contentStyle={{ background: isDark ? "#1a1a2e" : "#fff", border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 11 }} />
                          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                            {(Object.entries(aptitudeAnalytics.categoryScores) as [string, number][]).map(([,], idx) => (
                              <Cell key={idx} fill={["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"][idx % 5]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}
                </div>

                {/* Skill Mastery Levels (from real topicMastery) */}
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="p-5 border rounded-2xl space-y-3" style={{ borderColor: c.border, background: c.cardBg }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2"><TrendingUp size={14} /> Topic Mastery</h4>
                  <div className="space-y-2">
                    {(aptitudeAnalytics?.topicMastery ?? []).length > 0
                      ? aptitudeAnalytics.topicMastery.sort((a: any, b: any) => b.accuracy - a.accuracy).map((t: any, i: number) => {
                          const colors = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6"];
                          return (
                            <div key={t.topic} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black w-5 text-center" style={{ color: c.textMuted }}>#{i + 1}</span>
                                <span className="text-xs font-bold" style={{ color: c.text }}>{t.topic}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.trend === "improving" ? "bg-emerald-500/10 text-emerald-500" : t.trend === "declining" ? "bg-red-500/10 text-red-500" : "bg-white/5"}`} style={t.trend === "stable" ? { color: c.textMuted } : {}}>
                                  {t.trend === "improving" ? "↑" : t.trend === "declining" ? "↓" : "→"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>{t.totalCorrect}/{t.totalAttempted}</span>
                                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${t.accuracy}%`, background: colors[i % colors.length] }} />
                                </div>
                                <span className="text-[10px] font-black" style={{ color: colors[i % colors.length] }}>{Math.round(t.accuracy)}%</span>
                              </div>
                            </div>
                          );
                        })
                      : <p className="text-xs" style={{ color: c.textMuted }}>Complete aptitude sessions to see topic mastery</p>
                    }
                  </div>
                </motion.div>

                {/* Weekly Progress Bar Chart */}
                {aptitudeAnalytics?.weeklyProgress?.length > 0 && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="p-5 border rounded-2xl" style={{ borderColor: c.border, background: c.cardBg }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2 mb-3"><TrendingUp size={14} /> Weekly Progress</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={aptitudeAnalytics.weeklyProgress.slice(-7).map((w: any) => ({ name: w.week, sessions: w.sessionsCompleted, accuracy: Math.round(w.accuracy), xp: w.xpEarned }))}>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: c.textMuted }} />
                        <YAxis tick={{ fontSize: 9, fill: c.textMuted }} />
                        <ReTooltip contentStyle={{ background: isDark ? "#1a1a2e" : "#fff", border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="sessions" name="Sessions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="accuracy" name="Accuracy %" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.6} />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* Weak & Strong Topics */}
                {(aptitudeAnalytics?.weakTopics?.length > 0 || aptitudeAnalytics?.strongTopics?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aptitudeAnalytics.weakTopics?.length > 0 && (
                      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="p-5 border rounded-2xl space-y-3" style={{ borderColor: c.border, background: c.cardBg }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1"><AlertCircle size={14} /> Weak Areas</h4>
                        <div className="space-y-2">
                          {aptitudeAnalytics.weakTopics.slice(0, 5).map((topic: string) => {
                            const m = (aptitudeAnalytics.topicMastery ?? []).find((t: any) => t.topic === topic);
                            return (
                              <div key={topic} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.06)" }}>
                                <span className="text-xs font-bold" style={{ color: c.text }}>{topic}</span>
                                <span className="text-[10px] font-black text-red-400">{m ? Math.round(m.accuracy) : "?"}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                    {aptitudeAnalytics.strongTopics?.length > 0 && (
                      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="p-5 border rounded-2xl space-y-3" style={{ borderColor: c.border, background: c.cardBg }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1"><CheckCircle2 size={14} /> Strong Areas</h4>
                        <div className="space-y-2">
                          {aptitudeAnalytics.strongTopics.slice(0, 5).map((topic: string) => {
                            const m = (aptitudeAnalytics.topicMastery ?? []).find((t: any) => t.topic === topic);
                            return (
                              <div key={topic} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.06)" }}>
                                <span className="text-xs font-bold" style={{ color: c.text }}>{topic}</span>
                                <span className="text-[10px] font-black text-emerald-400">{m ? Math.round(m.accuracy) : "?"}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {!aptitudeAnalytics && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="p-8 border rounded-2xl text-center space-y-3" style={{ borderColor: c.border }}>
                    <p className="text-sm font-bold" style={{ color: c.text }}>No skill data available</p>
                    <p className="text-xs" style={{ color: c.textMuted }}>Complete aptitude sessions to unlock skill growth analytics.</p>
                    <motion.button onClick={() => setView("aptitude-hub")} className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>Start Aptitude Practice</motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>



      </div>

      {/* ==================== 5. INTERVIEW SESSION DETAIL MODAL ==================== */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSession(null)}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar"
              style={{ background: isDark ? "#0d1117" : "#ffffff", borderColor: c.border }}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-extrabold text-sm" style={{ fontFamily: "var(--font-sans)" }}>Session Details</h3>
                <motion.button onClick={() => setSelectedSession(null)} className="text-gray-400 hover:text-white" whileTap={{ scale: 0.96 }}>
                  <XCircle size={16} />
                </motion.button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Role", value: selectedSession.role || selectedSession.targetRole || "--" },
                    { label: "Type", value: selectedSession.type || selectedSession.interviewType || "--" },
                    { label: "Company", value: selectedSession.company || selectedSession.targetCompany || "--" },
                    { label: "Difficulty", value: selectedSession.difficulty || "--" },
                    { label: "Date", value: selectedSession.createdAt ? new Date(selectedSession.createdAt).toLocaleString() : "--" },
                    { label: "Duration", value: selectedSession.duration ? `${selectedSession.duration} min` : "--" },
                    { label: "Technology", value: selectedSession.technology || "--" },
                    { label: "Status", value: selectedSession.status || "--" },
                  ].map((f) => (
                    <div key={f.label}>
                      <span className="text-[10px] block" style={{ color: c.textMuted }}>{f.label}</span>
                      <span className="font-bold capitalize">{f.value}</span>
                    </div>
                  ))}
                </div>
                {(selectedSession.overallScore ?? selectedSession.evaluation?.overallScore) != null && (
                  <div className="p-3 rounded-xl text-center" style={{ background: `${c.primary}10` }}>
                    <span className="text-[10px] block uppercase font-bold" style={{ color: c.textMuted }}>Overall Score</span>
                    <span className="text-2xl font-black" style={{ color: c.primary }}>
                      {selectedSession.overallScore ?? selectedSession.evaluation?.overallScore}%
                    </span>
                  </div>
                )}
                {selectedSession.evaluation?.strengths?.length > 0 && (
                  <div>
                    <span className="text-[10px] block font-bold uppercase mb-1" style={{ color: c.green }}>Strengths</span>
                    <ul className="space-y-1">
                      {selectedSession.evaluation.strengths.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5" style={{ color: c.textSec }}>
                          <CheckCircle2 size={11} className="mt-0.5 shrink-0" style={{ color: c.green }} />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedSession.evaluation?.weaknesses?.length > 0 && (
                  <div>
                    <span className="text-[10px] block font-bold uppercase mb-1" style={{ color: c.red }}>Weaknesses</span>
                    <ul className="space-y-1">
                      {selectedSession.evaluation.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5" style={{ color: c.textSec }}>
                          <AlertCircle size={11} className="mt-0.5 shrink-0" style={{ color: c.red }} />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedSession.evaluation?.feedback && (
                  <div>
                    <span className="text-[10px] block font-bold uppercase mb-1" style={{ color: c.textMuted }}>AI Feedback</span>
                    <p className="leading-relaxed" style={{ color: c.textSec }}>{selectedSession.evaluation.feedback}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <motion.button
                  onClick={() => setSelectedSession(null)}
                  className="py-1.5 px-3 rounded bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold transition-colors"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== 6. FLOATING CHAT SIDEBAR PANEL ==================== */}
      <AnimatePresence>
        {assistantOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-[70px] right-0 bottom-0 z-[190] w-80 border-l flex flex-col shadow-2xl"
            style={{ background: isDark ? "#0d1117" : "#ffffff", borderColor: c.border }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-1.5">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                >
                  <Sparkles size={14} className="text-amber-500" />
                </motion.div>
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: c.text }}>AI Performance Coach</span>
              </div>
              <motion.button
                onClick={() => setAssistantOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <XCircle size={14} />
              </motion.button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {chatMessages.map((msg, idx) => {
                const isAI = msg.role === "assistant";
                return (
                  <motion.div
                    key={idx}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={idx}
                    className={`flex ${isAI ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                        isAI
                          ? "bg-white/5 border border-white/10 rounded-tl-sm"
                          : "bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-tr-sm"
                      }`}
                      style={{ borderColor: c.border }}
                    >
                      <p className="whitespace-pre-line">{stripMarkdown(msg.content)}</p>
                    </div>
                  </motion.div>
                );
              })}
              <AnimatePresence>
                {chatLoading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm p-3 flex items-center gap-1.5">
                      <Clock size={12} className="text-amber-500 animate-spin" />
                      <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Drafting response...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions */}
            <div className="p-3 border-t bg-white/[0.01] flex flex-col gap-1.5" style={{ borderColor: c.border }}>
              <span className="text-[8px] uppercase tracking-wider font-extrabold" style={{ color: c.textMuted }}>Suggestions</span>
              {[
                "Show learning hours",
                "Recommend missing skills",
                "Audit my interview performance"
              ].map((s, i) => (
                <motion.button
                  key={s}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                  onClick={() => { setChatInput(s); }}
                  className="w-full text-left p-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-[10px] font-semibold truncate transition-colors"
                  style={{ borderColor: c.border, color: c.textSec }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {s}
                </motion.button>
              ))}
            </div>

            {/* Input form */}
            <div className="p-3 border-t flex gap-1.5" style={{ borderColor: c.border }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask performance coach..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAssistantSend();
                }}
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
              />
              <motion.button
                onClick={handleAssistantSend}
                disabled={!chatInput.trim() || chatLoading}
                className="w-8 h-8 rounded-lg bg-amber-500 text-black hover:bg-amber-400 flex items-center justify-center shrink-0 disabled:opacity-30 transition-colors"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <Send size={12} />
              </motion.button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


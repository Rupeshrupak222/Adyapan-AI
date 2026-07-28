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

import { LearningAnalyticsDashboard } from "./LearningAnalyticsDashboard";
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

  // Tab State: "learning" | "interview" | "resume" | "skills"
  const [tab, setTab] = useState<"learning" | "interview" | "resume" | "skills">("learning");

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

  // Sync tab with activeModule from props
  useEffect(() => {
    if (activeModule === "analytics-learning") setTab("learning");
    else if (activeModule === "analytics-interview") setTab("interview");
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
            api.get("/hr/analytics"),
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
          const res = await api.get("/ats/latest");
          if (res.data?.success && res.data.report) setResumeStats(res.data.report);
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
            <h2 className="text-base font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {tab === "learning" && "Learning Progress"}
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

            {/* TAB A: LEARNING PROGRESS */}
            {tab === "learning" && (
              <LearningAnalyticsDashboard setView={setView as any} theme={theme} />
            )}

            {/* TAB B: INTERVIEW PROGRESS */}
            {tab === "interview" && (
              <motion.div
                key="interview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {interviewLoading ? (
                  <div className="flex items-center justify-center py-16 gap-2" style={{ color: c.textMuted }}>
                    <RefreshCw size={18} className="animate-spin text-amber-500" />
                    <span className="text-xs font-bold">Loading interview data...</span>
                  </div>
                ) : engineAnalytics ? (
                  <>
                    {/* ── KPI Row ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: "Total Interviews", val: String(engineAnalytics.totalInterviews ?? 0), icon: <MessageSquare size={14} />, color: "#f59e0b" },
                        { label: "Average Score", val: engineAnalytics.averageScore != null ? `${engineAnalytics.averageScore}%` : "--", icon: <TrendingUp size={14} />, color: "#10b981" },
                        { label: "Best Score", val: engineAnalytics.bestScore != null ? `${engineAnalytics.bestScore}%` : "--", icon: <Award size={14} />, color: "#8b5cf6" },
                        { label: "Hours Practiced", val: String(engineAnalytics.totalHours ?? 0), icon: <Clock size={14} />, color: "#06b6d4" },
                        { label: "Completed", val: String(interviewHistory.filter(s => s.evaluation).length), icon: <CheckCircle2 size={14} />, color: "#10b981" },
                        { label: "In Progress", val: String(interviewHistory.filter(s => s.status === "in_progress").length), icon: <Play size={14} />, color: "#f59e0b" },
                      ].map((s, idx) => (
                        <motion.div
                          key={idx}
                          variants={fadeUp}
                          initial="hidden"
                          animate="visible"
                          custom={idx}
                          whileHover={{ y: -4, scale: 1.01 }}
                          className="p-3.5 border rounded-xl text-center space-y-1.5 bg-white/[0.01]"
                          style={{ borderColor: c.border }}
                        >
                          <div className="flex justify-center" style={{ color: s.color }}>{s.icon}</div>
                          <span className="text-[9px] uppercase tracking-wider font-bold block" style={{ color: c.textMuted }}>{s.label}</span>
                          <span className="text-lg font-black" style={{ color: c.text }}>{s.val}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* ── Charts Row: Score Trend + Skill Radar ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Score Trend Line Chart */}
                      <motion.div
                        variants={fadeUp} initial="hidden" animate="visible" custom={0}
                        className="lg:col-span-2 p-5 border rounded-2xl bg-white/[0.01]"
                        style={{ borderColor: c.border }}
                      >
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: c.textSec }}>Score Trend</h4>
                        {engineAnalytics.scoreTrend?.length > 0 ? (
                          <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={engineAnalytics.scoreTrend}>
                              <defs>
                                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                              <XAxis dataKey="date" tick={{ fontSize: 9, fill: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8" }} tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}`; }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8" }} />
                              <ReTooltip
                                contentStyle={{ background: isDark ? "#1a1a2e" : "#fff", border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 11 }}
                                labelFormatter={(v) => new Date(v).toLocaleDateString()}
                                formatter={(v: number) => [`${v}%`, "Score"]}
                              />
                              <Area type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} fill="url(#scoreGrad)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[220px] text-xs" style={{ color: c.textMuted }}>
                            Complete interviews to see your score trend
                          </div>
                        )}
                      </motion.div>

                      {/* Skill Radar Chart */}
                      <motion.div
                        variants={fadeUp} initial="hidden" animate="visible" custom={1}
                        className="p-5 border rounded-2xl bg-white/[0.01]"
                        style={{ borderColor: c.border }}
                      >
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: c.textSec }}>Skill Breakdown</h4>
                        {engineAnalytics.skillAverages && Object.values(engineAnalytics.skillAverages).some((v: any) => v > 0) ? (
                          <ResponsiveContainer width="100%" height={220}>
                            <RadarChart data={[
                              { skill: "Communication", value: engineAnalytics.skillAverages.communication || 0 },
                              { skill: "Technical", value: engineAnalytics.skillAverages.technical || 0 },
                              { skill: "Confidence", value: engineAnalytics.skillAverages.confidence || 0 },
                              { skill: "Problem Solving", value: engineAnalytics.skillAverages.problemSolving || 0 },
                              { skill: "Leadership", value: engineAnalytics.skillAverages.leadership || 0 },
                              { skill: "Role Fit", value: engineAnalytics.skillAverages.roleFit || 0 },
                            ]}>
                              <PolarGrid stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 8, fill: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: isDark ? "rgba(255,255,255,0.3)" : "#94a3b8" }} />
                              <Radar name="Skills" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[220px] text-xs" style={{ color: c.textMuted }}>
                            Complete interviews to see skill breakdown
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* ── Weekly Activity + Score Distribution ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Weekly Activity Bar */}
                      <motion.div
                        variants={fadeUp} initial="hidden" animate="visible" custom={2}
                        className="lg:col-span-2 p-5 border rounded-2xl bg-white/[0.01]"
                        style={{ borderColor: c.border }}
                      >
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: c.textSec }}>Weekly Activity</h4>
                        {engineAnalytics.weeklyActivity?.some((w: any) => w.count > 0) ? (
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={engineAnalytics.weeklyActivity}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                              <XAxis dataKey="week" tick={{ fontSize: 9, fill: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8" }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8" }} />
                              <ReTooltip
                                contentStyle={{ background: isDark ? "#1a1a2e" : "#fff", border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 11 }}
                                formatter={(v: number, name: string) => [name === "count" ? `${v} sessions` : `${v}%`, name === "count" ? "Interviews" : "Avg Score"]}
                              />
                              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Interviews" />
                              <Bar dataKey="avgScore" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Avg Score" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[180px] text-xs" style={{ color: c.textMuted }}>
                            No activity in the last 8 weeks
                          </div>
                        )}
                      </motion.div>

                      {/* Score Distribution */}
                      <motion.div
                        variants={fadeUp} initial="hidden" animate="visible" custom={3}
                        className="p-5 border rounded-2xl bg-white/[0.01]"
                        style={{ borderColor: c.border }}
                      >
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: c.textSec }}>Score Distribution</h4>
                        {engineAnalytics.scoreDistribution ? (() => {
                          const dist = engineAnalytics.scoreDistribution;
                          const total = (dist.excellent || 0) + (dist.good || 0) + (dist.average || 0) + (dist.needsWork || 0);
                          const segments = [
                            { label: "Excellent (80+)", count: dist.excellent || 0, color: "#10b981" },
                            { label: "Good (60-79)", count: dist.good || 0, color: "#f59e0b" },
                            { label: "Average (40-59)", count: dist.average || 0, color: "#f97316" },
                            { label: "Needs Work (<40)", count: dist.needsWork || 0, color: "#ef4444" },
                          ];
                          return (
                            <div className="space-y-3">
                              {/* Segmented bar */}
                              <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
                                {total > 0 && segments.map((seg) => (
                                  <div key={seg.label} style={{ width: `${(seg.count / total) * 100}%`, background: seg.color, minWidth: seg.count > 0 ? 6 : 0 }} />
                                ))}
                                {total === 0 && <div className="w-full bg-white/5" />}
                              </div>
                              <div className="space-y-2">
                                {segments.map((seg) => (
                                  <div key={seg.label} className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                                      <span style={{ color: c.textSec }}>{seg.label}</span>
                                    </div>
                                    <span className="font-bold" style={{ color: c.text }}>{seg.count}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="pt-2 border-t text-center" style={{ borderColor: c.border }}>
                                <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Total: {total} sessions</span>
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="flex items-center justify-center h-[120px] text-xs" style={{ color: c.textMuted }}>
                            No data yet
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* ── Type Breakdown ── */}
                    {engineAnalytics.typeBreakdown?.length > 0 && (
                      <motion.div
                        variants={fadeUp} initial="hidden" animate="visible" custom={4}
                        className="p-5 border rounded-2xl bg-white/[0.01]"
                        style={{ borderColor: c.border }}
                      >
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: c.textSec }}>Interview Type Breakdown</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                          {engineAnalytics.typeBreakdown.map((t: any, idx: number) => {
                            const colors = ["#f59e0b", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#a855f7"];
                            return (
                              <div key={t.type} className="p-3 border rounded-xl text-center space-y-1" style={{ borderColor: c.border }}>
                                <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-black" style={{ background: `${colors[idx % colors.length]}20`, color: colors[idx % colors.length] }}>
                                  {t.count}
                                </div>
                                <span className="text-[10px] font-bold capitalize block" style={{ color: c.textSec }}>{t.type}</span>
                                <span className="text-[9px] block" style={{ color: c.textMuted }}>avg {t.avgScore}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* ── AI Insights ── */}
                    {engineAnalytics.insights?.length > 0 && (
                      <motion.div
                        variants={fadeUp} initial="hidden" animate="visible" custom={5}
                        className="p-5 border rounded-2xl space-y-2 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent"
                        style={{ borderColor: "rgba(245,158,11,0.15)" }}
                      >
                        <h4 className="text-xs font-extrabold flex items-center gap-1.5 text-amber-500">
                          <Sparkles size={14} /> AI Insights
                        </h4>
                        <ul className="space-y-1.5">
                          {engineAnalytics.insights.map((insight: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-xs" style={{ color: c.textSec }}>
                              <span className="text-amber-500 font-bold mt-0.5">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    {/* ── History Table ── */}
                    <motion.div
                      variants={fadeUp} initial="hidden" animate="visible" custom={6}
                      className="p-5 border rounded-2xl space-y-4 bg-white/[0.01]"
                      style={{ borderColor: c.border }}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Interview History</h4>
                        <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>{interviewHistory.length} sessions</span>
                      </div>
                      <div className="overflow-x-auto">
                        {interviewHistory.length > 0 ? (
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b" style={{ borderColor: c.border, color: c.textSec }}>
                                <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Role</th>
                                <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Type</th>
                                <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Company</th>
                                <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Date</th>
                                <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Duration</th>
                                <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Score</th>
                                <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Status</th>
                                <th className="pb-2 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: c.border }}>
                              {interviewHistory.slice(0, 15).map((s: any, i: number) => {
                                const score = s.overallScore ?? s.evaluation?.overallScore ?? null;
                                return (
                                  <motion.tr
                                    key={s.id}
                                    variants={fadeUp} initial="hidden" animate="visible" custom={i}
                                    className="hover:bg-white/5 transition-colors"
                                  >
                                    <td className="py-2.5 font-bold max-w-[140px] truncate">{s.role || s.targetRole || "--"}</td>
                                    <td className="py-2.5 capitalize" style={{ color: c.textSec }}>{s.type || s.interviewType || "--"}</td>
                                    <td className="py-2.5" style={{ color: c.textSec }}>{s.company || s.targetCompany || "--"}</td>
                                    <td className="py-2.5" style={{ color: c.textSec }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "--"}</td>
                                    <td className="py-2.5" style={{ color: c.textSec }}>{s.duration ? `${s.duration}m` : "--"}</td>
                                    <td className="py-2.5 font-black" style={{ color: score != null ? (score >= 70 ? c.green : score >= 50 ? c.primary : c.red) : c.textMuted }}>
                                      {score != null ? `${score}%` : "--"}
                                    </td>
                                    <td className="py-2.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        s.status === "completed" ? "bg-green-500/10 text-green-500" :
                                        s.status === "in_progress" ? "bg-amber-500/10 text-amber-500" :
                                        s.status === "terminated" ? "bg-red-500/10 text-red-500" :
                                        "bg-white/5"
                                      }`} style={s.status === "completed" || s.status === "in_progress" || s.status === "terminated" ? {} : { color: c.textMuted }}>
                                        {s.status || "unknown"}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-right">
                                      <motion.button
                                        onClick={() => setSelectedSession(s)}
                                        className="py-1 px-2 rounded bg-white/5 border hover:bg-white/10 text-[10px] font-bold transition-all"
                                        style={{ borderColor: c.border, color: c.textSec }}
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                      >
                                        Details
                                      </motion.button>
                                    </td>
                                  </motion.tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="py-10 text-center text-sm" style={{ color: c.textMuted }}>
                            No interview sessions yet. Start your first mock interview to see your progress here.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <div className="py-16 text-center space-y-3" style={{ color: c.textMuted }}>
                    <MessageSquare size={32} className="mx-auto opacity-30" />
                    <p className="text-sm font-bold">No interview data available</p>
                    <p className="text-xs">Complete your first mock interview to unlock detailed progress analytics.</p>
                    <motion.button
                      onClick={() => setView("interview-hub")}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      Start Interview
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB C: RESUME SCORE */}
            {tab === "resume" && (
              <motion.div
                key="resume"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Scoring metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Detailed Scores */}
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className="p-5 border rounded-2xl space-y-4 bg-white/[0.01]"
                    style={{ borderColor: c.border }}
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider">Resume Quality Metrics</h4>
                    {[
                      { label: "Overall ATS Score", score: resumeStats?.overallScore ?? 0, color: "#10b981" },
                      { label: "Summary Quality", score: resumeStats?.sectionScores?.summary ?? 0, color: "#06b6d4" },
                      { label: "Skills Coverage", score: resumeStats?.sectionScores?.skills ?? 0, color: "#8b5cf6" },
                      { label: "Experience Alignment", score: resumeStats?.sectionScores?.experience ?? 0, color: "#ec4899" }
                    ].map((m, i) => (
                      <motion.div
                        key={m.label}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        className="space-y-1.5"
                      >
                        <div className="flex justify-between text-[11px] font-bold" style={{ color: c.textSec }}>
                          <span>{m.label}</span>
                          <span>{m.score}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/5 border overflow-hidden" style={{ borderColor: c.border }}>
                          <div className="h-full rounded-full" style={{ width: `${m.score}%`, background: m.color }} />
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Highlights & missing blocks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      custom={0}
                      whileHover={{ y: -4, scale: 1.01 }}
                      className="p-5 border rounded-2xl space-y-3 bg-white/[0.01]"
                      style={{ borderColor: c.border }}
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                        <motion.div
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 280, damping: 18 }}
                        >
                          <CheckCircle2 size={14} />
                        </motion.div> Section Completions
                      </h4>
                      <ul className="space-y-1.5 text-xs font-semibold" style={{ color: c.textSec }}>
                        <li>✓ Summary Statement</li>
                        <li>✓ Projects Section</li>
                        <li>✓ Education Details</li>
                        <li>✓ Contact Details</li>
                      </ul>
                    </motion.div>

                    <motion.div
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      custom={1}
                      whileHover={{ y: -4, scale: 1.01 }}
                      className="p-5 border rounded-2xl space-y-3 bg-white/[0.01]"
                      style={{ borderColor: c.border }}
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                        <motion.div
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 280, damping: 18 }}
                        >
                          <Info size={14} />
                        </motion.div> Missing Areas
                      </h4>
                      <ul className="space-y-1.5 text-xs font-semibold" style={{ color: c.textSec }}>
                        <li>• Custom Hobbies</li>
                        <li>• Certifications</li>
                        <li>• LinkedIn Outreach URL</li>
                      </ul>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB D: SKILL GROWTH */}
            {tab === "skills" && (
              <motion.div
                key="skills"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Growth stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category level */}
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className="p-5 border rounded-2xl space-y-4 bg-white/[0.01]"
                    style={{ borderColor: c.border }}
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider">Skill Mastery Levels</h4>
                    {[
                      { label: "Programming Languages (Python, Java)", val: 90, color: "#10b981" },
                      { label: "Web Development (React, Next)", val: 85, color: "#06b6d4" },
                      { label: "Database Management (SQL, Postgres)", val: 80, color: "#8b5cf6" },
                      { label: "Machine Learning Concepts", val: 70, color: "#f59e0b" },
                      { label: "Cloud Computing (AWS, GCP)", val: 60, color: "#ec4899" }
                    ].map((skill, i) => (
                      <motion.div
                        key={skill.label}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        className="space-y-1.5"
                      >
                        <div className="flex justify-between text-[11px] font-bold" style={{ color: c.textSec }}>
                          <span>{skill.label}</span>
                          <span>{skill.val}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/5 border overflow-hidden" style={{ borderColor: c.border }}>
                          <div className="h-full rounded-full" style={{ width: `${skill.val}%`, background: skill.color }} />
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Growth log timeline */}
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={1}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className="p-5 border rounded-2xl space-y-4 bg-white/[0.01]"
                    style={{ borderColor: c.border }}
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider">Growth Log Timeline</h4>
                    <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                      {[
                        { title: "Next.js & Router architectures", date: "June 2026", desc: "Added to project stack, master metrics achieved." },
                        { title: "TypeScript & Data Schemas", date: "May 2026", desc: "Integrated types into global database schemas." },
                        { title: "Generative AI API integration", date: "April 2026", desc: "Completed Gemini model pipeline completions." }
                      ].map((item, idx) => (
                        <motion.div
                          key={idx}
                          variants={fadeUp}
                          initial="hidden"
                          animate="visible"
                          custom={idx}
                          className="pl-6 relative space-y-1"
                        >
                          <div className="absolute left-[5px] top-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <div className="flex justify-between text-[10px] font-bold">
                            <span style={{ color: c.text }}>{item.title}</span>
                            <span style={{ color: c.textMuted }}>{item.date}</span>
                          </div>
                          <p className="text-[10px]" style={{ color: c.textSec }}>{item.desc}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ==================== 4. CENTRAL AI PERFORMANCE INSIGHTS ==================== */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          whileHover={{ y: -4, scale: 1.01 }}
          className="p-5 border rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/10 space-y-2 shrink-0"
        >
          <h4 className="text-xs font-extrabold flex items-center gap-1.5 text-amber-500" style={{ fontFamily: "'Outfit', sans-serif" }}>
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 18 }}
            >
              <Sparkles size={14} />
            </motion.div> AI Performance Insights
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <motion.li
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="flex items-start gap-2"
              style={{ color: c.textSec }}
            >
              <span className="text-amber-500 font-bold">•</span>
              <span>Your interview scores improved by **18%** this month. Keep practicing!</span>
            </motion.li>
            <motion.li
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="flex items-start gap-2"
              style={{ color: c.textSec }}
            >
              <span className="text-amber-500 font-bold">•</span>
              <span>Continue practicing **Data Structures** to improve placement readiness.</span>
            </motion.li>
            <motion.li
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="flex items-start gap-2"
              style={{ color: c.textSec }}
            >
              <span className="text-amber-500 font-bold">•</span>
              <span>Completing 2 more mock tests can unlock top tier recruiter readiness levels.</span>
            </motion.li>
            <motion.li
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="flex items-start gap-2"
              style={{ color: c.textSec }}
            >
              <span className="text-amber-500 font-bold">•</span>
              <span>Focus on **Machine Learning projects** to strengthen your resume match rate.</span>
            </motion.li>
          </ul>
        </motion.div>

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
                <h3 className="font-extrabold text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>Session Details</h3>
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


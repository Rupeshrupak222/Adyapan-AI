"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";
import { mkColors } from "@/utils/themeColors";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, Cell
} from "recharts";
import {
  BarChart3, TrendingUp, Award, Clock, Target, ArrowLeft,
  ChevronRight, Flame, Sparkles, CheckCircle2, XCircle,
  Calendar, User, Code, Briefcase, Loader2, AlertTriangle, FileText, Download, RotateCcw
} from "lucide-react";
import { generateInterviewPDF } from "@/utils/interview-pdf";

interface SessionSummary {
  id: string;
  role: string;
  company?: string;
  type: string;
  difficulty: string;
  technology?: string;
  status: string;
  overallScore?: number;
  evaluation?: {
    overallScore: number;
    communicationScore: number;
    technicalScore?: number;
    hrScore?: number;
    confidenceScore?: number;
    fluencyScore?: number;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    summary: string;
    hiringRecommendation: string;
  };
  createdAt: string;
  endedAt?: string;
  duration: number;
  messageCount: number;
  violationCount: number;
}

interface InterviewAnalyticsViewProps {
  setView?: (v: string) => void;
  showBackBtn?: boolean;
  initialSessionId?: string;
}

export function InterviewAnalyticsView({ setView, showBackBtn = false, initialSessionId }: InterviewAnalyticsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const c = mkColors(theme);

  const targetSessionId = initialSessionId || searchParams?.get("sessionId");

  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [filter, setFilter] = useState<"all" | "technical" | "behavioral" | "general">("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["interview-history"],
    queryFn: async () => {
      const res = await api.get("/interview/history");
      return res.data.sessions as SessionSummary[];
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Auto-select session if sessionId parameter was passed (e.g. after ending an interview)
  useEffect(() => {
    if (data && targetSessionId) {
      const match = data.find(s => s.id === targetSessionId);
      if (match) {
        setSelectedSession(match);
      }
    }
  }, [data, targetSessionId]);

  const sessions = (data || []).filter(s =>
    filter === "all" ? true : s.type === filter
  );

  const completedSessions = (data || []).filter(s => s.evaluation?.overallScore || s.status === "completed");

  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((acc, s) => acc + (s.evaluation?.overallScore || 0), 0) / completedSessions.length)
    : 0;

  const bestScore = completedSessions.length > 0
    ? Math.max(...completedSessions.map(s => s.evaluation?.overallScore || 0))
    : 0;

  const latestScore = completedSessions.length > 0
    ? completedSessions[0].evaluation?.overallScore || 0
    : 0;

  // Score trend data (last 10 sessions)
  const trendData = [...completedSessions].reverse().slice(-10).map((s, i) => ({
    index: i + 1,
    score: s.evaluation?.overallScore || 0,
    role: s.role,
    date: new Date(s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));

  // Overall Score breakdown average across all completed sessions
  const radarData = completedSessions.length > 0 ? [
    { subject: "Communication", value: Math.round(completedSessions.reduce((a, s) => a + (s.evaluation?.communicationScore || 0), 0) / completedSessions.length) },
    { subject: "Technical", value: Math.round(completedSessions.filter(s => s.evaluation?.technicalScore).reduce((a, s) => a + (s.evaluation?.technicalScore || 0), 0) / (completedSessions.filter(s => s.evaluation?.technicalScore).length || 1)) },
    { subject: "HR/Behavioral", value: Math.round(completedSessions.filter(s => s.evaluation?.hrScore).reduce((a, s) => a + (s.evaluation?.hrScore || 0), 0) / (completedSessions.filter(s => s.evaluation?.hrScore).length || 1)) },
    { subject: "Confidence", value: Math.round(completedSessions.filter(s => s.evaluation?.confidenceScore).reduce((a, s) => a + (s.evaluation?.confidenceScore || 0), 0) / (completedSessions.filter(s => s.evaluation?.confidenceScore).length || 1)) },
    { subject: "Fluency", value: Math.round(completedSessions.filter(s => s.evaluation?.fluencyScore).reduce((a, s) => a + (s.evaluation?.fluencyScore || 0), 0) / (completedSessions.filter(s => s.evaluation?.fluencyScore).length || 1)) },
  ] : [];

  // Type distribution
  const typeData = ["technical", "behavioral", "general"].map(t => ({
    type: t.charAt(0).toUpperCase() + t.slice(1),
    count: (data || []).filter(s => s.type === t).length,
    color: t === "technical" ? c.cyan : t === "behavioral" ? c.amber : c.green,
  }));

  const scoreColor = (score: number) => score >= 80 ? c.green : score >= 60 ? c.amber : c.red;

  const handleDownloadPDF = (session: SessionSummary) => {
    if (!session.evaluation) return;
    generateInterviewPDF({
      sessionId: session.id,
      role: session.role,
      company: session.company,
      type: session.type,
      difficulty: session.difficulty,
      language: "english",
      durationMinutes: session.duration,
      technology: session.technology,
      createdAt: session.createdAt,
      endedAt: session.endedAt,
      evaluation: session.evaluation,
    });
  };

  const handleNewInterview = () => {
    if (setView) {
      setView("interview-hub");
    } else {
      router.push("/dashboard/interview");
    }
  };

  return (
    <div className="w-full space-y-6 antialiased" style={{ color: c.text }}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border shadow-sm transition-colors"
        style={{ background: c.cardBg, borderColor: c.border }}>
        <div className="flex items-center gap-3">
          {showBackBtn && (
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer"
              style={{ borderColor: c.border, background: c.surface, color: c.text }}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: c.text }}>
              <BarChart3 size={22} style={{ color: c.amber }} /> Interview Performance Analytics
            </h1>
            <p className="text-xs mt-0.5" style={{ color: c.textSec }}>
              Track score trends, technical mastery, and recruiter readiness
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedSession && (
            <button
              onClick={() => setSelectedSession(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer"
              style={{ borderColor: c.border, background: c.surface, color: c.textSec }}
            >
              <ArrowLeft size={13} /> View All Interviews
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNewInterview}
            className="px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
          >
            <Sparkles size={14} /> New Interview
          </motion.button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: c.amber }} />
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border text-center space-y-4"
          style={{ background: c.cardBg, borderColor: c.border }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center border"
            style={{ background: c.amberBg, borderColor: c.amberBorder }}>
            <BarChart3 size={28} style={{ color: c.amber }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: c.text }}>No Interview Sessions Logged Yet</h2>
            <p className="text-xs max-w-sm mx-auto mt-1" style={{ color: c.textSec }}>
              Complete your first AI Mock or Technical Interview to unlock performance analytics.
            </p>
          </div>
          <button
            onClick={handleNewInterview}
            className="px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
          >
            Start Your First Interview
          </button>
        </div>
      )}

      {/* PARTICULAR INTERVIEW REPORT CARD (Focus View when session selected) */}
      {!isLoading && selectedSession && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-6 space-y-6 shadow-md"
          style={{ background: c.cardBg, borderColor: c.border }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b"
            style={{ borderColor: c.border }}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider"
                  style={{
                    background: selectedSession.status === "completed" ? c.greenBg : c.amberBg,
                    color: selectedSession.status === "completed" ? c.green : c.amber,
                    borderColor: selectedSession.status === "completed" ? c.greenBorder : c.amberBorder,
                  }}>
                  {selectedSession.status === "completed" ? "COMPLETED" : "IN PROGRESS"}
                </span>
                <span className="text-xs capitalize font-semibold" style={{ color: c.textMuted }}>
                  {selectedSession.type} · {selectedSession.difficulty}
                </span>
              </div>
              <h2 className="text-xl font-extrabold mt-1" style={{ color: c.text }}>
                {selectedSession.role}{selectedSession.company && ` @ ${selectedSession.company}`}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: c.textMuted }}>
                Session Date: {new Date(selectedSession.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {selectedSession.evaluation?.overallScore != null && (
                <div className="flex flex-col items-center px-4 py-2 rounded-2xl border text-center"
                  style={{
                    background: `${scoreColor(selectedSession.evaluation.overallScore)}15`,
                    borderColor: `${scoreColor(selectedSession.evaluation.overallScore)}35`
                  }}>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: scoreColor(selectedSession.evaluation.overallScore) }}>
                    Overall Score
                  </span>
                  <span className="text-2xl font-black" style={{ color: scoreColor(selectedSession.evaluation.overallScore) }}>
                    {selectedSession.evaluation.overallScore}%
                  </span>
                </div>
              )}

              {selectedSession.evaluation && (
                <button
                  onClick={() => handleDownloadPDF(selectedSession)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer"
                  style={{ background: c.amberBg, color: c.amber, borderColor: c.amberBorder }}
                >
                  <Download size={15} /> Export PDF Report
                </button>
              )}
            </div>
          </div>

          {/* Session Evaluation Content */}
          {selectedSession.evaluation ? (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="p-4 rounded-xl border" style={{ background: c.surface, borderColor: c.border }}>
                <h4 className="text-xs font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Sparkles size={14} style={{ color: c.amber }} /> AI Evaluator Performance Summary
                </h4>
                <p className="text-xs leading-relaxed font-medium" style={{ color: c.textSec }}>
                  {selectedSession.evaluation.summary || "Session completed and evaluated by AI."}
                </p>
              </div>

              {/* Strengths and Growth Areas Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border space-y-2" style={{ background: c.greenBg, borderColor: c.greenBorder }}>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: c.green }}>
                    <CheckCircle2 size={15} /> Key Identified Strengths
                  </h4>
                  <ul className="space-y-2">
                    {(Array.isArray(selectedSession.evaluation.strengths) && selectedSession.evaluation.strengths.length > 0
                      ? selectedSession.evaluation.strengths
                      : ["Demonstrated solid core competencies and articulation"]
                    ).map((s, i) => (
                      <li key={i} className="text-xs flex items-start gap-2 font-medium" style={{ color: c.text }}>
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: c.green }} />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border space-y-2" style={{ background: c.redBg, borderColor: c.redBorder }}>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: c.red }}>
                    <XCircle size={15} /> Areas for Growth & Recommendation
                  </h4>
                  <ul className="space-y-2">
                    {(Array.isArray(selectedSession.evaluation.weaknesses) && selectedSession.evaluation.weaknesses.length > 0
                      ? selectedSession.evaluation.weaknesses
                      : ["Practice expanding technical details and real-world examples"]
                    ).map((w, i) => (
                      <li key={i} className="text-xs flex items-start gap-2 font-medium" style={{ color: c.text }}>
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: c.red }} />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Individual Session Skill Radar Breakdown */}
              <div className="p-5 rounded-2xl border" style={{ background: c.surface, borderColor: c.border }}>
                <h4 className="text-xs font-extrabold uppercase tracking-wider mb-4 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Target size={15} style={{ color: c.cyan }} /> Session Skill Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  {[
                    { label: "Communication", score: selectedSession.evaluation.communicationScore },
                    { label: "Technical", score: selectedSession.evaluation.technicalScore },
                    { label: "HR Fit", score: selectedSession.evaluation.hrScore },
                    { label: "Confidence", score: selectedSession.evaluation.confidenceScore },
                    { label: "Fluency", score: selectedSession.evaluation.fluencyScore },
                  ].map((sk) => (
                    <div key={sk.label} className="p-3 rounded-xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: c.textMuted }}>{sk.label}</span>
                      <span className="text-lg font-black mt-0.5 block" style={{ color: sk.score != null ? scoreColor(sk.score) : c.textMuted }}>
                        {sk.score != null ? `${sk.score}%` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center space-y-2 rounded-xl border" style={{ background: c.surface, borderColor: c.border }}>
              <p className="text-sm font-bold" style={{ color: c.amber }}>Evaluation Report Pending</p>
              <p className="text-xs" style={{ color: c.textMuted }}>
                This session was recently ended and evaluation data is being generated.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* GENERAL ANALYTICS OVERVIEW & HISTORY (Shown when no specific session is focused) */}
      {!isLoading && data && data.length > 0 && !selectedSession && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Interviews", value: data.length, icon: <Calendar size={18} style={{ color: c.amber }} /> },
              { label: "Average Score", value: `${avgScore}%`, icon: <Target size={18} style={{ color: c.cyan }} /> },
              { label: "Best Score", value: `${bestScore}%`, icon: <Award size={18} style={{ color: c.green }} /> },
              { label: "Latest Score", value: `${latestScore}%`, icon: <TrendingUp size={18} style={{ color: c.purple }} /> },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl border shadow-sm transition-colors"
                style={{ background: c.cardBg, borderColor: c.border }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                    {kpi.label}
                  </span>
                  {kpi.icon}
                </div>
                <div className="text-2xl font-black" style={{ color: c.text }}>
                  {kpi.value}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Trend */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="md:col-span-2 p-5 rounded-2xl border shadow-sm"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} style={{ color: c.amber }} />
                  <h3 className="text-sm font-bold" style={{ color: c.text }}>Score Trend</h3>
                </div>
                <span className="text-[10px] font-medium" style={{ color: c.textMuted }}>
                  Last {trendData.length} completed sessions
                </span>
              </div>
              {trendData.length > 1 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" tick={{ fill: c.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: c.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: c.isDark ? "#12121e" : "#ffffff",
                        border: `1px solid ${c.border}`,
                        borderRadius: "10px",
                        color: c.text,
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      formatter={(val: number) => [`${val}%`, "Overall Score"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={c.amber}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: c.amber, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: c.amber }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-44 flex items-center justify-center text-xs font-medium" style={{ color: c.textMuted }}>
                  Complete 2 or more interviews to view performance progression trend.
                </div>
              )}
            </motion.div>

            {/* Score Breakdown Radar */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-2xl border shadow-sm"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} style={{ color: c.cyan }} />
                <h3 className="text-sm font-bold" style={{ color: c.text }}>Skill Breakdown</h3>
              </div>
              {radarData.length > 0 && radarData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={170}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={c.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: c.textSec, fontSize: 9, fontWeight: 600 }} />
                    <Radar name="Score" dataKey="value" stroke={c.amber} fill={c.amber} fillOpacity={0.2} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-44 flex items-center justify-center text-xs font-medium text-center" style={{ color: c.textMuted }}>
                  Complete evaluated interviews to view skill breakdown.
                </div>
              )}
            </motion.div>
          </div>

          {/* History Table */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border shadow-sm overflow-hidden"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="flex flex-wrap items-center justify-between p-4 sm:p-5 border-b gap-3"
              style={{ borderColor: c.border }}>
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: c.amber }} />
                <h3 className="text-sm font-bold" style={{ color: c.text }}>Interview History</h3>
              </div>
              {/* Filter Tabs */}
              <div className="flex gap-1 p-1 rounded-xl border" style={{ background: c.surface, borderColor: c.border }}>
                {(["all", "technical", "behavioral", "general"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
                    style={{
                      background: filter === f ? c.amber : "transparent",
                      color: filter === f ? "#000" : c.textSec,
                    }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: c.border }}>
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-xs font-medium" style={{ color: c.textMuted }}>
                  No {filter === "all" ? "" : filter} interviews found.
                </div>
              ) : (
                sessions.slice(0, 20).map(session => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className="flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors hover:opacity-90"
                    style={{ background: selectedSession?.id === session.id ? c.surfaceHover : "transparent" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: session.type === "technical" ? c.cyanBg : session.type === "behavioral" ? c.amberBg : c.greenBg,
                          border: `1px solid ${session.type === "technical" ? c.cyanBorder : session.type === "behavioral" ? c.amberBorder : c.greenBorder}`
                        }}>
                        {session.type === "technical" ? <Code size={14} style={{ color: c.cyan }} /> :
                         session.type === "behavioral" ? <User size={14} style={{ color: c.amber }} /> :
                         <Briefcase size={14} style={{ color: c.green }} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold" style={{ color: c.text }}>
                          {session.role}{session.company && ` @ ${session.company}`}
                        </div>
                        <div className="text-[10px] capitalize flex items-center gap-1.5 mt-0.5 font-medium" style={{ color: c.textSec }}>
                          <span>{session.type}</span>
                          <span>·</span>
                          <span>{session.difficulty}</span>
                          <span>·</span>
                          <span>{new Date(session.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {session.violationCount > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: c.red }}>
                          <AlertTriangle size={11} /> {session.violationCount}
                        </div>
                      )}
                      {session.evaluation?.overallScore != null || session.status === "completed" ? (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border"
                          style={{
                            background: `${scoreColor(session.evaluation?.overallScore || 75)}18`,
                            color: scoreColor(session.evaluation?.overallScore || 75),
                            borderColor: `${scoreColor(session.evaluation?.overallScore || 75)}30`,
                          }}
                        >
                          {session.evaluation?.overallScore || 75}%
                        </div>
                      ) : (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg border uppercase tracking-wider"
                          style={{ background: c.amberBg, color: c.amber, borderColor: c.amberBorder }}>
                          IN PROGRESS
                        </span>
                      )}
                      <ChevronRight size={14} style={{ color: c.textMuted }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

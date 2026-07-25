"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Clock, Trophy, Target, MessageSquare, ChevronRight,
  Loader2, ArrowLeft, RefreshCw, Calendar,
} from "lucide-react";
import { api } from "@/services/api";

interface HistoryEntry {
  id: string;
  targetRole: string;
  targetCompany: string | null;
  interviewType: string;
  overallScore: number;
  passed: boolean;
  completedAt: string;
  messageCount: number;
}

interface HRHistoryProps {
  onBack: () => void;
  onSelectSession?: (sessionId: string) => void;
}

export default function HRHistory({ onBack, onSelectSession }: HRHistoryProps) {
  const [theme, setTheme] = useState("dark");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") setTheme(localStorage.getItem("adyapan-theme") || "dark");
  }, []);

  const isDark = theme === "dark";
  const c = {
    bg: isDark ? "#080710" : "#f9fafb",
    surface: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
    text: isDark ? "#ffffff" : "#111827",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#4b5563",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/interview/hr/history");
      setHistory(res.data.sessions || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#3b82f6";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  };

  const formatDate = (date: string) => {
    if (!date) return "Recent";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Recent";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: c.bg }}>
        <Loader2 size={24} className="animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: c.bg, fontFamily: "'Outfit', sans-serif" }}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-8 h-8 rounded-xl border flex items-center justify-center"
              style={{ borderColor: c.border, color: c.text }}>
              <ArrowLeft size={14} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold">HR Interview History</h1>
              <p className="text-[10px]" style={{ color: c.textMuted }}>Your past HR interview sessions</p>
            </div>
          </div>
          <button onClick={loadHistory}
            className="w-8 h-8 rounded-xl border flex items-center justify-center transition-colors"
            style={{ borderColor: c.border, color: c.textSec }}>
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Sessions */}
        {history.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb" }}>
              <MessageSquare size={28} className="text-amber-500" />
            </div>
            <h3 className="text-sm font-bold">No HR interviews yet</h3>
            <p className="text-xs" style={{ color: c.textMuted }}>Complete your first HR interview to see history here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectSession?.(session.id)}
                className="p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: c.cardBg, borderColor: c.border }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold truncate">{session.targetRole}</span>
                      {session.targetCompany && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md border font-bold"
                          style={{ background: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb", borderColor: isDark ? "rgba(245,158,11,0.2)" : "#fcd34d", color: "#f59e0b" }}>
                          {session.targetCompany}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[9px]" style={{ color: c.textMuted }}>
                      <span className="flex items-center gap-1"><Calendar size={9} />{formatDate(session.completedAt)}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={9} />{session.messageCount} messages</span>
                      <span className="flex items-center gap-1"><Target size={9} />{session.interviewType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className="text-lg font-extrabold" style={{ color: getScoreColor(session.overallScore) }}>
                        {session.overallScore}%
                      </div>
                      <div className="text-[8px] font-bold" style={{ color: c.textMuted }}>
                        {session.passed ? "Passed" : "Needs Work"}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: c.textMuted }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import {
  Search,
  Copy,
  Download,
  Star,
  StarOff,
  Filter,
  Bot,
  User,
  Clock,
  MessageSquare,
  Hash,
  ChevronDown,
  Check,
  FileText,
  Clipboard,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface EngineTranscriptProps {
  messages: Array<{
    id: string;
    role: "interviewer" | "candidate" | "system";
    content: string;
    timestamp: number;
    questionNumber?: number;
  }>;
  sessionId: string;
  config: {
    interviewType: string;
    targetRole: string;
    targetCompany: string;
  };
}

type RoleFilter = "all" | "interviewer" | "candidate";

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="px-0.5 rounded"
        style={{ background: "rgba(245,158,11,0.25)", color: "#f59e0b" }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function EngineTranscript({
  messages,
  sessionId,
  config,
  theme: propTheme,
}: EngineTranscriptProps & { theme?: string }) {
  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDark = theme === "dark";
  const c = useMemo(
    () => ({
      bg: isDark ? "#080710" : "#f9fafb",
      surface: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6",
      surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
      border: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
      borderLight: isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6",
      text: isDark ? "#ffffff" : "#111827",
      textSec: isDark ? "rgba(255,255,255,0.65)" : "#4b5563",
      textMuted: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af",
      amber: "#f59e0b",
      green: "#10b981",
      red: "#ef4444",
      purple: "#8b5cf6",
      cyan: "#06b6d4",
      blue: "#3b82f6",
      cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
      aiBubble: isDark ? "rgba(139,92,246,0.08)" : "#f5f3ff",
      userBubble: isDark ? "rgba(6,182,212,0.08)" : "#ecfeff",
      highlightGlow: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb",
    }),
    [isDark]
  );

  const filteredMessages = useMemo(() => {
    let result = messages;
    if (roleFilter !== "all") {
      result = result.filter((m) => m.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => m.content.toLowerCase().includes(q));
    }
    return result;
  }, [messages, roleFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalMsgs = messages.length;
    const questionMsgs = messages.filter((m) => m.role === "interviewer" && m.questionNumber);
    const questionsAsked = questionMsgs.length;
    const candidateMsgs = messages.filter((m) => m.role === "candidate");
    const avgLen =
      candidateMsgs.length > 0
        ? Math.round(candidateMsgs.reduce((sum, m) => sum + m.content.length, 0) / candidateMsgs.length)
        : 0;
    return { totalMsgs, questionsAsked, avgLen };
  }, [messages]);

  const toggleHighlight = useCallback((id: string) => {
    setHighlightedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyMessage = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  const copyAllAsText = useCallback(async () => {
    const text = filteredMessages
      .map((m) => {
        const role = m.role === "interviewer" ? "AI Interviewer" : m.role === "candidate" ? "Candidate" : "System";
        return `[${role}]${m.questionNumber ? ` (Q${m.questionNumber})` : ""}\n${m.content}`;
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Transcript copied as text");
      setShowExportMenu(false);
    } catch {
      toast.error("Failed to copy");
    }
  }, [filteredMessages]);

  const copyAllAsMarkdown = useCallback(async () => {
    const lines = [
      `# Interview Transcript`,
      ``,
      `**Role:** ${config.targetRole} | **Company:** ${config.targetCompany || "N/A"} | **Type:** ${config.interviewType}`,
      ``,
      `---`,
      ``,
    ];
    for (const m of filteredMessages) {
      const role = m.role === "interviewer" ? "**AI Interviewer**" : m.role === "candidate" ? "**Candidate**" : "*System*";
      const qNum = m.questionNumber ? ` (Q${m.questionNumber})` : "";
      const ts = new Date(m.timestamp).toLocaleTimeString();
      lines.push(`### ${role}${qNum} — ${ts}`, ``, m.content, ``, `---`, ``);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Transcript copied as Markdown");
      setShowExportMenu(false);
    } catch {
      toast.error("Failed to copy");
    }
  }, [filteredMessages, config]);

  const scrollToMessage = useCallback((id: string) => {
    const el = messageRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "var(--font-sans)", background: c.bg }}
    >
      {/* ═══ HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 border-b px-4 md:px-6 py-3"
        style={{ borderColor: c.border }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6d28d9, #3b82f6)" }}
            >
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: c.text }}>
                Transcript
              </h2>
              <p className="text-[10px]" style={{ color: c.textMuted }}>
                {stats.totalMsgs} messages · {stats.questionsAsked} questions
              </p>
            </div>
          </div>

          {/* Export button */}
          <div className="relative" ref={exportMenuRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: showExportMenu ? "rgba(245,158,11,0.12)" : c.surface,
                color: showExportMenu ? c.amber : c.textSec,
                border: `1px solid ${showExportMenu ? "rgba(245,158,11,0.25)" : c.border}`,
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className="w-3 h-3" />
            </motion.button>

            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-48 rounded-xl border overflow-hidden z-50"
                  style={{
                    background: isDark ? "#1a1a2e" : "#ffffff",
                    borderColor: c.border,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                >
                  <button
                    onClick={copyAllAsText}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-left transition-colors hover:bg-white/5"
                    style={{ color: c.textSec }}
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    Copy as Text
                  </button>
                  <button
                    onClick={copyAllAsMarkdown}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-left transition-colors hover:bg-white/5"
                    style={{ color: c.textSec }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Copy as Markdown
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search & Filter row */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors"
            style={{
              background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
              borderColor: searchQuery ? "rgba(245,158,11,0.3)" : c.border,
            }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.textMuted }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: c.text }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3" style={{ color: c.textMuted }} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors"
            style={{
              background: showFilters ? "rgba(139,92,246,0.1)" : c.surface,
              borderColor: showFilters ? "rgba(139,92,246,0.25)" : c.border,
              color: showFilters ? c.purple : c.textSec,
            }}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
          </motion.button>
        </div>

        {/* Filter chips */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pt-3">
                {([
                  { value: "all" as RoleFilter, label: "All", icon: MessageSquare },
                  { value: "interviewer" as RoleFilter, label: "AI Interviewer", icon: Bot },
                  { value: "candidate" as RoleFilter, label: "Candidate", icon: User },
                ]).map((f) => {
                  const Icon = f.icon;
                  const active = roleFilter === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setRoleFilter(f.value)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                      style={{
                        background: active
                          ? f.value === "interviewer"
                            ? "rgba(139,92,246,0.12)"
                            : f.value === "candidate"
                              ? "rgba(6,182,212,0.12)"
                              : "rgba(245,158,11,0.12)"
                          : c.surface,
                        border: `1px solid ${
                          active
                            ? f.value === "interviewer"
                              ? "rgba(139,92,246,0.25)"
                              : f.value === "candidate"
                                ? "rgba(6,182,212,0.25)"
                                : "rgba(245,158,11,0.25)"
                            : c.border
                        }`,
                        color: active
                          ? f.value === "interviewer"
                            ? c.purple
                            : f.value === "candidate"
                              ? c.cyan
                              : c.amber
                          : c.textMuted,
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {f.label}
                    </button>
                  );
                })}

                {searchQuery && (
                  <span className="text-[10px] ml-1" style={{ color: c.textMuted }}>
                    {filteredMessages.length} results
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══ STATS BAR ═══ */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-4 md:px-6 py-2 border-b overflow-x-auto"
        style={{ borderColor: c.borderLight }}
      >
        {[
          { label: "Messages", value: stats.totalMsgs, icon: MessageSquare, color: c.purple },
          { label: "Questions", value: stats.questionsAsked, icon: Hash, color: c.amber },
          { label: "Avg Length", value: `${stats.avgLen} chars`, icon: Sparkles, color: c.cyan },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[10px] whitespace-nowrap">
            <s.icon className="w-3 h-3" style={{ color: s.color }} />
            <span style={{ color: c.textMuted }}>{s.label}:</span>
            <span className="font-bold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
        {highlightedIds.size > 0 && (
          <div className="flex items-center gap-1 text-[10px] whitespace-nowrap">
            <Star className="w-3 h-3" style={{ color: c.amber }} />
            <span style={{ color: c.textMuted }}>Starred:</span>
            <span className="font-bold" style={{ color: c.amber }}>{highlightedIds.size}</span>
          </div>
        )}
      </div>

      {/* ═══ MESSAGES ═══ */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: isDark ? "rgba(255,255,255,0.08) transparent" : "rgba(0,0,0,0.08) transparent",
        }}
      >
        {filteredMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <MessageSquare className="w-10 h-10 mb-3" style={{ color: c.textMuted }} />
            <p className="text-sm" style={{ color: c.textMuted }}>
              {searchQuery ? "No messages match your search" : "No messages yet"}
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {filteredMessages.map((msg, idx) => {
            const isAI = msg.role === "interviewer";
            const isCandidate = msg.role === "candidate";
            const isSystem = msg.role === "system";
            const isHighlighted = highlightedIds.has(msg.id);
            const isCopied = copiedId === msg.id;

            return (
              <motion.div
                key={msg.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.id, el);
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.02, 0.3) }}
                className={`group relative ${
                  isSystem ? "flex justify-center" : isCandidate ? "flex justify-end" : "flex justify-start"
                }`}
              >
                {isSystem ? (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px]"
                    style={{
                      background: c.surface,
                      color: c.textMuted,
                      border: `1px solid ${c.borderLight}`,
                    }}
                  >
                    {stripMarkdown(msg.content)}
                  </div>
                ) : (
                  <div
                    className={`flex gap-2.5 max-w-[80%] ${isCandidate ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                      style={{
                        background: isAI
                          ? "linear-gradient(135deg, #6d28d9, #3b82f6)"
                          : isDark
                            ? "rgba(6,182,212,0.15)"
                            : "rgba(6,182,212,0.1)",
                        border: isCandidate ? `1px solid ${isDark ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.12)"}` : undefined,
                      }}
                    >
                      {isAI ? (
                        <Bot className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <User className="w-3.5 h-3.5" style={{ color: c.cyan }} />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className="rounded-2xl px-4 py-3 transition-all duration-200"
                      style={{
                        background: isHighlighted ? c.highlightGlow : isAI ? c.aiBubble : c.userBubble,
                        border: `1px solid ${
                          isHighlighted
                            ? "rgba(245,158,11,0.3)"
                            : isAI
                              ? isDark
                                ? "rgba(139,92,246,0.12)"
                                : "rgba(139,92,246,0.08)"
                              : isDark
                                ? "rgba(6,182,212,0.15)"
                                : "rgba(6,182,212,0.1)"
                        }`,
                        boxShadow: isHighlighted ? "0 0 20px rgba(245,158,11,0.08)" : undefined,
                        borderTopRightRadius: isCandidate ? "6px" : undefined,
                        borderTopLeftRadius: isAI ? "6px" : undefined,
                      }}
                    >
                      {/* Content */}
                      <p className="text-[13px] leading-relaxed" style={{ color: c.text }}>
                        {highlightText(msg.content, searchQuery)}
                      </p>

                      {/* Meta row */}
                      <div
                        className={`flex items-center gap-2 mt-2 ${isCandidate ? "justify-end" : ""}`}
                      >
                        {msg.questionNumber && (
                          <button
                            onClick={() => scrollToMessage(msg.id)}
                            className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-white/5"
                            style={{
                              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                              color: c.amber,
                            }}
                          >
                            <Hash className="w-2.5 h-2.5" />
                            Q{msg.questionNumber}
                          </button>
                        )}
                        <span className="text-[10px] flex items-center gap-1" style={{ color: c.textMuted }}>
                          <Clock className="w-2.5 h-2.5" />
                          {getRelativeTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div
                      className={`flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                        isCandidate ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Copy */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                        style={{
                          background: isCopied ? "rgba(16,185,129,0.15)" : c.surface,
                          color: isCopied ? c.green : c.textMuted,
                          border: `1px solid ${c.borderLight}`,
                        }}
                        title="Copy message"
                      >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </motion.button>

                      {/* Highlight */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleHighlight(msg.id)}
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                        style={{
                          background: isHighlighted ? "rgba(245,158,11,0.15)" : c.surface,
                          color: isHighlighted ? c.amber : c.textMuted,
                          border: `1px solid ${c.borderLight}`,
                        }}
                        title={isHighlighted ? "Remove star" : "Star message"}
                      >
                        {isHighlighted ? (
                          <Star className="w-3 h-3" fill="currentColor" />
                        ) : (
                          <StarOff className="w-3 h-3" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ═══ BOTTOM INFO ═══ */}
      <div
        className="flex-shrink-0 flex items-center justify-center px-4 py-2 border-t text-[10px]"
        style={{ borderColor: c.borderLight, color: c.textMuted }}
      >
        {config.targetRole}
        {config.targetCompany && ` @ ${config.targetCompany}`}
        {" · "}
        {config.interviewType.replace(/-/g, " ")}
        {" · "}
        Session {sessionId.slice(0, 8)}
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import {
  FileText, Sparkles, BookOpen, Clock, Download, Plus, ArrowRight,
  TrendingUp, Award, Layers, CheckCircle2, Bookmark, FileCode, Zap,
  BarChart3, Star, Globe, Edit3, Trash2, FolderPlus
} from "lucide-react";

interface ResearchDashboardProps {
  onStartNewPaper: () => void;
  onOpenTemplateGallery: () => void;
  onOpenPlagiarismChecker?: () => void;
  onSelectPaper: (paper: any) => void;
  stats: any;
  recentPapers: any[];
  drafts: any[];
  exportHistory: any[];
  c: any;
}

export function ResearchDashboard({
  onStartNewPaper,
  onOpenTemplateGallery,
  onOpenPlagiarismChecker,
  onSelectPaper,
  stats,
  recentPapers,
  drafts,
  exportHistory,
  c,
}: ResearchDashboardProps) {
  const statCards = [
    { label: "Total Papers", value: stats?.totalPapers ?? 0, icon: <FileText size={20} />, color: "#f59e0b" },
    { label: "Saved Drafts", value: stats?.savedDrafts ?? 0, icon: <Clock size={20} />, color: "#fbbf24" },
    { label: "AI Tokens Used", value: stats?.aiTokensUsed ? `${Math.round(stats.aiTokensUsed / 1000)}k` : "0", icon: <Zap size={20} />, color: "#d97706" },
    { label: "Research Score", value: stats?.researchProgress != null ? `${stats.researchProgress}%` : "0%", icon: <TrendingUp size={20} />, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Gold & Amber Header Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8"
        style={{
          background: c.isDark
            ? "linear-gradient(135deg, rgba(180,83,9,0.3) 0%, rgba(15,23,42,0.95) 100%)"
            : "linear-gradient(135deg, #ffffff 0%, rgba(254,243,199,0.45) 50%, #ffffff 100%)",
          border: `1px solid ${c.isDark ? "rgba(245,158,11,0.35)" : "rgba(245,158,11,0.25)"}`,
          boxShadow: c.isDark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 8px 24px rgba(245,158,11,0.06)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold mb-3"
              style={{
                background: c.isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.1)",
                color: c.isDark ? "#f59e0b" : "#d97706",
                border: `1px solid ${c.isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.25)"}`,
              }}
            >
              <Sparkles size={14} /> Peer-Reviewed Research Paper Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>
              Research Paper AI Dashboard
            </h1>
            <p className="text-sm mt-1 max-w-xl" style={{ color: c.textMuted }}>
              Generate, edit, enhance, and export peer-reviewed scientific papers formatted across 10+ top academic publication templates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenPlagiarismChecker && (
              <button
                onClick={onOpenPlagiarismChecker}
                className="px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                style={{
                  background: c.isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)",
                  color: c.isDark ? "#f59e0b" : "#d97706",
                  border: `1px solid ${c.isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.25)"}`,
                }}
              >
                <Sparkles size={16} /> Plagiarism & AI Checker
              </button>
            )}
            <button
              onClick={onOpenTemplateGallery}
              className="px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
              style={{
                background: c.isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
                color: c.text,
                border: `1px solid ${c.isDark ? "rgba(245,158,11,0.2)" : "rgba(203,213,225,0.8)"}`,
                boxShadow: c.isDark ? "none" : "0 2px 6px rgba(0,0,0,0.03)",
              }}
            >
              <Layers size={16} className="text-amber-500" /> Template Gallery
            </button>
            <button
              onClick={onStartNewPaper}
              className="px-5 py-2.5 rounded-xl font-black text-sm text-slate-950 transition-all shadow-lg hover:shadow-amber-500/25 flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              <Plus size={18} /> Create New Paper
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((sc, i) => (
          <motion.div
            key={sc.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl flex items-center gap-4 transition-all hover:border-amber-500/40"
            style={{
              background: c.isDark ? "rgba(255,255,255,0.025)" : "#ffffff",
              border: `1px solid ${c.isDark ? "rgba(245,158,11,0.15)" : "rgba(226,232,240,0.8)"}`,
              boxShadow: c.isDark ? "none" : "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
              style={{ background: `${sc.color}18`, color: sc.color, borderColor: `${sc.color}30` }}
            >
              {sc.icon}
            </div>
            <div>
              <div className="text-2xl font-black" style={{ color: c.text }}>{sc.value}</div>
              <div className="text-xs font-semibold" style={{ color: c.textMuted }}>{sc.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Recent Papers & Drafts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Papers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: c.text }}>
              <BookOpen size={18} className="text-amber-500" /> Recent Research Papers
            </h2>
            {recentPapers.length > 0 && (
              <button onClick={onStartNewPaper} className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1">
                New Wizard <ArrowRight size={12} />
              </button>
            )}
          </div>

          {recentPapers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentPapers.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPaper(p)}
                  className="p-5 rounded-xl transition-all cursor-pointer hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between"
                  style={{
                    background: c.isDark ? "rgba(255,255,255,0.025)" : "#ffffff",
                    border: `1px solid ${c.isDark ? "rgba(245,158,11,0.15)" : "rgba(226,232,240,0.8)"}`,
                    boxShadow: c.isDark ? "none" : "0 2px 8px rgba(0,0,0,0.02)",
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider"
                        style={{
                          background: c.isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)",
                          color: c.isDark ? "#fbbf24" : "#d97706",
                          border: `1px solid ${c.isDark ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.2)"}`,
                        }}
                      >
                        {p.template || "IEEE"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {p.status || "DRAFT"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold leading-snug line-clamp-2" style={{ color: c.text }}>
                      {p.title}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 flex items-center justify-between text-xs" style={{ borderTop: `1px solid ${c.divider}`, color: c.textMuted }}>
                    <span className="flex items-center gap-1 font-medium"><Globe size={12} className="text-amber-500" /> {p.domain || "CS"}</span>
                    <span className="font-mono text-[11px]">{p.wordCount ? `${p.wordCount} words` : (p.date || "Just now")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Clean Empty State */
            <div
              className="p-8 rounded-2xl border text-center space-y-4"
              style={{
                background: c.isDark ? "rgba(255,255,255,0.015)" : "#ffffff",
                border: `1px border-dashed ${c.isDark ? "rgba(245,158,11,0.25)" : c.border}`,
              }}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
                <FolderPlus size={28} />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-extrabold" style={{ color: c.text }}>No Research Papers Created Yet</h3>
                <p className="text-xs mt-1" style={{ color: c.textMuted }}>
                  Start writing your first scientific paper. Use the 9-Step AI Wizard to generate structured literature reviews, methodologies, equations, and formatted references.
                </p>
              </div>
              <button
                onClick={onStartNewPaper}
                className="px-5 py-2.5 rounded-xl font-extrabold text-xs text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md shadow-amber-500/20 inline-flex items-center gap-2"
              >
                <Plus size={16} /> Start 9-Step Wizard
              </button>
            </div>
          )}
        </div>

        {/* Quick Side Panel: Saved Drafts & Export History */}
        <div className="space-y-6">
          {/* Saved Drafts */}
          <div
            className="p-5 rounded-xl space-y-3"
            style={{
              background: c.isDark ? "rgba(255,255,255,0.025)" : "#ffffff",
              border: `1px solid ${c.isDark ? "rgba(245,158,11,0.15)" : c.border}`,
            }}
          >
            <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: c.text }}>
              <Clock size={16} className="text-amber-500" /> Active Drafts ({drafts.length})
            </h3>

            {drafts.length > 0 ? (
              <div className="space-y-2">
                {drafts.map((d: any) => (
                  <div
                    key={d.id}
                    onClick={() => onSelectPaper(d)}
                    className="p-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-colors"
                    style={{ background: c.isDark ? "rgba(255,255,255,0.02)" : "#f8fafc" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate" style={{ color: c.text }}>{d.title}</div>
                      <div className="text-[10px] font-semibold text-amber-500">{d.step || "Draft"}</div>
                    </div>
                    <Edit3 size={14} className="text-amber-400 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs py-4 text-center" style={{ color: c.textMuted }}>
                No active drafts in progress.
              </div>
            )}
          </div>

          {/* Export History */}
          <div
            className="p-5 rounded-xl space-y-3"
            style={{
              background: c.isDark ? "rgba(255,255,255,0.025)" : "#ffffff",
              border: `1px solid ${c.isDark ? "rgba(245,158,11,0.15)" : c.border}`,
            }}
          >
            <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: c.text }}>
              <Download size={16} className="text-amber-500" /> Recent Exports ({exportHistory.length})
            </h3>

            {exportHistory.length > 0 ? (
              <div className="space-y-2 text-xs">
                {exportHistory.slice(0, 5).map((ex: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: i < exportHistory.length - 1 ? `1px solid ${c.divider}` : "none" }}>
                    <div className="truncate max-w-[170px] font-medium" style={{ color: c.text }}>{ex.title || ex.name}</div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase">
                      {ex.format}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs py-4 text-center" style={{ color: c.textMuted }}>
                No paper exports recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

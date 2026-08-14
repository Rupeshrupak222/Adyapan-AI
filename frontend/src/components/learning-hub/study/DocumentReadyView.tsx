"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { AIContent } from "@/components/ai/AIContent";
import {
  FileText, Search, ChevronRight, BookOpen, Brain, Sparkles,
  Copy, FileDown, RefreshCw, X, Loader2, Cpu, BarChart2, Layers
} from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";
import { mkColors } from "@/utils/themeColors";
import { slideRight, scaleIn } from "@/utils/animations";
import type { TopicSummary, DocStats, AIInsights } from "../StudyAssistantView";

type Props = {
  c: ReturnType<typeof mkColors>;
  summaryData: { title: string; topics: TopicSummary[]; stats: DocStats; insights: AIInsights };
  fileDetails: { name: string; size: string; pages: number; language: string; time: string } | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTopic: string;
  handleScrollToTopic: (name: string) => void;
  revealedTopics: number;
  filteredTopics: TopicSummary[];
  contentRef: React.RefObject<HTMLDivElement | null>;
  handleCopySummary: () => void;
  handleDownloadPdf: () => void;
  downloadingPdf: boolean;
  onNewUpload: () => void;
};

export function DocumentReadyView({
  c, summaryData, fileDetails, searchQuery, setSearchQuery, activeTopic,
  handleScrollToTopic, revealedTopics, filteredTopics, contentRef,
  handleCopySummary, handleDownloadPdf, downloadingPdf, onNewUpload
}: Props) {


  return (
    <motion.div
      key="ready"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-0"
      style={{ minHeight: "600px" }}
    >
      {/* Left Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="sa-scroll flex flex-col gap-3 overflow-y-auto pr-3"
        style={{ width: "30%", minWidth: "200px", maxHeight: "80vh", position: "sticky", top: 0 }}
      >
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-2xl shrink-0" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
              <FileText size={14} style={{ color: c.amber }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: c.text }}>{fileDetails?.name || "Document"}</p>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ background: c.greenBg, color: c.green }}>Analyzed</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Pages", value: summaryData.stats.pages },
              { label: "Topics", value: summaryData.stats.topicsFound },
              { label: "Words", value: summaryData.stats.words.toLocaleString() },
              { label: "Read Time", value: summaryData.stats.readingTime }
            ].map(stat => (
              <div key={stat.label} className="p-2 rounded-lg text-center" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}` }}>
                <span className="text-[10px] block" style={{ color: c.textMuted }}>{stat.label}</span>
                <span className="text-xs font-extrabold" style={{ color: c.text }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <div className="p-3 border-b sticky top-0 z-10" style={{ borderColor: c.divider, background: c.stickyBg, backdropFilter: "blur(12px)" }}>
            <span className="text-[10px] font-black uppercase tracking-widest block mb-2" style={{ color: c.amber }}>Detected Topics</span>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="w-full rounded-lg pl-7 pr-2 py-1.5 text-xs focus:outline-none transition-colors"
                style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
              />
            </div>
          </div>
          <div className="p-2 space-y-0.5">
            {summaryData.topics.map((t, i) => (
              <motion.button
                key={t.name}
                custom={i}
                variants={slideRight}
                initial="hidden"
                animate="visible"
                onClick={() => handleScrollToTopic(t.name)}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left py-2.5 px-3 rounded-xl flex items-center justify-between transition-all duration-200"
                style={{
                  background: activeTopic === t.name ? c.amberActive : "transparent",
                  border: activeTopic === t.name ? `1px solid ${c.amberBorder}` : "1px solid transparent",
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors" style={{ background: activeTopic === t.name ? c.amber : c.border }} />
                  <span className="text-sm font-semibold truncate" style={{ color: activeTopic === t.name ? c.amber : c.textSec }}>{t.name}</span>
                </div>
                <motion.div
                  animate={{ rotate: activeTopic === t.name ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={12} style={{ color: activeTopic === t.name ? c.amber : c.textMuted }} />
                </motion.div>
              </motion.button>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="p-3 rounded-2xl shrink-0" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
          <span className="text-[10px] font-black uppercase tracking-widest block mb-2.5 flex items-center gap-1.5" style={{ color: c.amber }}>
            <Sparkles size={11} /> AI Subject Insights
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Main Subject", value: summaryData.insights.mainSubject },
              { label: "Difficulty", value: summaryData.insights.difficultyLevel },
              { label: "Study Time", value: summaryData.insights.estimatedStudyTime },
              { label: "Exam Priority", value: "High" }
            ].map((insight, i) => (
              <motion.div
                key={insight.label}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="p-2 rounded-xl text-center"
                style={{ background: c.cardBgAlt, border: `1px solid ${c.border}` }}
              >
                <span className="text-[10px] block leading-tight" style={{ color: c.textMuted }}>{insight.label}</span>
                <span className="text-xs font-extrabold block truncate mt-0.5" style={{ color: c.text }}>{insight.value}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="p-3 rounded-2xl shrink-0 space-y-2" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: c.textMuted }}>Actions</span>
          {[
            { icon: <Copy size={13} />, label: "Copy Summary", fn: handleCopySummary },
            { icon: downloadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />, label: downloadingPdf ? "Generating PDF..." : "Download PDF", fn: handleDownloadPdf, disabled: downloadingPdf },
          ].map((action) => (
            <motion.button
              key={action.label}
              whileHover={!action.disabled ? { x: 2 } : undefined}
              whileTap={!action.disabled ? { scale: 0.97 } : undefined}
              onClick={action.fn}
              disabled={action.disabled}
              className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all text-left"
              style={{ background: c.surface, border: `1px solid ${c.border}`, color: action.disabled ? c.textMuted : c.textSec, opacity: action.disabled ? 0.6 : 1, cursor: action.disabled ? "not-allowed" : "pointer" }}
            >
              <span style={{ color: c.amber }} className="shrink-0">{action.icon}</span>
              {action.label}
            </motion.button>
          ))}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNewUpload}
            className="w-full py-2 rounded-lg text-sm font-extrabold transition-all flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
          >
            <RefreshCw size={13} /> New Upload
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Main Content Body */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        ref={contentRef}
        className="flex-1 flex flex-col min-w-0 pl-4 space-y-4"
      >


        {/* Search Bar */}
        <div className="pb-1">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search summaries, keywords, topics..."
              className="w-full rounded-xl pl-10 pr-10 py-3 text-sm transition-all focus:outline-none"
              style={{
                background: c.inputBg,
                border: `1px solid ${searchQuery ? c.amber : c.border}`,
                color: c.text,
                boxShadow: searchQuery ? `0 0 0 2px ${c.amberBg}` : "none"
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: c.textMuted }}>
                <X size={14} />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs mt-1.5 ml-1" style={{ color: c.textMuted }}>
              {filteredTopics.length} topic{filteredTopics.length !== 1 ? "s" : ""} found for &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>

        {/* Topic Summaries */}
        <div className="space-y-3 pb-4">
          {(searchQuery ? filteredTopics : filteredTopics.slice(0, revealedTopics)).map((t, idx) => {
            const isOpen = activeTopic === t.name;
            return (
              <motion.div
                key={t.name}
                id={`topic-${t.name.replace(/\s+/g, "-")}`}
                custom={idx}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                className="rounded-2xl overflow-hidden"
                style={{ background: c.cardBg, border: `1px solid ${isOpen ? c.amberBorder : c.border}` }}
              >
                <motion.button
                  onClick={() => handleScrollToTopic(t.name)}
                  whileHover={{ background: isOpen ? c.amberBg : c.bgHover }}
                  whileTap={{ scale: 0.995 }}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-all"
                  style={{
                    background: isOpen ? c.amberBg : c.surface,
                    borderBottom: isOpen ? `1px solid ${c.divider}` : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: isOpen ? "rgba(245,158,11,0.2)" : c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                      <BookOpen size={14} style={{ color: c.amber }} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>{t.name}</h3>
                      {!isOpen && (
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: c.textMuted }}>{t.overview.slice(0, 80)}…</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full hidden sm:block" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textMuted }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <ChevronRight size={16} style={{ color: isOpen ? c.amber : c.textMuted }} />
                    </motion.div>
                  </div>
                </motion.button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="p-5 space-y-5">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest font-black block mb-2" style={{ color: c.amber }}>Overview</span>
                          <AIContent content={t.overview} />
                        </div>

                        {t.subtopics && t.subtopics.length > 0 && (
                          <div className="space-y-3">
                            <span className="text-[10px] uppercase tracking-widest font-black block mb-2" style={{ color: c.amber }}>Subtopics</span>
                            <div className="space-y-4 pl-4 border-l-2" style={{ borderColor: c.border }}>
                              {t.subtopics.map((sub, sIdx) => (
                                <div key={sIdx} className="space-y-1">
                                  <h4 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
                                    {sub.name}
                                  </h4>
                                  <div className="text-sm leading-relaxed" style={{ color: c.textSec }}>
                                    <AIContent content={sub.content} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl" style={{ background: c.purpleBg, border: `1px solid ${c.purpleBorder}` }}>
                            <span className="text-[10px] uppercase tracking-widest font-black block mb-3" style={{ color: "#a78bfa" }}>
                              ✦ Key Concepts
                            </span>
                            <ul className="space-y-1.5">
                              {t.keyConcepts.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-[14px] leading-snug" style={{ color: c.textSec }}>
                                  <span style={{ color: "#a78bfa" }} className="mt-1 shrink-0">▸</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl" style={{ background: c.cyanBg, border: `1px solid ${c.cyanBorder}` }}>
                            <span className="text-[10px] uppercase tracking-widest font-black block mb-3" style={{ color: "#22d3ee" }}>
                              ★ Important Points
                            </span>
                            <ul className="space-y-1.5">
                              {t.importantPoints.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-[14px] leading-snug" style={{ color: c.textSec }}>
                                  <span style={{ color: "#22d3ee" }} className="mt-1 shrink-0">▸</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {t.questions && t.questions.length > 0 && (
                          <div className="p-4 rounded-xl" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                            <span className="text-[10px] uppercase tracking-widest font-black block mb-3 flex items-center gap-1.5" style={{ color: c.amber }}>
                              <Brain size={12} /> Practice Questions
                            </span>
                            <ul className="space-y-3">
                              {t.questions.map((q, i) => (
                                <li key={i} className="flex items-start gap-2 text-[14px] leading-snug" style={{ color: c.textSec }}>
                                  <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold" style={{ background: c.amberBg, color: c.amber }}>{i + 1}</span>
                                  <span>{q}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="p-4 rounded-xl relative overflow-hidden" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{ opacity: 0.04, background: "radial-gradient(circle, #f59e0b, transparent)", transform: "translate(30%, -30%)" }} />
                          <span className="text-[10px] uppercase tracking-widest font-black block mb-2" style={{ color: c.amber }}>⚡ Quick Revision</span>
                          <p className="text-[15px] leading-[1.75] italic" style={{ color: c.textSec }}>&ldquo;{t.quickRevision}&rdquo;</p>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase tracking-widest font-black block mb-2.5" style={{ color: c.textMuted }}># Keywords</span>
                          <div className="flex flex-wrap gap-2">
                            {t.keywords.map(kw => (
                              <motion.span
                                key={kw}
                                whileHover={{ scale: 1.06, y: -1 }}
                                className="px-3 py-1 rounded-full text-sm font-semibold cursor-default"
                                style={{ background: c.pill, border: `1px solid ${c.pillBorder}`, color: c.textSec }}
                              >
                                {kw}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

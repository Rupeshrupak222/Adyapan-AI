"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronDown, Terminal, AlertTriangle,
  BookOpenCheck, Plus, BookOpen, Layers, Award, Zap, CheckCircle,
} from "lucide-react";
import { mkColors } from "@/utils/themeColors";
import { parseMarkdown } from "@/utils/parseMarkdown";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { AIContent } from "@/components/ai/AIContent";
import type { UnifiedLesson } from "../StudyAssistantView";

const modeConfig = {
  beginner: { borderColor: "border-amber-500/15", textColor: "text-amber-400", accentBg: "bg-amber-500/10", glowColor: "from-amber-500/20 to-yellow-500/20", icon: BookOpen },
  intermediate: { borderColor: "border-amber-500/15", textColor: "text-amber-400", accentBg: "bg-amber-500/10", glowColor: "from-amber-500/20 to-yellow-500/20", icon: Layers },
  interview: { borderColor: "border-amber-500/15", textColor: "text-amber-400", accentBg: "bg-amber-500/10", glowColor: "from-amber-500/20 to-yellow-500/20", icon: Award },
  revision: { borderColor: "border-amber-500/15", textColor: "text-amber-400", accentBg: "bg-amber-500/10", glowColor: "from-amber-500/20 to-red-500/20", icon: Zap }
};

type Props = {
  c: ReturnType<typeof mkColors>;
  data: UnifiedLesson;
  level: string;
  expandedConceptIdx: number | null;
  setExpandedConceptIdx: (idx: number | null) => void;
  isScratchpadOpen: boolean;
  onImportConcept: (concept: { title: string; content: string }) => void;
  practiceRevealed: Record<number, boolean>;
  setPracticeRevealed: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  quizAnswers: Record<number, string>;
  quizSubmitted: Record<number, boolean>;
  onQuizSelect: (questionIdx: number, option: string) => void;
  onQuizSubmit: (questionIdx: number) => void;
};

export function IntermediateLesson({ c, data, level, expandedConceptIdx, setExpandedConceptIdx, isScratchpadOpen, onImportConcept, practiceRevealed, setPracticeRevealed, quizAnswers, quizSubmitted, onQuizSelect, onQuizSubmit }: Props) {
  const mode = modeConfig[level as keyof typeof modeConfig] || modeConfig.intermediate;
  const ModeIcon = mode.icon;
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="p-6 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider" style={{ color: c.text }}>
              <ModeIcon size={14} /> Comprehension Overview
            </div>
            <div className="text-sm leading-relaxed" style={{ color: c.textSec }}>{parseMarkdown(data.overview, c.isDark)}</div>
          </div>
        </div>
      </motion.div>
      {data.key_concepts && data.key_concepts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-extrabold tracking-wider" style={{ color: c.textMuted }}>Core Syllabus Concepts</h3>
          <div className="space-y-4">
            {data.key_concepts.map((concept, idx) => {
              const isExpanded = expandedConceptIdx === idx;
              return (
                <div key={idx} onClick={() => setExpandedConceptIdx(isExpanded ? null : idx)}
                  className="p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden"
                  style={{
                    background: isExpanded ? c.cardBg : c.cardBgAlt,
                    borderColor: isExpanded ? c.borderHover : c.border
                  }}>
                  <div className="flex justify-between items-start w-full">
                    <h4 className="text-xs font-black uppercase tracking-wider transition-colors" style={{ color: c.text }}>
                      {concept.title}
                    </h4>
                    {isExpanded
                      ? <ChevronDown size={14} style={{ color: c.text }} />
                      : <ChevronRight size={14} style={{ color: c.textMuted }} />}
                  </div>
                  {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.2 }}
                      className="mt-3.5 space-y-4 pt-3 border-t" style={{ borderColor: c.divider }}>
                      <div className="text-xs leading-relaxed" style={{ color: c.textSec }}>{parseMarkdown(concept.content, c.isDark)}</div>
                      {concept.sub_concepts && concept.sub_concepts.length > 0 && (
                        <div className="space-y-2 pl-2" style={{ borderLeft: `2px solid ${c.borderHover}` }}>
                          <span className="text-[9px] uppercase tracking-widest font-extrabold block" style={{ color: c.textMuted }}>Sub-Concepts</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {concept.sub_concepts.map((sub, sIdx) => (
                              <div key={sIdx} className="p-2.5 rounded-lg text-xs font-medium" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}`, color: c.textMuted }}>
                                {sub}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {concept.tips && concept.tips.length > 0 && (
                        <div className="p-4 rounded-xl space-y-2" style={{ background: c.amberBg, border: `1px solid ${c.border}` }}>
                          <span className="text-[9px] uppercase tracking-widest font-extrabold flex items-center gap-1.5" style={{ color: c.amber }}>
                            <AlertTriangle size={11} /> Important Rule / Tip
                          </span>
                          <ul className="list-disc pl-4 text-xs space-y-1 leading-relaxed" style={{ color: c.textSec }}>
                            {concept.tips.map((tip, tIdx) => <li key={tIdx}>{tip}</li>)}
                          </ul>
                        </div>
                      )}
                      {isScratchpadOpen && (
                        <div className="flex justify-end pt-2">
                          <button onClick={(e) => { e.stopPropagation(); onImportConcept(concept); }}
                            className="px-2.5 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.amber }}>
                            <Plus size={8} /> Copy to Scratchpad
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {data.examples && data.examples.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-extrabold tracking-wider" style={{ color: c.textMuted }}>Explanatory Walkthroughs & Code</h3>
          <div className="space-y-4">
            {data.examples.map((ex, idx) => (
              <div key={idx} className="p-6 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider" style={{ color: c.textMuted }}>
                    <Terminal size={14} /> {ex.title}
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: c.textSec }}>{parseMarkdown(ex.scenario, c.isDark)}</div>
                  {ex.code_or_data && (
                    <div className="rounded-xl border font-mono text-xs leading-relaxed whitespace-pre-wrap select-text p-4" style={{ borderColor: c.border, background: c.isDark ? "rgba(0,0,0,0.4)" : "#f1f5f9", color: c.textSec }}>
                      <code>{ex.code_or_data}</code>
                    </div>
                  )}
                  {ex.explanation && (
                    <p className="text-xs italic pl-2 leading-relaxed" style={{ color: c.textMuted, borderLeft: `2px solid ${c.borderHover}` }}>{ex.explanation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.practice_questions && data.practice_questions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-extrabold tracking-wider" style={{ color: c.textMuted }}>Interactive Challenges & Scenarios</h3>
          <div className="space-y-4">
            {data.practice_questions.map((pr, idx) => {
              const isAnswerRevealed = practiceRevealed[idx];
              return (
                <div key={idx} className="p-5 rounded-2xl space-y-4" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}` }}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold uppercase font-mono" style={{ color: c.textMuted }}>CHALLENGE {idx + 1}</span>
                      <h4 className="text-sm font-bold leading-relaxed" style={{ color: c.text }}>{pr.question}</h4>
                    </div>
                  </div>
                  {pr.guidance && (
                    <div className="text-xs p-3 rounded-lg leading-relaxed font-medium" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}`, color: c.textMuted }}>
                      <strong>Guidance/Hint:</strong> <AIContent content={pr.guidance} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setPracticeRevealed(prev => ({ ...prev, [idx]: !isAnswerRevealed }))}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold h-8 border transition-all cursor-pointer"
                      style={{
                        background: isAnswerRevealed ? c.surfaceHover : c.amberBg,
                        borderColor: c.borderHover,
                        color: isAnswerRevealed ? c.text : c.amber
                      }}>
                      {isAnswerRevealed ? "Hide Solution" : "Reveal Model Answer"}
                    </button>
                  </div>
                  <AnimatePresence>
                    {isAnswerRevealed && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-3 border-t overflow-hidden" style={{ borderColor: c.divider }}>
                        {pr.expected_answer && (
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-widest font-extrabold block" style={{ color: c.amber }}>Ideal Model Answer</span>
                            <div className="text-xs leading-relaxed p-3.5 rounded-xl" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.textSec }}>
                              {parseMarkdown(pr.expected_answer, c.isDark)}
                            </div>
                          </div>
                        )}
                        {pr.red_flag && (
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-widest font-extrabold block" style={{ color: c.rose }}>Critical Trap / Common Mistake</span>
                            <div className="text-xs leading-relaxed p-3.5 rounded-xl" style={{ background: c.roseBg, border: `1px solid ${c.roseBorder}`, color: c.textSec }}>
                              {parseMarkdown(pr.red_flag, c.isDark)}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {data.quiz && data.quiz.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-extrabold tracking-wider flex items-center gap-1.5" style={{ color: c.textMuted }}>
            <BookOpenCheck size={13} /> Comprehension Checkpoint Quiz
          </h3>
          <div className="space-y-6">
            {data.quiz.map((q, qIdx) => {
              const userAns = quizAnswers[qIdx];
              const isSubmitted = quizSubmitted[qIdx];
              return (
                <div key={qIdx} className="p-6 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <div className="space-y-5">
                    <div className="pb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
                      <span className="text-[10px] font-mono" style={{ color: c.textMuted }}>QUESTION {qIdx + 1} OF {data.quiz!.length}</span>
                      <h4 className="text-sm font-bold mt-1" style={{ color: c.text }}>{q.question}</h4>
                    </div>
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const isSelected = userAns === opt;
                        const isCorrect = opt === q.answer;
                        let optionStyle: React.CSSProperties = { background: c.inputBg, borderColor: c.border };
                        if (isSelected && !isSubmitted) {
                          optionStyle = { background: c.cardBgAlt, borderColor: c.borderHover, color: c.text };
                        } else if (isSubmitted) {
                          if (isCorrect) {
                            optionStyle = { background: "rgba(16,185,129,0.15)", borderColor: c.amber, color: c.amber };
                          } else if (isSelected) {
                            optionStyle = { background: "rgba(244,63,94,0.15)", borderColor: c.rose, color: c.rose };
                          } else {
                            optionStyle = { background: c.surface, borderColor: c.border, opacity: 0.55 };
                          }
                        }
                        return (
                          <button key={opt} disabled={isSubmitted} onClick={() => onQuizSelect(qIdx, opt)}
                            className="w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer flex justify-between items-center"
                            style={optionStyle}>
                            <span>{opt}</span>
                            {isSubmitted && isCorrect && <CheckCircle size={15} style={{ color: c.amber }} />}
                            {isSubmitted && isSelected && !isCorrect && <AlertTriangle size={15} style={{ color: c.rose }} />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-1 flex flex-col gap-3">
                      {!isSubmitted ? (
                        <button disabled={!userAns} onClick={() => onQuizSubmit(qIdx)}
                          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", border: "none" }}>
                          Submit Answer
                        </button>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl text-xs leading-relaxed" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}`, color: c.textSec }}>
                          <strong style={{ color: c.amber }}>Explanation:</strong> {q.explanation}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {data.summary && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-extrabold tracking-wider flex items-center gap-1.5" style={{ color: c.textMuted }}>
            <Terminal size={13} /> Study Recap & Summary
          </h3>
          <div className="p-6 rounded-2xl relative overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
            <div className="relative space-y-4 select-text">
              <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
                <span className="text-xs font-black tracking-widest uppercase" style={{ color: c.text }}>REVISION CHEAT SHEET</span>
                <span className="text-[10px] font-mono" style={{ color: c.textMuted }}>ACCELERATED DIGEST</span>
              </div>
              <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: c.textSec }}>{parseMarkdown(data.summary, c.isDark)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Bookmark,
  BookmarkCheck,
  Flag,
  StickyNote,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Zap,
  Brain,
  Target,
} from "lucide-react";
import type { AptitudeQuestion, AptitudeAnswer } from "./types";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.07, duration: 0.35 },
  }),
};

interface QuestionCardProps {
  question: AptitudeQuestion;
  questionNumber: number;
  totalQuestions: number;
  answer: AptitudeAnswer | null;
  theme?: string;
  showExplanation: boolean;
  timeElapsed: number;
  onSelectOption: (idx: number) => void;
  onSubmit: () => void;
  onNext: () => void;
  onBookmark: () => void;
  onFlag: () => void;
  onAddNote: (note: string) => void;
  onToggleExplanation: () => void;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  easy: { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.25)" },
  medium: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
  hard: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.25)" },
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  answer,
  theme = "dark",
  showExplanation,
  timeElapsed,
  onSelectOption,
  onSubmit,
  onNext,
  onBookmark,
  onFlag,
  onAddNote,
  onToggleExplanation,
}: QuestionCardProps) {
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

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSelectedIdx(null);
    setIsSubmitted(false);
    setNotesOpen(false);
    setNotesValue(answer?.notes || "");
  }, [question.id]);

  const isBookmarked = answer?.bookmarked ?? false;
  const isFlagged = answer?.flagged ?? false;
  const isCorrect = isSubmitted && selectedIdx === question.correctIdx;
  const isWrong = isSubmitted && selectedIdx !== null && selectedIdx !== question.correctIdx;

  const diffConfig = DIFFICULTY_COLORS[question.difficulty] || DIFFICULTY_COLORS.medium;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const estimatedMin = Math.ceil(question.estimatedTimeSec / 60);

  const isTimerLow = timeElapsed > question.estimatedTimeSec * 1.5;
  const isTimerCritical = timeElapsed > question.estimatedTimeSec * 2;

  const handleSubmit = () => {
    if (selectedIdx === null || isSubmitted) return;
    setIsSubmitted(true);
    onSubmit();
  };

  const handleNext = () => {
    onNext();
  };

  const handleSaveNotes = () => {
    onAddNote(notesValue);
  };

  useEffect(() => {
    if (notesOpen && notesRef.current) {
      notesRef.current.focus();
    }
  }, [notesOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="p-6 border rounded-2xl space-y-5"
      style={{ background: c.cardBg, borderColor: c.border }}
    >
      {/* Top Bar: Progress + Timer + Meta */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b" style={{ borderColor: c.border }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
            style={{ background: diffConfig.bg, color: diffConfig.text, border: `1px solid ${diffConfig.border}` }}
          >
            {question.difficulty}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            {question.topic}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: c.textMuted }}>
            <Clock size={11} /> ~{estimatedMin}m
          </span>
          <motion.span
            animate={
              isTimerCritical
                ? { scale: [1, 1.08, 1], color: ["#ef4444", "#fca5a5", "#ef4444"] }
                : isTimerLow
                ? { scale: [1, 1.04, 1] }
                : {}
            }
            transition={{ duration: 1, repeat: Infinity }}
            className="text-xs font-black flex items-center gap-1"
            style={{ color: isTimerCritical ? "#ef4444" : isTimerLow ? "#f59e0b" : c.textSec }}
          >
            <Clock size={13} /> {formatTime(timeElapsed)}
          </motion.span>
        </div>
      </div>

      {/* Problem Statement */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="space-y-2">
        <p className="text-sm font-semibold leading-relaxed whitespace-pre-line" style={{ color: c.text }}>
          {question.text}
        </p>
        {question.companyTags && question.companyTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {question.companyTags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Options (2x2 grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {question.options.map((opt, oIdx) => {
          const isSelected = selectedIdx === oIdx;
          const isCorrectAnswer = oIdx === question.correctIdx;

          let optBg = "rgba(255,255,255,0.05)";
          let optBorder = "rgba(255,255,255,0.1)";
          let optText = c.textSec;
          let letterBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
          let letterColor = c.textMuted;

          if (isSelected && !isSubmitted) {
            optBg = "rgba(245,158,11,0.1)";
            optBorder = "rgba(245,158,11,0.3)";
            optText = "#f59e0b";
            letterBg = "rgba(245,158,11,0.2)";
            letterColor = "#f59e0b";
          }

          if (isSubmitted) {
            if (isCorrectAnswer) {
              optBg = "rgba(16,185,129,0.1)";
              optBorder = "rgba(16,185,129,0.3)";
              optText = "#10b981";
              letterBg = "rgba(16,185,129,0.2)";
              letterColor = "#10b981";
            } else if (isSelected) {
              optBg = "rgba(239,68,68,0.1)";
              optBorder = "rgba(239,68,68,0.3)";
              optText = "#ef4444";
              letterBg = "rgba(239,68,68,0.2)";
              letterColor = "#ef4444";
            }
          }

          return (
            <motion.div
              key={oIdx}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              custom={oIdx}
              whileHover={!isSubmitted ? { y: -2, scale: 1.01 } : {}}
              whileTap={!isSubmitted ? { scale: 0.97 } : {}}
              onClick={() => !isSubmitted && onSelectOption(oIdx)}
              className="p-3.5 border rounded-xl cursor-pointer transition-all flex items-center gap-3"
              style={{ background: optBg, borderColor: optBorder, color: optText }}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                style={{ background: letterBg, color: letterColor }}
              >
                {OPTION_LETTERS[oIdx]}
              </span>
              <span className="text-xs font-bold leading-relaxed flex-1">{opt}</span>
              <AnimatePresence>
                {isSubmitted && isCorrectAnswer && (
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="inline-flex shrink-0"
                  >
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  </motion.span>
                )}
                {isSubmitted && isSelected && !isCorrectAnswer && (
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="inline-flex shrink-0"
                  >
                    <XCircle size={15} className="text-red-500" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {!isSubmitted ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSubmit}
            disabled={selectedIdx === null}
            className="py-2 px-4 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            Submit Answer
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleNext}
            className="py-2 px-4 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors flex items-center gap-1.5"
          >
            {questionNumber < totalQuestions ? "Next Question" : "Finish"}
            <ChevronRight size={13} />
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onBookmark}
          className="py-2 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors"
          style={{
            background: isBookmarked ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
            borderColor: isBookmarked ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.1)",
            color: isBookmarked ? "#f59e0b" : c.textMuted,
          }}
        >
          {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          {isBookmarked ? "Saved" : "Bookmark"}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onFlag}
          className="py-2 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors"
          style={{
            background: isFlagged ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
            borderColor: isFlagged ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)",
            color: isFlagged ? "#ef4444" : c.textMuted,
          }}
        >
          <Flag size={13} />
          {isFlagged ? "Flagged" : "Flag"}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setNotesOpen(!notesOpen)}
          className="py-2 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors"
          style={{
            background: notesOpen ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.05)",
            borderColor: notesOpen ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.1)",
            color: notesOpen ? "#3b82f6" : c.textMuted,
          }}
        >
          <StickyNote size={13} />
          Notes
        </motion.button>

        {isSubmitted && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onToggleExplanation}
            className="py-2 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors"
            style={{
              background: showExplanation ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
              borderColor: showExplanation ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.1)",
              color: showExplanation ? "#f59e0b" : c.textMuted,
            }}
          >
            <Lightbulb size={13} />
            {showExplanation ? "Hide" : "AI Solution"}
          </motion.button>
        )}
      </div>

      {/* Notes Panel */}
      <AnimatePresence>
        {notesOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl border space-y-2" style={{ background: "rgba(59,130,246,0.05)", borderColor: "rgba(59,130,246,0.15)" }}>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Personal Notes</span>
              <textarea
                ref={notesRef}
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Jot down your approach, formulas, or reminders..."
                rows={3}
                className="w-full bg-transparent border rounded-lg p-2.5 text-xs font-semibold leading-relaxed resize-none focus:outline-none focus:border-blue-500/40"
                style={{ color: c.text, borderColor: "rgba(59,130,246,0.2)" }}
              />
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSaveNotes}
                  className="py-1.5 px-3 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 text-[10px] font-bold hover:bg-blue-500/25 transition-colors"
                >
                  Save Note
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Banner */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
              isCorrect
                ? "bg-emerald-500/10 border-emerald-500/25"
                : selectedIdx === null
                ? "bg-white/5 border-white/10"
                : "bg-red-500/10 border-red-500/25"
            }`}
            style={
              isCorrect
                ? { color: "#10b981" }
                : selectedIdx === null
                ? { color: c.textMuted }
                : { color: "#ef4444" }
            }
          >
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 18 }}
              className="inline-flex"
            >
              {isCorrect ? (
                <CheckCircle2 size={16} />
              ) : selectedIdx === null ? (
                <AlertTriangle size={16} />
              ) : (
                <XCircle size={16} />
              )}
            </motion.span>
            <span>
              {isCorrect
                ? "Correct! Well done."
                : selectedIdx === null
                ? "Skipped."
                : `Incorrect. The correct answer is ${OPTION_LETTERS[question.correctIdx]}.`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Explanation Panel */}
      <AnimatePresence>
        {showExplanation && isSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "rgba(245,158,11,0.2)" }}
          >
            {/* Explanation Header */}
            <div
              className="px-5 py-3 flex items-center gap-2 border-b"
              style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.15)" }}
            >
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 18 }}
                className="inline-flex"
              >
                <Brain size={15} className="text-amber-500" />
              </motion.span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-500">
                AI Explanation
              </span>
            </div>

            <div className="p-5 space-y-4" style={{ background: isDark ? "rgba(245,158,11,0.03)" : "rgba(245,158,11,0.02)" }}>
              {/* Step-by-step Solution */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Target size={12} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                    Step-by-Step Solution
                  </span>
                </div>
                <p className="text-xs leading-relaxed pl-5" style={{ color: c.textSec }}>
                  {question.explanation}
                </p>
              </motion.div>

              {/* Shortcut / Trick */}
              {question.shortcut && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap size={12} className="text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                      Shortcut Method
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed pl-5" style={{ color: c.textSec }}>
                    {question.shortcut}
                  </p>
                </motion.div>
              )}

              {/* Common Mistakes */}
              {question.commonMistakes && question.commonMistakes.length > 0 && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-red-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
                      Common Mistakes
                    </span>
                  </div>
                  <ul className="space-y-1 pl-5">
                    {question.commonMistakes.map((mistake, mIdx) => (
                      <li key={mIdx} className="text-xs leading-relaxed flex items-start gap-1.5" style={{ color: c.textSec }}>
                        <span className="text-red-500 mt-0.5 shrink-0">•</span>
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Related Concepts */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Lightbulb size={12} className="text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                    Related Concepts
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-5">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}
                  >
                    {question.topic}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    {question.category.replace(/_/g, " ")}
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

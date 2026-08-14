"use client";

import { motion } from "framer-motion";
import {
  BookOpen, FileText, GraduationCap, Plus, History,
} from "lucide-react";
import { mkColors } from "@/utils/themeColors";
import type { UnifiedLesson } from "../StudyAssistantView";

type Props = {
  c: ReturnType<typeof mkColors>;
  mode: "document" | "topic";
  onSwitchToDocument: () => void;
  onSwitchToTopic: () => void;
  showNewUpload: boolean;
  onNewUpload: () => void;
  showDocumentHistory: boolean;
  onToggleDocumentHistory: () => void;
  documentHistoryCount: number;
  showTopicHistory: boolean;
  onToggleTopicHistory: () => void;
  topicHistoryCount: number;
};

export function StudyAssistantHeader({ c, mode, onSwitchToDocument, onSwitchToTopic, showNewUpload, onNewUpload, showDocumentHistory, onToggleDocumentHistory, documentHistoryCount, showTopicHistory, onToggleTopicHistory, topicHistoryCount }: Props) {
  return (
    <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
      <div className="flex items-center gap-2.5">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
        >
          <BookOpen size={18} style={{ color: "#000" }} />
        </motion.div>
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-base font-extrabold leading-tight"
            style={{ color: c.text, fontFamily: "var(--font-sans)" }}
          >
            Study Assistant
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-xs leading-tight"
            style={{ color: c.textMuted }}
          >
            {mode === "document" ? "AI-powered document summarizer & topic analyzer" : "AI-powered accelerated learning plans"}
          </motion.p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex p-0.5 rounded-lg" style={{ background: c.inputBg, border: `1px solid ${c.border}` }}>
          <button onClick={onSwitchToDocument}
            className="relative px-3 py-1.5 rounded-md text-[10px] font-bold select-none cursor-pointer z-10 transition-colors">
            <span style={{ color: mode === "document" ? c.text : c.textMuted }}><FileText size={12} className="inline mr-1" />Document</span>
            {mode === "document" && (
              <motion.div layoutId="modePill"
                className="absolute inset-0 rounded-md -z-10"
                style={{ background: c.surfaceHover, border: `1px solid ${c.borderHover}` }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }} />
            )}
          </button>
          <button onClick={onSwitchToTopic}
            className="relative px-3 py-1.5 rounded-md text-[10px] font-bold select-none cursor-pointer z-10 transition-colors">
            <span style={{ color: mode === "topic" ? c.text : c.textMuted }}><GraduationCap size={12} className="inline mr-1" />Topic</span>
            {mode === "topic" && (
              <motion.div layoutId="modePill"
                className="absolute inset-0 rounded-md -z-10"
                style={{ background: c.surfaceHover, border: `1px solid ${c.borderHover}` }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }} />
            )}
          </button>
        </div>
        {showNewUpload && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onNewUpload}
            className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}
          >
            <Plus size={14} /> New Upload
          </motion.button>
        )}
        {mode === "document" && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onToggleDocumentHistory}
            className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            style={{
              background: showDocumentHistory ? c.amberActive : c.surface,
              border: `1px solid ${showDocumentHistory ? c.amberBorder : c.border}`,
              color: showDocumentHistory ? c.amber : c.text
            }}
          >
            <History size={14} /> History
            {documentHistoryCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black" style={{ background: c.amberBg, color: c.amber }}>
                {documentHistoryCount}
              </span>
            )}
          </motion.button>
        )}
        {mode === "topic" && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onToggleTopicHistory}
            className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            style={{
              background: showTopicHistory ? c.amberActive : c.surface,
              border: `1px solid ${showTopicHistory ? c.amberBorder : c.border}`,
              color: showTopicHistory ? c.amber : c.text
            }}
          >
            <History size={14} /> History
            {topicHistoryCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black" style={{ background: c.amberBg, color: c.amber }}>
                {topicHistoryCount}
              </span>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}

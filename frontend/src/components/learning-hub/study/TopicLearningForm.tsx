"use client";

import { motion } from "framer-motion";
import {
  Search, Sparkles, BookOpen, Layers, Award, Zap, Clock, GraduationCap,
} from "lucide-react";
import { mkColors } from "@/utils/themeColors";

const examples = [
  "Explain Gradient Descent",
  "Teach me SQL Joins",
  "Explain Neural Networks",
  "Explain React Server Components"
];

type Props = {
  c: ReturnType<typeof mkColors>;
  inputTopic: string;
  setInputTopic: (v: string) => void;
  duration: "5m" | "10m" | "20m" | "30m";
  setDuration: (v: "5m" | "10m" | "20m" | "30m") => void;
  level: "beginner" | "intermediate" | "interview" | "revision";
  setLevel: (v: "beginner" | "intermediate" | "interview" | "revision") => void;
  isGenerating: boolean;
  onGenerate: (topic: string) => void;
};

export function TopicLearningForm({ c, inputTopic, setInputTopic, duration, setDuration, level, setLevel, isGenerating, onGenerate }: Props) {
  return (
    <motion.div key="topic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {!isGenerating && (
        <div className="space-y-6" style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: "16px", padding: "24px" }}>
          <div className="space-y-2.5">
            <label className="text-[10px] uppercase font-extrabold tracking-wider flex items-center gap-1.5" style={{ color: c.textMuted }}>
              <Search size={12} style={{ color: c.amber }} /> Learning Objective
            </label>
            <div className="relative">
              <input type="text" value={inputTopic} onChange={e => setInputTopic(e.target.value)}
                placeholder="What would you like to learn today?"
                onKeyDown={e => { if (e.key === "Enter") onGenerate(inputTopic); }}
                className="w-full pl-5 pr-12 py-4 rounded-xl text-sm font-medium outline-none transition-all"
                style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
              <button onClick={() => onGenerate(inputTopic)} disabled={isGenerating || !inputTopic.trim()}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textMuted }}>
                <Sparkles size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-extrabold tracking-wider flex items-center gap-1.5" style={{ color: c.textMuted }}>
                <Clock size={12} style={{ color: c.amber }} /> Learning Timeframe
              </label>
              <div className="flex p-1 rounded-xl max-w-md" style={{ background: c.inputBg, border: `1px solid ${c.border}` }}>
                {[
                  { id: "5m" as const, label: "5 Min" },
                  { id: "10m" as const, label: "10 Min" },
                  { id: "20m" as const, label: "20 Min" },
                  { id: "30m" as const, label: "30 Min" }
                ].map(t => {
                  const isActive = duration === t.id;
                  return (
                    <button key={t.id} onClick={() => setDuration(t.id)}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold text-center select-none cursor-pointer relative z-10 transition-colors">
                      <span style={{ color: isActive ? c.text : c.textMuted }}>{t.label}</span>
                      {isActive && (
                        <motion.div layoutId="activeDuration"
                          className="absolute inset-0 rounded-lg -z-10"
                          style={{ background: c.surfaceHover, border: `1px solid ${c.borderHover}` }}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-extrabold tracking-wider flex items-center gap-1.5" style={{ color: c.textMuted }}>
                <GraduationCap size={13} style={{ color: c.amber }} /> Learning Mode Selector
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: "beginner" as const, label: "Beginner", icon: BookOpen, desc: "Understand from scratch with simple terms & analogies", color: "amber" },
                  { id: "intermediate" as const, label: "Intermediate", icon: Layers, desc: "Dive into practical details, mechanics, and design", color: "amber" },
                  { id: "interview" as const, label: "Interview", icon: Award, desc: "Prepare for placements, trade-offs, and traps", color: "amber" },
                  { id: "revision" as const, label: "Quick Revision", icon: Zap, desc: "Refresh knowledge with condensed sheets", color: "amber" }
                ].map(m => {
                  const isActive = level === m.id;
                  const Icon = m.icon;
                  const colorKey = m.color as keyof typeof c;
                  const borderColor = `${m.color}Border` as keyof typeof c;
                  const bgColor = `${m.color}Bg` as keyof typeof c;
                  return (
                    <motion.button key={m.id} type="button" onClick={() => setLevel(m.id)}
                      whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative p-5 rounded-2xl border text-left flex flex-col justify-between h-[170px] cursor-pointer transition-all duration-300 group overflow-hidden"
                      style={{
                        background: (isActive ? c[bgColor] : c.cardBg) as string,
                        borderColor: (isActive ? c[borderColor] : c.border) as string
                      }}>
                      <div className="flex justify-between items-center w-full relative z-10">
                        <div className="p-2 rounded-xl" style={{
                          background: (isActive ? c[bgColor] : c.surface) as string,
                          color: (isActive ? c[colorKey] : c.textMuted) as string
                        }}>
                          <Icon size={18} />
                        </div>
                        {isActive && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full" style={{ background: c[bgColor] as string, color: c[colorKey] as string, border: `1px solid ${c[borderColor] as string}` }}>
                            Active
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 relative z-10">
                        <h4 className="text-sm font-black leading-none tracking-tight" style={{ color: c.text }}>{m.label}</h4>
                        <p className="text-[11px] leading-normal line-clamp-2" style={{ color: c.textMuted }}>{m.desc}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
          <button onClick={() => onGenerate(inputTopic)} disabled={isGenerating || !inputTopic.trim()}
            className="w-full py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", border: "none" }}>
            <Sparkles size={16} /> Generate Accelerated Lesson
          </button>
        </div>
      )}
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import {
  Sparkles, Edit3, Clock, Check, Terminal, Plus, Play,
} from "lucide-react";
import { mkColors } from "@/utils/themeColors";
import type { UnifiedLesson } from "../StudyAssistantView";

type Props = {
  c: ReturnType<typeof mkColors>;
  lessonData: UnifiedLesson;
  currentTopic: string;
  duration: string;
  level: string;
  isScratchpadOpen: boolean;
  setIsScratchpadOpen: (v: boolean) => void;
  scratchpadTab: "notes" | "takeaways" | "playground";
  setScratchpadTab: (v: "notes" | "takeaways" | "playground") => void;
  notesText: string;
  isSavingNotes: boolean;
  onNotesChange: (val: string) => void;
  onImportConcept: (concept: { title: string; content: string }) => void;
  onImportTakeaway: (takeaway: string) => void;
  playgroundOutput: string | null;
  isRunningPlayground: boolean;
  onRunPlayground: () => void;
  renderLesson: (data: UnifiedLesson) => React.ReactNode;
};

export function LessonViewer({ c, lessonData, currentTopic, duration, isScratchpadOpen, setIsScratchpadOpen, scratchpadTab, setScratchpadTab, notesText, isSavingNotes, onNotesChange, onImportConcept, onImportTakeaway, playgroundOutput, isRunningPlayground, onRunPlayground, renderLesson }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
      <div className="p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        style={{ background: c.surface, border: `1px solid ${c.border}` }}>
        <div className="space-y-1">
          <div className="inline-flex gap-1.5 items-center text-[10px] uppercase font-extrabold tracking-wider" style={{ color: c.amber }}>
            <Sparkles size={10} /> Interactive Lesson Module ({duration} &bull; {lessonData && currentTopic ? "" : ""})
          </div>
          <h2 className="text-xl font-black tracking-tight" style={{ color: c.text }}>{currentTopic}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              background: isScratchpadOpen ? c.amberBg : c.surface,
              border: `1px solid ${isScratchpadOpen ? c.amberBorder : c.border}`,
              color: isScratchpadOpen ? c.amber : c.text
            }}>
            <Edit3 size={13} className="inline mr-1.5" />
            {isScratchpadOpen ? "Hide Study Companion" : "Open Study Companion"}
          </button>
          <div className="text-xs px-3 py-1 rounded-lg flex items-center gap-1.5" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}`, color: c.textMuted }}>
            <Clock size={12} style={{ color: c.amber }} /> Digest: {duration}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className={isScratchpadOpen ? "lg:col-span-7 space-y-8" : "lg:col-span-12 space-y-8"}>
          {renderLesson(lessonData)}
        </div>

        {isScratchpadOpen && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="lg:col-span-5 rounded-2xl p-5 sticky top-6 space-y-5"
            style={{ background: c.stickyBg, border: `1px solid ${c.amberBorder}`, backdropFilter: "blur(12px)" }}>
            <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: c.text }}>
                  <Edit3 size={14} style={{ color: c.amber }} /> Active Scratchpad
                </h3>
                <p className="text-[10px]" style={{ color: c.textMuted }}>Study notes companion</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: c.textMuted }}>
                {isSavingNotes ? (
                  <><span className="h-1.5 w-1.5 rounded-full animate-ping" style={{ background: c.amber }} /><span>Saving...</span></>
                ) : (
                  <><Check size={11} style={{ color: c.amber }} /><span style={{ color: c.amber }}>Auto-saved</span></>
                )}
              </div>
            </div>
            <div className="flex space-x-1 p-1 rounded-lg" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
              {[
                { id: "notes" as const, label: "My Notes" },
                { id: "takeaways" as const, label: "Takeaways" },
                { id: "playground" as const, label: "Playground" }
              ].map(t => {
                const isActive = scratchpadTab === t.id;
                return (
                  <button key={t.id} onClick={() => setScratchpadTab(t.id)}
                    className="flex-1 py-1.5 rounded-md text-[10px] font-semibold text-center select-none cursor-pointer relative z-10 transition-colors">
                    <span style={{ color: isActive ? c.text : c.textMuted }}>{t.label}</span>
                    {isActive && (
                      <motion.div layoutId="activeScratchTab"
                        className="absolute inset-0 rounded-md -z-10"
                        style={{ background: c.surfaceHover, border: `1px solid ${c.borderHover}` }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="min-h-[300px] flex flex-col">
              {scratchpadTab === "notes" && (
                <div className="flex-1 flex flex-col space-y-3">
                  <textarea value={notesText} onChange={e => onNotesChange(e.target.value)}
                    placeholder="Write notes here or copy concepts from 'Takeaways' tab..."
                    className="flex-1 w-full min-h-[320px] p-3 rounded-lg text-sm leading-relaxed resize-y outline-none"
                    style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.textSec }} />
                  <div className="text-[10px] flex justify-between" style={{ color: c.textMuted }}>
                    <span>Markdown supported</span>
                    <span>{notesText.length} chars</span>
                  </div>
                </div>
              )}
              {scratchpadTab === "takeaways" && (
                <div className="space-y-4">
                  <div className="text-[11px] leading-normal p-3 rounded-lg flex items-start gap-2" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textMuted }}>
                    <Sparkles size={12} style={{ color: c.amber }} className="shrink-0 mt-0.5" />
                    <span>Copy concepts directly into your active Scratchpad notes.</span>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {lessonData.key_concepts.map((concept, idx) => (
                      <div key={idx} className="p-3 rounded-xl transition-colors space-y-2" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.text }}>{concept.title}</h4>
                          <button onClick={() => onImportConcept(concept)}
                            className="px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.amber }}>
                            <Plus size={8} /> Copy to Notes
                          </button>
                        </div>
                        <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: c.textMuted }}>{stripMarkdown(concept.content)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {scratchpadTab === "playground" && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-center text-[10px] font-mono pl-1" style={{ color: c.textMuted }}>
                      <span className="flex items-center gap-1"><Terminal size={11} style={{ color: c.amber }} /> simulator_script.py</span>
                    </div>
                    <div className="rounded-xl border font-mono text-[11px] leading-relaxed p-4 flex-1 min-h-[160px] whitespace-pre-wrap select-text"
                      style={{ borderColor: c.border, background: c.isDark ? "rgba(0,0,0,0.4)" : "#f1f5f9", color: c.textSec }}>
                      <code>
                        {currentTopic.toLowerCase().includes("gradient")
                          ? `# Gradient Descent optimization simulator\nimport numpy as np\n\nweights = 10.0\nlearning_rate = 0.01\ngradient = 2.5\n\nprint("Updating weights...")\nweights = weights - (learning_rate * gradient)\nprint(f"Final weights: {weights}")`
                          : currentTopic.toLowerCase().includes("sql") || currentTopic.toLowerCase().includes("join")
                            ? `# SQL Join execution simulation\nimport sqlite3\n\nconn = sqlite3.connect(':memory:')\n# Executing query:\n# SELECT o.id, c.name FROM orders o INNER JOIN customers c ON o.cust_id = c.id`
                            : `# Activation Function execution\nimport numpy as np\n\ninputs = np.array([0.5, -0.2])\nweights = np.array([0.8, 0.4])\nbias = -0.1\n\nz = np.dot(inputs, weights) + bias\nactivation = max(0, z)\nprint(f"ReLU activation: {activation}")`}
                      </code>
                    </div>
                    <button onClick={onRunPlayground} disabled={isRunningPlayground}
                      className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", border: "none" }}>
                      {isRunningPlayground ? "Running script..." : "Execute Python Script"} <Play size={10} fill="currentColor" />
                    </button>
                  </div>
                  {playgroundOutput && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap"
                      style={{ borderColor: c.border, background: c.isDark ? "rgba(0,0,0,0.4)" : "#f1f5f9", color: c.amber }}>
                      {playgroundOutput}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

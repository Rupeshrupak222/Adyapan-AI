"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  Lightbulb,
  FolderKanban,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Terminal,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { ChatBackground } from "@/components/ady-chat/ChatBackground";
import { renderMarkdown } from "@/utils/renderMarkdown";

type Step = "mode" | "input" | "result";
type Mode = "generate" | "explain" | "project";

const ACCENT = "#f59e0b";
const ACCENT_DARK = "#d97706";
const ACCENT_LIGHT = "#fbbf24";

const C = {
  cardBg: (d: boolean) => d ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
  cardBorder: (d: boolean) => d ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  inputBg: (d: boolean) => d ? "rgba(0,0,0,0.35)" : "#ffffff",
  inputBorder: (d: boolean) => d ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)",
  textPrimary: (d: boolean) => d ? "#ffffff" : "#1a1a2e",
  textSecondary: (d: boolean) => d ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)",
  textMuted: (d: boolean) => d ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
  divider: (d: boolean) => d ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
  headerBg: (d: boolean) => d ? "transparent" : "rgba(255,255,255,0.92)",
  btnGhost: (d: boolean) => d ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
  btnGhostBorder: (d: boolean) => d ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  btnGhostText: (d: boolean) => d ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)",
  pageBg: (d: boolean) => d ? "transparent" : "transparent",
};

const MODES: {
  id: Mode;
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: { name: string; label: string; placeholder: string; type: "textarea" | "input" }[];
}[] = [
  {
    id: "generate",
    title: "Generate Code",
    description: "Describe what you want to build and get production-ready code",
    icon: <Code2 size={28} />,
    fields: [
      { name: "prompt", label: "What do you want to build?", placeholder: "Describe your code requirement in detail...", type: "textarea" },
    ],
  },
  {
    id: "explain",
    title: "Explain Code",
    description: "Paste any code and get a detailed line-by-line explanation",
    icon: <Lightbulb size={28} />,
    fields: [
      { name: "code", label: "Paste your code", placeholder: "// Paste your code here...", type: "textarea" },
    ],
  },
  {
    id: "project",
    title: "Create Project",
    description: "Get a full project plan with architecture, tech stack, and roadmap",
    icon: <FolderKanban size={28} />,
    fields: [
      { name: "projectName", label: "Project Name / Topic", placeholder: "e.g., Real-time Chat App", type: "input" },
      { name: "description", label: "Description (optional)", placeholder: "Describe the project goals, features, and requirements...", type: "textarea" },
    ],
  },
];

export default function CodingAssistantView() {
  const theme = useTheme();
  const isDark = theme === "dark";

  const [step, setStep] = useState<Step>("mode");
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const modeConfig = MODES.find((m) => m.id === selectedMode);

  const handleSelectMode = (mode: Mode) => {
    setSelectedMode(mode);
    setFormValues({});
    setStep("input");
  };

  const handleSubmit = async () => {
    if (!selectedMode) return;

    if (selectedMode === "generate" && !formValues.prompt?.trim()) {
      toast.error("Please describe what you want to build");
      return;
    }
    if (selectedMode === "explain" && !formValues.code?.trim()) {
      toast.error("Please paste your code");
      return;
    }
    if (selectedMode === "project" && !formValues.projectName?.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setLoading(true);
    try {
      let res;
      if (selectedMode === "generate") {
        res = await api.post("/coding/generate", { prompt: formValues.prompt });
      } else if (selectedMode === "explain") {
        res = await api.post("/coding/explain", { codeSnippet: formValues.code });
      } else {
        const payload = formValues.description
          ? { projectName: `${formValues.projectName}: ${formValues.description}` }
          : { projectName: formValues.projectName };
        res = await api.post("/coding/project", payload);
      }
      setResult(res.data);
      setStep("result");
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(e?.response?.data?.error || e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("mode");
    setSelectedMode(null);
    setFormValues({});
    setResult(null);
  };

  const handleBack = () => {
    if (step === "result") {
      setResult(null);
      setStep("input");
    } else if (step === "input") {
      setStep("mode");
      setSelectedMode(null);
      setFormValues({});
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div
      className="relative flex flex-col overflow-hidden w-full"
      style={{
        margin: "-1.25rem",
        width: "calc(100% + 2.5rem)",
        height: "calc(100% + 2.5rem)",
        background: C.pageBg(isDark),
        color: C.textPrimary(isDark),
      }}
    >
      <ChatBackground isDark={isDark} />

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{
            borderColor: C.divider(isDark),
            background: C.headerBg(isDark),
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              {step !== "mode" && (
                <motion.button
                  key="back"
                  initial={{ opacity: 0, x: -12, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -12, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={handleBack}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer border"
                  style={{
                    background: C.btnGhost(isDark),
                    borderColor: C.btnGhostBorder(isDark),
                  }}
                  whileHover={{ scale: 1.1, background: `${ACCENT}15` }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ArrowLeft size={16} style={{ color: ACCENT }} />
                </motion.button>
              )}
            </AnimatePresence>

            <motion.div
              className="w-9 h-9 rounded-xl flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}25, ${ACCENT_DARK}10)`,
                border: `1px solid ${ACCENT}35`,
                color: ACCENT,
              }}
              whileHover={{ scale: 1.08, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              {modeConfig?.icon || <Code2 size={18} />}
              <motion.div
                className="absolute inset-0 rounded-xl"
                style={{ background: ACCENT, zIndex: -1, opacity: 0.08 }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              />
            </motion.div>

            <div>
              <AnimatePresence mode="wait">
                <motion.h1
                  key={step === "mode" ? "home" : modeConfig?.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-bold tracking-tight"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {step === "mode" ? "Coding Assistant" : modeConfig?.title}
                </motion.h1>
              </AnimatePresence>
              <div className="flex items-center gap-1.5 mt-1">
                {(["mode", "input", "result"] as Step[]).map((s) => {
                  const steps = ["mode", "input", "result"];
                  const currentIdx = steps.indexOf(step);
                  const thisIdx = steps.indexOf(s);
                  const isActive = thisIdx === currentIdx;
                  const isDone = thisIdx < currentIdx;
                  return (
                    <motion.span
                      key={s}
                      className="h-1 rounded-full"
                      animate={{
                        width: isActive ? 22 : 10,
                        background: isActive ? ACCENT : isDone ? `${ACCENT}70` : C.btnGhostBorder(isDark),
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {step !== "mode" && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer"
                  style={{
                    background: C.btnGhost(isDark),
                    borderColor: C.btnGhostBorder(isDark),
                    color: C.btnGhostText(isDark),
                  }}
                  whileHover={{ scale: 1.04, color: ACCENT, borderColor: `${ACCENT}40` }}
                  whileTap={{ scale: 0.96 }}
                >
                  <RotateCcw size={12} />
                  Start Over
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {/* Step 1: Choose Mode */}
            {step === "mode" && (
              <motion.div
                key="mode"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-4xl mx-auto px-6 py-12"
              >
                <div className="text-center mb-10">
                  <div className="relative inline-block mb-5">
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10"
                      style={{
                        background: `linear-gradient(135deg, ${ACCENT}20, ${ACCENT_DARK}10)`,
                        border: `1.5px solid ${ACCENT}35`,
                      }}
                    >
                      <Code2 size={30} style={{ color: ACCENT }} />
                    </motion.div>
                    <motion.div
                      className="absolute -inset-3 rounded-3xl blur-xl"
                      style={{ background: ACCENT, opacity: 0.1 }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.18, 0.1] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    />
                  </div>
                  <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-3xl font-extrabold tracking-tight mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Adyapan <span style={{ color: ACCENT }}>Coding</span>
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-sm max-w-md mx-auto"
                    style={{ color: C.textSecondary(isDark) }}
                  >
                    Choose what you want to do
                  </motion.p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {MODES.map((m, i) => (
                    <motion.button
                      key={m.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 300, damping: 24 }}
                      onClick={() => handleSelectMode(m.id)}
                      className="text-left p-6 rounded-2xl border cursor-pointer group relative overflow-hidden"
                      style={{
                        background: C.cardBg(isDark),
                        borderColor: C.cardBorder(isDark),
                      }}
                      whileHover={{
                        scale: 1.025,
                        borderColor: `${ACCENT}50`,
                        boxShadow: `0 12px 40px ${ACCENT}12`,
                      }}
                      whileTap={{ scale: 0.975 }}
                    >
                      <motion.div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: `radial-gradient(circle at 50% 0%, ${ACCENT}08 0%, transparent 70%)`,
                        }}
                      />
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 relative z-10"
                        style={{
                          background: `${ACCENT}12`,
                          color: ACCENT,
                          border: `1px solid ${ACCENT}25`,
                        }}
                      >
                        {m.icon}
                      </div>
                      <h3 className="text-base font-bold mb-1.5 relative z-10" style={{ color: C.textPrimary(isDark) }}>
                        {m.title}
                      </h3>
                      <p className="text-xs leading-relaxed relative z-10" style={{ color: C.textSecondary(isDark) }}>
                        {m.description}
                      </p>
                      <motion.div
                        className="flex items-center gap-1 mt-4 text-[11px] font-bold relative z-10"
                        style={{ color: ACCENT }}
                        initial={{ opacity: 0, x: -5 }}
                        whileHover={{ opacity: 1, x: 0 }}
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
                          Get Started
                        </span>
                        <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" />
                      </motion.div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Input */}
            {step === "input" && modeConfig && (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-3xl mx-auto px-6 py-10"
              >
                <div className="space-y-5">
                  {modeConfig.fields.map((field, i) => (
                    <motion.div
                      key={field.name}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                    >
                      <label
                        className="block text-xs font-bold uppercase tracking-wider mb-2"
                        style={{ color: C.textSecondary(isDark) }}
                      >
                        {field.label}
                      </label>
                      <motion.div
                        className="relative rounded-xl overflow-hidden"
                        animate={{
                          boxShadow: focusedField === field.name
                            ? `0 0 0 2px ${ACCENT}30, 0 4px 20px ${ACCENT}08`
                            : "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                        transition={{ duration: 0.25 }}
                      >
                        {field.type === "textarea" ? (
                          <textarea
                            value={formValues[field.name] || ""}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full p-4 text-sm leading-relaxed resize-none outline-none transition-colors duration-200"
                            style={{
                              background: C.inputBg(isDark),
                              border: `1.5px solid ${focusedField === field.name ? `${ACCENT}60` : C.inputBorder(isDark)}`,
                              color: C.textPrimary(isDark),
                              minHeight: field.name === "code" ? "200px" : "120px",
                              borderRadius: "0.75rem",
                            }}
                            rows={field.name === "code" ? 10 : 5}
                            onFocus={() => setFocusedField(field.name)}
                            onBlur={() => setFocusedField(null)}
                          />
                        ) : (
                          <input
                            value={formValues[field.name] || ""}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full p-4 text-sm outline-none transition-colors duration-200"
                            style={{
                              background: C.inputBg(isDark),
                              border: `1.5px solid ${focusedField === field.name ? `${ACCENT}60` : C.inputBorder(isDark)}`,
                              color: C.textPrimary(isDark),
                              borderRadius: "0.75rem",
                            }}
                            onFocus={() => setFocusedField(field.name)}
                            onBlur={() => setFocusedField(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                              }
                            }}
                          />
                        )}
                      </motion.div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="flex justify-end mt-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer relative overflow-hidden"
                    style={{
                      background: loading ? `${ACCENT}60` : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                      color: "#000",
                      boxShadow: loading ? "none" : `0 4px 20px ${ACCENT}30`,
                    }}
                    whileHover={!loading ? { scale: 1.04, boxShadow: `0 8px 30px ${ACCENT}45` } : {}}
                    whileTap={!loading ? { scale: 0.96 } : {}}
                  >
                    {loading && (
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${ACCENT_LIGHT}30, transparent)`,
                        }}
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="currentColor" />
                          Generate
                        </>
                      )}
                    </span>
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {/* Step 3: Results */}
            {step === "result" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-4xl mx-auto px-6 py-8"
              >
                {selectedMode === "generate" && <GenerateResult result={result as Record<string, string>} isDark={isDark} onCopy={handleCopy} />}
                {selectedMode === "explain" && <ExplainResult result={result as Record<string, string>} isDark={isDark} />}
                {selectedMode === "project" && <ProjectResult result={result as Record<string, unknown>} isDark={isDark} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Result Renderers ────────────────────────────────────────────────────────

function GenerateResult({
  result,
  isDark,
  onCopy,
}: {
  result: Record<string, string>;
  isDark: boolean;
  onCopy: (text: string) => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyField = (key: string, val: string) => {
    onCopy(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const sections: { key: string; label: string; value: string }[] = [];
  if (result.code) sections.push({ key: "code", label: "Code", value: result.code });
  if (result.folderStructure) sections.push({ key: "folder", label: "Folder Structure", value: result.folderStructure });
  if (result.setupGuide) sections.push({ key: "setup", label: "Setup Guide", value: result.setupGuide });

  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border overflow-hidden"
          style={{
            background: C.cardBg(isDark),
            borderColor: C.cardBorder(isDark),
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: C.divider(isDark) }}
          >
            <span
              className="text-[10px] uppercase font-black tracking-widest"
              style={{ color: C.textSecondary(isDark) }}
            >
              {s.label}
            </span>
            <motion.button
              onClick={() => copyField(s.key, s.value)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-colors duration-200"
              style={{
                background: copiedField === s.key ? `${ACCENT}15` : C.btnGhost(isDark),
                color: copiedField === s.key ? ACCENT : C.btnGhostText(isDark),
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              <AnimatePresence mode="wait">
                {copiedField === s.key ? (
                  <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Check size={12} />
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Copy size={12} />
                  </motion.span>
                )}
              </AnimatePresence>
              {copiedField === s.key ? "Copied!" : "Copy"}
            </motion.button>
          </div>
          <div
            className="p-4 text-sm leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto"
            style={{ color: C.textPrimary(isDark) }}
          >
            {renderMarkdown(s.value, isDark)}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ExplainResult({ result, isDark }: { result: Record<string, string>; isDark: boolean }) {
  return (
    <div className="space-y-4">
      {result.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border overflow-hidden"
          style={{
            background: C.cardBg(isDark),
            borderColor: C.cardBorder(isDark),
          }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: C.divider(isDark) }}
          >
            <span
              className="text-[10px] uppercase font-black tracking-widest"
              style={{ color: C.textSecondary(isDark) }}
            >
              Explanation
            </span>
          </div>
          <div
            className="p-5 text-sm leading-relaxed"
            style={{ color: C.textPrimary(isDark) }}
          >
            {renderMarkdown(result.explanation, isDark)}
          </div>
        </motion.div>
      )}

      {result.complexity && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="rounded-2xl border p-4 flex items-center gap-3"
          style={{
            background: C.cardBg(isDark),
            borderColor: `${ACCENT}25`,
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${ACCENT}12` }}
          >
            <Terminal size={16} style={{ color: ACCENT }} />
          </div>
          <div>
            <span
              className="text-[10px] font-bold uppercase tracking-wider block"
              style={{ color: ACCENT }}
            >
              Complexity
            </span>
            <span className="text-xs font-mono" style={{ color: C.textPrimary(isDark) }}>
              {result.complexity}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ProjectResult({ result, isDark }: { result: Record<string, unknown>; isDark: boolean }) {
  const architecture = result.architecture as string | undefined;
  const techStack = result.techStack as string[] | undefined;
  const folderStructure = result.folderStructure as string | undefined;
  const features = result.features as string[] | undefined;
  const roadmap = result.roadmap as string[] | undefined;

  return (
    <div className="space-y-4">
      {architecture && (
        <ResultCard title="Architecture" isDark={isDark} delay={0}>
          <div className="text-sm leading-relaxed" style={{ color: C.textPrimary(isDark) }}>
            {renderMarkdown(architecture, isDark)}
          </div>
        </ResultCard>
      )}

      {techStack && techStack.length > 0 && (
        <ResultCard title="Tech Stack" isDark={isDark} delay={0.1}>
          <div className="flex flex-wrap gap-2">
            {techStack.map((t: string, i: number) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{
                  background: isDark ? `${ACCENT}12` : `${ACCENT}10`,
                  color: ACCENT,
                  border: `1px solid ${ACCENT}20`,
                }}
              >
                {t}
              </motion.span>
            ))}
          </div>
        </ResultCard>
      )}

      {folderStructure && (
        <ResultCard title="Folder Structure" isDark={isDark} delay={0.2}>
          <div className="text-sm leading-relaxed" style={{ color: C.textPrimary(isDark) }}>
            {renderMarkdown(folderStructure, isDark)}
          </div>
        </ResultCard>
      )}

      {features && features.length > 0 && (
        <ResultCard title="Features" isDark={isDark} delay={0.3}>
          <div className="space-y-2">
            {features.map((f: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.04 }}
                className="flex items-start gap-2 text-xs"
                style={{ color: C.textPrimary(isDark) }}
              >
                <span style={{ color: ACCENT }} className="font-bold mt-0.5">&#10003;</span>
                <span>{f}</span>
              </motion.div>
            ))}
          </div>
        </ResultCard>
      )}

      {roadmap && roadmap.length > 0 && (
        <ResultCard title="Roadmap" isDark={isDark} delay={0.4}>
          <div className="space-y-2">
            {roadmap.map((s: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.04 }}
                className="flex items-start gap-2 text-xs"
                style={{ color: C.textPrimary(isDark) }}
              >
                <span style={{ color: ACCENT }} className="font-bold mt-0.5">{i + 1}.</span>
                <span>{s}</span>
              </motion.div>
            ))}
          </div>
        </ResultCard>
      )}
    </div>
  );
}

function ResultCard({
  title,
  isDark,
  delay = 0,
  children,
}: {
  title: string;
  isDark: boolean;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border overflow-hidden"
      style={{
        background: C.cardBg(isDark),
        borderColor: C.cardBorder(isDark),
      }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: C.divider(isDark) }}
      >
        <span
          className="text-[10px] uppercase font-black tracking-widest"
          style={{ color: C.textSecondary(isDark) }}
        >
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ADY_MODELS, type ChatModel } from "./types";

// ─── SVG icons for each model ─────────────────────────────────────────────────

function ModelIcon({ iconKey, size = 16 }: { iconKey: string; size?: number }) {
  if (iconKey === "flash") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M13 2L4.5 13.5H11L10 22L20 10H13.5L13 2Z" fill="currentColor" opacity="0.9" />
      </svg>
    );
  }
  if (iconKey === "pro") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M12 2C12 2 8 6 8 12C8 18 12 22 12 22C12 22 16 18 16 12C16 6 12 2 12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M2 12C2 12 6 8 12 8C18 8 22 12 22 12C22 12 18 16 12 16C6 16 2 12 2 12Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  if (iconKey === "reasoning") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="12" r="2" fill="currentColor" />
        <circle cx="12" cy="6" r="2" fill="currentColor" />
        <circle cx="18" cy="12" r="2" fill="currentColor" />
        <circle cx="12" cy="18" r="2" fill="currentColor" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6" />
        <line x1="8" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" />
        <line x1="14" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" />
        <line x1="12" y1="8" x2="12" y2="10" stroke="currentColor" strokeWidth="1.5" />
        <line x1="12" y1="14" x2="12" y2="16" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (iconKey === "vision") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M2 12C2 12 6 5 12 5C18 5 22 12 22 12C22 12 18 19 12 19C6 19 2 12 2 12Z" stroke="currentColor" strokeWidth="1.8" fill="none" />
        <circle cx="12" cy="12" r="3.5" fill="currentColor" />
        <circle cx="13" cy="11" r="1.2" fill="white" opacity="0.7" />
      </svg>
    );
  }
  return null;
}

interface ModelSelectorProps {
  selectedModel: string;
  isDark: boolean;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, isDark, onModelChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const current = ADY_MODELS.find(m => m.id === selectedModel) || ADY_MODELS[0];

  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const bg = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)";
  const dropdownBg = isDark ? "rgba(12,10,28,0.97)" : "rgba(255,255,255,0.99)";
  const text = isDark ? "#ffffff" : "#0f172a";
  const textMuted = isDark ? "rgba(255,255,255,0.6)" : "#5f6368";
  const hoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <div className="relative flex justify-center mb-2.5">
      {/* Trigger */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
        style={{
          background: bg,
          border: `1px solid ${border}`,
          backdropFilter: "blur(12px)",
          color: text,
        }}
        whileHover={{
          scale: 1.02,
          borderColor: "rgba(245,158,11,0.35)",
          boxShadow: "0 0 10px rgba(245,158,11,0.12)",
        }}
        whileTap={{ scale: 0.97 }}
      >
        <span style={{ color: "#f59e0b" }}>
          <ModelIcon iconKey={current.iconKey} size={12} />
        </span>
        <span style={{ fontFamily: "'Outfit', sans-serif" }}>{current.displayName}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-2.5 h-2.5" style={{ color: textMuted }} />
        </motion.div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-1.5 w-56 rounded-2xl overflow-hidden z-50"
              style={{
                background: dropdownBg,
                border: `1px solid ${border}`,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: isDark
                  ? "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)"
                  : "0 20px 60px rgba(0,0,0,0.12)",
              }}
            >
              <div className="p-2">
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: textMuted, letterSpacing: "0.12em" }}
                >
                  Select Model
                </div>

                {ADY_MODELS.map((model, i) => (
                  <ModelOption
                    key={model.id}
                    model={model}
                    isSelected={selectedModel === model.id}
                    isDark={isDark}
                    text={text}
                    textMuted={textMuted}
                    hoverBg={hoverBg}
                    index={i}
                    onClick={() => {
                      onModelChange(model.id);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModelOption({
  model, isSelected, isDark, text, textMuted, hoverBg, index, onClick,
}: {
  model: ChatModel;
  isSelected: boolean;
  isDark: boolean;
  text: string;
  textMuted: string;
  hoverBg: string;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left"
      style={{
        background: isSelected ? "rgba(245,158,11,0.1)" : "rgba(0,0,0,0)",
        borderLeft: isSelected ? "2px solid rgba(245,158,11,0.6)" : "2px solid transparent",
      }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      whileHover={{ background: isSelected ? "rgba(245,158,11,0.14)" : hoverBg, x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      <span style={{ color: isSelected ? "#f59e0b" : textMuted }}>
        <ModelIcon iconKey={model.iconKey} size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <div
          className="text-[11px] font-semibold"
          style={{ color: isSelected ? "#f59e0b" : text, fontFamily: "'Outfit', sans-serif" }}
        >
          {model.displayName}
        </div>
        <div className="text-[9px]" style={{ color: textMuted }}>
          {model.description} · {model.fast ? "Fast" : "Premium"}
        </div>
      </div>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"
        />
      )}
    </motion.button>
  );
}


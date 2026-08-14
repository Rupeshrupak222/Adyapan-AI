"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Mic, MicOff, Send, X, FileText, Image } from "lucide-react";
import { ModelSelector } from "./ModelSelector";

interface ChatInputProps {
  input: string;
  isDark: boolean;
  loading: boolean;
  listening: boolean;
  uploadedFile: { name: string; text: string } | null;
  selectedModel: string;
  hasMessages: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onModelChange: (modelId: string) => void;
}

export function ChatInput({
  input,
  isDark,
  loading,
  listening,
  uploadedFile,
  selectedModel,
  hasMessages,
  onInputChange,
  onSend,
  onVoiceToggle,
  onFileSelect,
  onRemoveFile,
  onModelChange,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const focusBorder = "rgba(245,158,11,0.5)";
  const bg = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.85)";
  const text = isDark ? "#ffffff" : "#0f172a";
  const textMuted = isDark ? "rgba(255,255,255,0.6)" : "#5f6368";
  const canSend = (input.trim().length > 0 || uploadedFile) && !loading;

  return (
    <motion.div
      className="w-full max-w-3xl mx-auto px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Model selector */}
      <ModelSelector
        selectedModel={selectedModel}
        isDark={isDark}
        onModelChange={onModelChange}
      />

      {/* Uploaded file badge */}
      <AnimatePresence>
        {uploadedFile && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mb-2"
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs mx-1"
              style={{
                background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)",
                border: `1px solid rgba(245,158,11,0.25)`,
              }}
            >
              <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="flex-1 font-medium truncate" style={{ color: text }}>
                {uploadedFile.name}
              </span>
              <motion.button
                onClick={onRemoveFile}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3.5 h-3.5" style={{ color: textMuted }} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input container */}
      <motion.div
        className="relative flex items-end gap-2 px-3 py-2"
        style={{
          background: bg,
          border: `1.5px solid ${focused ? focusBorder : border}`,
          borderRadius: 999,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: focused
            ? isDark
              ? `0 0 0 4px rgba(245,158,11,0.08), 0 8px 40px rgba(0,0,0,0.2)`
              : `0 0 0 4px rgba(245,158,11,0.08), 0 8px 40px rgba(0,0,0,0.06)`
            : isDark
              ? `0 4px 24px rgba(0,0,0,0.12)`
              : `0 4px 24px rgba(0,0,0,0.04)`,
          transition: "all 0.25s ease",
        }}
      >
        {/* Left icons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Attachment */}
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ color: textMuted }}
            whileHover={{
              scale: 1.1,
              color: "#f59e0b",
              background: "rgba(245,158,11,0.1)",
            }}
            whileTap={{ scale: 0.9 }}
            title="Attach file"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </motion.button>

          {/* Voice */}
          <motion.button
            onClick={onVoiceToggle}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              color: listening ? "#f59e0b" : textMuted,
              background: listening ? "rgba(245,158,11,0.12)" : "transparent",
            }}
            whileHover={{
              scale: 1.1,
              color: listening ? "#f59e0b" : textMuted,
              background: listening
                ? "rgba(245,158,11,0.18)"
                : isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.04)",
            }}
            whileTap={{ scale: 0.9 }}
            title={listening ? "Stop listening" : "Voice input"}
          >
            <AnimatePresence mode="wait">
              {listening ? (
                <motion.div
                  key="mic-off"
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  <MicOff className="w-3.5 h-3.5" />
                </motion.div>
              ) : (
                <motion.div
                  key="mic-on"
                  initial={{ scale: 0, rotate: 10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <Mic className="w-3.5 h-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Text area */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={listening ? "Listening..." : "Ask Ady Chat anything..."}
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none text-xs leading-relaxed py-1"
          style={{
            color: text,
            maxHeight: 160,
            fontFamily: "var(--font-sans)",
          }}
        />

        {/* Send button */}
        <motion.button
          onClick={onSend}
          disabled={!canSend}
          className="w-7.5 h-7.5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: canSend
              ? "linear-gradient(135deg, #f59e0b, #d97706)"
              : isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
            boxShadow: canSend ? "0 0 16px rgba(245,158,11,0.4)" : "none",
            cursor: canSend ? "pointer" : "not-allowed",
          }}
          animate={
            canSend
              ? {
                  boxShadow: [
                    "0 0 10px rgba(245,158,11,0.3)",
                    "0 0 18px rgba(245,158,11,0.6)",
                    "0 0 10px rgba(245,158,11,0.3)",
                  ],
                }
              : {}
          }
          transition={canSend ? { duration: 2, repeat: Infinity } : {}}
          whileHover={canSend ? { scale: 1.08, boxShadow: "0 0 24px rgba(245,158,11,0.7)" } : {}}
          whileTap={canSend ? { scale: 0.93 } : {}}
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12" cy="12" r="10"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
          ) : (
            <Send
              className="w-3.5 h-3.5"
              style={{
                color: canSend ? "white" : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
                transform: "translateX(1px)",
              }}
            />
          )}
        </motion.button>
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx,.zip,.png,.jpg,.jpeg,.mp3,.mp4"
        className="hidden"
        onChange={onFileSelect}
      />
    </motion.div>
  );
}


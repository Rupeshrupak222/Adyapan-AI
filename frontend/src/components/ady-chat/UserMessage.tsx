"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import type { ChatMessage } from "./types";

interface UserMessageProps {
  message: ChatMessage;
  index: number;
  isDark: boolean;
  userName?: string;
  onEdit?: (text: string) => void;
}

export function UserMessage({ message, index, isDark, userName, onEdit }: UserMessageProps) {
  const userInitial = (userName || "U").charAt(0).toUpperCase();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ChatGPT-style gray bubble
  const bg = isDark ? "#2f2f2f" : "#f4f4f4";
  const text = isDark ? "#ececf1" : "#0f172a";
  const border = isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.02)";
  const shadow = isDark ? "0 4px 12px rgba(0,0,0,0.15)" : "0 2px 8px rgba(0,0,0,0.04)";
  const iconColor = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";

  return (
    <motion.div
      className="flex justify-end mb-5 group"
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        duration: 0.35,
        delay: index * 0.03,
        ease: "easeOut",
      }}
    >
      <div className="flex items-end gap-2.5 max-w-[75%]">
        {/* Bubble + Actions wrapper */}
        <div className="flex flex-col items-end">
          {/* Message bubble */}
          <motion.div
            className="relative px-4 py-2.5 text-sm leading-relaxed"
            style={{
              background: bg,
              border: border,
              borderRadius: "20px 20px 4px 20px",
              color: text,
              boxShadow: shadow,
              fontFamily: "var(--font-sans)",
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
            whileHover={{ y: -0.5 }}
          >
            <span className="relative">{message.content}</span>

            {/* Timestamp */}
            <div
              className="text-[9px] mt-1 text-right opacity-50 font-medium"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </motion.div>

          {/* Action icons under the user chat bubble */}
          <div className="flex items-center gap-2.5 mt-1.5 mr-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Copy button */}
            <motion.button
              onClick={handleCopy}
              className="flex items-center justify-center p-1 rounded transition-colors"
              style={{ color: iconColor }}
              whileHover={{
                color: isDark ? "#ffffff" : "#0f172a",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              }}
              whileTap={{ scale: 0.9 }}
              title="Copy message"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Check className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
                  </motion.div>
                ) : (
                  <motion.div key="copy" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Edit button */}
            {onEdit && (
              <motion.button
                onClick={() => onEdit(message.content)}
                className="flex items-center justify-center p-1 rounded transition-colors"
                style={{ color: iconColor }}
                whileHover={{
                  color: isDark ? "#ffffff" : "#0f172a",
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                }}
                whileTap={{ scale: 0.9 }}
                title="Edit message"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>

        {/* User initials bubble (gray gradient) */}
        <motion.div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mb-7"
          style={{
            background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            color: isDark ? "#e2e8f0" : "#475569",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
        >
          {userInitial}
        </motion.div>
      </div>
    </motion.div>
  );
}


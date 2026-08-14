"use client";

import { motion } from "framer-motion";
import { SUGGESTION_CARDS } from "./types";

interface ChatGreetingProps {
  userName: string;
  isDark: boolean;
  onSuggestionClick: (prompt: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// ─── SVG icon map ─────────────────────────────────────────────────────────────

function CardIcon({ iconKey }: { iconKey: string }) {
  const s = 20;
  switch (iconKey) {
    case "book":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="13" y2="11" />
        </svg>
      );
    case "notes":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      );
    case "code":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          <line x1="14" y1="4" x2="10" y2="20" />
        </svg>
      );
    case "resume":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <circle cx="10" cy="13" r="2" /><path d="M7 18s1-2 3-2 3 2 3 2" />
          <line x1="15" y1="11" x2="17" y2="11" /><line x1="15" y1="14" x2="17" y2="14" />
        </svg>
      );
    case "target":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "research":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "clipboard":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
        </svg>
      );
    case "slides":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
          <line x1="6" y1="9" x2="18" y2="9" /><line x1="6" y1="12" x2="14" y2="12" />
        </svg>
      );
    case "quiz":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "career":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    default:
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /></svg>;
  }
}

export function ChatGreeting({ userName, isDark, onSuggestionClick }: ChatGreetingProps) {
  const firstName = userName.split(" ")[0] || userName;

  // Colors
  const headingColor  = isDark ? "#f1f5f9" : "#0f172a";
  const subtitleColor = isDark ? "rgba(255,255,255,0.6)" : "#5f6368";
  const cardBg        = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.09)";
  const cardText      = isDark ? "rgba(255,255,255,0.8)" : "#334155";
  const iconColor     = "#f59e0b";

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-6 py-8">

      {/* Greeting */}
      <motion.h1
        className="text-4xl sm:text-5xl font-black text-center mb-3"
        style={{
          color: headingColor,
          fontFamily: "var(--font-sans)",
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
        }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
      >
        {getGreeting()},{" "}
        <span style={{ color: "#f59e0b" }}>
          {firstName}
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="text-sm sm:text-base text-center mb-8"
        style={{
          color: subtitleColor,
          fontFamily: "var(--font-sans)",
          fontWeight: 400,
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16 }}
      >
        What would you like to learn today?
      </motion.p>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 w-full">
        {SUGGESTION_CARDS.map((card, i) => (
          <motion.button
            key={card.title}
            onClick={() => onSuggestionClick(card.prompt)}
            className="flex flex-col items-start gap-2.5 p-3.5 rounded-2xl text-left relative overflow-hidden group"
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.22 + i * 0.045 }}
            whileHover={{
              y: -4,
              borderColor: "rgba(245,158,11,0.4)",
              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.98)",
              boxShadow: isDark
                ? "0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(245,158,11,0.18)"
                : "0 12px 28px rgba(0,0,0,0.1), 0 0 0 1px rgba(245,158,11,0.25)",
              transition: { duration: 0.18 },
            }}
            whileTap={{ scale: 0.96 }}
          >
            {/* Hover glow spot */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
              style={{
                background: "radial-gradient(circle at 30% 20%, rgba(245,158,11,0.07) 0%, transparent 60%)",
              }}
            />

            {/* Icon container */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
                color: iconColor,
              }}
            >
              <CardIcon iconKey={card.iconKey} />
            </div>

            {/* Title */}
            <span
              className="text-xs font-semibold leading-tight"
              style={{
                color: cardText,
                fontFamily: "var(--font-sans)",
                letterSpacing: "0.005em",
              }}
            >
              {card.title}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}


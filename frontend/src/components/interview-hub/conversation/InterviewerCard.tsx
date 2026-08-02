"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bot, Loader2 } from "lucide-react";
import AIAvatar from "@/components/interview-hub/shared/AIAvatar";
import type { ConversationState } from "./conversation-types";

interface InterviewerCardProps {
  state: ConversationState;
  interviewerName?: string;
  interviewerRole?: string;
  avatarVideoUrl?: string | null;
  avatarAudioUrl?: string | null;
  companyName?: string;
  theme?: string;
  className?: string;
}

export const InterviewerCard: React.FC<InterviewerCardProps> = ({
  state,
  interviewerName = "AI Interviewer",
  interviewerRole = "Lead Hiring Architect",
  avatarVideoUrl,
  avatarAudioUrl,
  companyName,
  theme = "dark",
  className = "",
}) => {
  const isDark = theme === "dark";
  const isSpeaking = state === "AI_SPEAKING";
  const isThinking = state === "PROCESSING";

  let statusLabel = "Listening to candidate";
  let statusBadgeColor = isDark
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold";

  if (isSpeaking) {
    statusLabel = "Speaking...";
    statusBadgeColor = isDark
      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
      : "bg-purple-100 text-purple-800 border-purple-300 font-semibold";
  } else if (isThinking) {
    statusLabel = "Reviewing answer...";
    statusBadgeColor = isDark
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : "bg-amber-100 text-amber-800 border-amber-300 font-semibold";
  }

  const avatarStatus = isSpeaking
    ? "speaking"
    : isThinking
    ? "thinking"
    : "listening";

  return (
    <div
      className={`relative h-full flex flex-col items-center justify-between p-3.5 rounded-2xl border backdrop-blur-md overflow-hidden transition-all duration-300 ${
        isDark
          ? "bg-slate-900/90 border-slate-800 shadow-2xl shadow-purple-950/20 text-slate-100"
          : "bg-white/95 border-slate-200 shadow-xl shadow-slate-200/70 text-slate-900"
      } ${className}`}
    >
      {/* Top Bar: Interviewer Info & Status */}
      <div className="w-full flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div
            className={`p-1.5 rounded-lg border ${
              isDark
                ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
                : "bg-purple-100 text-purple-700 border-purple-200"
            }`}
          >
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4
              className={`text-xs font-bold tracking-wide leading-tight ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {interviewerName}
            </h4>
            <p
              className={`text-[10px] font-semibold ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {companyName ? `${companyName} • ${interviewerRole}` : interviewerRole}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div
          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${statusBadgeColor}`}
        >
          {isSpeaking && (
            <span className="flex space-x-0.5 items-center">
              <span className="w-1 h-2.5 bg-purple-500 animate-pulse rounded-full" />
              <span className="w-1 h-3.5 bg-purple-500 animate-pulse delay-75 rounded-full" />
              <span className="w-1 h-2 bg-purple-500 animate-pulse delay-150 rounded-full" />
            </span>
          )}
          {isThinking && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Main AIAvatar Display */}
      <div className="relative my-auto py-2 flex flex-col items-center justify-center">
        {/* Glow Ring when speaking */}
        {isSpeaking && (
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute -inset-3 rounded-full blur-xl pointer-events-none ${
              isDark
                ? "bg-gradient-to-r from-purple-600/40 via-indigo-600/30 to-purple-600/40"
                : "bg-gradient-to-r from-purple-300/60 via-indigo-200/50 to-purple-300/60"
            }`}
          />
        )}

        <AIAvatar
          aiStatus={avatarStatus}
          videoUrl={avatarVideoUrl}
          audioUrl={avatarAudioUrl}
          size="md"
          theme={theme}
          companyName={companyName}
        />
      </div>

      {/* Footer / Dynamic Waveform */}
      <div className="w-full flex items-center justify-center h-6 shrink-0">
        {isSpeaking ? (
          <div className="flex items-center space-x-1">
            {[30, 60, 90, 50, 80, 40, 70, 30].map((height, idx) => (
              <motion.span
                key={idx}
                animate={{ height: ["15%", `${height}%`, "15%"] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: idx * 0.08,
                }}
                className={`w-1 rounded-full ${
                  isDark ? "bg-purple-400" : "bg-purple-600"
                }`}
              />
            ))}
          </div>
        ) : (
          <span
            className={`text-[11px] font-semibold tracking-wide ${
              isDark ? "text-slate-500" : "text-slate-500"
            }`}
          >
            {isThinking ? "Evaluating conversational context..." : "Ready for candidate response"}
          </span>
        )}
      </div>
    </div>
  );
};

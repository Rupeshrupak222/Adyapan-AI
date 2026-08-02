"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bot, Volume2, Brain, Loader2 } from "lucide-react";
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
  let statusBadgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  if (isSpeaking) {
    statusLabel = "Speaking...";
    statusBadgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/30";
  } else if (isThinking) {
    statusLabel = "Reviewing answer...";
    statusBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  }

  // Map state to AIAvatar status format
  const avatarStatus = isSpeaking
    ? "speaking"
    : isThinking
    ? "thinking"
    : "listening";

  return (
    <div
      className={`relative flex flex-col items-center justify-between p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
        isDark
          ? "bg-slate-900/90 border-slate-800 shadow-2xl shadow-purple-950/20"
          : "bg-white/90 border-slate-200 shadow-xl shadow-purple-500/10"
      } ${className}`}
    >
      {/* Top Bar: Interviewer Info & Status */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-slate-100">
              {interviewerName}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">
              {companyName ? `${companyName} • ${interviewerRole}` : interviewerRole}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div
          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-medium ${statusBadgeColor}`}
        >
          {isSpeaking && (
            <span className="flex space-x-0.5 items-center">
              <span className="w-1 h-3 bg-purple-400 animate-pulse rounded-full" />
              <span className="w-1 h-4 bg-purple-400 animate-pulse delay-75 rounded-full" />
              <span className="w-1 h-2 bg-purple-400 animate-pulse delay-150 rounded-full" />
            </span>
          )}
          {isThinking && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Main AIAvatar Display */}
      <div className="relative my-6 flex flex-col items-center justify-center">
        {/* Glow Ring when speaking */}
        {isSpeaking && (
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-600/40 via-indigo-600/30 to-purple-600/40 blur-xl pointer-events-none"
          />
        )}

        <AIAvatar
          aiStatus={avatarStatus}
          videoUrl={avatarVideoUrl}
          audioUrl={avatarAudioUrl}
          size="lg"
          theme={theme}
          companyName={companyName}
        />
      </div>

      {/* Footer / Dynamic Waveform */}
      <div className="w-full flex items-center justify-center h-8">
        {isSpeaking ? (
          <div className="flex items-center space-x-1">
            {[40, 70, 100, 60, 90, 50, 80, 40].map((height, idx) => (
              <motion.span
                key={idx}
                animate={{ height: ["10%", `${height}%`, "10%"] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: idx * 0.08,
                }}
                className="w-1 rounded-full bg-purple-400"
              />
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-medium tracking-wide">
            {isThinking ? "Evaluating conversational context..." : "Ready for candidate response"}
          </span>
        )}
      </div>
    </div>
  );
};

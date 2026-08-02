"use client";

import React from "react";
import { motion } from "framer-motion";
import { User, Mic, MicOff, Camera } from "lucide-react";
import type { ConversationState, SilenceStage } from "./conversation-types";

interface CandidateCardProps {
  state: ConversationState;
  silenceStage: SilenceStage;
  micLevel: number;
  isMicEnabled: boolean;
  candidateName?: string;
  videoElement?: React.ReactNode;
  proctoringHUD?: React.ReactNode;
  theme?: string;
  className?: string;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  state,
  silenceStage,
  micLevel,
  isMicEnabled,
  candidateName = "You (Candidate)",
  videoElement,
  proctoringHUD,
  theme = "dark",
  className = "",
}) => {
  const isDark = theme === "dark";
  const isSpeaking = micLevel > 15;

  let silenceLabel = "Microphone Ready";
  let badgeColor = isDark
    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
    : "bg-cyan-100 text-cyan-800 border-cyan-300";

  if (state === "AI_SPEAKING") {
    silenceLabel = "Interviewer speaking (Mic muted)";
    badgeColor = isDark
      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
      : "bg-purple-100 text-purple-800 border-purple-300";
  } else if (isSpeaking) {
    silenceLabel = "Speaking naturally...";
    badgeColor = isDark
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold";
  } else if (silenceStage === "brief") {
    silenceLabel = "Brief pause...";
    badgeColor = isDark
      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
      : "bg-blue-100 text-blue-800 border-blue-300";
  } else if (silenceStage === "thinking") {
    silenceLabel = "Thinking pause...";
    badgeColor = isDark
      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
      : "bg-indigo-100 text-indigo-800 border-indigo-300";
  } else if (silenceStage === "waiting_hint") {
    silenceLabel = "Listening... take your time";
    badgeColor = isDark
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : "bg-amber-100 text-amber-800 border-amber-300";
  } else if (silenceStage === "confirming" || silenceStage === "finalizing") {
    silenceLabel = "Finalizing answer...";
    badgeColor = isDark
      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
      : "bg-purple-100 text-purple-800 border-purple-300";
  }

  return (
    <div
      className={`relative h-full flex flex-col justify-between p-3.5 rounded-2xl border backdrop-blur-md overflow-hidden transition-all duration-300 ${
        isDark
          ? "bg-slate-900/90 border-slate-800 shadow-xl shadow-cyan-950/20 text-slate-100"
          : "bg-white/95 border-slate-200 shadow-xl shadow-slate-200/70 text-slate-900"
      } ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between z-10 mb-2 shrink-0">
        <div className="flex items-center space-x-2">
          <div
            className={`p-1 rounded-lg border ${
              isDark
                ? "bg-cyan-600/20 text-cyan-400 border-cyan-500/30"
                : "bg-cyan-100 text-cyan-700 border-cyan-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4
              className={`text-xs font-bold tracking-wide leading-tight ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {candidateName}
            </h4>
            <span
              className={`text-[10px] font-semibold block ${
                isDark ? "text-cyan-400" : "text-cyan-700"
              }`}
            >
              Candidate Feed
            </span>
          </div>
        </div>

        {/* Status Pill */}
        <div
          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${badgeColor}`}
        >
          {isSpeaking ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          ) : (
            <Mic className="w-3 h-3" />
          )}
          <span>{silenceLabel}</span>
        </div>
      </div>

      {/* Center Camera Feed / Video Viewport */}
      <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        {videoElement ? (
          videoElement
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-2 border border-slate-700">
              <Camera className="w-6 h-6 text-slate-400 opacity-60" />
            </div>
            <p className="text-xs font-medium">Webcam Video Feed</p>
          </div>
        )}

        {/* Proctoring HUD Overlay */}
        {proctoringHUD && (
          <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none max-w-full overflow-hidden">
            {proctoringHUD}
          </div>
        )}

        {/* Microphone Audio Level Overlay */}
        <div
          className={`absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center space-x-2 backdrop-blur-md px-2.5 py-1 rounded-lg border ${
            isDark
              ? "bg-slate-900/85 border-slate-700/50 text-slate-300"
              : "bg-white/90 border-slate-200 text-slate-700 shadow-md"
          }`}
        >
          <div>
            {isMicEnabled ? (
              <Mic className="w-3 h-3 text-cyan-500" />
            ) : (
              <MicOff className="w-3 h-3 text-rose-500" />
            )}
          </div>
          <div
            className={`flex-1 h-1.5 rounded-full overflow-hidden ${
              isDark ? "bg-slate-800" : "bg-slate-200"
            }`}
          >
            <motion.div
              className={`h-full ${
                isSpeaking
                  ? "bg-gradient-to-r from-cyan-500 to-emerald-500"
                  : "bg-slate-500"
              }`}
              animate={{ width: `${micLevel}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <span className="text-[10px] font-mono font-semibold w-6 text-right">
            {micLevel}%
          </span>
        </div>
      </div>
    </div>
  );
};

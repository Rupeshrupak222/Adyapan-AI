"use client";

import React from "react";
import { motion } from "framer-motion";
import { User, Mic, MicOff, Camera, Shield, AlertTriangle } from "lucide-react";
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
  let badgeColor = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";

  if (state === "AI_SPEAKING") {
    silenceLabel = "Interviewer speaking (Mic muted)";
    badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/30";
  } else if (isSpeaking) {
    silenceLabel = "Speaking naturally...";
    badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  } else if (silenceStage === "brief") {
    silenceLabel = "Brief pause...";
    badgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/30";
  } else if (silenceStage === "thinking") {
    silenceLabel = "Thinking pause...";
    badgeColor = "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
  } else if (silenceStage === "waiting_hint") {
    silenceLabel = "Listening... take your time";
    badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  } else if (silenceStage === "confirming" || silenceStage === "finalizing") {
    silenceLabel = "Finalizing answer...";
    badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/30";
  }

  return (
    <div
      className={`relative flex flex-col justify-between p-4 rounded-2xl border backdrop-blur-md overflow-hidden transition-all duration-300 ${
        isDark
          ? "bg-slate-900/90 border-slate-800 shadow-xl shadow-cyan-950/20"
          : "bg-white/90 border-slate-200 shadow-lg shadow-cyan-500/10"
      } ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between z-10 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-slate-100">
              {candidateName}
            </h4>
            <span className="text-[10px] text-cyan-400 font-medium">Candidate Feed</span>
          </div>
        </div>

        {/* Status Pill */}
        <div
          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-medium ${badgeColor}`}
        >
          {isSpeaking ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          ) : (
            <Mic className="w-3 h-3" />
          )}
          <span>{silenceLabel}</span>
        </div>
      </div>

      {/* Center Camera Feed / Video Viewport */}
      <div className="relative flex-1 min-h-[180px] rounded-xl overflow-hidden bg-slate-950/90 border border-slate-800 flex items-center justify-center">
        {videoElement ? (
          videoElement
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2 border border-slate-700">
              <Camera className="w-8 h-8 text-slate-400 opacity-60" />
            </div>
            <p className="text-xs font-medium">Webcam Video Feed</p>
          </div>
        )}

        {/* Proctoring HUD Overlay if provided */}
        {proctoringHUD && (
          <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none">
            {proctoringHUD}
          </div>
        )}

        {/* Microphone Audio Level Overlay */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/50">
          <div className="text-slate-400">
            {isMicEnabled ? <Mic className="w-3.5 h-3.5 text-cyan-400" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
          </div>
          <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${isSpeaking ? "bg-gradient-to-r from-cyan-400 to-emerald-400" : "bg-slate-600"}`}
              animate={{ width: `${micLevel}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
            {micLevel}%
          </span>
        </div>
      </div>
    </div>
  );
};

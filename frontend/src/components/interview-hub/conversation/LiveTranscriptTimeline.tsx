"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot, Sparkles, MessageSquare } from "lucide-react";
import type { ConversationMessage } from "./conversation-types";

interface LiveTranscriptTimelineProps {
  messages: ConversationMessage[];
  liveTranscript?: string;
  accumulatedTranscript?: string;
  isCandidateSpeaking?: boolean;
  theme?: string;
  className?: string;
}

export const LiveTranscriptTimeline: React.FC<LiveTranscriptTimelineProps> = ({
  messages,
  liveTranscript = "",
  accumulatedTranscript = "",
  isCandidateSpeaking = false,
  theme = "dark",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  const currentCandidateText = (accumulatedTranscript + " " + liveTranscript).trim();

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, currentCandidateText]);

  return (
    <div
      className={`relative flex flex-col h-full rounded-2xl border p-4 backdrop-blur-md overflow-hidden ${
        isDark
          ? "bg-slate-900/80 border-slate-800 text-slate-100"
          : "bg-white/90 border-slate-200 text-slate-800"
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Live Meeting Transcript
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Sync</span>
        </div>
      </div>

      {/* Transcript Timeline List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-3.5 pr-2 scrollbar-thin scrollbar-thumb-purple-500/20"
      >
        {messages.length === 0 && !currentCandidateText && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Sparkles className="w-8 h-8 text-purple-400 mb-2 opacity-50 animate-pulse" />
            <p className="text-sm font-medium">Interview transcript will stream here live</p>
            <p className="text-xs opacity-75 mt-1">Speak naturally when prompted</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isSystem = msg.role === "system";
            const isInterviewer = msg.role === "interviewer";

            if (isSystem) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center my-2"
                >
                  <span className="text-[11px] px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-400 font-medium">
                    {msg.content}
                  </span>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-start space-x-3 text-sm"
              >
                <div
                  className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isInterviewer
                      ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                      : "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30"
                  }`}
                >
                  {isInterviewer ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-semibold ${isInterviewer ? "text-purple-300" : "text-cyan-300"}`}>
                      {isInterviewer ? "Interviewer" : "Candidate"}
                    </span>
                    {msg.timestamp && (
                      <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                    )}
                  </div>
                  <p className={`mt-0.5 leading-relaxed text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {msg.content}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Live Interim Streaming Transcript for Candidate */}
        {currentCandidateText && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start space-x-3 text-sm border-l-2 border-cyan-400 pl-3 py-1 bg-cyan-950/20 rounded-r-lg"
          >
            <div className="mt-0.5 w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center flex-shrink-0 animate-pulse">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-cyan-300">You (Speaking)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <p className="mt-0.5 leading-relaxed text-sm text-cyan-100 font-normal italic">
                {currentCandidateText}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

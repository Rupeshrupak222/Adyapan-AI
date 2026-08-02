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
      className={`relative flex flex-col h-full rounded-2xl border p-4 backdrop-blur-md overflow-hidden transition-all duration-300 ${
        isDark
          ? "bg-slate-900/90 border-slate-800 text-slate-100 shadow-2xl shadow-purple-950/20"
          : "bg-white/95 border-slate-200 text-slate-900 shadow-xl shadow-slate-200/70"
      } ${className}`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between pb-3 border-b mb-3 shrink-0 ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-purple-500" />
          <h3
            className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Live Meeting Transcript
          </h3>
        </div>
        <div
          className={`flex items-center space-x-1.5 text-[11px] font-medium ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Sync</span>
        </div>
      </div>

      {/* Transcript Timeline List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 scrollbar-thin scrollbar-thumb-purple-500/20"
      >
        {messages.length === 0 && !currentCandidateText && (
          <div
            className={`h-full flex flex-col items-center justify-center text-center p-6 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <Sparkles className="w-8 h-8 text-purple-500 mb-2 opacity-60 animate-pulse" />
            <p className="text-sm font-semibold">
              Interview transcript will stream here live
            </p>
            <p className="text-xs opacity-75 mt-1">
              Speak naturally when interviewer finishes
            </p>
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
                  <span
                    className={`text-[11px] px-3 py-1 rounded-full border font-medium ${
                      isDark
                        ? "bg-slate-800/80 border-slate-700/50 text-slate-400"
                        : "bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
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
                  className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                    isInterviewer
                      ? isDark
                        ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
                        : "bg-purple-100 text-purple-700 border-purple-200"
                      : isDark
                      ? "bg-cyan-600/20 text-cyan-400 border-cyan-500/30"
                      : "bg-cyan-100 text-cyan-700 border-cyan-200"
                  }`}
                >
                  {isInterviewer ? (
                    <Bot className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold ${
                        isInterviewer
                          ? isDark
                            ? "text-purple-300"
                            : "text-purple-700"
                          : isDark
                          ? "text-cyan-300"
                          : "text-cyan-700"
                      }`}
                    >
                      {isInterviewer ? "Interviewer" : "Candidate"}
                    </span>
                    {msg.timestamp && (
                      <span
                        className={`text-[10px] ${
                          isDark ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-0.5 leading-relaxed text-sm ${
                      isDark ? "text-slate-200" : "text-slate-800 font-medium"
                    }`}
                  >
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
            className={`flex items-start space-x-3 text-sm border-l-2 pl-3 py-1.5 rounded-r-lg ${
              isDark
                ? "border-cyan-400 bg-cyan-950/30 text-cyan-100"
                : "border-cyan-500 bg-cyan-50 text-cyan-900 font-medium"
            }`}
          >
            <div
              className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 animate-pulse ${
                isDark
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "bg-cyan-200 text-cyan-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs font-bold ${
                    isDark ? "text-cyan-300" : "text-cyan-700"
                  }`}
                >
                  You (Speaking)
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              </div>
              <p className="mt-0.5 leading-relaxed text-sm font-normal italic">
                {currentCandidateText}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

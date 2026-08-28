"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pause,
  Play,
  PhoneOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Clock,
  Sparkles,
  Keyboard,
  Send,
  Loader2,
  AlertCircle,
  PictureInPicture,
} from "lucide-react";
import { InterviewerCard } from "./InterviewerCard";
import { CandidateCard } from "./CandidateCard";
import { LiveTranscriptTimeline } from "./LiveTranscriptTimeline";
import type {
  ConversationState,
  SilenceStage,
  ConversationMessage,
} from "./conversation-types";

interface InterviewRoomUIProps {
  state: ConversationState;
  silenceStage: SilenceStage;
  messages: ConversationMessage[];
  liveTranscript: string;
  accumulatedTranscript: string;
  micLevel: number;
  isMicEnabled: boolean;
  isAiMuted: boolean;
  isPaused: boolean;
  textModeEnabled: boolean;
  avatarVideoUrl?: string | null;
  avatarAudioUrl?: string | null;
  interviewTitle?: string;
  targetRole?: string;
  companyName?: string;
  difficulty?: string;
  elapsedSeconds?: number;
  candidateVideoElement?: React.ReactNode;
  proctoringHUD?: React.ReactNode;
  proctoringPanel?: React.ReactNode;
  customOverlayContent?: React.ReactNode;
  onPauseToggle: () => void;
  onEndInterview: () => void;
  onMuteToggle: () => void;
  onReplayLastQuestion: () => void;
  onTextSubmit: (text: string) => void;
  onTextModeToggle: () => void;
  theme?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const InterviewRoomUI: React.FC<InterviewRoomUIProps> = ({
  state,
  silenceStage,
  messages,
  liveTranscript,
  accumulatedTranscript,
  micLevel,
  isMicEnabled,
  isAiMuted,
  isPaused,
  textModeEnabled,
  avatarVideoUrl,
  avatarAudioUrl,
  interviewTitle = "AI Interview Session",
  targetRole = "Software Engineer",
  companyName,
  difficulty = "Medium",
  elapsedSeconds = 0,
  candidateVideoElement,
  proctoringHUD,
  proctoringPanel,
  customOverlayContent,
  onPauseToggle,
  onEndInterview,
  onMuteToggle,
  onReplayLastQuestion,
  onTextSubmit,
  onTextModeToggle,
  theme = "dark",
}) => {
  const isDark = theme === "dark";
  const [textInput, setTextInput] = useState("");
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [isFloatingPIP, setIsFloatingPIP] = useState(false);

  const handleManualTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onTextSubmit(textInput.trim());
    setTextInput("");
  };

  const lastInterviewerMessage = [...messages]
    .reverse()
    .find((m) => m.role === "interviewer")?.content;

  return (
    <div
      className={`relative h-[calc(100vh-76px)] w-full flex flex-col justify-between p-3.5 select-none overflow-hidden transition-colors duration-300 ${
        isDark
          ? "bg-slate-950 text-slate-100"
          : "bg-slate-100/90 text-slate-900"
      }`}
    >
      {/* 1. Header Bar */}
      <header
        className={`shrink-0 flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b transition-colors ${
          isDark ? "border-slate-800/80" : "border-slate-200"
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`p-1.5 rounded-xl border ${
              isDark
                ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
                : "bg-purple-100 text-purple-700 border-purple-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1
              className={`text-sm md:text-base font-bold tracking-tight leading-tight ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {interviewTitle}
            </h1>
            <p
              className={`text-[11px] font-medium ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Role:{" "}
              <span
                className={isDark ? "text-purple-300 font-semibold" : "text-purple-700 font-bold"}
              >
                {targetRole}
              </span>
              {companyName && (
                <>
                  {" "}
                  • Company:{" "}
                  <span
                    className={isDark ? "text-cyan-300 font-semibold" : "text-cyan-700 font-bold"}
                  >
                    {companyName}
                  </span>
                </>
              )}
              {" "}
              • Level:{" "}
              <span
                className={`capitalize font-semibold ${
                  isDark ? "text-indigo-300" : "text-indigo-700"
                }`}
              >
                {difficulty}
              </span>
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono font-semibold ${
              isDark
                ? "bg-slate-900 border-slate-800 text-slate-300"
                : "bg-white border-slate-200 text-slate-700 shadow-sm"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          <div
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold ${
              isDark
                ? "bg-slate-900 border-slate-800 text-emerald-400"
                : "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Voice Room Active</span>
          </div>
        </div>
      </header>

      {/* 2. Main Stage Content */}
      <main className="flex-1 min-h-0 my-2 flex flex-col space-y-2.5 overflow-hidden">
        {/* Top Grid: Video Feeds + Live Transcript */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch overflow-hidden">
          {/* Left Column: Interviewer & Candidate Cards (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3 h-full min-h-0 overflow-hidden">
            <div
              className={`grid gap-3 flex-1 min-h-0 overflow-hidden ${
                isFloatingPIP ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              <InterviewerCard
                state={state}
                interviewerName="AI Recruiter"
                interviewerRole={targetRole}
                companyName={companyName}
                currentQuestion={lastInterviewerMessage}
                avatarVideoUrl={avatarVideoUrl}
                avatarAudioUrl={avatarAudioUrl}
                theme={theme}
                className="h-full min-h-0"
              />

              <CandidateCard
                state={state}
                silenceStage={silenceStage}
                micLevel={micLevel}
                isMicEnabled={isMicEnabled}
                videoElement={candidateVideoElement}
                proctoringHUD={proctoringHUD}
                theme={theme}
                className="h-full min-h-0"
                isFloatingPIP={isFloatingPIP}
                onTogglePIP={() => setIsFloatingPIP((prev) => !prev)}
              />
            </div>
          </div>

          {/* Right Column: Live Meeting Transcript (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0 overflow-hidden">
            <LiveTranscriptTimeline
              messages={messages}
              liveTranscript={liveTranscript}
              accumulatedTranscript={accumulatedTranscript}
              isCandidateSpeaking={micLevel > 15}
              theme={theme}
              className="h-full min-h-0 flex-1"
            />
          </div>
        </div>

        {/* Bottom Full-Width Section (Custom Workspace / Overlay) */}
        {customOverlayContent && (
          <div className="shrink-0 w-full overflow-hidden">{customOverlayContent}</div>
        )}
      </main>

      {/* 3. AI Thinking State Overlay */}
      <AnimatePresence>
        {state === "PROCESSING" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`shrink-0 mb-2 p-2 rounded-xl border backdrop-blur-md flex items-center justify-center space-x-2 text-xs font-semibold shadow-lg ${
              isDark
                ? "bg-purple-950/60 border-purple-500/40 text-purple-200 shadow-purple-950/40"
                : "bg-purple-50 border-purple-200 text-purple-900 shadow-purple-100"
            }`}
          >
            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            <span className="tracking-wide">
              Interviewer is reviewing your answer...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Accessibility Text Mode Drawer */}
      <AnimatePresence>
        {textModeEnabled && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleManualTextSubmit}
            className={`shrink-0 mb-2 flex items-center space-x-2 p-2 rounded-xl border ${
              isDark
                ? "bg-slate-900 border-purple-500/30 text-slate-100"
                : "bg-white border-purple-300 text-slate-900 shadow-md"
            }`}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Keyboard Accessibility Mode: Type your answer here..."
              className={`flex-1 bg-transparent px-3 py-1.5 text-xs focus:outline-none ${
                isDark
                  ? "text-slate-100 placeholder-slate-500"
                  : "text-slate-900 placeholder-slate-400 font-medium"
              }`}
            />
            <button
              type="submit"
              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors flex items-center space-x-1 text-xs"
            >
              <span>Submit</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 5. Minimal Utility Toolbar (Bottom) */}
      <footer
        className={`shrink-0 flex flex-wrap items-center justify-between gap-2 pt-2 border-t transition-colors ${
          isDark ? "border-slate-800/80" : "border-slate-200"
        }`}
      >
        <div className="flex items-center space-x-2">
          {/* Pause / Resume */}
          <button
            onClick={onPauseToggle}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              isPaused
                ? "bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30"
                : isDark
                ? "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>

          {/* Mute AI Voice */}
          <button
            onClick={onMuteToggle}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              isAiMuted
                ? "bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30"
                : isDark
                ? "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm"
            }`}
          >
            {isAiMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isAiMuted ? "Unmute AI" : "Mute AI"}</span>
          </button>

          {/* Replay Last Question */}
          <button
            onClick={onReplayLastQuestion}
            disabled={!lastInterviewerMessage}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 ${
              isDark
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
            <span>Replay Question</span>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center space-x-2">
          {/* Toggle Floating Camera PIP Popup */}
          <button
            onClick={() => setIsFloatingPIP((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              isFloatingPIP
                ? "bg-cyan-600/20 text-cyan-300 border-cyan-500/40"
                : isDark
                ? "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm"
            }`}
            title="Toggle Floating Camera PIP Popup"
          >
            <PictureInPicture className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFloatingPIP ? "Dock Camera" : "Floating Camera"}</span>
          </button>

          {/* Text Mode Toggle */}
          <button
            onClick={onTextModeToggle}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              textModeEnabled
                ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                : isDark
                ? "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm"
            }`}
            title="Toggle Accessibility Text Mode"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Text Mode</span>
          </button>

          {/* End Interview */}
          <button
            onClick={() => setShowEndConfirmModal(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30 text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Interview</span>
          </button>
        </div>
      </footer>

      {/* End Interview Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className={`p-6 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-4 border ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">End Interview Session?</h3>
              <p
                className={`text-sm ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Are you sure you want to finish this session? Your conversation transcript will be saved and evaluated.
              </p>
              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={() => setShowEndConfirmModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Continue Interview
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirmModal(false);
                    onEndInterview();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors"
                >
                  End & Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

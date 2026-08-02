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
  Shield,
  Clock,
  Sparkles,
  Keyboard,
  Send,
  Loader2,
  AlertCircle,
  HelpCircle,
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
      className={`relative min-h-screen flex flex-col justify-between p-4 md:p-6 select-none ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* 1. Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-100">
              {interviewTitle}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Role: <span className="text-purple-300">{targetRole}</span>
              {companyName && (
                <>
                  {" "}
                  • Company: <span className="text-cyan-300">{companyName}</span>
                </>
              )}
              {" "}
              • Level: <span className="capitalize text-indigo-300">{difficulty}</span>
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Voice Room Active</span>
          </div>
        </div>
      </header>

      {/* 2. Main Stage Content */}
      <main className="flex-1 my-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Interviewer & Candidate Cards (8 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <InterviewerCard
              state={state}
              interviewerName="AI Recruiter"
              interviewerRole={targetRole}
              companyName={companyName}
              avatarVideoUrl={avatarVideoUrl}
              avatarAudioUrl={avatarAudioUrl}
              theme={theme}
              className="h-full min-h-[300px]"
            />

            <CandidateCard
              state={state}
              silenceStage={silenceStage}
              micLevel={micLevel}
              isMicEnabled={isMicEnabled}
              videoElement={candidateVideoElement}
              proctoringHUD={proctoringHUD}
              theme={theme}
              className="h-full min-h-[300px]"
            />
          </div>

          {/* Custom Overlay (e.g. Technical Code Editor or STAR feedback drawer) if passed */}
          {customOverlayContent && (
            <div className="flex-1 mt-2">{customOverlayContent}</div>
          )}
        </div>

        {/* Right Column: Live Meeting Transcript (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-[350px]">
          <LiveTranscriptTimeline
            messages={messages}
            liveTranscript={liveTranscript}
            accumulatedTranscript={accumulatedTranscript}
            isCandidateSpeaking={micLevel > 15}
            theme={theme}
            className="flex-1"
          />
        </div>
      </main>

      {/* 3. AI Thinking State Overlay */}
      <AnimatePresence>
        {state === "PROCESSING" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-2xl bg-purple-950/60 border border-purple-500/40 backdrop-blur-md flex items-center justify-center space-x-3 text-purple-200 text-sm shadow-xl shadow-purple-950/50"
          >
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span className="font-medium tracking-wide">
              Interviewer is reviewing your answer...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Accessibility Text Mode Drawer (Optional) */}
      <AnimatePresence>
        {textModeEnabled && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleManualTextSubmit}
            className="mb-4 flex items-center space-x-2 bg-slate-900 p-2.5 rounded-2xl border border-purple-500/30"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Keyboard Accessibility Mode: Type your answer here..."
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors flex items-center space-x-1 text-xs"
            >
              <span>Submit</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 5. Minimal Utility Toolbar (Bottom) */}
      <footer className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
        <div className="flex items-center space-x-2">
          {/* Pause / Resume */}
          <button
            onClick={onPauseToggle}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-colors ${
              isPaused
                ? "bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>

          {/* Mute AI Voice */}
          <button
            onClick={onMuteToggle}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-colors ${
              isAiMuted
                ? "bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            {isAiMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isAiMuted ? "Unmute AI" : "Mute AI"}</span>
          </button>

          {/* Replay Last Question */}
          <button
            onClick={onReplayLastQuestion}
            disabled={!lastInterviewerMessage}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold flex items-center space-x-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-purple-400" />
            <span>Replay Question</span>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center space-x-2">
          {/* Text Mode Toggle */}
          <button
            onClick={onTextModeToggle}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-colors ${
              textModeEnabled
                ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
            }`}
            title="Toggle Accessibility Text Mode"
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden sm:inline">Text Mode</span>
          </button>

          {/* End Interview */}
          <button
            onClick={() => setShowEndConfirmModal(true)}
            className="p-2.5 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 text-xs font-semibold flex items-center space-x-2 transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
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
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">End Interview Session?</h3>
              <p className="text-sm text-slate-400">
                Are you sure you want to finish this session? Your conversation transcript will be saved and evaluated.
              </p>
              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={() => setShowEndConfirmModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  Continue Interview
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirmModal(false);
                    onEndInterview();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
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

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Send, PhoneOff, Clock, Brain, Volume2, VolumeX,
  User, Bot, Loader2, Sparkles, Target, ArrowRight, MessageSquare,
  Star, TrendingUp, ChevronDown, ChevronUp, Eye, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import AIAvatar from "@/components/interview-hub/shared/AIAvatar";
import type { HRConfig, HRMessage, STARAnalysis, CommunicationAnalysis } from "./HRTypes";
import { useHRStore } from "./HRStore";
import FormattedMarkdown from "@/components/shared/FormattedMarkdown";

interface HRInterviewActiveProps {
  sessionId: string;
  config: HRConfig;
  initialMessages?: HRMessage[];
  onComplete: (sessionId: string) => void;
  onEnd: () => void;
  theme?: string;
}

type AIStatus = "listening" | "thinking" | "speaking" | "idle";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const HRInterviewActive: React.FC<HRInterviewActiveProps> = ({
  sessionId, config, initialMessages, onComplete, onEnd, theme: propTheme,
}) => {
  const store = useHRStore();
  const {
    messages, sending, isListening, liveTranscript, micLevel,
    questionNumber, totalQuestions, setMessages, addMessage,
    setSending, setIsListening, setLiveTranscript, setMicLevel,
    setQuestionNumber, setTotalQuestions, setCurrentCompetency,
    setLiveSTAR, setLiveCommunication,
  } = store;

  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const [aiStatus, setAiStatus] = useState<AIStatus>("idle");
  const [inputText, setInputText] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(config.aiVoiceEnabled);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const [showLiveAnalysis, setShowLiveAnalysis] = useState(false);
  const [liveSTAR, setLocalLiveSTAR] = useState<STARAnalysis | null>(null);
  const [liveComm, setLocalLiveComm] = useState<CommunicationAnalysis | null>(null);
  const [currentCompetency, setLocalCompetency] = useState("communication");
  const [violationCount, setViolationCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const micEnabledRef = useRef(micEnabled);
  useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);
  const [avatarAudioUrl, setAvatarAudioUrl] = useState<string | null>(null);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);

  const isDark = theme === "dark";

  const HR_TIPS = [
    "Use the STAR method for behavioral questions",
    "Be specific with real examples from your experience",
    "Show enthusiasm and genuine interest in the role",
    "Connect your answers to the company's values",
    "Highlight leadership moments, even small ones",
    "Be honest about challenges and what you learned",
    "Quantify your achievements when possible",
    "Show self-awareness about your growth areas",
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    timerRef.current = setInterval(() => setElapsedSeconds((p) => p + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isMounted]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((p) => (p + 1) % HR_TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#{}`]/g, ""));
    utterance.rate = config.voiceSpeed || 0.95;
    utterance.pitch = config.voicePitch || 1;
    if (config.voiceGender === "male") utterance.pitch = 0.85;
    else if (config.voiceGender === "female") utterance.pitch = 1.15;
    utterance.onstart = () => setAiStatus("speaking");
    utterance.onend = () => setAiStatus("idle");
    utterance.onerror = () => setAiStatus("idle");
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled, config.voiceSpeed, config.voicePitch, config.voiceGender]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!sessionLoaded) {
      setSessionLoaded(true);
      const msgsToUse = initialMessages && initialMessages.length > 0 ? initialMessages : messages;
      if (msgsToUse && msgsToUse.length > 0) {
        setMessages(msgsToUse);
        const lastMsg = msgsToUse[msgsToUse.length - 1];
        if (lastMsg) setCurrentQuestionText(lastMsg.content);
        const firstInterviewerMsg = msgsToUse.find((m) => m.role === "interviewer");
        if (firstInterviewerMsg && voiceEnabled) {
          setTimeout(() => {
            speakText(firstInterviewerMsg.content);
          }, 500);
        }
      }
      setTotalQuestions(Math.ceil((config.durationMinutes || 30) / 4));
    }
  }, [sessionLoaded, config, initialMessages, setMessages, setTotalQuestions, speakText, voiceEnabled, messages]);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = config.language === "hindi" ? "hi-IN" : "en-US";

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      const trimmed = currentTranscript.trim();
      if (trimmed) {
        setLiveTranscript(trimmed);
        setInputText(trimmed);
      }
    };

    recognition.onerror = (err: any) => {
      if (err.error === "no-speech" || err.error === "aborted") return;
      if (err.error === "not-allowed") toast.error("Microphone permission denied.");
      setAiStatus("idle");
    };

    recognition.onend = () => {
      if (micEnabledRef.current) {
        setTimeout(() => {
          if (micEnabledRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 300);
      } else {
        setIsListening(false);
        setAiStatus("idle");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      setAiStatus("listening");
    } catch {}
  }, [config.language, setIsListening, setLiveTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setAiStatus("idle");
    setLiveTranscript("");
  }, [setIsListening, setLiveTranscript]);

  useEffect(() => {
    if (micEnabled) startListening();
    else stopListening();
    return () => stopListening();
  }, [micEnabled]);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    const userMsg: HRMessage = {
      id: `candidate-${Date.now()}`,
      role: "candidate",
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInputText("");
    setSending(true);
    setAiStatus("thinking");

    try {
      const res = await api.post(`/interview/hr/${sessionId}/answer`, {
        answer: text,
        isFollowUp: false,
      });

      if (res.data.success) {
        setMessages(res.data.messages || []);
        setQuestionNumber(res.data.questionNumber || questionNumber + 1);

        if (res.data.questionMeta) {
          setLocalCompetency(res.data.questionMeta.competency || "communication");
          setCurrentCompetency(res.data.questionMeta.competency || "communication");
        }

        if (res.data.liveAnalysis) {
          if (res.data.liveAnalysis.starAnalysis) {
            setLocalLiveSTAR(res.data.liveAnalysis.starAnalysis);
            setLiveSTAR(res.data.liveAnalysis.starAnalysis);
          }
          if (res.data.liveAnalysis.communicationAnalysis) {
            setLocalLiveComm(res.data.liveAnalysis.communicationAnalysis);
            setLiveCommunication(res.data.liveAnalysis.communicationAnalysis);
          }
        }

        if (res.data.isComplete) {
          onComplete(sessionId);
          return;
        }

        if (res.data.nextQuestion) {
          setCurrentQuestionText(res.data.nextQuestion);
          speakText(res.data.nextQuestion);
        }
      }
    } catch {
      toast.error("Failed to send answer");
    } finally {
      setSending(false);
    }
  }, [inputText, sending, sessionId, addMessage, setMessages, setQuestionNumber, questionNumber, onComplete, speakText, setCurrentCompetency, setLiveSTAR, setLiveCommunication]);

  const handleEndInterview = useCallback(async () => {
    setShowEndConfirm(false);
    try {
      const res = await api.post(`/interview/hr/${sessionId}/end`);
      if (res.data.evaluation) {
        onComplete(sessionId);
      } else {
        onEnd();
      }
    } catch {
      onEnd();
    }
  }, [sessionId, onComplete, onEnd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const progress = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

  return (
    <div
      className="relative w-full h-[calc(100vh-70px)] -m-5 flex flex-col overflow-hidden rounded-2xl border"
      style={{
        background: isDark ? "#080710" : "#f9fafb",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
        color: isDark ? "#ffffff" : "#111827",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 border-b px-4 py-2.5 flex items-center justify-between"
        style={{
          background: isDark ? "rgba(8,7,16,0.95)" : "rgba(255,255,255,0.95)",
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <AIAvatar
            aiStatus={aiStatus}
            videoUrl={avatarVideoUrl}
            audioUrl={avatarAudioUrl}
            companyName={config.targetCompany || ""}
            size="sm"
            theme={theme}
          />
          <div>
            <div className="text-xs font-bold">HR Interview</div>
            <div className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
              {config.targetCompany || "General"} · {config.targetRole}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }}>
            <Clock size={10} />
            {formatTime(elapsedSeconds)}
          </div>
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
            style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
            {questionNumber}/{totalQuestions}
          </div>
          {violationCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
              <Shield size={10} />
              {violationCount}
            </div>
          )}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="w-7 h-7 rounded-lg border flex items-center justify-center"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }}
          >
            {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="w-7 h-7 rounded-lg border flex items-center justify-center text-red-500"
            style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)" }}
          >
            <PhoneOff size={12} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="shrink-0 h-1" style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6" }}>
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Messages + Input */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tip Banner */}
          <div className="shrink-0 px-4 py-2 border-b flex items-center gap-2"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6", background: isDark ? "rgba(245,158,11,0.03)" : "rgba(245,158,11,0.02)" }}>
            <Target size={12} className="text-amber-500 shrink-0" />
            <AnimatePresence mode="wait">
              <motion.span
                key={tipIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[10px]"
                style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}
              >
                {HR_TIPS[tipIndex]}
              </motion.span>
            </AnimatePresence>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold ml-auto shrink-0"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
              {currentCompetency.replace(/_/g, " ")}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "candidate" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: msg.role === "interviewer"
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : "linear-gradient(135deg, #3b82f6, #2563eb)",
                  }}
                >
                  {msg.role === "interviewer" ? <Bot size={14} className="text-black" /> : <User size={14} className="text-white" />}
                </div>
                <div
                  className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed relative group ${
                    msg.role === "candidate" ? "rounded-tr-md" : "rounded-tl-md"
                  }`}
                  style={{
                    background: msg.role === "interviewer"
                      ? isDark ? "rgba(245,158,11,0.08)" : "#fffbeb"
                      : isDark ? "rgba(59,130,246,0.1)" : "#eff6ff",
                    border: `1px solid ${
                      msg.role === "interviewer"
                        ? isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.2)"
                        : isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.2)"
                    }`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <FormattedMarkdown content={msg.content} isDark={isDark} className="flex-1" />
                    {msg.role === "interviewer" && (
                      <button
                        onClick={() => speakText(msg.content)}
                        title="Read question aloud"
                        className="shrink-0 p-1 rounded-lg hover:bg-amber-500/10 text-amber-500 transition-colors"
                      >
                        <Volume2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {sending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Bot size={14} className="text-black" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-md"
                  style={{ background: isDark ? "rgba(245,158,11,0.08)" : "#fffbeb" }}>
                  <div className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-amber-500" />
                    <span className="text-[10px] font-bold" style={{ color: "#f59e0b" }}>
                      {aiStatus === "thinking" ? "Analyzing..." : "Preparing..."}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* AI Status + Mic Level */}
          {(isListening || aiStatus === "speaking") && (
            <div className="shrink-0 px-4 py-2 border-t flex items-center gap-3"
              style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6" }}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  aiStatus === "listening" ? "bg-emerald-400 animate-pulse"
                    : aiStatus === "speaking" ? "bg-amber-400 animate-pulse"
                    : "bg-gray-400"
                }`} />
                <span className="text-[10px] font-bold" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}>
                  {aiStatus === "listening" ? "Listening..." : aiStatus === "speaking" ? "AI Speaking..." : "Ready"}
                </span>
              </div>
              {isListening && (
                <div className="flex items-center gap-1 ml-auto">
                  {Array.from({ length: 12 }, (_, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 rounded-full bg-amber-500"
                      animate={{ height: Math.random() * 16 + 4 }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>
              )}
              {liveTranscript && (
                <div className="text-[10px] italic ml-2 flex-1 truncate" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af" }}>
                  {liveTranscript}
                </div>
              )}
            </div>
          )}

          {/* Input Area */}
          <div className="shrink-0 p-3 border-t"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb", background: isDark ? "rgba(8,7,16,0.95)" : "#ffffff" }}>
            <div className="flex items-end gap-2">
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: micEnabled ? "rgba(239,68,68,0.1)" : isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6",
                  borderColor: micEnabled ? "rgba(239,68,68,0.3)" : isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
                  color: micEnabled ? "#ef4444" : isDark ? "rgba(255,255,255,0.5)" : "#6b7280",
                }}
              >
                {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer or use microphone..."
                  rows={1}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs resize-none focus:outline-none focus:border-amber-500/50 transition-colors"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
                    color: isDark ? "#fff" : "#111827",
                    maxHeight: 120,
                  }}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!inputText.trim() || sending}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
              >
                <Send size={16} className="text-black" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Live Analysis */}
        <div
          className="hidden lg:flex flex-col w-72 border-l"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
            background: isDark ? "rgba(8,7,16,0.5)" : "#ffffff",
          }}
        >
          <div className="p-3 border-b flex items-center justify-between"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
            <div className="flex items-center gap-2">
              <Eye size={12} className="text-amber-500" />
              <span className="text-[10px] font-bold">Live Analysis</span>
            </div>
            <button
              onClick={() => setShowLiveAnalysis(!showLiveAnalysis)}
              className="w-5 h-5 rounded flex items-center justify-center"
            >
              {showLiveAnalysis ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollbarWidth: "none" }}>
            {/* STAR Analysis */}
            {liveSTAR && (
              <div className="p-3 rounded-xl border space-y-2"
                style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                <div className="flex items-center gap-2">
                  <Star size={10} className="text-amber-500" />
                  <span className="text-[10px] font-bold">STAR Method</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto"
                    style={{
                      background: liveSTAR.score >= 70 ? "rgba(16,185,129,0.1)" : liveSTAR.score >= 40 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                      color: liveSTAR.score >= 70 ? "#10b981" : liveSTAR.score >= 40 ? "#f59e0b" : "#ef4444",
                    }}>
                    {liveSTAR.score}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["hasSituation", "hasTask", "hasAction", "hasResult"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-1.5 text-[10px]">
                      <div className={`w-1.5 h-1.5 rounded-full ${liveSTAR[key] ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}>
                        {key.replace("has", "")}
                      </span>
                    </div>
                  ))}
                </div>
                {liveSTAR.feedback && (
                  <p className="text-[10px] leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
                    {liveSTAR.feedback}
                  </p>
                )}
              </div>
            )}

            {/* Communication Analysis */}
            {liveComm && (
              <div className="p-3 rounded-xl border space-y-2"
                style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                <div className="flex items-center gap-2">
                  <MessageSquare size={10} className="text-blue-500" />
                  <span className="text-[10px] font-bold">Communication</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto"
                    style={{
                      background: liveComm.overallScore >= 70 ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                      color: liveComm.overallScore >= 70 ? "#10b981" : "#f59e0b",
                    }}>
                    {liveComm.overallScore}%
                  </span>
                </div>
                <div className="space-y-1">
                  {(["clarity", "confidence", "fluency", "conciseness"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] w-16 capitalize" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
                        {key}
                      </span>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                        <motion.div
                          className="h-full rounded-full bg-blue-500"
                          animate={{ width: `${liveComm[key]}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-[10px] font-bold w-6 text-right" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
                        {liveComm[key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Competency */}
            <div className="p-3 rounded-xl border"
              style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={10} className="text-purple-500" />
                <span className="text-[10px] font-bold">Evaluating</span>
              </div>
              <div className="text-xs font-bold capitalize" style={{ color: "#f59e0b" }}>
                {currentCompetency.replace(/_/g, " ")}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="p-3 rounded-xl border"
              style={{ background: isDark ? "rgba(245,158,11,0.03)" : "rgba(245,158,11,0.02)", borderColor: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Brain size={10} className="text-amber-500" />
                <span className="text-[10px] font-bold">HR Tip</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] leading-relaxed"
                  style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}
                >
                  {HR_TIPS[tipIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* End Confirm Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm p-6 rounded-2xl border space-y-4"
              style={{ background: isDark ? "#0f0e17" : "#ffffff", borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                  <PhoneOff size={20} className="text-red-500" />
                </div>
                <h3 className="text-sm font-bold">End Interview?</h3>
                <p className="text-[11px]" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}>
                  You have answered {questionNumber} questions. Your performance will be evaluated.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-bold"
                  style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}
                >
                  Continue
                </button>
                <button
                  onClick={handleEndInterview}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold"
                >
                  End Interview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HRInterviewActive;

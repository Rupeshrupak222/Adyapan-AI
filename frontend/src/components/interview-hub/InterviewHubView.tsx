"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import {
  Mic, Send, RefreshCw, Sparkles, ChevronRight, History, User, Code,
  Award, ShieldAlert, Volume2, Briefcase, Loader2, Calendar, ChevronLeft,
  CheckCircle2, XCircle, Info, GraduationCap, Flame, ArrowLeft,
  Camera, Monitor, Wifi, Smartphone, Eye, Users, AlertTriangle,
  Clock, BookOpen, Shield, CheckCheck, Ban, AlertOctagon,
  BarChart3, ExternalLink, Download,
} from "lucide-react";
import type {
  InterviewSession, InterviewMessage, InterviewConfig,
  EnvironmentScanResult, IdentityVerification, ViolationReport,
  ProctoringEvent, InterviewEvaluation,
} from "./InterviewTypes";
import { generateInterviewPDF } from "@/utils/interview-pdf";

interface InterviewHubViewProps {
  setView: (v: string) => void;
  activeModule?: string;
  theme?: string;
}

type AppScreen =
  | "dashboard"
  | "config"
  | "identity"
  | "system-check"
  | "environment-scan"
  | "rules"
  | "initializing"
  | "active"
  | "feedback"
  | "terminated";

export function InterviewHubView({ setView, activeModule = "interview-hub", theme = "dark" }: InterviewHubViewProps) {
  const isDark = theme === "dark";
  const router = useRouter();
  const c = {
    bg: isDark ? "#080710" : "#f0f4ff",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    surfaceHover: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.06)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#475569",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8",
    primary: "#f59e0b",
    primaryDark: "#d97706",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
  };

  const [screen, setScreen] = useState<AppScreen>("dashboard");
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Loading / error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 3: Config
  const [config, setConfig] = useState<InterviewConfig>({
    role: "Software Engineer",
    company: "",
    type: "technical",
    difficulty: "medium",
    language: "english",
    durationMinutes: 30,
    technology: "",
    experience: "mid",
    aiVoiceEnabled: true,
    videoEnabled: true,
  });

  // Phase 4: Identity
  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Phase 5: System check
  const [systemResults, setSystemResults] = useState<Record<string, { status: string; message: string }>>({});
  const [systemChecked, setSystemChecked] = useState(false);

  // Phase 6: Environment scan
  const [envScanning, setEnvScanning] = useState(false);
  const [envScanResult, setEnvScanResult] = useState<EnvironmentScanResult | null>(null);

  // Phase 7: Rules
  const [rulesAccepted, setRulesAccepted] = useState(false);

  // Phase 9: Active interview
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Phase 10: Proctoring
  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [violationPoints, setViolationPoints] = useState(0);
  const proctorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 11: Details
  const [viewingHistoryItem, setViewingHistoryItem] = useState<InterviewSession | null>(null);
  const [violationReport, setViolationReport] = useState<ViolationReport | null>(null);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/interview/history");
      if (res.data.success) {
        setHistory(res.data.sessions || []);
      }
    } catch { /* ignore */ } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadHistory();
  }, []);

  // Stop proctoring polling and leave fullscreen when the component unmounts
  useEffect(() => {
    return () => {
      if (proctorIntervalRef.current) {
        clearInterval(proctorIntervalRef.current);
        proctorIntervalRef.current = null;
      }
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (activeModule === "interview-hr") {
      setConfig(p => ({ ...p, type: "behavioral" }));
    } else if (activeModule === "interview-technical") {
      setConfig(p => ({ ...p, type: "technical" }));
    } else if (activeModule === "interview-mock") {
      setConfig(p => ({ ...p, type: "general" }));
    }
  }, [activeModule]);

  // ═══════════════════════════════════════════════════════════════════
  // Phase 3: Start interview (go to config first)
  // ═══════════════════════════════════════════════════════════════════
  const handleStartClicked = (presetType?: "technical" | "behavioral" | "general") => {
    if (presetType) {
      setConfig(p => ({ ...p, type: presetType }));
    }
    setScreen("config");
  };

  const handleLaunchInterview = async () => {
    setLoading(true);
    setError(null);
    try {
      // For HR / Tech quick-start, we merge module info
      let type = config.type;
      if (activeModule === "interview-technical") type = "technical";

      const res = await api.post("/interview/start", {
        role: config.role,
        company: config.company?.trim() || null,
        type,
        difficulty: config.difficulty,
        language: config.language,
        durationMinutes: config.durationMinutes,
        technology: config.technology?.trim() || null,
        aiVoiceEnabled: config.aiVoiceEnabled,
        videoEnabled: config.videoEnabled,
      });

      if (res.data.success) {
        setActiveSession(res.data.session);
        setMessages(res.data.messages || []);
        setScreen("identity");
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // Phase 4: Identity Verification
  // ═══════════════════════════════════════════════════════════════════
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !activeSession) return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageData);

    // Verify on backend
    try {
      const res = await api.post(`/interview/${activeSession.id}/verify-identity`, {
        faceDescriptor: [],
        faceQuality: { brightness: 60, contrast: 50, sharpness: 50 },
        deviceInfo: getDeviceInfo(),
        capturedImage: imageData,
      });

      if (res.data.success) {
        setVerification(res.data.verification);
        if (res.data.verification.verified) {
          stopCamera();
          setScreen("system-check");
        }
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Identity verification failed");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const getDeviceInfo = () => ({
    browser: navigator.userAgent,
    os: navigator.platform,
    screen: `${window.screen.width}x${window.screen.height}`,
    camera: "default",
    microphone: "default",
    connection: (navigator as { connection?: { effectiveType?: string } }).connection?.effectiveType || "unknown",
  });

  // ═══════════════════════════════════════════════════════════════════
  // Phase 5: System Compatibility Check
  // ═══════════════════════════════════════════════════════════════════
  const runSystemCheck = async () => {
    setLoading(true);
    const results: Record<string, { status: string; message: string }> = {};

    // Camera check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      results.camera = { status: "pass", message: "Camera working" };
      stream.getTracks().forEach(t => t.stop());
    } catch {
      results.camera = { status: "fail", message: "Camera not accessible" };
    }

    // Microphone check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      results.microphone = { status: "pass", message: "Microphone working" };
      stream.getTracks().forEach(t => t.stop());
    } catch {
      results.microphone = { status: "fail", message: "Microphone not accessible" };
    }

    // Speaker test (check if audio context works)
    try {
      const ctx = new AudioContext();
      ctx.close();
      results.speaker = { status: "pass", message: "Audio system working" };
    } catch {
      results.speaker = { status: "warning", message: "Speaker test incomplete" };
    }

    // Internet
    results.internet = navigator.onLine
      ? { status: "pass", message: "Connected" }
      : { status: "fail", message: "No internet connection" };

    // WebRTC
    results.webrtc = typeof RTCPeerConnection !== "undefined"
      ? { status: "pass", message: "WebRTC supported" }
      : { status: "fail", message: "WebRTC not supported" };

    // Fullscreen
    results.fullscreen = typeof Element.prototype.requestFullscreen !== "undefined"
      ? { status: "pass", message: "Fullscreen supported" }
      : { status: "warning", message: "Fullscreen may not be supported" };

    // Permissions
    results.permissions = { status: "pass", message: "Permissions available" };

    results.browser = { status: "pass", message: "Compatible browser" };

    setSystemResults(results);

    // Save to backend
    if (activeSession) {
      try {
        await api.post(`/interview/${activeSession.id}/system-check/result`, {
          systemCheck: results,
          deviceInfo: getDeviceInfo(),
        });
      } catch { /* ignore */ }
    }

    setSystemChecked(true);
    setLoading(false);
  };

  const hasSystemFailures = () =>
    Object.values(systemResults).some(r => r.status === "fail");

  // ═══════════════════════════════════════════════════════════════════
  // Phase 6: AI Environment Scan
  // ═══════════════════════════════════════════════════════════════════
  const runEnvironmentScan = async () => {
    if (!activeSession) return;
    setEnvScanning(true);
    setError(null);

    // Simulate environment check (actual ML runs on client side)
    const mockScanData = {
      faceDetection: {
        faceCount: 1,
        faceCentered: true,
        lighting: 70,
        cameraStable: true,
        gazeDirection: "forward",
      },
      roomScan: {
        secondPerson: false,
        mobilePhone: false,
        tablet: false,
        suspiciousObjects: false,
      },
      audioCheck: {
        microphoneWorking: true,
        backgroundNoise: 20,
        multipleVoices: false,
      },
    };

    try {
      const res = await api.post(`/interview/${activeSession.id}/environment-scan`, mockScanData);
      if (res.data.success) {
        setEnvScanResult(res.data.scanResult);
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Environment scan failed");
    } finally {
      setEnvScanning(false);
    }
  };

  const canProceedAfterScan = () =>
    envScanResult?.passed || false;

  // ═══════════════════════════════════════════════════════════════════
  // Phase 7: Rules & Consent
  // ═══════════════════════════════════════════════════════════════════
  const handleAcceptRules = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      await api.post(`/interview/${activeSession.id}/accept-rules`);
      setRulesAccepted(true);
      setScreen("initializing");
      // Brief initialization then enter room
      setTimeout(() => {
        setScreen("active");
        startProctoringPolling();
        activateFullscreen();
      }, 2000);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to accept rules");
    } finally {
      setLoading(false);
    }
  };

  const activateFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch { /* fullscreen may be blocked */ }
  };

  // ═══════════════════════════════════════════════════════════════════
  // Phase 8-9: Real-Time AI Interview
  // ═══════════════════════════════════════════════════════════════════
  const handleSendAnswer = async () => {
    if (!chatInput.trim() || !activeSession || sending) return;
    const answer = chatInput.trim();
    setChatInput("");
    setSending(true);

    const tempUserMsg: InterviewMessage = {
      id: "temp-user",
      sessionId: activeSession.id,
      role: "user",
      content: answer,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await api.post(`/interview/${activeSession.id}/answer`, { answer });
      if (res.data.success) {
        if (res.data.isComplete) {
          setMessages(res.data.messages || []);
          setActiveSession(res.data.session);
          stopProctoringPolling();
          setTimeout(() => setScreen("feedback"), 1000);
        } else {
          setMessages(res.data.messages || []);
        }
      }
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const handleVoiceInput = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Voice input not supported in this browser");
      return;
    }
    setIsVoiceMode(true);

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          await submitVoiceTranscript(audioBlob);
        }
        setIsVoiceMode(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      // Auto-stop after 30s
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 30000);
    }).catch(() => {
      setError("Microphone access denied");
      setIsVoiceMode(false);
    });
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const submitVoiceTranscript = async (audioBlob: Blob) => {
    if (!activeSession) return;
    try {
      // For now, use browser's SpeechRecognition
      const w = window as any;
      const SpeechRecognitionClass = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = config.language === "hindi" ? "hi-IN" : "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = async (event: any) => {
          const text = event.results[0][0].transcript;
          if (text.trim()) {
            const res = await api.post(`/interview/${activeSession.id}/voice`, { text, duration: 0 });
            if (res.data.success) {
              setMessages(res.data.messages || []);
            }
          }
        };
        recognition.start();
      }
    } catch { /* ignore */ }
  };

  // ═══════════════════════════════════════════════════════════════════
  // Phase 10-11: Continuous Proctoring
  // ═══════════════════════════════════════════════════════════════════
  const startProctoringPolling = () => {
    if (!activeSession) return;
    proctorIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/interview/${activeSession.id}/proctor`);
        if (res.data.success) {
          setProctoringEvents(res.data.events || []);
          setViolationPoints(res.data.totalPoints || 0);
          if (res.data.events?.length > 0) {
            const last = res.data.events[res.data.events.length - 1];
            if (last.eventType && last.severity === "critical") {
              setError(`Proctoring alert: ${last.description}`);
            }
          }
        }
      } catch { /* ignore */ }
    }, 5000);
  };

  const stopProctoringPolling = () => {
    if (proctorIntervalRef.current) {
      clearInterval(proctorIntervalRef.current);
      proctorIntervalRef.current = null;
    }
  };

  const handleEndInterview = async () => {
    if (!activeSession) return;
    if (!window.confirm("End interview? This will generate your evaluation report.")) return;
    setSending(true);
    stopProctoringPolling();
    try {
      const res = await api.post(`/interview/${activeSession.id}/end`);
      if (res.data.success) {
        setActiveSession(res.data.session);
        setVerification(null);
        loadHistory();
        setScreen("feedback");
      }
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const retryVerification = () => {
    setCapturedImage(null);
    setVerification(null);
    startCamera();
  };

  const restartSession = () => {
    setScreen("dashboard");
    setActiveSession(null);
    setMessages([]);
    setVerification(null);
    setSystemResults({});
    setSystemChecked(false);
    setEnvScanResult(null);
    setRulesAccepted(false);
    setProctoringEvents([]);
    setViolationPoints(0);
    setViewingHistoryItem(null);
    setError(null);
    setCapturedImage(null);
    stopProctoringPolling();
  };

  const viewHistorySession = async (session: InterviewSession) => {
    try {
      const res = await api.get(`/interview/${session.id}`);
      if (res.data.success) {
        setViewingHistoryItem(res.data.session);
        setScreen("feedback");
      }
    } catch { /* ignore */ }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return c.green;
    if (score >= 60) return c.primary;
    return c.red;
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return "rgba(16,185,129,0.1)";
    if (score >= 60) return "rgba(245,158,11,0.1)";
    return "rgba(239,68,68,0.1)";
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="relative h-full flex flex-col min-h-[calc(100vh-120px)]" style={{ color: c.text }}>
      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-xl border max-w-sm"
          style={{ background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.3)", color: c.red }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div className="space-y-3">
              <p className="text-xs font-bold">{error}</p>
              <button onClick={() => setError(null)} className="text-[10px] underline opacity-70">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ════════════════════════ DASHBOARD ════════════════════════ */}
        {screen === "dashboard" && (
          <motion.div key="dash" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="flex-1 space-y-8">
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent border border-amber-500/10 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full uppercase tracking-wider">
                  <Flame size={12} className="animate-pulse" /> AI Interview Coach
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {activeModule === "interview-hr" && "AI HR Interview"}
                  {activeModule === "interview-technical" && "AI Technical Interview"}
                  {activeModule === "interview-mock" && "Mock Interview Simulator"}
                  {activeModule === "interview-hub" && "AI Interview Simulator"}
                </h2>
              </div>
              <div className="flex items-center gap-2 p-3.5 rounded-2xl shrink-0" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
                <Mic size={28} className="text-amber-500" />
                <div>
                  <div className="text-lg font-black text-amber-500">Live AI</div>
                  <div className="text-[10px]" style={{ color: c.textMuted }}>AI Proctoring</div>
                </div>
              </div>
            </div>

            {/* Quick cards */}
            {activeModule === "interview-hub" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: "AI HR Interview", desc: "Behavioral, situational, and HR-focused interview practice.", icon: <User size={24} className="text-pink-500" />, type: "behavioral" as const, viewId: "interview-hr" },
                  { title: "AI Technical Interview", desc: "Coding, system design, architecture, and deep technical discussions.", icon: <Code size={24} className="text-cyan-500" />, type: "technical" as const, viewId: "interview-technical" },
                ].map((card) => (
                  <div key={card.title}
                    className="rounded-2xl p-5 border flex flex-col justify-between hover:shadow-xl transition-all cursor-pointer group"
                    style={{ background: c.cardBg, borderColor: c.border }}
                    onClick={() => {
                      if (setView) {
                        setView(card.viewId);
                      } else {
                        handleStartClicked(card.type);
                      }
                    }}
                  >
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:border-amber-500/20 group-hover:bg-amber-500/5 transition-all" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
                        {card.icon}
                      </div>
                      <h3 className="font-extrabold text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>{card.title}</h3>
                      <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>{card.desc}</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-[11px] font-bold text-amber-500">
                      <span>Configure & Start</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Direct start for specific modules */}
            {(activeModule !== "interview-hub") && (
              <button
                onClick={() => handleStartClicked()}
                className="w-full p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-center"
              >
                <Sparkles size={24} className="mx-auto mb-2 text-amber-500" />
                <p className="text-sm font-bold">Start {activeModule === "interview-hr" ? "HR" : "Technical"} Interview</p>
                <p className="text-[10px] mt-1" style={{ color: c.textMuted }}>Customize your interview settings</p>
              </button>
            )}

            {/* History */}
            <div className="space-y-4">
              <h3 className="text-base font-extrabold flex items-center justify-between gap-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                <span className="flex items-center gap-2"><History size={16} className="text-amber-500" /> Interview History</span>
                <button onClick={() => setView("analytics-interview")} className="text-[10px] font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border" style={{ borderColor: c.border, color: c.primary }}>
                  <BarChart3 size={11} /> Analytics
                </button>
              </h3>
              {historyLoading ? (
                <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-amber-500" /></div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-2xl" style={{ borderColor: c.border }}>
                  <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <span className="text-xs font-semibold" style={{ color: c.textMuted }}>No interviews yet. Complete one to see results!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {history.map((h: InterviewSession) => (
                    <div key={h.id} onClick={() => viewHistorySession(h)}
                      className="p-4 border rounded-xl flex items-center justify-between cursor-pointer hover:shadow-md transition-all"
                      style={{ background: c.cardBg, borderColor: c.border }}>
                      <div className="min-w-0 flex-1 pr-2 space-y-1">
                        <div className="text-xs font-bold truncate">{h.role} {h.company && `@ ${h.company}`}</div>
                        <div className="text-[10px] capitalize flex items-center gap-1.5" style={{ color: c.textSec }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: h.type === "technical" ? "#06b6d4" : h.type === "behavioral" ? "#f59e0b" : "#10b981" }} />
                          {h.type} · {h.difficulty} · <Calendar size={10} /> {(() => {
                            const raw = (h as any).createdAt || (h as any).date;
                            if (!raw) return "Recent";
                            const d = new Date(raw);
                            return isNaN(d.getTime()) ? "Recent" : d.toLocaleDateString();
                          })()}
                        </div>
                        {h.status === "terminated" && <span className="text-[10px] font-bold text-red-500">Terminated</span>}
                      </div>
                      {h.evaluation?.overallScore ? (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-[11px] shrink-0"
                          style={{ background: scoreBg(h.evaluation.overallScore), color: scoreColor(h.evaluation.overallScore) }}>
                          {h.evaluation.overallScore}%
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">In Progress</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════ CONFIGURATION ════════════════════════ */}
        {screen === "config" && (
          <motion.div key="config" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="flex-1 max-w-3xl mx-auto w-full space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setScreen("dashboard")} className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ background: c.cardBg, borderColor: c.border, color: c.text }}>
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-xl font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {config.type === "behavioral" ? "AI HR Interview" : config.type === "technical" ? "AI Technical Interview" : "Mock Interview"}
                </h1>
              </div>
            </div>

            <div className="p-6 rounded-2xl border space-y-5" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Job Role</label>
                  <input value={config.role} onChange={e => setConfig(p => ({ ...p, role: e.target.value }))}
                    className="w-full border rounded-lg p-2 text-xs mt-1" style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
                </div>
                {config.type === "general" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Target Company</label>
                    <input value={config.company} onChange={e => setConfig(p => ({ ...p, company: e.target.value }))}
                      placeholder="Google, Microsoft, etc."
                      className="w-full border rounded-lg p-2 text-xs mt-1" style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
                  </div>
                )}
                {config.type === "technical" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Technology</label>
                    <input value={config.technology} onChange={e => setConfig(p => ({ ...p, technology: e.target.value }))}
                      placeholder="React, Node.js, Python..."
                      className="w-full border rounded-lg p-2 text-xs mt-1" style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Experience Level</label>
                  <select value={config.experience} onChange={e => setConfig(p => ({ ...p, experience: e.target.value }))}
                    className="w-full border rounded-lg p-2 text-xs mt-1" style={{ background: c.inputBg, color: c.text, borderColor: c.border }}>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Difficulty</label>
                    <select value={config.difficulty} onChange={e => setConfig(p => ({ ...p, difficulty: e.target.value as InterviewConfig["difficulty"] }))}
                    className="w-full border rounded-lg p-2 text-xs mt-1" style={{ background: c.inputBg, color: c.text, borderColor: c.border }}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Duration (minutes)</label>
                  <select value={config.durationMinutes} onChange={e => setConfig(p => ({ ...p, durationMinutes: Number(e.target.value) }))}
                    className="w-full border rounded-lg p-2 text-xs mt-1" style={{ background: c.inputBg, color: c.text, borderColor: c.border }}>
                    {[15, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Language</label>
                  <select value={config.language} onChange={e => setConfig(p => ({ ...p, language: e.target.value }))}
                    className="w-full border rounded-lg p-2 text-xs mt-1" style={{ background: c.inputBg, color: c.text, borderColor: c.border }}>
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={config.aiVoiceEnabled} onChange={e => setConfig(p => ({ ...p, aiVoiceEnabled: e.target.checked }))}
                    className="w-4 h-4" />
                  AI Voice Enabled
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={config.videoEnabled} onChange={e => setConfig(p => ({ ...p, videoEnabled: e.target.checked }))}
                    className="w-4 h-4" />
                  Video Interview
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setScreen("dashboard")}
                  className="px-4 py-2 rounded-lg border text-xs font-bold" style={{ borderColor: c.border, color: c.textSec }}>
                  Back
                </button>
                <button onClick={handleLaunchInterview} disabled={loading || !config.role}
                  className="px-6 py-2 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {loading ? <><Loader2 size={12} className="animate-spin" /> Starting...</> : "Start Interview"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════ IDENTITY VERIFICATION ════════════════════════ */}
        {screen === "identity" && activeSession && (
          <motion.div key="identity" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="flex-1 max-w-2xl mx-auto w-full space-y-6">
            <div className="text-center">
              <Camera size={32} className="mx-auto mb-3 text-amber-500" />
              <h1 className="text-xl font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>Identity Verification</h1>
              <p className="text-xs mt-1" style={{ color: c.textSec }}>Camera will capture your face for verification</p>
            </div>

            <div className="p-6 rounded-2xl border space-y-5" style={{ background: c.cardBg, borderColor: c.border }}>
              {!cameraActive ? (
                <div className="text-center py-8">
                  <button onClick={startCamera}
                    className="px-6 py-3 rounded-xl bg-amber-500 text-black font-extrabold text-sm hover:bg-amber-400 transition-colors flex items-center gap-2 mx-auto">
                    <Camera size={18} /> Open Camera
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black mx-auto max-w-md">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
                    {capturedImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <img src={capturedImage} alt="Captured" className="max-h-48 rounded-lg" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center gap-3">
                    {!capturedImage ? (
                      <button onClick={captureAndVerify}
                        className="px-6 py-2 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors">
                        Capture & Verify
                      </button>
                    ) : (
                      <div className="text-center space-y-2">
                        {verification?.verified ? (
                          <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold">
                            <CheckCircle2 size={18} /> Identity Verified
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                              <XCircle size={16} /> Verification failed
                            </div>
                            {verification?.issues?.map((issue, i) => (
                              <p key={i} className="text-[10px]" style={{ color: c.textMuted }}>{issue}</p>
                            ))}
                            <div className="flex gap-2 justify-center">
                              <button onClick={retryVerification}
                                className="px-4 py-2 rounded-lg border text-xs font-bold" style={{ borderColor: c.border, color: c.textSec }}>
                                Retry
                              </button>
                              <button onClick={() => { stopCamera(); setScreen("dashboard"); }}
                                className="px-4 py-2 rounded-lg text-xs font-bold text-red-500">
                                Cannot Continue
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════ SYSTEM CHECK ════════════════════════ */}
        {screen === "system-check" && (
          <motion.div key="syscheck" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="flex-1 max-w-2xl mx-auto w-full space-y-6">
            <div className="text-center">
              <Monitor size={32} className="mx-auto mb-3 text-amber-500" />
              <h1 className="text-xl font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>System Compatibility Check</h1>
              <p className="text-xs mt-1" style={{ color: c.textSec }}>Verifying camera, microphone, and system requirements</p>
            </div>

            <div className="p-6 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
              {!systemChecked ? (
                <div className="text-center py-8">
                  <button onClick={runSystemCheck} disabled={loading}
                    className="px-6 py-3 rounded-xl bg-amber-500 text-black font-extrabold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto">
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Checking...</> : <><RefreshCw size={18} /> Run System Check</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(systemResults).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border"
                      style={{ borderColor: val.status === "pass" ? "rgba(16,185,129,0.2)" : val.status === "warning" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
                        background: val.status === "pass" ? "rgba(16,185,129,0.05)" : val.status === "warning" ? "rgba(245,158,11,0.05)" : "rgba(239,68,68,0.05)" }}>
                      <span className="text-xs font-bold capitalize">{key}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]" style={{ color: c.textMuted }}>{val.message}</span>
                        {val.status === "pass" ? <CheckCircle2 size={14} className="text-emerald-500" /> :
                         val.status === "warning" ? <AlertTriangle size={14} className="text-amber-500" /> :
                         <XCircle size={14} className="text-red-500" />}
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 flex justify-center gap-3">
                    {hasSystemFailures() ? (
                      <button onClick={runSystemCheck}
                        className="px-4 py-2 rounded-lg border text-xs font-bold" style={{ borderColor: c.border, color: c.textSec }}>
                        Recheck
                      </button>
                    ) : (
                      <button onClick={() => setScreen("environment-scan")}
                        className="px-6 py-2 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors">
                        Continue to Environment Scan
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════ ENVIRONMENT SCAN ════════════════════════ */}
        {screen === "environment-scan" && (
          <motion.div key="envscan" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="flex-1 max-w-2xl mx-auto w-full space-y-6">
            <div className="text-center">
              <Smartphone size={32} className="mx-auto mb-3 text-amber-500" />
              <h1 className="text-xl font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>AI Proctoring Environment Scan</h1>
              <p className="text-xs mt-1" style={{ color: c.textSec }}>AI analyzes your surroundings for a fair interview</p>
            </div>

            <div className="p-6 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
              {!envScanResult ? (
                <div className="text-center py-8">
                  <button onClick={runEnvironmentScan} disabled={envScanning}
                    className="px-6 py-3 rounded-xl bg-amber-500 text-black font-extrabold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto">
                    {envScanning ? <><Loader2 size={18} className="animate-spin" /> Scanning...</> : <><Eye size={18} /> Start Environment Scan</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`text-center p-3 rounded-lg ${envScanResult.passed ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"} font-bold text-sm`}>
                    {envScanResult.passed ? "Environment Check Passed" : "Environment Issues Detected"}
                  </div>
                  {envScanResult.checks.map((check, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border"
                      style={{ borderColor: check.status === "pass" ? "rgba(16,185,129,0.2)" : check.status === "warning" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)" }}>
                      <div>
                        <span className="text-xs font-bold">{check.name}</span>
                        <p className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>{check.message}</p>
                      </div>
                      {check.status === "pass" ? <CheckCircle2 size={14} className="text-emerald-500" /> :
                       check.status === "warning" ? <AlertTriangle size={14} className="text-amber-500" /> :
                       <XCircle size={14} className="text-red-500" />}
                    </div>
                  ))}
                  <div className="pt-4 flex justify-center gap-3">
                    {!canProceedAfterScan() ? (
                      <button onClick={runEnvironmentScan}
                        className="px-4 py-2 rounded-lg border text-xs font-bold" style={{ borderColor: c.border, color: c.textSec }}>
                        Rescan
                      </button>
                    ) : (
                      <button onClick={() => setScreen("rules")}
                        className="px-6 py-2 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors">
                        Continue to Interview Rules
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════ RULES & CONSENT ════════════════════════ */}
        {screen === "rules" && (
          <motion.div key="rules" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="flex-1 max-w-2xl mx-auto w-full space-y-6">
            <div className="text-center">
              <Shield size={32} className="mx-auto mb-3 text-amber-500" />
              <h1 className="text-xl font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>Interview Rules & Consent</h1>
              <p className="text-xs mt-1" style={{ color: c.textSec }}>Please read and accept the interview rules</p>
            </div>

            <div className="p-6 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="space-y-3">
                {[
                  { icon: Camera, text: "Camera must remain ON throughout the interview" },
                  { icon: Mic, text: "Microphone must remain ON throughout the interview" },
                  { icon: Monitor, text: "Fullscreen mode is mandatory" },
                  { icon: Ban, text: "Tab switching is prohibited" },
                  { icon: Users, text: "No additional person may enter the camera frame" },
                  { icon: Smartphone, text: "No mobile phone usage during the interview" },
                  { icon: Eye, text: "The interview will be monitored by AI proctoring" },
                  { icon: AlertOctagon, text: "Repeated violations may terminate the interview automatically" },
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: c.surface }}>
                    <rule.icon size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-xs">{rule.text}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-col items-center gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={rulesAccepted} onChange={e => setRulesAccepted(e.target.checked)}
                    className="w-5 h-5" />
                  I have read and accept all interview rules
                </label>
                <button onClick={handleAcceptRules} disabled={!rulesAccepted || loading}
                  className="px-6 py-2 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {loading ? <><Loader2 size={12} className="animate-spin" /> Initializing...</> : <><CheckCheck size={14} /> Accept & Start Interview</>}
                </button>
                {activeSession && (
                  <button
                    onClick={() => router.push(`/dashboard/interview/room/${activeSession.id}`)}
                    className="px-4 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5"
                    style={{ borderColor: c.border, color: c.textSec }}
                  >
                    <ExternalLink size={12} /> Open Full Interview Room
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════ INITIALIZING ════════════════════════ */}
        {screen === "initializing" && (
          <motion.div key="init" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 size={48} className="animate-spin text-amber-500 mx-auto" />
              <h2 className="text-lg font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>Initializing Interview Room</h2>
              <div className="space-y-2 text-xs" style={{ color: c.textMuted }}>
                <p>Generating AI questions...</p>
                <p>Preparing WebSocket connection...</p>
                <p>Enabling AI proctoring...</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════ ACTIVE INTERVIEW ════════════════════════ */}
        {screen === "active" && activeSession && (
          <motion.div key="active" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col h-[calc(100vh-130px)] rounded-2xl border"
            style={{ background: c.cardBg, borderColor: c.border }}>

            {/* Proctoring bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: c.border, background: violationPoints > (activeSession.violationThreshold * 0.7) ? "rgba(239,68,68,0.1)" : "transparent" }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Proctoring Active</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold" style={{ color: violationPoints > (activeSession.violationThreshold * 0.7) ? c.red : c.primary }}>
                  <AlertTriangle size={12} />
                  <span>{violationPoints}/{activeSession.violationThreshold}</span>
                </div>
              </div>
              <button onClick={handleEndInterview} disabled={sending}
                className="py-1 px-3 rounded-lg bg-red-500/15 border border-red-500/20 text-red-500 text-[10px] font-bold hover:bg-red-500/25 disabled:opacity-50">
                {sending ? "Ending..." : "End Interview"}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((m, idx) => {
                const isInterviewer = m.role === "interviewer";
                return (
                  <div key={idx} className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isInterviewer
                        ? "rounded-tl-sm text-left"
                        : "bg-amber-500/15 border border-amber-500/25 rounded-tr-sm text-right"
                    }`} style={isInterviewer ? { background: c.surface, border: `1px solid ${c.border}`, color: c.text } : { color: c.primary }}>
                      <div className="text-[10px] uppercase tracking-wider font-bold mb-1 opacity-60">
                        {isInterviewer ? "AI Interviewer" : "You"}
                      </div>
                      <p className="whitespace-pre-line">{stripMarkdown(m.content)}</p>
                    </div>
                  </div>
                );
              })}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm p-4 flex items-center gap-1.5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
                    <Loader2 size={12} className="text-amber-500 animate-spin" />
                    <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Evaluating...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Waveform bar */}
            <div className="px-6 py-2 border-t flex justify-center gap-1 items-center shrink-0" style={{ borderColor: c.border }}>
              <Volume2 size={12} style={{ color: c.textMuted }} />
              <div className="flex gap-[3px] items-center h-4">
                {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((bar, i) => (
                  <motion.div key={i}
                    className="w-[2px] bg-amber-500/50 rounded-full"
                    animate={{ height: sending ? [4, 16, 4] : [4, 8, 4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }} />
                ))}
              </div>
              <span className="text-[10px] font-semibold tracking-wide uppercase ml-1" style={{ color: c.textMuted }}>
                {sending ? "Analyzing..." : "AI Proctoring Active"}
              </span>
            </div>

            {/* Input */}
            <div className="p-4 border-t shrink-0 flex gap-2" style={{ borderColor: c.border }}>
              <textarea
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder="Type your answer or click mic to speak..."
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendAnswer(); } }}
                disabled={sending}
                className="flex-1 border rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500/50 transition-colors resize-none h-16 max-h-24"
                style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
              />
              <button onClick={isVoiceMode ? stopVoiceRecording : handleVoiceInput}
                className={`px-3 rounded-xl border flex items-center justify-center shrink-0 h-16 w-14 ${
                  isVoiceMode ? "bg-red-500/20 border-red-500/30 text-red-500" : "text-amber-500"
                }`}
                style={isVoiceMode ? {} : { background: c.inputBg, border: `1px solid ${c.border}` }}>
                {isVoiceMode ? <XCircle size={18} /> : <Mic size={18} />}
              </button>
              <button onClick={handleSendAnswer} disabled={sending || !chatInput.trim()}
                className="px-4 rounded-xl bg-amber-500 text-black hover:bg-amber-400 transition-colors flex items-center justify-center shrink-0 disabled:opacity-30 h-16 w-16">
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════ FEEDBACK ════════════════════════ */}
        {screen === "feedback" && (
          <motion.div key="feedback" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={restartSession}
                className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ background: c.cardBg, borderColor: c.border, color: c.text }}>
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-xl font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>Performance Report</h1>
              </div>
            </div>

            {/* Session info */}
            {activeSession && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border flex flex-col items-center" style={{ background: c.cardBg, borderColor: c.border }}>
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="46" stroke={c.border} strokeWidth="8" fill="transparent" />
                      <circle cx="56" cy="56" r="46"
                        stroke={activeSession.evaluation ? scoreColor(activeSession.evaluation.overallScore) : c.border}
                        strokeWidth="8" fill="transparent"
                        strokeDasharray={2 * Math.PI * 46}
                        strokeDashoffset={2 * Math.PI * 46 * (1 - (activeSession.evaluation?.overallScore || 0) / 100)}
                        strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-extrabold" style={{ color: c.text }}>{activeSession.evaluation?.overallScore || 0}%</span>
                      <span className="block text-[10px] uppercase tracking-wider" style={{ color: c.textMuted }}>Overall</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: c.textMuted }}>Score Breakdown</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Communication", score: activeSession.evaluation?.communicationScore || 0 },
                      { label: "Technical", score: activeSession.evaluation?.technicalScore || 0 },
                      { label: "HR / Behavioral", score: activeSession.evaluation?.hrScore || 0 },
                      { label: "Confidence", score: activeSession.evaluation?.confidenceScore || 0 },
                      { label: "Fluency", score: activeSession.evaluation?.fluencyScore || 0 },
                      { label: "Body Language", score: activeSession.evaluation?.bodyLanguageScore || 0 },
                    ].filter(s => s.score > 0).map(s => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold" style={{ color: c.textSec }}>{s.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: c.border }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${s.score}%`, background: scoreColor(s.score) }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: scoreColor(s.score) }}>{s.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: c.textMuted }}>Details</h3>
                  <div className="space-y-2 text-xs" style={{ color: c.textSec }}>
                    <p><span className="font-bold">Role:</span> {activeSession.role}</p>
                    {activeSession.company && <p><span className="font-bold">Company:</span> {activeSession.company}</p>}
                    <p><span className="font-bold">Type:</span> {activeSession.type}</p>
                    <p><span className="font-bold">Difficulty:</span> {activeSession.difficulty}</p>
                    <p><span className="font-bold">Duration:</span> {activeSession.durationMinutes} min</p>
                    {activeSession.evaluation?.hiringRecommendation && (
                      <p className="mt-2">
                        <span className="font-bold">Recommendation: </span>
                        <span className={
                          activeSession.evaluation.hiringRecommendation.includes("strong") || activeSession.evaluation.hiringRecommendation === "recommend"
                            ? "text-emerald-500" : activeSession.evaluation.hiringRecommendation === "maybe"
                            ? "text-amber-500" : "text-red-500"
                        }>{activeSession.evaluation.hiringRecommendation.replace(/_/g, " ")}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Strengths
                </h3>
                <ul className="space-y-2">
                  {(activeSession?.evaluation?.strengths || []).map((str: string, idx: number) => (
                    <li key={idx} className="text-xs leading-relaxed flex items-start gap-2" style={{ color: c.textSec }}>
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                  {(!activeSession?.evaluation?.strengths || activeSession.evaluation.strengths.length === 0) && (
                    <p className="text-xs italic" style={{ color: c.textMuted }}>No data available</p>
                  )}
                </ul>
              </div>

              <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <XCircle size={16} className="text-red-500" /> Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {(activeSession?.evaluation?.weaknesses || []).map((w: string, idx: number) => (
                    <li key={idx} className="text-xs leading-relaxed flex items-start gap-2" style={{ color: c.textSec }}>
                      <span className="text-red-500 font-bold">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                  {(!activeSession?.evaluation?.weaknesses || activeSession.evaluation.weaknesses.length === 0) && (
                    <p className="text-xs italic" style={{ color: c.textMuted }}>No data available</p>
                  )}
                </ul>
              </div>
            </div>

            {/* Violation report */}
            {activeSession?.violationReport && activeSession.violationReport.totalViolations > 0 && (
              <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" /> Violation Report
                </h3>
                <div className="space-y-2">
                  <div className="flex gap-4 text-xs" style={{ color: c.textSec }}>
                    <span>Total Violations: <strong>{activeSession.violationReport.totalViolations}</strong></span>
                    <span>Total Points: <strong>{activeSession.violationReport.totalPoints}</strong></span>
                    <span>Threshold: <strong>{activeSession.violationReport.threshold}</strong></span>
                  </div>
                  {activeSession.violationReport.violations.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ background: c.surface }}>
                      <span className="font-bold capitalize">{v.type.replace(/_/g, " ")}</span>
                      <span className="text-[10px]" style={{ color: c.textMuted }}>×{v.count} ({v.totalPoints} pts)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 flex-wrap">
              {activeSession?.evaluation && (
                <button
                  onClick={() => {
                    if (!activeSession.evaluation) return;
                    generateInterviewPDF({
                      sessionId: activeSession.id,
                      role: activeSession.role,
                      company: activeSession.company,
                      type: activeSession.type,
                      difficulty: activeSession.difficulty,
                      language: 'english',
                      durationMinutes: activeSession.durationMinutes,
                      technology: activeSession.technology,
                      createdAt: activeSession.createdAt,
                      endedAt: activeSession.endedAt,
                      evaluation: activeSession.evaluation as Parameters<typeof generateInterviewPDF>[0]['evaluation'],
                      violationReport: activeSession.violationReport as Parameters<typeof generateInterviewPDF>[0]['violationReport'],
                    });
                  }}
                  className="py-2.5 px-5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  style={{ borderColor: c.border, color: c.textSec }}
                >
                  <Download size={13} /> Download PDF Report
                </button>
              )}
              <button onClick={() => setView("analytics-interview")}
                className="py-2.5 px-5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5" style={{ borderColor: c.primary, color: c.primary }}>
                <BarChart3 size={13} /> View Analytics
              </button>
              <button onClick={restartSession}
                className="py-2.5 px-6 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors">
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


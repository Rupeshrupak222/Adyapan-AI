"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import dynamic from "next/dynamic";
import {
  Mic, MicOff, Video, VideoOff, Send, AlertTriangle, Clock,
  Loader2, ChevronRight, X, Code, MessageSquare, BarChart3,
  CheckCircle2, XCircle, Shield, PhoneOff, Volume2, Maximize2, Minimize2
} from "lucide-react";
import { toast } from "sonner";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Message {
  id?: string;
  role: "interviewer" | "user" | "candidate";
  content: string;
  createdAt?: string;
}

interface SessionData {
  id: string;
  role: string;
  company?: string;
  type: string;
  difficulty: string;
  durationMinutes: number;
  technology?: string;
  language: string;
  aiVoiceEnabled: boolean;
  videoEnabled: boolean;
  violationPoints: number;
  violationThreshold: number;
  status: string;
}

export default function InterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Camera & Mic
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  // Voice recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any | null>(null);

  // Proctoring
  const [violationPoints, setViolationPoints] = useState(0);
  const [violations, setViolations] = useState(0);
  const proctorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [tabSwitched, setTabSwitched] = useState(false);

  // Code editor
  const [showEditor, setShowEditor] = useState(false);
  const [code, setCode] = useState("// Write your solution here\n\n");
  const [editorLang, setEditorLang] = useState("javascript");

  // Panel & Mobile Tab
  const [activePanel, setActivePanel] = useState<"chat" | "code">("chat");
  const [mobileTab, setMobileTab] = useState<"interview" | "video">("interview");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  // Waveform animation
  const [waveHeights, setWaveHeights] = useState([4, 6, 8, 12, 8, 6, 4]);
  const lastSpokenTextRef = useRef<string>("");

  // Text-to-Speech
  const speak = useCallback((text: string) => {
    if (!session?.aiVoiceEnabled || !text) return;
    if (lastSpokenTextRef.current === text) return; // Prevent double speak of exact same message
    lastSpokenTextRef.current = text;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ""));
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = "en-US";
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang === "en-US" && v.name.includes("Google"));
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    }
  }, [session?.aiVoiceEnabled]);

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    const fetchSession = async () => {
      try {
        const res = await api.get(`/interview/${sessionId}`);
        if (res.data.success) {
          const s = res.data.session;
          setSession(s);
          setMessages(s.messages || []);
          setViolationPoints(s.violationPoints || 0);
          setViolations(s.violations?.length || 0);
          setTimeLeft((s.durationMinutes || 30) * 60);
          if (s.type === "technical") {
            setShowEditor(true);
            setActivePanel("code");
            if (s.technology) {
              const langMap: Record<string, string> = {
                python: "python", java: "java", "c++": "cpp", cpp: "cpp",
                javascript: "javascript", typescript: "typescript",
                go: "go", rust: "rust",
              };
              setEditorLang(langMap[s.technology.toLowerCase()] || "javascript");
            }
          }
        }
      } catch {
        toast.error("Failed to load interview session");
        router.push("/dashboard/user");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId, router]);

  // Speak last interviewer message when messages first load
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "interviewer") {
        speak(lastMsg.content);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch {
        // Fallback to video only or audio only
        try {
          const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = videoOnly;
          if (videoRef.current) {
            videoRef.current.srcObject = videoOnly;
            videoRef.current.play().catch(() => {});
          }
        } catch {
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = audioOnly;
          } catch {
            toast.error("Camera/Mic access denied — proctoring may flag this.");
          }
        }
      }
    };
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleEndInterview = async () => {
    if (!confirm("Are you sure you want to end the interview? Your evaluation will be generated.")) return;
    clearInterval(timerRef.current!);
    clearInterval(proctorIntervalRef.current!);
    try {
      await api.post(`/interview/${sessionId}/end`);
      toast.success("Interview ended. Generating your report...");
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      router.push(`/dashboard/interview?completed=${sessionId}`);
    } catch {
      toast.error("Failed to end interview. Please try again.");
    }
  };

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || !session) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleEndInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Tab switch detection proctoring
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && sessionId) {
        setTabSwitched(true);
        try {
          await api.post(`/interview/${sessionId}/proctor`, {
            eventType: "tab_switch",
            category: "focus",
            description: "Candidate switched browser tab or minimized window",
            confidence: 0.95,
            severity: "warning",
            pointsDeducted: 1,
          });
          setViolationPoints(p => p + 1);
          setViolations(v => v + 1);
          toast.warning("⚠ Tab switching detected and logged!");
        } catch { /* ignore */ }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [sessionId]);

  // Fullscreen proctoring (safeguarded for iOS / mobile touch devices)
  useEffect(() => {
    const isMobileDevice =
      typeof window !== "undefined" &&
      (window.innerWidth < 1024 || "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0);

    if (!isMobileDevice && typeof document.documentElement?.requestFullscreen === "function") {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    const onFsChange = async () => {
      if (
        !isMobileDevice &&
        typeof document.documentElement?.requestFullscreen === "function" &&
        !document.fullscreenElement &&
        sessionId
      ) {
        try {
          await api.post(`/interview/${sessionId}/proctor`, {
            eventType: "fullscreen_exit",
            category: "focus",
            description: "Candidate exited fullscreen mode",
            confidence: 0.9,
            severity: "warning",
            pointsDeducted: 1,
          });
          setViolationPoints(p => p + 1);
          setViolations(v => v + 1);
          toast.warning("⚠ Fullscreen exit detected — please re-enter fullscreen.");
        } catch { /* ignore */ }
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [sessionId]);

  // Periodic proctoring poll
  useEffect(() => {
    if (!sessionId) return;
    proctorIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/interview/${sessionId}/proctor`);
        if (res.data.success) {
          setViolationPoints(res.data.totalPoints || 0);
        }
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(proctorIntervalRef.current!);
  }, [sessionId]);

  // Waveform animation
  useEffect(() => {
    const waveInterval = setInterval(() => {
      setWaveHeights([
        Math.random() * 12 + 4,
        Math.random() * 16 + 4,
        Math.random() * 20 + 4,
        Math.random() * 24 + 4,
        Math.random() * 20 + 4,
        Math.random() * 16 + 4,
        Math.random() * 12 + 4,
      ]);
    }, 200);
    return () => clearInterval(waveInterval);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setCameraOn(prev => !prev);
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setMicOn(prev => !prev);
    }
  };

  const startVoiceRecording = async () => {
    if (isRecordingRef.current) return;
    setIsRecording(true);
    isRecordingRef.current = true;
    setLiveTranscript("");
    audioChunksRef.current = [];

    // Ensure active audio stream
    let activeStream = streamRef.current;
    if (!activeStream || activeStream.getAudioTracks().length === 0 || !activeStream.getAudioTracks()[0].enabled) {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = activeStream;
      } catch {
        toast.error("Microphone access denied.");
        setIsRecording(false);
        isRecordingRef.current = false;
        return;
      }
    }

    // 1. Setup MediaRecorder with cross-browser audio stream support
    try {
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
        "audio/ogg",
        "audio/wav",
      ];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }
      const recorder = selectedMime
        ? new MediaRecorder(activeStream, { mimeType: selectedMime })
        : new MediaRecorder(activeStream);

      const effectiveMime = (recorder.mimeType || selectedMime || "audio/webm").split(";")[0].trim() || "audio/webm";

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        isRecordingRef.current = false;
        if (audioChunksRef.current.length > 0) {
          try {
            const cleanMime = effectiveMime;
            const audioBlob = new Blob(audioChunksRef.current, { type: cleanMime });
            audioChunksRef.current = [];
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Data = reader.result as string;
              if (!base64Data || base64Data.length < 50) return;
              try {
                const res = await api.post("/interview/transcribe", {
                  audioBase64: base64Data,
                  mimeType: cleanMime,
                  language: session?.language || "english",
                });
                if (res.data?.success && res.data.text) {
                  const transcribed = res.data.text.trim();
                  setInput((prev) => {
                    if (!prev) return transcribed;
                    if (!prev.toLowerCase().includes(transcribed.toLowerCase())) {
                      return `${prev} ${transcribed}`;
                    }
                    return prev;
                  });
                  setLiveTranscript(transcribed);
                  toast.success("Voice response captured!");
                }
              } catch {}
            };
            reader.readAsDataURL(audioBlob);
          } catch {}
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (recErr) {
      console.warn("MediaRecorder start notice:", recErr);
    }

    // 2. Use SpeechRecognition API for instant live transcription where available (Chrome/Edge)
    const w = window as any;
    const SpeechRecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const setupRecognition = () => {
        if (!isRecordingRef.current) return;
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = session?.language === "hindi" ? "hi-IN" : "en-US";

          recognition.onresult = (event: any) => {
            let currentTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              currentTranscript += (event.results[i][0]?.transcript || "") + " ";
            }
            const trimmed = currentTranscript.trim();
            if (trimmed) {
              setLiveTranscript(trimmed);
              setInput(trimmed);
            }
          };

          recognition.onerror = (event: any) => {
            const err = event.error;
            if (err === "no-speech" || err === "aborted") return;
          };

          recognition.onend = () => {
            if (isRecordingRef.current) {
              setTimeout(() => {
                if (isRecordingRef.current) {
                  setupRecognition();
                }
              }, 200);
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (e) {
          console.warn("SpeechRecognition init notice:", e);
        }
      };
      setupRecognition();
    }
  };

  const stopVoiceRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch {}
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch {}
  };

  const handleSend = async () => {
    const answer = input.trim();
    if (!answer || sending || !sessionId) return;
    setInput("");
    setLiveTranscript("");
    setSending(true);

    const tempMsg: Message = { role: "user", content: answer, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await api.post(`/interview/${sessionId}/answer`, { answer });
      if (res.data.success) {
        if (res.data.isComplete) {
          toast.success("Interview completed! Generating your report...");
          clearInterval(timerRef.current!);
          clearInterval(proctorIntervalRef.current!);
          setTimeout(() => {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
            router.push(`/dashboard/interview?completed=${sessionId}`);
          }, 2000);
        } else {
          const updatedMessages: Message[] = res.data.messages || [];
          setMessages(updatedMessages);
          const last = updatedMessages[updatedMessages.length - 1];
          if (last?.role === "interviewer") speak(last.content);
        }
      }
    } catch {
      toast.error("Failed to submit answer. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const urgency = session ? violationPoints / session.violationThreshold : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060611] flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20"
          >
            <Shield size={32} className="text-black" />
          </motion.div>
          <h2 className="text-white text-xl font-bold">Loading Interview Room...</h2>
          <p className="text-white/40 text-sm">Preparing your proctored interview environment</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isTimeCritical = timeLeft < 300;

  return (
    <div className="fixed inset-0 z-50 h-screen h-[100dvh] w-screen bg-[#060611] text-white flex flex-col overflow-hidden select-none" style={{ fontFamily: "var(--font-sans)" }}>
      {/* ── TOP BAR ─────────────────────────── */}
      <div className={`flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/8 ${urgency > 0.7 ? "bg-red-950/30" : "bg-[#0a0a1a]"} shrink-0 gap-2`}>
        {/* Session info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Live</span>
          </div>
          <div className="hidden sm:block truncate">
            <span className="text-xs font-bold">{session.role}</span>
            {session.company && <span className="text-xs text-white/40"> @ {session.company}</span>}
            <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-white/5 capitalize text-white/50">{session.type}</span>
          </div>
        </div>

        {/* Center: Timer & Mobile Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden items-center p-0.5 rounded-xl border border-white/10 bg-white/5">
            <button
              onClick={() => setMobileTab("interview")}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                mobileTab === "interview"
                  ? "bg-amber-500 text-black shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {session.type === "technical" ? "Code/Chat" : "Chat"}
            </button>
            <button
              onClick={() => setMobileTab("video")}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                mobileTab === "video"
                  ? "bg-amber-500 text-black shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Video size={10} />
              Camera
            </button>
          </div>

          <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl ${isTimeCritical ? "bg-red-500/15 border border-red-500/30" : "bg-white/5 border border-white/10"}`}>
            <Clock size={13} className={isTimeCritical ? "text-red-400" : "text-amber-400"} />
            <span className={`text-xs sm:text-sm font-black tabular-nums ${isTimeCritical ? "text-red-400" : "text-white"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Proctoring + Fullscreen + end */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${urgency > 0.5 ? "bg-red-500/10 border border-red-500/20" : "bg-white/5 border border-white/10"}`}>
            <AlertTriangle size={11} className={urgency > 0.5 ? "text-red-400" : "text-white/40"} />
            <span className={`text-[10px] font-bold ${urgency > 0.5 ? "text-red-400" : "text-white/40"}`}>
              {violationPoints}/{session.violationThreshold}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            type="button"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 text-[11px] font-bold transition-all cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 size={12} className="text-amber-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 size={12} className="text-amber-400" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>

          <button
            onClick={handleEndInterview}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold hover:bg-red-500/25 transition-colors cursor-pointer"
          >
            <PhoneOff size={12} />
            <span className="hidden sm:inline">End Interview</span>
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ───────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left: Chat / Code panel */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileTab === "interview" ? "flex" : "hidden lg:flex"}`}>
          {/* Panel switcher (technical only) */}
          {session.type === "technical" && (
            <div className="flex border-b border-white/8 bg-[#0a0a1a] shrink-0">
              <button
                onClick={() => setActivePanel("chat")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activePanel === "chat" ? "border-amber-500 text-amber-500" : "border-transparent text-white/40 hover:text-white/70"}`}
              >
                <MessageSquare size={13} /> Conversation
              </button>
              <button
                onClick={() => setActivePanel("code")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activePanel === "code" ? "border-amber-500 text-amber-500" : "border-transparent text-white/40 hover:text-white/70"}`}
              >
                <Code size={13} /> Code Editor {session.technology && `(${session.technology})`}
              </button>
            </div>
          )}

          {/* Chat panel */}
          <AnimatePresence mode="wait">
            {activePanel === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((m, idx) => {
                    const isInterviewer = m.role === "interviewer";
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}
                      >
                        {isInterviewer && (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 mr-2 mt-1">
                            <BarChart3 size={13} className="text-amber-500" />
                          </div>
                        )}
                        <div className={`max-w-[78%] ${isInterviewer
                          ? "bg-white/4 border border-white/8 rounded-2xl rounded-tl-sm"
                          : "bg-amber-500/10 border border-amber-500/20 rounded-2xl rounded-tr-sm"
                        } p-3.5`}>
                          <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5 opacity-50">
                            {isInterviewer ? "AI Interviewer" : "You"}
                          </div>
                          <p className="text-xs leading-relaxed text-white/85 whitespace-pre-line">{m.content}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                  {sending && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 mr-2 mt-1">
                        <BarChart3 size={13} className="text-amber-500" />
                      </div>
                      <div className="bg-white/4 border border-white/8 rounded-2xl rounded-tl-sm p-3.5 flex items-center gap-2">
                        <Loader2 size={13} className="text-amber-500 animate-spin" />
                        <span className="text-[11px] text-white/40">Evaluating your answer...</span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Live transcript display */}
                <AnimatePresence>
                  {(isRecording || liveTranscript) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-2"
                    >
                      <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Live Transcript</span>
                        </div>
                        <p className="text-xs text-white/60 italic">{liveTranscript || "Listening..."}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input area */}
                <div className="p-4 border-t border-white/8 bg-[#0a0a1a] shrink-0">
                  {/* Waveform */}
                  <div className="flex items-center justify-center gap-1 mb-2 h-5">
                    <Volume2 size={11} className="text-white/20 mr-1" />
                    {waveHeights.map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-[3px] rounded-full bg-amber-500/50"
                        animate={{ height: isRecording || sending ? h : 4 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        style={{ height: 4 }}
                      />
                    ))}
                    <span className="text-[9px] ml-1 text-white/20 uppercase tracking-wider">
                      {isRecording ? "Recording..." : sending ? "Processing..." : "AI Proctoring Active"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Type your answer or use voice input..."
                      disabled={sending}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      className="flex-1 bg-white/4 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/25 resize-none h-16 focus:outline-none focus:border-amber-500/40 transition-colors"
                    />
                    {/* Voice button */}
                    <button
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      disabled={sending}
                      className={`px-3 rounded-xl border shrink-0 h-16 w-14 flex items-center justify-center transition-all ${
                        isRecording
                          ? "bg-red-500/15 border-red-500/30 text-red-400"
                          : "bg-white/4 border-white/10 text-amber-400 hover:border-amber-500/30"
                      } disabled:opacity-30`}
                    >
                      {isRecording
                        ? <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}><MicOff size={18} /></motion.div>
                        : <Mic size={18} />
                      }
                    </button>
                    {/* Send button */}
                    <button
                      onClick={handleSend}
                      disabled={sending || !input.trim()}
                      className="px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black shrink-0 h-16 w-16 flex items-center justify-center transition-colors disabled:opacity-30"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Code editor panel */}
            {activePanel === "code" && (
              <motion.div
                key="code"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                {/* Editor toolbar */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 bg-[#0a0a1a] shrink-0">
                  <div className="flex items-center gap-2">
                    <Code size={13} className="text-amber-500" />
                    <span className="text-xs font-bold text-white/70">Code Editor</span>
                    <select
                      value={editorLang}
                      onChange={e => setEditorLang(e.target.value)}
                      className="ml-2 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] text-white/70 cursor-pointer"
                    >
                      {["javascript", "typescript", "python", "java", "cpp", "go", "rust"].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCode("// Write your solution here\n\n")}
                      className="text-[10px] text-white/40 hover:text-white/70 border border-white/10 rounded px-2 py-0.5 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        const answer = `Here is my code solution:\n\`\`\`${editorLang}\n${code}\n\`\`\``;
                        setInput(answer);
                        setActivePanel("chat");
                      }}
                      className="text-[10px] bg-amber-500 text-black font-bold rounded px-2 py-0.5 hover:bg-amber-400 transition-colors flex items-center gap-1"
                    >
                      <ChevronRight size={11} /> Submit Code
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <MonacoEditor
                    height="100%"
                    language={editorLang}
                    value={code}
                    onChange={(val) => setCode(val || "")}
                    theme="vs-dark"
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      automaticLayout: true,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontLigatures: true,
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Webcam + Info panel */}
        <div className={`w-full lg:w-64 xl:w-72 shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-white/8 bg-[#0a0a1a] overflow-y-auto ${mobileTab === "video" ? "flex" : "hidden lg:flex"}`}>
          {/* Webcam */}
          <div className="relative aspect-video bg-black border-b border-white/8">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity ${cameraOn ? "opacity-100" : "opacity-0"}`}
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff size={24} className="text-white/20" />
              </div>
            )}
            {/* Camera controls overlay */}
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button
                onClick={toggleCamera}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${cameraOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500/20 border border-red-500/30"}`}
              >
                {cameraOn ? <Video size={12} className="text-white" /> : <VideoOff size={12} className="text-red-400" />}
              </button>
              <button
                onClick={toggleMic}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500/20 border border-red-500/30"}`}
              >
                {micOn ? <Mic size={12} className="text-white" /> : <MicOff size={12} className="text-red-400" />}
              </button>
            </div>
            {/* Live badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-[9px] font-bold text-white">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </div>
          </div>

          {/* Proctoring status */}
          <div className="p-3 border-b border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Proctoring</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-emerald-500 font-bold">ACTIVE</span>
              </div>
            </div>
            {/* Violation meter */}
            <div>
              <div className="flex justify-between text-[9px] mb-1">
                <span className="text-white/40">Violation Points</span>
                <span className={urgency > 0.5 ? "text-red-400 font-bold" : "text-white/40"}>
                  {violationPoints}/{session.violationThreshold}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: urgency > 0.7 ? "#ef4444" : urgency > 0.4 ? "#f59e0b" : "#10b981" }}
                  animate={{ width: `${Math.min(urgency * 100, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            {/* Event flags */}
            <div className="space-y-1">
              {[
                { label: "Tab Switches", flagged: tabSwitched },
                { label: "Camera On", flagged: !cameraOn },
                { label: "Mic On", flagged: !micOn },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[9px] text-white/40">{item.label}</span>
                  {item.flagged
                    ? <XCircle size={11} className="text-red-400" />
                    : <CheckCircle2 size={11} className="text-emerald-500" />}
                </div>
              ))}
            </div>
          </div>

          {/* Interview info */}
          <div className="p-3 space-y-2 flex-1">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Session Info</span>
            {[
              { label: "Role", value: session.role },
              { label: "Type", value: session.type.charAt(0).toUpperCase() + session.type.slice(1) },
              { label: "Difficulty", value: session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1) },
              { label: "Language", value: session.language.charAt(0).toUpperCase() + session.language.slice(1) },
              ...(session.technology ? [{ label: "Tech", value: session.technology }] : []),
            ].map(item => (
              <div key={item.label} className="flex justify-between">
                <span className="text-[9px] text-white/30">{item.label}</span>
                <span className="text-[9px] font-bold text-white/60">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Quick tips */}
          <div className="p-3 border-t border-white/8">
            <span className="text-[9px] text-white/25 block mb-1.5 uppercase tracking-widest font-bold">Tips</span>
            <ul className="space-y-1">
              {[
                "Stay in camera frame",
                "Speak clearly and slowly",
                "Think aloud before answering",
              ].map((tip, i) => (
                <li key={i} className="text-[9px] text-white/30 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">›</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

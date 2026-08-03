"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import type { ResumeHubViewType } from "@/types/resume";

import { IntroAnimation } from "./IntroAnimation";
import { ChatBackground } from "./ChatBackground";
import { ChatSidebar } from "./ChatSidebar";
import { ChatGreeting } from "./ChatGreeting";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { ADY_MODELS, type ChatSession, type ChatMessage } from "./types";
import { useTheme } from "@/hooks/useTheme";

// ─── Voice recognition hook ──────────────────────────────────────────────────

function useVoiceRecognition(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any | null>(null);

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      onResult(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, onResult]);

  return { listening, toggle };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface AdyChatViewProps {
  setView: (v: ResumeHubViewType) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdyChatView({ setView }: AdyChatViewProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme === "dark";

  // ── Intro animation ────────────────────────────────────────────────────────
  const [introComplete, setIntroComplete] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(ADY_MODELS[0].id);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; text: string } | null>(null);

  // ── Load sessions ──────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const res = await api.get("/ady-chat/sessions");
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (introComplete) loadSessions();
  }, [introComplete, loadSessions]);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await api.get(`/ady-chat/sessions/${sessionId}`);
      if (res.data.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, loadMessages]);

  // ── New session ────────────────────────────────────────────────────────────
  const handleNewSession = useCallback(async () => {
    try {
      const res = await api.post("/ady-chat/sessions", { model: selectedModel });
      if (res.data.success) {
        setSessions(prev => [res.data.session, ...prev]);
        setActiveSessionId(res.data.session.id);
        setMessages([]);
        setStreamingText("");
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedModel]);

  // ── Delete session ─────────────────────────────────────────────────────────
  const handleDeleteSession = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/ady-chat/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeSessionId]);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/ady-chat/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setUploadedFile({ name: res.data.filename, text: res.data.text });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const handleVoiceResult = useCallback((text: string) => {
    setInput(prev => prev + text);
  }, []);
  const { listening, toggle: toggleVoice } = useVoiceRecognition(handleVoiceResult);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && !uploadedFile) return;

    let finalMessage = text;
    if (uploadedFile) {
      finalMessage = `[File: ${uploadedFile.name}]\n\n${uploadedFile.text}\n\n---\n${text || "Please analyze this document."}`;
    }

    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const res = await api.post("/ady-chat/sessions", {
          model: selectedModel,
          title: finalMessage.slice(0, 80),
        });
        if (res.data.success) {
          sessionId = res.data.session.id;
          setActiveSessionId(sessionId);
          setSessions(prev => [res.data.session, ...prev]);
        }
      } catch (err) {
        console.error(err);
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: sessionId!,
      role: "user",
      content: finalMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setUploadedFile(null);
    setLoading(true);
    setStreamingText("");

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token")
        : null;
    try {
      const res = await fetch(`${api.defaults.baseURL}/ady-chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId, message: finalMessage, model: selectedModel }),
      });

      if (!res.ok) {
        const bodyText = await res.text();
        let data: unknown = null;
        try {
          data = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          data = null;
        }
        if (data && typeof data === "object" && (data as { code?: string }).code === "LIMIT_EXCEEDED") {
          import("@/store/usage-store").then(({ useUsageStore }) =>
            useUsageStore.getState().openLimitModal(data as import("@/store/usage-store").LimitSnapshot)
          );
        }
        throw new Error("Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === "chunk") {
              accumulated += data.text;
              setStreamingText(accumulated);
            } else if (data.type === "done") {
              const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                sessionId: sessionId!,
                role: "assistant",
                content: accumulated,
                createdAt: new Date().toISOString(),
              };
              setMessages(prev => [...prev, aiMsg]);
              setStreamingText("");
              loadSessions();
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sessionId: sessionId!,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  }, [input, uploadedFile, activeSessionId, selectedModel, loadSessions]);

  const handleSuggestionClick = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  // Lock dash-main to prevent page scroll when ady-chat is open
  useEffect(() => {
    const el = document.querySelector(".dash-main");
    if (el) {
      el.classList.add("ady-chat-active");
    }
    return () => {
      if (el) {
        el.classList.remove("ady-chat-active");
      }
    };
  }, []);

  const hasMessages = messages.length > 0 || !!streamingText;
  const userName = user?.name || "Ashish";

  // ─── Render ────────────────────────────────────────────────────────────────
  // Fixed full height layout — page does not scroll, only chat history and messages list scroll
  return (
    <div
      className="relative flex overflow-hidden w-full h-[calc(100vh-70px)] max-h-[calc(100vh-70px)]"
      style={{
        background: "transparent",
      }}
    >
      {/* Intro animation — absolute, stays within this container */}
      <AnimatePresence>
        {!introComplete && (
          <IntroAnimation isDark={isDark} onComplete={() => setIntroComplete(true)} />
        )}
      </AnimatePresence>

      {/* Animated background — absolute within container */}
      <ChatBackground isDark={isDark} />

      {/* Sidebar toggle — amber pill, only visible when sidebar is closed */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            key="sidebar-open-btn"
            className="absolute top-3 left-3 z-30 flex items-center justify-center rounded-xl"
            style={{
              width: 40,
              height: 40,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#000",
              boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
            }}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setSidebarOpen(true)}
            whileHover={{ scale: 1.08, boxShadow: "0 6px 24px rgba(245,158,11,0.55)" }}
            whileTap={{ scale: 0.92 }}
            title="Open sidebar"
          >
            {/* Hamburger SVG */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Body: sidebar + main — both sit as flex children, no overlay */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar */}
        <ChatSidebar
          isOpen={sidebarOpen}
          sessions={sessions}
          activeSessionId={activeSessionId}
          isDark={isDark}
          onNewChat={handleNewSession}
          onToggle={() => setSidebarOpen(false)}
          onSelectSession={id => setActiveSessionId(id)}
          onDeleteSession={handleDeleteSession}
          userName={userName}
        />

        {/* Main content area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {!hasMessages ? (
              /* ── Greeting / empty state ── */
              <motion.div
                key="greeting"
                className="flex-1 min-h-0 flex flex-col overflow-hidden"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, y: -16, transition: { duration: 0.3 } }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex-1 flex items-center justify-center overflow-y-auto">
                  <ChatGreeting
                    userName={userName}
                    isDark={isDark}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </div>
                <div className="pb-4 pt-2 shrink-0 z-20">
                  <ChatInput
                    input={input}
                    isDark={isDark}
                    loading={loading}
                    listening={listening}
                    uploadedFile={uploadedFile}
                    selectedModel={selectedModel}
                    hasMessages={false}
                    onInputChange={setInput}
                    onSend={handleSend}
                    onVoiceToggle={toggleVoice}
                    onFileSelect={handleFileSelect}
                    onRemoveFile={() => setUploadedFile(null)}
                    onModelChange={setSelectedModel}
                  />
                </div>
              </motion.div>
            ) : (
              /* ── Active conversation ── */
              <motion.div
                key="conversation"
                className="flex-1 min-h-0 flex flex-col overflow-hidden"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
              >
                <MessageList
                  messages={messages}
                  streamingText={streamingText}
                  loading={loading}
                  isDark={isDark}
                  userName={userName}
                  onRegenerate={() => {
                    const lastUser = [...messages].reverse().find(m => m.role === "user");
                    if (lastUser) {
                      setInput(lastUser.content);
                      setMessages(prev => prev.slice(0, -1));
                    }
                  }}
                  onEditUserMessage={setInput}
                />
                <div
                  className="pb-4 pt-2 shrink-0 z-20"
                  style={{
                    background: isDark
                      ? "linear-gradient(to top, rgba(7,7,21,0.98) 75%, transparent 100%)"
                      : "linear-gradient(to top, rgba(255,255,255,0.98) 75%, transparent 100%)",
                  }}
                >
                  <ChatInput
                    input={input}
                    isDark={isDark}
                    loading={loading}
                    listening={listening}
                    uploadedFile={uploadedFile}
                    selectedModel={selectedModel}
                    hasMessages={true}
                    onInputChange={setInput}
                    onSend={handleSend}
                    onVoiceToggle={toggleVoice}
                    onFileSelect={handleFileSelect}
                    onRemoveFile={() => setUploadedFile(null)}
                    onModelChange={setSelectedModel}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


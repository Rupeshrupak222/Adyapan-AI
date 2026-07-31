"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Send, User, Loader2,
  BarChart3, TrendingDown, DollarSign,
  Activity, Users, Shield, Brain,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { api } from "@/services/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Stats {
  total: number;
  admin: number;
  premium: number;
  free: number;
  newToday: number;
  newWeek: number;
  newMonth: number;
}

interface DashboardData {
  success: boolean;
  stats?: {
    users?: Stats;
    revenue?: {
      total: number;
      month: number;
      successfulPayments: number;
      failedPayments: number;
      totalPayments: number;
    };
    totalAiRequests?: number;
  };
}

interface RevenueData {
  success: boolean;
  revenue?: {
    total: number;
    month: number;
    today: number;
    premiumUsers: number;
    totalTransactions: number;
    monthTransactions: number;
    averageOrderValue: number;
    planDist: { plan: string; count: number }[];
  };
}

interface PerformanceData {
  success: boolean;
  stats?: {
    avgApiResponseTime: number;
    avgDatabaseQueryTime: number;
    avgAiGenerationTime: number;
    avgUploadTime: number;
    errorRate: number;
    totalRequests: number;
    totalErrors: number;
  };
}

interface HealthData {
  success: boolean;
  health?: {
    status: string;
    uptime: number;
    memory: { used: number; total: number; rss: number };
    cpu: { user: number; system: number };
    platform: string;
    nodeVersion: string;
  };
}

interface SecurityData {
  success: boolean;
  security?: {
    totalAdmins: number;
    activeSessions: number;
    failedLogins: number;
    blockedIps: number;
    status: string;
    alerts: { id: string; title: string; severity: string }[];
  };
}

interface ActivityData {
  success: boolean;
  activities?: { id: string; time: string; user: string; action: string; module: string }[];
}

interface ModulesData {
  success: boolean;
  modules?: {
    resumeHub: { total: number; resumes: number; atsReports: number; coverLetters: number; linkedinReports: number };
    learningHub: { total: number; studySessions: number; notes: number; quizzes: number; assignments: number; ppts: number; mindmaps: number; flashcards: number };
    codingHub: { total: number; sessions: number; submissions: number; challenges: number };
    interviewHub: { total: number; completed: number; completionRate: number };
  };
}

const EXAMPLE_PROMPTS = [
  { icon: <Users size={12} />, text: "How many premium users do we have?" },
  { icon: <DollarSign size={12} />, text: "Show revenue this month" },
  { icon: <BarChart3 size={12} />, text: "Feature usage overview" },
  { icon: <TrendingDown size={12} />, text: "Show API failures today" },
  { icon: <Activity size={12} />, text: "What's the platform health?" },
  { icon: <Shield size={12} />, text: "Security status" },
];

function inr(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function ms(value: number): string {
  return `${Math.round(value)} ms`;
}

function fmtUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function buildResponse(prompt: string, data: unknown): string {
  const lower = prompt.toLowerCase();
  const has = (words: string[]) => words.some((w) => lower.includes(w));

  if (has(["revenue", "payment", "sales", "money", "earning", "paid"])) {
    const r = (data as RevenueData).revenue;
    if (!r) return "**No revenue data available.** The revenue endpoint returned nothing yet.";
    const planLines = r.planDist?.length
      ? r.planDist.slice(0, 4).map((p) => `- **${p.plan}:** ${p.count} subscribers`).join("\n")
      : "- No plan distribution data";
    return `**Revenue Overview** _(live)_\n\n- **All-time revenue:** ${inr(r.total)}\n- **This month:** ${inr(r.month)}\n- **Today:** ${inr(r.today)}\n- **Premium users:** ${r.premiumUsers}\n- **Transactions:** ${r.totalTransactions} total (${r.monthTransactions} this month)\n- **Avg order value:** ${inr(r.averageOrderValue)}\n\n**Plan mix**\n${planLines}`;
  }

  if (has(["user", "premium", "active", "inactive", "registered", "signup", "sign-up"])) {
    const u = (data as DashboardData).stats?.users;
    if (!u) return "**No user data available.** The dashboard endpoint returned nothing yet.";
    return `**User Overview** _(live)_\n\n- **Total users:** ${u.total}\n- **Premium:** ${u.premium}\n- **Free:** ${u.free}\n- **Admins:** ${u.admin}\n- **New today:** ${u.newToday}\n- **New this week:** ${u.newWeek}\n- **New this month:** ${u.newMonth}`;
  }

  if (has(["api", "failure", "error", "fail", "performance", "latency", "response time"])) {
    const s = (data as PerformanceData).stats;
    if (!s) return "**No performance data available.** The performance endpoint returned nothing yet.";
    return `**API Performance** _(live)_\n\n- **Total requests:** ${s.totalRequests}\n- **Errors:** ${s.totalErrors} (error rate ${s.errorRate}%)\n- **Avg API response:** ${ms(s.avgApiResponseTime)}\n- **Avg AI generation:** ${ms(s.avgAiGenerationTime)}\n- **Avg upload:** ${ms(s.avgUploadTime)}\n- **Avg DB query:** ${ms(s.avgDatabaseQueryTime)}`;
  }

  if (has(["feature", "usage", "module", "learning", "coding", "interview", "resume", "hub", "content"])) {
    const m = (data as ModulesData).modules;
    if (!m) return "**No module analytics available.** The modules endpoint returned nothing yet.";
    return `**Feature Usage Overview** _(live)_\n\n**Resume Hub** — ${m.resumeHub.total}\n- Resumes: ${m.resumeHub.resumes} | ATS reports: ${m.resumeHub.atsReports} | Cover letters: ${m.resumeHub.coverLetters}\n\n**Learning Hub** — ${m.learningHub.total}\n- Study sessions: ${m.learningHub.studySessions} | Notes: ${m.learningHub.notes} | Quizzes: ${m.learningHub.quizzes} | Assignments: ${m.learningHub.assignments} | PPTs: ${m.learningHub.ppts} | Mind maps: ${m.learningHub.mindmaps} | Flashcards: ${m.learningHub.flashcards}\n\n**Coding Hub** — ${m.codingHub.total}\n- Sessions: ${m.codingHub.sessions} | Submissions: ${m.codingHub.submissions} | Challenges: ${m.codingHub.challenges}\n\n**Interview Hub** — ${m.interviewHub.total} (completion rate ${m.interviewHub.completionRate}%)`;
  }

  if (has(["health", "system", "status", "server", "uptime", "memory", "cpu"])) {
    const h = (data as HealthData).health;
    if (!h) return "**No system health data available.** The health endpoint returned nothing yet.";
    return `**Platform Health** _(live)_\n\n- **Status:** ${h.status}\n- **Uptime:** ${fmtUptime(h.uptime)}\n- **Memory:** ${mb(h.memory.used)} used of ${mb(h.memory.total)} (RSS ${mb(h.memory.rss)})\n- **CPU:** user ${h.cpu.user}% / system ${h.cpu.system}%\n- **Node:** ${h.nodeVersion} on ${h.platform}`;
  }

  if (has(["security", "alert", "login", "blocked", "notification", "threat"])) {
    const s = (data as SecurityData).security;
    if (!s) return "**No security data available.** The security endpoint returned nothing yet.";
    const alertLines = s.alerts?.length
      ? s.alerts.slice(0, 3).map((a) => `- **${a.title}** (${a.severity})`).join("\n")
      : "- No recent alerts";
    return `**Security Overview** _(live)_\n\n- **Status:** ${s.status}\n- **Admins:** ${s.totalAdmins} (${s.activeSessions} active sessions)\n- **Failed logins (24h):** ${s.failedLogins}\n- **Blocked IPs:** ${s.blockedIps}\n\n**Recent alerts**\n${alertLines}`;
  }

  if (has(["activity", "recent", "log", "timeline"])) {
    const a = (data as ActivityData).activities;
    if (!a || a.length === 0) return "**No activity data available.**";
    const lines = a.slice(0, 6).map((x) => `- **${x.user}** — ${x.action} (${x.module})`).join("\n");
    return `**Recent Platform Activity** _(live)_\n\n${lines}`;
  }

  const u = (data as DashboardData).stats?.users;
  const r = (data as DashboardData).stats?.revenue;
  if (!u || !r) return "I couldn't fetch a live summary right now. Please try again in a moment.";
  return `**Platform Summary** _(live)_\n\n- **Users:** ${u.total} (${u.premium} premium, ${u.free} free)\n- **Revenue:** ${inr(r.total)} all-time, ${inr(r.month)} this month\n- **Payments:** ${r.successfulPayments} succeeded, ${r.failedPayments} failed\n- **Total AI requests:** ${(data as DashboardData).stats?.totalAiRequests ?? 0}`;
}

const INTENT_ENDPOINTS: { test: (p: string) => boolean; endpoint: string }[] = [
  { test: (p) => ["revenue", "payment", "sales", "money", "earning", "paid"].some((w) => p.includes(w)), endpoint: "/admin/analytics/revenue" },
  { test: (p) => ["user", "premium", "active", "inactive", "registered", "signup"].some((w) => p.includes(w)), endpoint: "/admin/dashboard" },
  { test: (p) => ["api", "failure", "error", "fail", "performance", "latency"].some((w) => p.includes(w)), endpoint: "/admin/performance" },
  { test: (p) => ["feature", "usage", "module", "learning", "coding", "interview", "resume", "hub", "content"].some((w) => p.includes(w)), endpoint: "/admin/modules" },
  { test: (p) => ["health", "system", "status", "server", "uptime", "memory", "cpu"].some((w) => p.includes(w)), endpoint: "/admin/system-health" },
  { test: (p) => ["security", "alert", "login", "blocked", "notification", "threat"].some((w) => p.includes(w)), endpoint: "/admin/security" },
  { test: (p) => ["activity", "recent", "log", "timeline"].some((w) => p.includes(w)), endpoint: "/admin/activity" },
];

export default function AICopilot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your **AI Copilot**. Ask me anything about platform operations, analytics, users, or system status. All answers are generated live from the admin API. Here are some example prompts to get started:",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (prompt: string) => {
    if (!prompt.trim() || loading) return;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const lower = prompt.toLowerCase();
      const intent = INTENT_ENDPOINTS.find((i) => i.test(lower));
      const endpoint = intent?.endpoint ?? "/admin/dashboard";
      const res = await api.get(endpoint);
      const content = buildResponse(prompt, res.data);
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "assistant", content, timestamp: new Date() }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: "**I couldn't reach the admin API.** Please check the backend connection and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="AI Copilot"
        description="Natural language interface for platform operations — answers built from live admin data"
        actions={
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(147,51,234,0.2))",
                color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <Sparkles size={12} />
              Powered by AI
            </span>
          </div>
        }
      />

      {/* Chat Container */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border-color)",
          height: "600px",
        }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-amber-500/20 to-purple-500/20"
                    : "bg-white/5"
                }`}
                style={{
                  border: `1px solid ${
                    msg.role === "assistant" ? "rgba(245,158,11,0.3)" : "var(--border-color)"
                  }`,
                }}
              >
                {msg.role === "assistant" ? (
                  <Brain size={15} style={{ color: "#f59e0b" }} />
                ) : (
                  <User size={15} style={{ color: "var(--text-secondary)" }} />
                )}
              </div>

              {/* Bubble */}
              <div
                className="max-w-[80%] rounded-2xl p-4"
                style={{
                  background: msg.role === "assistant"
                    ? "linear-gradient(135deg, rgba(245,158,11,0.04), rgba(147,51,234,0.04))"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    msg.role === "assistant"
                      ? "rgba(245,158,11,0.15)"
                      : "var(--border-color)"
                  }`,
                }}
              >
                <div
                  className="text-xs leading-relaxed prose prose-sm max-w-none"
                  style={{ color: "var(--text-primary)" }}
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br/>")
                      .replace(/```/g, ""),
                  }}
                />
                <div className="text-[9px] font-medium mt-2" style={{ color: "var(--text-muted)" }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(147,51,234,0.2))",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <Brain size={15} style={{ color: "#f59e0b" }} />
              </div>
              <div
                className="rounded-2xl p-4 flex items-center gap-2"
                style={{
                  background: "rgba(245,158,11,0.04)",
                  border: "1px solid rgba(245,158,11,0.15)",
                }}
              >
                <Loader2 size={14} className="animate-spin" style={{ color: "#f59e0b" }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>Querying live data...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Example Prompts */}
        <div
          className="px-5 py-3 border-t flex flex-wrap gap-2"
          style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.02)" }}
        >
          {EXAMPLE_PROMPTS.map((prompt) => (
            <motion.button
              key={prompt.text}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => sendMessage(prompt.text)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all"
              style={{
                background: "rgba(245,158,11,0.06)",
                color: "var(--text-secondary)",
                border: "1px solid rgba(245,158,11,0.15)",
              }}
            >
              <span style={{ color: "#f59e0b" }}>{prompt.icon}</span>
              {prompt.text}
            </motion.button>
          ))}
        </div>

        {/* Input */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-t"
          style={{
            borderColor: "var(--border-color)",
            background: "linear-gradient(135deg, rgba(245,158,11,0.03), transparent)",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your platform..."
            className="flex-1 bg-transparent text-xs font-medium outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: input.trim() ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(255,255,255,0.05)",
              color: input.trim() ? "#000" : "var(--text-muted)",
              opacity: input.trim() ? 1 : 0.5,
            }}
          >
            <Send size={14} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

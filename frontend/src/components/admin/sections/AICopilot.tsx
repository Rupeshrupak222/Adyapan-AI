"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Send, Bot, User, Loader2,
  BarChart3, TrendingDown, DollarSign,
  Activity, Users, Shield, Brain,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const EXAMPLE_PROMPTS = [
  { icon: <Users size={12} />, text: "Show premium users from LPU" },
  { icon: <BarChart3 size={12} />, text: "Generate monthly report" },
  { icon: <TrendingDown size={12} />, text: "Which feature has highest abandonment?" },
  { icon: <DollarSign size={12} />, text: "Why did payments decrease yesterday?" },
  { icon: <Activity size={12} />, text: "Show API failures today" },
  { icon: <Users size={12} />, text: "List inactive users" },
  { icon: <DollarSign size={12} />, text: "Predict next month's revenue" },
];

const MOCK_RESPONSES: Record<string, string> = {
  "Show premium users from LPU": "**Found 2,340 premium users** from LPU.\n\n- **Plan breakdown:** 1,120 Pro, 890 Enterprise, 330 Student Pro\n- **Avg. daily usage:** 47 min\n- **Top features:** Interview AI, Coding AI, Resume Builder\n- **Active this week:** 1,890 (80.7%)\n\n```\nSELECT COUNT(*) FROM users\nWHERE organization = 'LPU' AND plan IN ('pro', 'enterprise')\n```",
  "Generate monthly report": "**Monthly Report — June 2026**\n\n| Metric | Value | Change |\n|--------|-------|--------|\n| New Users | 12,450 | +8.3% |\n| Active Users | 48,230 | +12.1% |\n| Revenue | ₹84.2L | +15.7% |\n| Avg Session | 23m 40s | +2.1% |\n| Feature Usage | 87.4% | +4.2% |\n\n**Summary:** Strong growth across all metrics. Coding AI and Interview AI are the top drivers. Recommend scaling infrastructure for next quarter.",
  "Which feature has highest abandonment?": "**Feature Abandonment Analysis**\n\nHighest abandonment rate: **Study Planner** — **67%** drop-off after first use\n\n| Feature | Abandonment | Sessions Before Drop |\n|---------|-------------|---------------------|\n| Study Planner | 67% | 1.2 |\n| Flashcards | 54% | 2.8 |\n| Career Roadmap | 48% | 3.1 |\n| MCQ Generator | 42% | 4.5 |\n| Coding AI | 18% | 12.7 |\n\n**Recommendation:** Improve Study Planner onboarding and add personalized reminders.",
  "Why did payments decrease yesterday?": "**Payment Decline Analysis — Yesterday**\n\n- **Total revenue:** ₹2.1L (—23% vs. same day last week)\n- **Failed transactions:** 47 (vs. 12 avg)\n- **Primary cause:** Stripe gateway outage from 14:30–15:45 IST\n- **Affected region:** Primarily HDFC and SBI card users\n- **Recovery:** Auto-retry queued 89 pending payments\n- **Status:** Gateway restored at 15:48. All pending payments reprocessed.",
  "Show API failures today": "**API Failures — Today**\n\n| Endpoint | Failures | Error Rate | Status |\n|----------|----------|------------|--------|\n| `/api/ai/chat` | 12 | 0.8% | ✅ |\n| `/api/payments/create` | 3 | 0.4% | ✅ |\n| `/api/users/sync` | 28 | 12.3% | ⚠️ Rate limited |\n| `/api/storage/upload` | 0 | 0% | ✅ |\n| `/api/webhooks/github` | 7 | 5.1% | ⚠️ Timeout |\n\n**Alert:** User sync endpoint hitting rate limits. Consider increasing from 100 to 200 req/min.",
  "List inactive users": "**Inactive Users (30+ days)**\n\n- **Total inactive:** 12,340 users\n- **By tier:** 8,200 Free | 2,890 Pro | 1,250 Enterprise\n- **Last active >60 days:** 5,670 users\n- **Notable:** 3 organizations with >50% inactivity — SRM (62%), VIT (55%), Amazon (48%)\n\n**Recommendation:** Launch re-engagement campaign targeting inactive users with personalized feature highlights.",
  "Predict next month's revenue": "**Revenue Prediction — July 2026**\n\n**Forecast: ₹92.4L — ₹1.02Cr** (confidence: 87%)\n\nBased on:\n- Current MRR run rate: ₹78.5L\n- Expected new subscriptions: +8–12%\n- Historic July growth factor: +6.3%\n- Pipeline: 14 enterprise deals (est. ₹12L–₹18L)\n- Churn prediction: 4.2% (within normal range)\n\n**Risk factors:** 2 large enterprise accounts up for renewal.",
};

export default function AICopilot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your **AI Copilot**. Ask me anything about platform operations, analytics, users, or system status. Here are some example prompts to get started:",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = (prompt: string) => {
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

    const responseText = MOCK_RESPONSES[prompt] || "I've analyzed your request. Based on the available data, I recommend reviewing the detailed metrics in the Analytics & BI section for a comprehensive breakdown. Is there a specific aspect you'd like to explore further?";
    const responseKey = Object.keys(MOCK_RESPONSES).find((k) =>
      k.toLowerCase().includes(prompt.toLowerCase()) || prompt.toLowerCase().includes(k.toLowerCase())
    );
    const finalResponse = responseKey ? MOCK_RESPONSES[responseKey] : responseText;

    setTimeout(() => {
      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: finalResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
    }, 1200 + Math.random() * 800);
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
        description="Natural language interface for platform operations"
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
          {messages.map((msg, idx) => (
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
                className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === "assistant"
                    ? ""
                    : ""
                }`}
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
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>Analyzing...</span>
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

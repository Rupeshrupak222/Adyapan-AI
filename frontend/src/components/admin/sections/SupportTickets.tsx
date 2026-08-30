"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import {
  LifeBuoy, Search, Loader2, X, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, Bug, Eye,
  MessageSquare, Send, User, ShieldCheck, Sparkles, Check, ChevronRight,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { toast } from "sonner";

interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: "USER" | "ADMIN";
  senderName: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  ticketId: string;
  subject: string;
  category: string;
  severity: string;
  status: string;
  message: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface UserSettingsView {
  profile?: {
    college?: string;
    branch?: string;
    degree?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    aboutMe?: string;
    graduationYear?: string;
  };
  settings?: {
    themeMode?: string;
    accentColor?: string;
    aiModel?: string;
    twoFactorEnabled?: boolean;
    loginAlerts?: boolean;
    publicProfile?: boolean;
    [key: string]: unknown;
  };
  storageUsage?: { limitMb?: number; usedMb?: number };
  ticketCount?: number;
}

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];

const QUICK_REPLIES = [
  "Hello! We are currently investigating this issue for you.",
  "This issue has been resolved. Please refresh your page and verify.",
  "Could you please share more details or the exact steps to reproduce?",
  "Thank you for reporting this bug! Our engineering team is on it.",
  "Your account settings/quota have been updated.",
];

function statusVariant(status: string): "success" | "warning" | "error" | "info" | "default" {
  switch (status) {
    case "open": return "warning";
    case "in_progress": return "info";
    case "resolved": return "success";
    case "closed": return "default";
    default: return "default";
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "low": return "#10b981";
    default: return "#f59e0b";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatChatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // User Profile / Settings Modal
  const [viewing, setViewing] = useState<{ ticket: SupportTicket; data: UserSettingsView } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Live Chat Drawer State
  const [activeChatTicket, setActiveChatTicket] = useState<SupportTicket | null>(null);
  const [chatMessages, setChatMessages] = useState<SupportTicketMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await api.get(`/admin/support-tickets?${params.toString()}`);
      if (res.data.success) {
        setTickets(res.data.tickets || []);
        setStats(res.data.stats || {});
      }
    } catch {
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeChatTicket) {
      scrollToBottom();
    }
  }, [chatMessages, activeChatTicket]);

  const changeStatus = async (ticketId: string, status: string) => {
    setUpdatingId(ticketId);
    try {
      const res = await api.put(`/admin/support-tickets/${ticketId}/status`, { status });
      if (res.data.success) {
        setTickets((prev) => prev.map((t) => (t.ticketId === ticketId ? { ...t, status } : t)));
        if (activeChatTicket && activeChatTicket.ticketId === ticketId) {
          setActiveChatTicket((prev) => prev ? { ...prev, status } : null);
        }
        setFeedback(`Ticket #${ticketId} status updated to ${status}`);
        setTimeout(() => setFeedback(""), 3000);
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const openTicketProfile = async (ticket: SupportTicket) => {
    setViewing({ ticket, data: {} });
    setViewLoading(true);
    try {
      const res = await api.get(`/admin/users/${ticket.userId}/settings`);
      if (res.data.success) {
        setViewing({ ticket, data: res.data });
      }
    } catch {
      // Continue displaying ticket message even if settings fail
    } finally {
      setViewLoading(false);
    }
  };

  const openChatThread = async (ticket: SupportTicket) => {
    setActiveChatTicket(ticket);
    setChatLoading(true);
    try {
      const res = await api.get(`/admin/support-tickets/${ticket.ticketId}/messages`);
      if (res.data.success) {
        setChatMessages(res.data.messages || []);
      }
    } catch {
      toast.error("Failed to load chat history");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !activeChatTicket || sendingReply) return;

    const messageContent = replyText.trim();
    setSendingReply(true);
    try {
      const res = await api.post(`/admin/support-tickets/${activeChatTicket.ticketId}/messages`, {
        message: messageContent,
        status: activeChatTicket.status === "open" ? "in_progress" : activeChatTicket.status,
      });

      if (res.data.success && res.data.chatMessage) {
        setChatMessages((prev) => [...prev, res.data.chatMessage]);
        setReplyText("");
        toast.success("Reply sent to user!");
        
        // Update local ticket list status if changed to in_progress
        if (activeChatTicket.status === "open") {
          setTickets((prev) =>
            prev.map((t) => (t.ticketId === activeChatTicket.ticketId ? { ...t, status: "in_progress" } : t))
          );
          setActiveChatTicket((prev) => prev ? { ...prev, status: "in_progress" } : null);
        }
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || "Failed to send message";
      toast.error(errMsg);
    } finally {
      setSendingReply(false);
    }
  };

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        t.subject.toLowerCase().includes(q) ||
        t.ticketId.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.message.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [tickets, statusFilter, search]);

  const kpiCards = [
    { label: "Total Tickets", value: stats.total ?? 0, icon: <LifeBuoy size={14} />, color: "#38bdf8" },
    { label: "Open", value: stats.open ?? 0, icon: <AlertTriangle size={14} />, color: "#f59e0b" },
    { label: "In Progress", value: stats.inProgress ?? 0, icon: <Clock size={14} />, color: "#818cf8" },
    { label: "Resolved", value: stats.resolved ?? 0, icon: <CheckCircle2 size={14} />, color: "#10b981" },
    { label: "Bug Reports", value: stats.bugs ?? 0, icon: <Bug size={14} />, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Support Center & Live Query Chat"
        description="Manage user inquiries, bug reports, and chat live with students on their specific support tickets"
        actions={
          <button
            onClick={() => fetchTickets()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border"
            style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.3)" }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((k) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: k.color }}>
              {k.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{k.label}</span>
            </div>
            <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{k.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", ...STATUS_OPTIONS].map((s) => (
          <motion.button
            key={s}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            style={{
              background: statusFilter === s ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
              color: statusFilter === s ? "#f59e0b" : "var(--text-secondary)",
              border: `1px solid ${statusFilter === s ? "rgba(245,158,11,0.3)" : "var(--border-color)"}`,
            }}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </motion.button>
        ))}
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets or users..."
            className="pl-8 pr-3 py-1.5 rounded-full text-[11px] font-medium outline-none w-48 transition-all focus:w-64"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          />
        </div>
      </div>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
        >
          {feedback}
        </motion.div>
      )}

      {/* Tickets table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: "#f59e0b" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              No support tickets found
            </div>
          ) : (
            <table className="w-full text-left" style={{ minWidth: 860 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["Ticket", "User", "Subject", "Category", "Severity", "Status", "Submitted", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border-color)" }} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 text-xs font-black whitespace-nowrap" style={{ color: "#f59e0b" }}>
                      {t.ticketId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{t.userName}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[220px] truncate font-medium" style={{ color: "var(--text-primary)" }}>{t.subject}</td>
                    <td className="px-4 py-3 text-xs capitalize">
                      <span className="inline-flex items-center gap-1">
                        {t.category === "bug" ? <Bug size={12} className="text-red-400" /> : <LifeBuoy size={12} className="text-amber-400" />}
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `${severityColor(t.severity)}22`, color: severityColor(t.severity), border: `1px solid ${severityColor(t.severity)}44` }}>
                        {t.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={t.status}
                        disabled={updatingId === t.ticketId}
                        onChange={(e) => changeStatus(t.ticketId, e.target.value)}
                        className="text-[11px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer disabled:opacity-50"
                        style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openChatThread(t)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
                          style={{
                            background: "linear-gradient(135deg, #f59e0b, #d97706)",
                            color: "#000",
                          }}
                        >
                          <MessageSquare size={13} /> Chat / Reply
                        </motion.button>
                        <button
                          onClick={() => openTicketProfile(t)}
                          className="p-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:bg-white/10 border"
                          style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)" }}
                          title="View User Details & Settings"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* ── TWO-WAY LIVE CHAT MODAL / DRAWER ── */}
      <AnimatePresence>
        {activeChatTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => setActiveChatTicket(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-3xl h-[85vh] max-h-[750px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chat Header */}
              <div
                className="p-4 border-b flex items-center justify-between gap-3 shrink-0"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
                  >
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-amber-500">#{activeChatTicket.ticketId}</span>
                      <h3 className="text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>
                        {activeChatTicket.subject}
                      </h3>
                      <StatusBadge variant={statusVariant(activeChatTicket.status)}>
                        {activeChatTicket.status}
                      </StatusBadge>
                    </div>
                    <div className="text-[11px] flex items-center gap-2 mt-0.5" style={{ color: "var(--text-muted)" }}>
                      <span>User: <strong style={{ color: "var(--text-primary)" }}>{activeChatTicket.userName}</strong> ({activeChatTicket.userEmail})</span>
                      <span>·</span>
                      <span className="capitalize">{activeChatTicket.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={activeChatTicket.status}
                    onChange={(e) => changeStatus(activeChatTicket.ticketId, e.target.value)}
                    className="text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setActiveChatTicket(null)}
                    className="p-2 rounded-full hover:bg-white/10 cursor-pointer transition-all border-none"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Chat Thread Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" style={{ background: "rgba(0,0,0,0.15)" }}>
                {/* Original Ticket Issue Box */}
                <div
                  className="p-4 rounded-2xl border space-y-1.5"
                  style={{
                    background: "rgba(245,158,11,0.05)",
                    borderColor: "rgba(245,158,11,0.2)",
                  }}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-amber-500">
                      <Bug size={13} /> Original Query / Description
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>{formatDate(activeChatTicket.createdAt)}</span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                    {activeChatTicket.message}
                  </p>
                </div>

                <div className="flex items-center justify-center my-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: "var(--text-muted)" }}>
                    Conversation Thread
                  </span>
                </div>

                {chatLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-amber-500" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
                    No messages yet. Send the first response to {activeChatTicket.userName} below.
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isAdmin = msg.senderType === "ADMIN";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                          {isAdmin ? (
                            <>
                              <span className="text-amber-400">Support Team ({msg.senderName})</span>
                              <ShieldCheck size={11} className="text-amber-400" />
                            </>
                          ) : (
                            <>
                              <User size={11} />
                              <span style={{ color: "var(--text-secondary)" }}>{msg.senderName}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{formatChatTime(msg.createdAt)}</span>
                        </div>
                        <div
                          className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                            isAdmin
                              ? "rounded-tr-sm text-slate-950 font-medium"
                              : "rounded-tl-sm text-slate-100 font-normal border"
                          }`}
                          style={{
                            background: isAdmin
                              ? "linear-gradient(135deg, #f59e0b, #d97706)"
                              : "rgba(255,255,255,0.08)",
                            borderColor: isAdmin ? "transparent" : "var(--border-color)",
                          }}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Chips */}
              <div
                className="px-4 py-2 border-t flex items-center gap-1.5 overflow-x-auto shrink-0"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-color)" }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-amber-500 flex items-center gap-1">
                  <Sparkles size={11} /> Quick:
                </span>
                {QUICK_REPLIES.map((qr, idx) => (
                  <button
                    key={idx}
                    onClick={() => setReplyText(qr)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap hover:bg-white/10 transition-all cursor-pointer border"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {qr.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Chat Composer Input */}
              <form
                onSubmit={handleSendReply}
                className="p-3 sm:p-4 border-t flex items-center gap-2.5 shrink-0"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border-color)" }}
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${activeChatTicket.userName}... (Press Enter to send)`}
                  disabled={sendingReply}
                  className="flex-1 px-4 py-2.5 rounded-2xl text-xs outline-none transition-all"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#000",
                  }}
                >
                  {sendingReply ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={14} /> Send Reply
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Details / Settings Modal */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setViewing(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border p-6 space-y-5"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
                    {viewing.ticket.ticketId} — {viewing.ticket.subject}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{viewing.ticket.userName}</span> · {viewing.ticket.userEmail}
                    <StatusBadge variant={statusVariant(viewing.ticket.status)}>{viewing.ticket.status}</StatusBadge>
                  </div>
                </div>
                <button
                  onClick={() => setViewing(null)}
                  className="p-2 rounded-full hover:bg-white/10 cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-2xl border p-4 text-xs leading-relaxed whitespace-pre-wrap" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                {viewing.ticket.message}
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  User Account & Settings {viewLoading && <Loader2 size={11} className="inline animate-spin ml-1" />}
                </div>
                {viewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-amber-500" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      ["Theme", viewing.data.settings?.themeMode],
                      ["Accent", viewing.data.settings?.accentColor],
                      ["AI Model", viewing.data.settings?.aiModel],
                      ["2FA", viewing.data.settings?.twoFactorEnabled ? "Enabled" : "Disabled"],
                      ["Login Alerts", viewing.data.settings?.loginAlerts ? "On" : "Off"],
                      ["Public Profile", viewing.data.settings?.publicProfile ? "Visible" : "Hidden"],
                      ["College", viewing.data.profile?.college],
                      ["Branch", viewing.data.profile?.branch],
                      ["Degree", viewing.data.profile?.degree],
                      ["Graduation", viewing.data.profile?.graduationYear],
                      ["Location", viewing.data.profile?.location],
                      ["Storage Used", `${viewing.data.storageUsage?.usedMb ?? 0} MB / ${viewing.data.storageUsage?.limitMb ?? 50} MB`],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border-color)" }}>
                        <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
                        <div className="font-semibold capitalize truncate" style={{ color: "var(--text-primary)" }}>
                          {value === undefined || value === null || value === "" ? "—" : String(value)}
                        </div>
                      </div>
                    ))}
                    <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border-color)" }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Tickets</div>
                      <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{viewing.data.ticketCount ?? 0}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

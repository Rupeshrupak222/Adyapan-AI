"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Trash2, MessageSquare,
  Clock, Star, Zap,
} from "lucide-react";
import type { ChatSession } from "./types";
import { getDiceBearUrl } from "@/lib/avatar";

interface ChatSidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  isDark: boolean;
  onNewChat: () => void;
  onToggle: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  userName?: string;
  userPlan?: string;
}

function groupSessionsByDate(sessions: ChatSession[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const lastWeek = today - 7 * 86400000;

  const groups: { label: string; items: ChatSession[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Last 7 Days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const s of sessions) {
    const t = new Date(s.updatedAt).getTime();
    if (t >= today) groups[0].items.push(s);
    else if (t >= yesterday) groups[1].items.push(s);
    else if (t >= lastWeek) groups[2].items.push(s);
    else groups[3].items.push(s);
  }

  return groups.filter(g => g.items.length > 0);
}

export function ChatSidebar({
  isOpen,
  sessions,
  activeSessionId,
  isDark,
  onNewChat,
  onToggle,
  onSelectSession,
  onDeleteSession,
  userName,
  userPlan,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const normalizedPlan = (userPlan || "").toLowerCase();
  const isPremiumUser = Boolean(
    normalizedPlan &&
    normalizedPlan !== "free" &&
    normalizedPlan !== "none"
  );
  const planLabel = normalizedPlan.includes("yearly")
    ? "Pro Yearly"
    : normalizedPlan.includes("enterprise")
    ? "Enterprise"
    : "Premium";

  const filtered = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );
  const groups = groupSessionsByDate(filtered);

  const bg = isDark ? "rgba(8,6,20,0.92)" : "rgba(248,250,252,0.95)";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const text = isDark ? "#ffffff" : "#0f172a";
  const textMuted = isDark ? "rgba(255,255,255,0.6)" : "#5f6368";
  const textSec = isDark ? "rgba(255,255,255,0.65)" : "#475569";
  const surfaceHover = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const activeItem = isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex-shrink-0 flex flex-col overflow-hidden"
          style={{
            background: bg,
            borderRight: `1px solid ${border}`,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Top: Toggle + New Chat + Search */}
          <div className="p-3 space-y-2 flex-shrink-0">
            {/* Amber toggle + New Chat row */}
            <div className="flex items-center gap-2">
              {/* Sidebar toggle — amber, hamburger icon */}
              <motion.button
                onClick={onToggle}
                className="flex items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#000",
                  boxShadow: "0 2px 10px rgba(245,158,11,0.3)",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Close sidebar"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
                </svg>
              </motion.button>

              {/* New Chat button */}
              <motion.button
                onClick={onNewChat}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold"
                style={{
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  color: text,
                  border: `1px solid ${border}`,
                }}
                whileHover={{
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  scale: 1.01,
                }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>New Chat</span>
              </motion.button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: textMuted }}
              />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none transition-all"
                style={{
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: `1px solid ${border}`,
                  color: text,
                }}
              />
            </div>
          </div>

          {/* Session history list */}
          <div className="flex-1 overflow-y-auto px-2 space-y-4 scrollbar-none">
            {groups.length === 0 ? (
              <div className="py-8 text-center" style={{ color: textMuted }}>
                <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No conversations found</p>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.label} className="space-y-1">
                  <div
                    className="px-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: textMuted }}
                  >
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((session, i) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === activeSessionId}
                        isHovered={hoveredId === session.id}
                        isDark={isDark}
                        index={i}
                        text={text}
                        textSec={textSec}
                        textMuted={textMuted}
                        surfaceHover={surfaceHover}
                        activeItem={activeItem}
                        onSelect={() => onSelectSession(session.id)}
                        onDelete={(e) => onDeleteSession(session.id, e)}
                        onHover={setHoveredId}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom: User profile */}
          <div
            className="p-2.5 flex-shrink-0"
            style={{ borderTop: `1px solid ${border}` }}
          >
            {/* User card */}
            <motion.div
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer"
              style={{ background: surfaceHover }}
              whileHover={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }}
            >
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden"
                style={{ boxShadow: isPremiumUser ? "0 0 10px rgba(245,158,11,0.25)" : "none" }}
              >
                <img src={getDiceBearUrl(userName || "User")} alt="avatar" width={28} height={28} style={{ borderRadius: "50%", display: "block" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold truncate" style={{ color: text }}>
                  {userName || "User"}
                </div>
                {isPremiumUser ? (
                  <div className="flex items-center gap-0.5">
                    <Star className="w-2 h-2" style={{ color: "#f59e0b" }} />
                    <span className="text-[9px] font-medium" style={{ color: "#f59e0b" }}>{planLabel}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px] font-medium" style={{ color: textMuted }}>Free</span>
                  </div>
                )}
              </div>
              {isPremiumUser && <Zap className="w-3 h-3 flex-shrink-0" style={{ color: "#f59e0b" }} />}
            </motion.div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ─── Individual session item ──────────────────────────────────────────────────

function SessionItem({
  session,
  isActive,
  isHovered,
  isDark,
  index,
  text,
  textSec,
  textMuted,
  surfaceHover,
  activeItem,
  onSelect,
  onDelete,
  onHover,
}: {
  session: ChatSession;
  isActive: boolean;
  isHovered: boolean;
  isDark: boolean;
  index: number;
  text: string;
  textSec: string;
  textMuted: string;
  surfaceHover: string;
  activeItem: string;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onHover: (id: string | null) => void;
}) {
  return (
    <motion.div
      onClick={onSelect}
      onMouseEnter={() => onHover(session.id)}
      onMouseLeave={() => onHover(null)}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer group relative"
      style={{
        background: isActive ? (isDark ? "rgba(245,158,11,0.09)" : "rgba(245,158,11,0.06)") : "transparent",
        border: isActive ? "1.5px solid rgba(245,158,11,0.4)" : "1.5px solid transparent",
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      whileHover={{
        background: isActive ? (isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)") : surfaceHover,
        x: 2,
      }}
    >
      <MessageSquare
        className="w-3 h-3 flex-shrink-0"
        style={{ color: isActive ? "#f59e0b" : textMuted }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-[11px] font-medium truncate"
          style={{ color: isActive ? "#f59e0b" : textSec }}
        >
          {session.title}
        </div>
        <div className="text-[9px] flex items-center gap-1" style={{ color: textMuted }}>
          <Clock className="w-2 h-2" />
          {new Date(session.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
        </div>
      </div>

      {/* Actions on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1"
          >
            <motion.button
              onClick={onDelete}
              className="w-4 h-4 rounded flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.12)" }}
              whileHover={{ background: "rgba(239,68,68,0.2)", scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Trash2 className="w-2 h-2 text-red-400" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


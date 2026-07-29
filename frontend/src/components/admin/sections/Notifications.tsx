"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell, Mail, MessageSquare, Smartphone,
  Send, FileText, CreditCard, Calendar,
  Award, Megaphone, CheckCircle, Clock,
  Users, Layers, DraftingCompass, Rocket,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

interface ChannelToggle {
  id: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface NotificationTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  channels: string[];
  lastUsed: string;
}

interface CampaignSummary {
  draft: number;
  scheduled: number;
  sent: number;
  total: number;
}

interface RecentNotification {
  id: string;
  title: string;
  audience: string;
  channel: string;
  status: "Sent" | "Failed" | "Scheduled";
  timestamp: string;
  openRate?: string;
}

const CHANNELS: ChannelToggle[] = [
  { id: "push", label: "Push", icon: <Bell size={14} />, enabled: true },
  { id: "email", label: "Email", icon: <Mail size={14} />, enabled: true },
  { id: "sms", label: "SMS", icon: <Smartphone size={14} />, enabled: false },
  { id: "inapp", label: "In-app", icon: <MessageSquare size={14} />, enabled: true },
];

const TEMPLATES: NotificationTemplate[] = [
  { id: "tpl-1", name: "Welcome Email", icon: <Mail size={16} />, description: "Onboarding sequence for new users", channels: ["Email"], lastUsed: "2 hours ago" },
  { id: "tpl-2", name: "Payment Receipt", icon: <CreditCard size={16} />, description: "Transaction confirmation with details", channels: ["Email", "Push"], lastUsed: "5 min ago" },
  { id: "tpl-3", name: "Interview Reminder", icon: <Calendar size={16} />, description: "Upcoming interview alert", channels: ["Push", "SMS", "Email"], lastUsed: "1 hour ago" },
  { id: "tpl-4", name: "Achievement Unlocked", icon: <Award size={16} />, description: "User milestone celebration", channels: ["Push", "In-app"], lastUsed: "3 days ago" },
  { id: "tpl-5", name: "Feature Announcement", icon: <Megaphone size={16} />, description: "New feature release notification", channels: ["Email", "Push", "In-app"], lastUsed: "1 week ago" },
  { id: "tpl-6", name: "Subscription Expiry", icon: <CreditCard size={16} />, description: "Plan renewal reminder (7, 3, 1 day)", channels: ["Email", "Push", "SMS"], lastUsed: "Yesterday" },
];

const CAMPAIGN: CampaignSummary = {
  draft: 3,
  scheduled: 5,
  sent: 128,
  total: 136,
};

const RECENT_NOTIFICATIONS: RecentNotification[] = [
  { id: "notif-1", title: "Welcome to Adyapan AI", audience: "All new users", channel: "Email", status: "Sent", timestamp: "2 min ago", openRate: "68%" },
  { id: "notif-2", title: "Your interview is tomorrow", audience: "Students (scheduled)", channel: "Push", status: "Scheduled", timestamp: "Tomorrow 9:00 AM" },
  { id: "notif-3", title: "Payment confirmed — Pro Plan", audience: "Premium users", channel: "Email", status: "Sent", timestamp: "15 min ago", openRate: "92%" },
  { id: "notif-4", title: "Study streak: 7 days! 🎉", audience: "Active students", channel: "In-app", status: "Sent", timestamp: "1 hour ago", openRate: "87%" },
  { id: "notif-5", title: "Batch 2027 placements begin", audience: "Final year students", channel: "Email", status: "Failed", timestamp: "3 hours ago" },
  { id: "notif-6", title: "Resume builder tips", audience: "All users", channel: "Push", status: "Sent", timestamp: "5 hours ago", openRate: "54%" },
  { id: "notif-7", title: "New feature: AI Flashcards", audience: "All users", channel: "Email", status: "Scheduled", timestamp: "Next Monday 10:00 AM" },
  { id: "notif-8", title: "Payment failed — retry needed", audience: "Users with failed payments", channel: "SMS", status: "Sent", timestamp: "Yesterday", openRate: "—" },
];

function statusNotifVariant(s: RecentNotification["status"]) {
  switch (s) {
    case "Sent": return "success" as const;
    case "Failed": return "error" as const;
    case "Scheduled": return "info" as const;
  }
}

export default function Notifications() {
  const [channels, setChannels] = useState<ChannelToggle[]>(CHANNELS);

  const toggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, enabled: !ch.enabled } : ch))
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Notifications & Campaigns"
        description="Create, schedule, and manage platform notifications and campaigns"
        actions={
          <StatusBadge variant="info">{RECENT_NOTIFICATIONS.length} Recent</StatusBadge>
        }
      />

      {/* Channel Toggles */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Notification Channels</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {channels.map((ch) => (
            <motion.button
              key={ch.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleChannel(ch.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: ch.enabled ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                color: ch.enabled ? "#f59e0b" : "var(--text-secondary)",
                border: `1px solid ${ch.enabled ? "rgba(245,158,11,0.3)" : "var(--border-color)"}`,
              }}
            >
              {ch.icon}
              {ch.label}
              <StatusBadge variant={ch.enabled ? "success" : "default"}>
                {ch.enabled ? "Active" : "Disabled"}
              </StatusBadge>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Send size={16} style={{ color: "#818cf8" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Campaigns</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="text-lg font-black font-mono" style={{ color: "#f59e0b" }}>{CAMPAIGN.draft}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--text-muted)" }}>
                <DraftingCompass size={11} className="inline mr-1" />Draft
              </div>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div className="text-lg font-black font-mono" style={{ color: "#818cf8" }}>{CAMPAIGN.scheduled}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--text-muted)" }}>
                <Clock size={11} className="inline mr-1" />Scheduled
              </div>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="text-lg font-black font-mono" style={{ color: "#10b981" }}>{CAMPAIGN.sent}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--text-muted)" }}>
                <Rocket size={11} className="inline mr-1" />Sent
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)" }}>
            <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Total campaigns</span>
            <span className="text-sm font-black font-mono" style={{ color: "var(--text-primary)" }}>{CAMPAIGN.total}</span>
          </div>
        </motion.div>

        {/* Create Notification Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>New Notification</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Title</label>
              <div className="rounded-xl border px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)" }}>
                <input
                  type="text"
                  placeholder="e.g. New feature available!"
                  className="w-full bg-transparent text-xs font-medium outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Message</label>
              <div className="rounded-xl border px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)" }}>
                <textarea
                  rows={3}
                  placeholder="Write your notification message..."
                  className="w-full bg-transparent text-xs font-medium outline-none resize-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Audience</label>
                <div className="rounded-xl border px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)" }}>
                  <select className="w-full bg-transparent text-xs font-medium outline-none" style={{ color: "var(--text-primary)" }}>
                    <option>All Users</option>
                    <option>Premium Users</option>
                    <option>Free Users</option>
                    <option>Students</option>
                    <option>Universities</option>
                    <option>Companies</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Channel</label>
                <div className="rounded-xl border px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)" }}>
                  <select className="w-full bg-transparent text-xs font-medium outline-none" style={{ color: "var(--text-primary)" }}>
                    <option>All Channels</option>
                    <option>Email Only</option>
                    <option>Push Only</option>
                    <option>SMS Only</option>
                    <option>In-app Only</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#000",
                }}
              >
                <Send size={12} />
                Send Now
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <Clock size={12} />
                Schedule
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <FileText size={12} />
                Save as Draft
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Templates */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <FileText size={16} style={{ color: "#f472b6" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Notification Templates</h2>
          <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            {TEMPLATES.length} templates
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 p-4">
          {TEMPLATES.map((tpl, idx) => (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
              className="p-4 rounded-xl border transition-all hover:scale-[1.03] cursor-pointer"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-color)" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                {tpl.icon}
              </div>
              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{tpl.name}</p>
              <p className="text-[9px] font-medium mt-0.5 leading-tight" style={{ color: "var(--text-muted)" }}>{tpl.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {tpl.channels.map((ch) => (
                  <span key={ch} className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider" style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>
                    {ch}
                  </span>
                ))}
              </div>
              <div className="text-[9px] font-medium mt-2" style={{ color: "var(--text-muted)" }}>
                Last used: {tpl.lastUsed}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Notification Log */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <Bell size={16} style={{ color: "#10b981" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Recent Notifications</h2>
          <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            Last 24 hours
          </span>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
          {RECENT_NOTIFICATIONS.map((n, idx) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.2 }}
              className="flex items-center gap-4 px-5 py-3.5 transition-all hover:bg-white/[0.02]"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{n.title}</span>
                  <StatusBadge variant={statusNotifVariant(n.status)} pulse={n.status === "Sent"}>
                    {n.status}
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{n.audience}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8" }}>{n.channel}</span>
                  {n.openRate && n.openRate !== "—" && (
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Open rate: {n.openRate}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Clock size={10} style={{ color: "var(--text-muted)" }} />
                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{n.timestamp}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

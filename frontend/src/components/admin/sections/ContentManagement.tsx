"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText, Megaphone, Layout, Images, MessageSquare,
  HelpCircle, Briefcase, FileCheck, Clock, Eye, RefreshCw
} from "lucide-react";
import { api } from "@/services/api";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { toast } from "sonner";

interface ContentSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  itemCount: number;
  lastUpdated: string;
  status: "Published" | "Draft";
  description: string;
}

export default function ContentManagement() {
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContentStats = async () => {
    setLoading(true);
    try {
      const [dashRes, settingsRes] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/settings"),
      ]);

      const m = dashRes.data?.stats?.modules || {};
      const banner = settingsRes.data?.settings?.announcementBanner || "";

      setSections([
        { id: "resumes", title: "Resumes & ATS Templates", icon: <FileText size={16} />, itemCount: m.resume?.resumes ?? 0, lastUpdated: "Updated live", status: "Published", description: "User resumes and ATS check templates" },
        { id: "announcements", title: "Platform Announcements", icon: <Megaphone size={16} />, itemCount: banner ? 1 : 0, lastUpdated: "Updated live", status: banner ? "Published" : "Draft", description: "Active system announcement banner" },
        { id: "notes", title: "Learning Notes & Quizzes", icon: <Layout size={16} />, itemCount: (m.learning?.notes ?? 0) + (m.learning?.quizzes ?? 0), lastUpdated: "Updated live", status: "Published", description: "AI generated study notes and quizzes" },
        { id: "coding", title: "Coding Problems & Submissions", icon: <Images size={16} />, itemCount: (m.coding?.submissions ?? 0) + (m.coding?.challenges ?? 0), lastUpdated: "Updated live", status: "Published", description: "Codeforces & DSA problem submissions" },
        { id: "interviews", title: "Interview Practice Sessions", icon: <MessageSquare size={16} />, itemCount: m.interview?.sessions ?? 0, lastUpdated: "Updated live", status: "Published", description: "AI interview mock sessions" },
        { id: "chat", title: "Ady AI Chat Transcripts", icon: <HelpCircle size={16} />, itemCount: m.chat?.sessions ?? 0, lastUpdated: "Updated live", status: "Published", description: "AI learning chat conversations" },
      ]);
    } catch {
      toast.error("Failed to load content telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentStats();
  }, []);

  const totalItems = sections.reduce((sum, s) => sum + s.itemCount, 0);
  const publishedCount = sections.filter((s) => s.status === "Published").length;

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Content Management"
        description="Manage all platform content, generated assets, and system media"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" pulse>{publishedCount}/{sections.length} Published</StatusBadge>
            <StatusBadge variant="info">{totalItems} Total Assets</StatusBadge>
            <button
              onClick={fetchContentStats}
              disabled={loading}
              className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section, idx) => (
          <ContentCard key={section.id} section={section} delay={idx * 0.035} />
        ))}
      </div>
    </div>
  );
}

function ContentCard({ section, delay }: { section: ContentSection; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:scale-[1.02] cursor-pointer"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <span style={{ color: "#f59e0b" }}>{section.icon}</span>
        </div>
        <StatusBadge variant={section.status === "Published" ? "success" : "warning"}>
          {section.status === "Published" ? <Eye size={10} /> : <Clock size={10} />}
          {section.status}
        </StatusBadge>
      </div>

      <div>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{section.title}</h3>
        <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>{section.description}</p>
      </div>

      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--border-color)" }}>
        <div>
          <span className="text-lg font-black font-mono" style={{ color: "#f59e0b" }}>{section.itemCount}</span>
          <span className="text-[10px] font-medium ml-1" style={{ color: "var(--text-muted)" }}>records</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={10} style={{ color: "var(--text-muted)" }} />
          <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>{section.lastUpdated}</span>
        </div>
      </div>
    </motion.div>
  );
}

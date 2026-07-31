"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText, Briefcase, Search, Code, Monitor,
  ClipboardList, HelpCircle, Layers, Mail, FileCheck,
  MessageSquare, Calendar, Flame, Loader2, RefreshCw,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { api } from "@/services/api";

interface ModulesData {
  resumeHub: {
    resumes: number; atsReports: number; coverLetters: number; linkedinReports: number;
  };
  learningHub: {
    studySessions: number; notes: number; quizzes: number; assignments: number;
    ppts: number; mindmaps: number; flashcards: number;
  };
  codingHub: {
    sessions: number; submissions: number; challenges: number;
  };
  interviewHub: {
    sessions: number; completed: number;
  };
}

interface FeatureRow {
  key: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  value: number;
}

const FEATURES: Omit<FeatureRow, "value">[] = [
  { key: "resumes", name: "Resume Builder", icon: <FileText size={16} />, color: "#f59e0b" },
  { key: "atsReports", name: "ATS Reports", icon: <Search size={16} />, color: "#f59e0b" },
  { key: "coverLetters", name: "Cover Letters", icon: <Mail size={16} />, color: "#f59e0b" },
  { key: "linkedinReports", name: "LinkedIn Reports", icon: <FileCheck size={16} />, color: "#f59e0b" },
  { key: "studySessions", name: "Study Sessions", icon: <Calendar size={16} />, color: "#10b981" },
  { key: "notes", name: "Notes Generated", icon: <ClipboardList size={16} />, color: "#10b981" },
  { key: "quizzes", name: "Quizzes", icon: <HelpCircle size={16} />, color: "#10b981" },
  { key: "assignments", name: "Assignments", icon: <Layers size={16} />, color: "#10b981" },
  { key: "ppts", name: "PPT Generator", icon: <Monitor size={16} />, color: "#10b981" },
  { key: "mindmaps", name: "Mind Maps", icon: <Flame size={16} />, color: "#10b981" },
  { key: "flashcards", name: "Flashcards", icon: <MessageSquare size={16} />, color: "#10b981" },
  { key: "sessions", name: "Coding Sessions", icon: <Code size={16} />, color: "#818cf8" },
  { key: "submissions", name: "Code Submissions", icon: <FileText size={16} />, color: "#818cf8" },
  { key: "challenges", name: "Challenges", icon: <Briefcase size={16} />, color: "#818cf8" },
  { key: "interviewSessions", name: "Interview Sessions", icon: <Briefcase size={16} />, color: "#f472b6" },
  { key: "interviewCompleted", name: "Interviews Completed", icon: <MessageSquare size={16} />, color: "#f472b6" },
];

const FEATURE_GROUPS = [
  { label: "Resume Hub", color: "#f59e0b", keys: ["resumes", "atsReports", "coverLetters", "linkedinReports"] },
  { label: "Learning Hub", color: "#10b981", keys: ["studySessions", "notes", "quizzes", "assignments", "ppts", "mindmaps", "flashcards"] },
  { label: "Coding Hub", color: "#818cf8", keys: ["sessions", "submissions", "challenges"] },
  { label: "Interview Hub", color: "#f472b6", keys: ["interviewSessions", "interviewCompleted"] },
];

export default function FeatureManagement() {
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/modules");
      const m: ModulesData = res.data?.modules;
      if (!m) return;

      const map: Record<string, number> = {
        resumes: m.resumeHub?.resumes ?? 0,
        atsReports: m.resumeHub?.atsReports ?? 0,
        coverLetters: m.resumeHub?.coverLetters ?? 0,
        linkedinReports: m.resumeHub?.linkedinReports ?? 0,
        studySessions: m.learningHub?.studySessions ?? 0,
        notes: m.learningHub?.notes ?? 0,
        quizzes: m.learningHub?.quizzes ?? 0,
        assignments: m.learningHub?.assignments ?? 0,
        ppts: m.learningHub?.ppts ?? 0,
        mindmaps: m.learningHub?.mindmaps ?? 0,
        flashcards: m.learningHub?.flashcards ?? 0,
        sessions: m.codingHub?.sessions ?? 0,
        submissions: m.codingHub?.submissions ?? 0,
        challenges: m.codingHub?.challenges ?? 0,
        interviewSessions: m.interviewHub?.sessions ?? 0,
        interviewCompleted: m.interviewHub?.completed ?? 0,
      };

      setFeatures(
        FEATURES.map((f) => ({ ...f, value: map[f.key] ?? 0 }))
      );
    } catch {
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeCount = features.filter((f) => f.value > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading Feature Management
          </span>
        </div>
      </div>
    );
  }

  const total = features.reduce((s, f) => s + f.value, 0);
  const maxVal = Math.max(...features.map((f) => f.value), 1);

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Feature Management"
        description="Live usage across all platform features"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge variant="success" pulse>{activeCount}/{features.length} Active</StatusBadge>
            <StatusBadge variant="info">{total.toLocaleString()} Total Items</StatusBadge>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <RefreshCw size={12} />
              Refresh
            </motion.button>
          </div>
        }
      />

      {FEATURE_GROUPS.map((group, gi) => {
        const groupFeatures = features.filter((f) => group.keys.includes(f.key));
        return (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.06, duration: 0.35 }}
            className="rounded-2xl border p-5"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: group.color }} />
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                {group.label}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {groupFeatures.map((feat) => {
                const pct = Math.round((feat.value / maxVal) * 100);
                const active = feat.value > 0;
                return (
                  <div
                    key={feat.key}
                    className="rounded-xl border p-3.5"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-color)" }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${feat.color}18` }}>
                        <span style={{ color: feat.color }}>{feat.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{feat.name}</p>
                        <p className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>Total records</p>
                      </div>
                      <StatusBadge variant={active ? "success" : "default"}>
                        {active ? "Active" : "Unused"}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Usage</span>
                      <span className="text-xs font-black font-mono" style={{ color: feat.color }}>
                        {feat.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: feat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

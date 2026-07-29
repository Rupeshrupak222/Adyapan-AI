"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText, Briefcase, Search, Code, Monitor,
  ClipboardList, HelpCircle, Layers, Mail, FileCheck,
  MessageSquare, Route, Calendar, Flame,
  ChevronRight,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

const STATUS_CYCLE = ["Enabled", "Disabled", "Maintenance", "Beta", "Premium Only"] as const;
type FeatureStatus = (typeof STATUS_CYCLE)[number];

function nextStatus(s: FeatureStatus): FeatureStatus {
  const idx = STATUS_CYCLE.indexOf(s);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function statusMap(s: FeatureStatus) {
  switch (s) {
    case "Enabled": return { variant: "success" as const, color: "#10b981" };
    case "Disabled": return { variant: "error" as const, color: "#ef4444" };
    case "Maintenance": return { variant: "warning" as const, color: "#f59e0b" };
    case "Beta": return { variant: "info" as const, color: "#818cf8" };
    case "Premium Only": return { variant: "info" as const, color: "#f472b6" };
  }
}

function healthColor(s: FeatureStatus, traffic: number): string {
  if (s === "Disabled") return "#ef4444";
  if (s === "Maintenance") return "#f59e0b";
  if (s === "Beta" || s === "Premium Only") return "#f59e0b";
  if (traffic < 20) return "#ef4444";
  if (traffic < 60) return "#f59e0b";
  return "#10b981";
}

function healthLabel(s: FeatureStatus, traffic: number): string {
  if (s === "Disabled") return "Critical";
  if (s === "Maintenance") return "Warning";
  if (s === "Beta" || s === "Premium Only") return "Warning";
  if (traffic < 20) return "Critical";
  if (traffic < 60) return "Warning";
  return "Healthy";
}

const FEATURE_DEFS = [
  { id: "resume-builder", name: "Resume Builder", icon: <FileText size={16} />, version: "2.1.0" },
  { id: "interview-ai", name: "Interview AI", icon: <Briefcase size={16} />, version: "1.4.2" },
  { id: "research-ai", name: "Research AI", icon: <Search size={16} />, version: "1.2.0" },
  { id: "coding-ai", name: "Coding AI", icon: <Code size={16} />, version: "2.0.1" },
  { id: "ppt-generator", name: "PPT Generator", icon: <Monitor size={16} />, version: "1.1.3" },
  { id: "assignments", name: "Assignments", icon: <ClipboardList size={16} />, version: "1.0.5" },
  { id: "mcq-generator", name: "MCQ Generator", icon: <HelpCircle size={16} />, version: "1.3.0" },
  { id: "flashcards", name: "Flashcards", icon: <Layers size={16} />, version: "1.0.2" },
  { id: "email-writer", name: "Email Writer", icon: <Mail size={16} />, version: "1.1.0" },
  { id: "sop-generator", name: "SOP Generator", icon: <FileCheck size={16} />, version: "1.0.8" },
  { id: "ady-chat", name: "Ady Chat", icon: <MessageSquare size={16} />, version: "2.3.1" },
  { id: "career-roadmap", name: "Career Roadmap", icon: <Route size={16} />, version: "1.0.4" },
  { id: "study-planner", name: "Study Planner", icon: <Calendar size={16} />, version: "1.2.1" },
  { id: "learning-streak", name: "Learning Streak", icon: <Flame size={16} />, version: "1.0.0" },
];

interface FeatureState {
  id: string;
  status: FeatureStatus;
  traffic: number;
}

function initFeatures(): FeatureState[] {
  return FEATURE_DEFS.map((f) => ({
    id: f.id,
    status: "Enabled" as FeatureStatus,
    traffic: 50 + Math.floor(Math.random() * 41),
  }));
}

export default function FeatureManagement() {
  const [features, setFeatures] = useState<FeatureState[]>(initFeatures);

  const cycleStatus = useCallback((id: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: nextStatus(f.status) } : f))
    );
  }, []);

  const setTraffic = useCallback((id: string, traffic: number) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, traffic: Math.min(100, Math.max(0, traffic)) } : f))
    );
  }, []);

  const enabledCount = features.filter((f) => f.status === "Enabled").length;

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Feature Management"
        description="Control platform features, rollouts, toggles, and A/B experiments"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge variant="success" pulse>
              {enabledCount}/{FEATURE_DEFS.length} Enabled
            </StatusBadge>
            <StatusBadge variant="info">v2.4.1</StatusBadge>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {FEATURE_DEFS.map((def, idx) => {
          const state = features.find((f) => f.id === def.id)!;
          const sm = statusMap(state.status);
          const hColor = healthColor(state.status, state.traffic);
          const hLabel = healthLabel(state.status, state.traffic);

          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.025, duration: 0.3 }}
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <span style={{ color: "#f59e0b" }}>{def.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                      {def.name}
                    </p>
                    <p className="text-[10px] font-medium font-mono" style={{ color: "var(--text-muted)" }}>
                      v{def.version}
                    </p>
                  </div>
                </div>
                {/* Health */}
                <div className="flex items-center gap-1.5 shrink-0 mt-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: hColor }} />
                  <span className="text-[9px] font-bold uppercase" style={{ color: hColor }}>
                    {hLabel}
                  </span>
                </div>
              </div>

              {/* Status toggle */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => cycleStatus(def.id)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: `${sm.color}14`,
                  color: sm.color,
                  border: `1px solid ${sm.color}30`,
                }}
              >
                {state.status}
                <ChevronRight size={11} />
              </motion.button>

              {/* Traffic slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Traffic
                  </span>
                  <span className="text-[11px] font-bold font-mono" style={{ color: "#f59e0b" }}>
                    {state.traffic}%
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: "linear-gradient(90deg, #f59e0b, #d97706)" }}
                    initial={false}
                    animate={{ width: `${state.traffic}%` }}
                    transition={{ duration: 0.15 }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={state.traffic}
                    onChange={(e) => setTraffic(def.id, Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

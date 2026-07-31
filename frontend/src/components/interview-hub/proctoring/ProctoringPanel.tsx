"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Mic,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Move,
  Maximize2,
  Minimize2,
  Users,
  Check,
  XCircle,
  Eye,
  ShieldAlert,
} from "lucide-react";
import type { ProctoringState } from "./proctoringTypes";

interface ProctoringPanelProps {
  proctorState: ProctoringState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isDark?: boolean;
  isMinimised?: boolean;
  onToggleMinimize?: () => void;
}

export const ProctoringPanel: React.FC<ProctoringPanelProps> = ({
  proctorState,
  videoRef,
  isDark = true,
  isMinimised = false,
  onToggleMinimize,
}) => {
  const [localMinimized, setLocalMinimized] = useState(false);
  const minimised = isMinimised ?? localMinimized;
  const toggleMin = onToggleMinimize ?? (() => setLocalMinimized((p) => !p));

  const {
    warnings,
    maxWarnings,
    personCount,
    cameraActive,
    micActive,
    detectionStatus,
    pendingViolation,
  } = proctorState;

  // Status colors & labels
  const getStatusBadge = () => {
    if (proctorState.cooldownActive && proctorState.cooldownRemainingSeconds > 0) {
      return {
        label: `Grace Period (${proctorState.cooldownRemainingSeconds}s)`,
        bg: isDark ? "rgba(245, 158, 11, 0.25)" : "#fef3c7",
        color: isDark ? "#fbbf24" : "#d97706",
        border: isDark ? "rgba(245, 158, 11, 0.5)" : "#fcd34d",
      };
    }
    if (detectionStatus === "violation" || warnings > 0) {
      return {
        label: `Violation (${warnings}/${maxWarnings})`,
        bg: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2",
        color: isDark ? "#f87171" : "#dc2626",
        border: isDark ? "rgba(239, 68, 68, 0.4)" : "#fca5a5",
      };
    }
    if (detectionStatus === "pending_violation") {
      return {
        label: "Checking...",
        bg: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7",
        color: isDark ? "#fbbf24" : "#d97706",
        border: isDark ? "rgba(245, 158, 11, 0.4)" : "#fcd34d",
      };
    }
    return {
      label: "AI Monitoring",
      bg: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
      color: isDark ? "#34d399" : "#059669",
      border: isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0",
    };
  };

  const badge = getStatusBadge();

  return (
    <motion.div
      drag
      dragConstraints={{ left: -300, right: 300, top: -200, bottom: 400 }}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`fixed bottom-5 right-5 z-50 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-200 select-none overflow-hidden ${
        isDark
          ? "bg-slate-900/90 text-white border-white/10"
          : "bg-white/95 text-slate-900 border-slate-200"
      }`}
      style={{ width: minimised ? "200px" : "280px" }}
    >
      {/* Header bar */}
      <div
        className={`px-3 py-2 flex items-center justify-between border-b cursor-move ${
          isDark ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Recording pulse indicator */}
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-xs font-bold tracking-wide uppercase flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-400" />
            AI Proctor
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleMin}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? "hover:bg-white/10 text-white/70" : "hover:bg-slate-200 text-slate-600"
            }`}
            title={minimised ? "Expand Video" : "Minimize"}
          >
            {minimised ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <AnimatePresence mode="wait">
        {!minimised ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 space-y-2.5"
          >
            {/* Live Camera Feed Container */}
            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-black/80 border border-white/10 group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Status Badge overlay */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md"
                  style={{
                    backgroundColor: badge.bg,
                    color: badge.color,
                    borderColor: badge.border,
                  }}
                >
                  {badge.label}
                </span>
              </div>

              {/* Warnings Pill */}
              <div className="absolute top-2 right-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md flex items-center gap-1 ${
                    warnings > 0
                      ? "bg-red-500/80 text-white border-red-400"
                      : "bg-black/60 text-white/90 border-white/20"
                  }`}
                >
                  <AlertTriangle size={11} />
                  Warnings {warnings}/{maxWarnings}
                </span>
              </div>

              {/* Person count overlay */}
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 text-[10px] font-semibold text-white/90 flex items-center gap-1">
                <Users size={11} className={personCount !== 1 ? "text-amber-400" : "text-emerald-400"} />
                {personCount} {personCount === 1 ? "Person" : "Persons"} Detected
              </div>

              {/* Live camera indicator tag */}
              <div className="absolute bottom-2 right-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                ● LIVE
              </div>
            </div>

            {/* Status Checklist & Telemetry */}
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
                isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1" title="Camera Status">
                  <Camera size={13} className={cameraActive ? "text-emerald-400" : "text-red-400"} />
                  <span className="text-[11px] font-semibold">Camera</span>
                  {cameraActive ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <XCircle size={12} className="text-red-400" />
                  )}
                </div>

                <div className="flex items-center gap-1" title="Microphone Status">
                  <Mic size={13} className={micActive ? "text-emerald-400" : "text-red-400"} />
                  <span className="text-[11px] font-semibold">Mic</span>
                  {micActive ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <XCircle size={12} className="text-red-400" />
                  )}
                </div>
              </div>

              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <Eye size={12} />
                Encrypted & Local
              </div>
            </div>
          </motion.div>
        ) : (
          /* Minimized State */
          <motion.div
            key="minimized"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-2 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden relative bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              </div>
              <div>
                <div className="font-bold text-[11px] leading-tight">Proctor Active</div>
                <div className="text-[10px] opacity-70">Warnings: {warnings}/{maxWarnings}</div>
              </div>
            </div>
            <button
              onClick={toggleMin}
              className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-500/30 transition-colors"
            >
              Expand
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

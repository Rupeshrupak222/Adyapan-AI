"use client";

import React from "react";
import { Camera, Mic, ShieldCheck, AlertTriangle } from "lucide-react";
import type { ProctoringState } from "./proctoringTypes";

interface ProctoringHUDProps {
  proctorState: ProctoringState;
  isDark?: boolean;
  className?: string;
}

export const ProctoringHUD: React.FC<ProctoringHUDProps> = ({
  proctorState,
  isDark = true,
  className = "",
}) => {
  const { warnings, maxWarnings, cameraActive, micActive, modelLoaded } = proctorState;

  return (
    <div
      className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-semibold select-none ${
        isDark
          ? "bg-slate-900/80 border-white/10 text-white/90"
          : "bg-white/90 border-slate-200 text-slate-800"
      } ${className}`}
    >
      {/* Camera status */}
      <div className="flex items-center gap-1">
        <Camera size={13} className={cameraActive ? "text-emerald-400" : "text-red-400"} />
        <span className="hidden sm:inline text-[11px]">Camera</span>
        <span className={cameraActive ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
          {cameraActive ? "✓" : "✗"}
        </span>
      </div>

      <div className={`h-3 w-px ${isDark ? "bg-white/15" : "bg-slate-300"}`} />

      {/* Mic status */}
      <div className="flex items-center gap-1">
        <Mic size={13} className={micActive ? "text-emerald-400" : "text-red-400"} />
        <span className="hidden sm:inline text-[11px]">Microphone</span>
        <span className={micActive ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
          {micActive ? "✓" : "✗"}
        </span>
      </div>

      <div className={`h-3 w-px ${isDark ? "bg-white/15" : "bg-slate-300"}`} />

      {/* AI Proctor status */}
      <div className="flex items-center gap-1">
        <ShieldCheck size={13} className={modelLoaded ? "text-emerald-400" : "text-amber-400"} />
        <span className="hidden sm:inline text-[11px]">AI Monitor</span>
        <span className={modelLoaded ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
          {modelLoaded ? "✓" : "..."}
        </span>
      </div>

      <div className={`h-3 w-px ${isDark ? "bg-white/15" : "bg-slate-300"}`} />

      {/* Warnings counter */}
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold ${
          warnings > 0
            ? "bg-red-500/20 text-red-400 border-red-500/30"
            : isDark
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}
      >
        <AlertTriangle size={12} />
        <span>Warnings</span>
        <span>
          {warnings} / {maxWarnings}
        </span>
      </div>

      {proctorState.cooldownActive && proctorState.cooldownRemainingSeconds > 0 && (
        <>
          <div className={`h-3 w-px ${isDark ? "bg-white/15" : "bg-slate-300"}`} />
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold bg-amber-500/20 text-amber-400 border-amber-500/30">
            <span>Grace: {proctorState.cooldownRemainingSeconds}s</span>
          </div>
        </>
      )}
    </div>
  );
};

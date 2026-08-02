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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border backdrop-blur-md text-[10px] font-medium select-none max-w-full overflow-x-auto scrollbar-none whitespace-nowrap ${
        isDark
          ? "bg-slate-900/90 border-white/15 text-slate-200"
          : "bg-white/95 border-slate-200 text-slate-800"
      } ${className}`}
    >
      {/* Camera status */}
      <div className="flex items-center gap-1">
        <Camera size={12} className={cameraActive ? "text-emerald-400" : "text-rose-400"} />
        <span className="text-[10px]">Camera</span>
        <span className={cameraActive ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
          {cameraActive ? "✓" : "✗"}
        </span>
      </div>

      <div className={`h-2.5 w-px ${isDark ? "bg-white/20" : "bg-slate-300"}`} />

      {/* Mic status */}
      <div className="flex items-center gap-1">
        <Mic size={12} className={micActive ? "text-emerald-400" : "text-rose-400"} />
        <span className="text-[10px]">Mic</span>
        <span className={micActive ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
          {micActive ? "✓" : "✗"}
        </span>
      </div>

      <div className={`h-2.5 w-px ${isDark ? "bg-white/20" : "bg-slate-300"}`} />

      {/* AI Proctor status */}
      <div className="flex items-center gap-1">
        <ShieldCheck size={12} className={modelLoaded ? "text-emerald-400" : "text-amber-400"} />
        <span className="text-[10px]">AI</span>
        <span className={modelLoaded ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
          {modelLoaded ? "✓" : "..."}
        </span>
      </div>

      <div className={`h-2.5 w-px ${isDark ? "bg-white/20" : "bg-slate-300"}`} />

      {/* Warnings counter */}
      <div
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${
          warnings > 0
            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
            : isDark
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}
      >
        <AlertTriangle size={10} />
        <span>Warn {warnings}/{maxWarnings}</span>
      </div>

      {proctorState.cooldownActive && proctorState.cooldownRemainingSeconds > 0 && (
        <>
          <div className={`h-2.5 w-px ${isDark ? "bg-white/20" : "bg-slate-300"}`} />
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold bg-amber-500/20 text-amber-300 border-amber-500/30">
            <span>Grace: {proctorState.cooldownRemainingSeconds}s</span>
          </div>
        </>
      )}
    </div>
  );
};

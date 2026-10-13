"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { ActiveWarningInfo } from "./proctoringTypes";

interface ProctorWarningModalProps {
  warning: ActiveWarningInfo | null;
  onDismiss: () => void;
  isTerminated?: boolean;
}

export const ProctorWarningModal: React.FC<ProctorWarningModalProps> = ({
  warning,
  onDismiss,
  isTerminated = false,
}) => {
  if (!warning && !isTerminated) return null;

  const isCritical = isTerminated || (warning ? warning.warningNumber >= warning.maxWarnings : false);
  const remainingWarnings = warning ? Math.max(0, warning.maxWarnings - warning.warningNumber) : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`relative max-w-lg w-full rounded-2xl p-6 sm:p-7 text-center border shadow-2xl overflow-hidden ${
            isCritical
              ? "bg-[#140608] border-rose-500/50 text-white shadow-rose-950/50"
              : "bg-[#0f0e1a] border-amber-500/40 text-white shadow-amber-950/40"
          }`}
        >
          {/* Top ambient glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 rounded-full blur-3xl pointer-events-none ${
              isCritical ? "bg-rose-500/25" : "bg-amber-500/20"
            }`}
          />

          {/* Alert icon badge */}
          <div className="relative mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center">
            <div
              className={`w-full h-full rounded-2xl flex items-center justify-center shadow-lg ${
                isCritical
                  ? "bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-rose-500/10"
                  : "bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-amber-500/10"
              }`}
            >
              {isCritical ? (
                <ShieldAlert className="w-8 h-8 animate-pulse text-rose-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              )}
            </div>
          </div>

          {/* Pill banner */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3 border backdrop-blur-sm ${
              isCritical
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCritical ? "bg-rose-400 animate-ping" : "bg-amber-400 animate-pulse"
              }`}
            />
            <span>
              {isCritical
                ? "Session Terminated"
                : `Security Warning (${warning?.warningNumber || 1} of ${warning?.maxWarnings || 3})`}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2 text-white">
            {isCritical
              ? "Interview Terminated"
              : warning?.type === "tab_switch"
              ? "Tab Switching Detected"
              : warning?.title || "Proctoring Security Warning"}
          </h2>

          {/* Message */}
          <p className="text-sm text-white/70 leading-relaxed mb-5">
            {isCritical
              ? "You have reached the maximum allowed proctoring violations. Your interview has been ended and security logs have been submitted with your session."
              : warning?.message || "Please remain in frame and focus on the interview window."}
          </p>

          {/* Remaining warnings counter */}
          {!isCritical && (
            <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center justify-between">
              <span className="text-white/60 font-medium">Warnings Remaining:</span>
              <span className="font-extrabold text-amber-400">
                {remainingWarnings} {remainingWarnings === 1 ? "chance" : "chances"} left
              </span>
            </div>
          )}

          {/* Action button */}
          {!isCritical ? (
            <button
              onClick={onDismiss}
              className="w-full py-3.5 px-6 rounded-xl font-extrabold text-sm transition-all shadow-lg cursor-pointer bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black active:scale-[0.98]"
            >
              I Understand, Return to Interview
            </button>
          ) : (
            <div className="text-xs text-rose-300/80 font-semibold animate-pulse">
              Redirecting to session analysis...
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

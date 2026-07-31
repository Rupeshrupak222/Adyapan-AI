"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Camera,
  Mic,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Lock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { ProctoringState } from "./proctoringTypes";

interface PermissionGateModalProps {
  isOpen: boolean;
  proctorState: ProctoringState;
  onGrantPermission: () => Promise<boolean>;
  onProceed: () => void;
  onCancel?: () => void;
  isDark?: boolean;
  interviewTitle?: string;
}

export const PermissionGateModal: React.FC<PermissionGateModalProps> = ({
  isOpen,
  proctorState,
  onGrantPermission,
  onProceed,
  onCancel,
  isDark = true,
  interviewTitle = "AI Interview Session",
}) => {
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  const { status, cameraActive, micActive, modelLoaded, errorMessage, loadingStepMessage } =
    proctorState;

  const isReady = cameraActive && micActive && modelLoaded && status === "active";
  const hasError = status === "error" || Boolean(errorMessage);

  const handleGrant = async () => {
    setLoading(true);
    try {
      const ok = await onGrantPermission();
      if (ok) {
        onProceed();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border ${
            isDark
              ? "bg-slate-900/95 text-white border-white/10"
              : "bg-white text-slate-900 border-slate-200"
          }`}
        >
          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShieldCheck size={28} className="text-black" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{interviewTitle}</h2>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              AI Interview Proctoring & Security Pre-Check
            </p>
          </div>

          {/* Loading / Status Steps */}
          <div
            className={`p-4 rounded-2xl border space-y-3 mb-6 ${
              isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
            }`}
          >
            {/* Step 1: Camera & Mic */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2.5">
                <Camera size={16} className={cameraActive ? "text-emerald-400" : "text-amber-400"} />
                <span>Camera & Microphone Access</span>
              </div>
              {cameraActive && micActive ? (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 size={14} /> Ready
                </span>
              ) : hasError ? (
                <span className="text-red-400 font-bold">Access Required</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <Loader2 size={13} className="animate-spin" /> Requesting...
                </span>
              )}
            </div>

            {/* Step 2: AI Proctor Model Loading */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className={modelLoaded ? "text-emerald-400" : "text-amber-400"} />
                <span>Object Detection Engine (COCO-SSD)</span>
              </div>
              {modelLoaded ? (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 size={14} /> Loaded
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <Loader2 size={13} className="animate-spin" /> {loadingStepMessage || "Loading..."}
                </span>
              )}
            </div>

            {/* Step 3: Local Privacy Guarantee */}
            <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-white/5">
              <div className="flex items-center gap-2.5">
                <Lock size={16} className="text-emerald-400" />
                <span>100% In-Browser Privacy Protection</span>
              </div>
              <span className="text-emerald-400 font-bold text-[11px]">No Video Saved</span>
            </div>
          </div>

          {/* Error Message Box */}
          {hasError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-2"
            >
              <div className="flex items-center gap-2 font-bold text-red-400 text-sm">
                <AlertTriangle size={16} /> Permission Required
              </div>
              <p>{errorMessage || "Camera and microphone access are required to begin the interview."}</p>
            </motion.div>
          )}

          {/* Help details accordion */}
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-3 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1.5"
            >
              <p className="font-bold">How to grant permission:</p>
              <ol className="list-decimal list-inside space-y-1 opacity-90 text-[11px]">
                <li>Click the camera/lock icon in your browser address bar.</li>
                <li>Set <strong>Camera</strong> and <strong>Microphone</strong> to <strong>Allow</strong>.</li>
                <li>Click <strong>Retry</strong> below to re-initialize access.</li>
              </ol>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {isReady ? (
              <button
                onClick={onProceed}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold text-sm hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <span>Enter Interview Room</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleGrant}
                  disabled={loading}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold text-xs hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  <span>{hasError ? "Retry Access" : "Grant Permission"}</span>
                </button>

                <button
                  onClick={() => setShowHelp((p) => !p)}
                  className={`py-3 px-4 rounded-2xl border font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                    isDark
                      ? "border-white/10 hover:bg-white/5 text-white/80"
                      : "border-slate-300 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <HelpCircle size={14} />
                  <span>{showHelp ? "Hide Help" : "Permission Help"}</span>
                </button>
              </div>
            )}

            {onCancel && (
              <button
                onClick={onCancel}
                className={`w-full py-2.5 text-center text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity ${
                  isDark ? "text-white" : "text-slate-800"
                }`}
              >
                Cancel and return to dashboard
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

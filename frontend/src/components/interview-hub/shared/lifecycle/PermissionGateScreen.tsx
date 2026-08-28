"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Camera,
  Mic,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  HelpCircle,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import type { MediaValidationStatus } from "./useInterviewLifecycle";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";

interface PermissionGateScreenProps {
  interviewTitle: string;
  mediaStatus: MediaValidationStatus;
  onRequestPermissions: () => Promise<boolean>;
  onProceedToInterview: () => void;
  onCancel: () => void;
  isDark?: boolean;
  featureKey?: string;
}

export const PermissionGateScreen: React.FC<PermissionGateScreenProps> = ({
  interviewTitle,
  mediaStatus,
  onRequestPermissions,
  onProceedToInterview,
  onCancel,
  isDark = true,
  featureKey,
}) => {
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const { cameraWorking, micWorking, errorMessage } = mediaStatus;
  const isReady = cameraWorking && micWorking;
  const hasError = Boolean(errorMessage);

  const handleGrantAgain = async () => {
    setLoading(true);
    try {
      const ok = await onRequestPermissions();
      if (ok) {
        // Auto-proceed once verified
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-76px)] flex items-center justify-center p-4 md:p-6 transition-colors ${
        isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border ${
          isDark
            ? "bg-slate-900/90 border-slate-800 text-white shadow-purple-950/20"
            : "bg-white border-slate-200 text-slate-900 shadow-slate-200/80"
        }`}
      >
        {/* Top Icon & Title */}
        <div className="text-center space-y-3 mb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ShieldCheck size={32} className="text-black" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                isDark
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                  : "bg-amber-100 text-amber-800 border-amber-300"
              }`}
            >
              Pre-Interview Device Check
            </span>
            {featureKey && <FeatureCreditBadge featureKey={featureKey} isDark={isDark} compact />}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold">{interviewTitle}</h2>
          <p
            className={`text-xs md:text-sm max-w-md mx-auto ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Grant camera and microphone permissions to enter the AI interview room. No video or audio is ever recorded without authorization.
          </p>
        </div>

        {/* Interactive Checklist Box */}
        <div
          className={`p-5 rounded-2xl border space-y-3 mb-6 ${
            isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            System Requirements Checklist:
          </div>

          {/* Checklist Item 1: Camera */}
          <div className="flex items-center justify-between text-xs font-bold p-2.5 rounded-xl border bg-slate-900/40 border-slate-800/80">
            <div className="flex items-center space-x-3">
              <Camera
                size={18}
                className={cameraWorking ? "text-emerald-400" : "text-amber-400"}
              />
              <span>Camera Access & Video Stream</span>
            </div>
            {cameraWorking ? (
              <span className="text-emerald-400 flex items-center space-x-1 font-extrabold">
                <CheckCircle2 size={16} />
                <span>Granted</span>
              </span>
            ) : (
              <span className="text-amber-400 font-semibold text-[11px]">Required</span>
            )}
          </div>

          {/* Checklist Item 2: Microphone */}
          <div className="flex items-center justify-between text-xs font-bold p-2.5 rounded-xl border bg-slate-900/40 border-slate-800/80">
            <div className="flex items-center space-x-3">
              <Mic
                size={18}
                className={micWorking ? "text-emerald-400" : "text-amber-400"}
              />
              <span>Microphone & Voice Input</span>
            </div>
            {micWorking ? (
              <span className="text-emerald-400 flex items-center space-x-1 font-extrabold">
                <CheckCircle2 size={16} />
                <span>Granted</span>
              </span>
            ) : (
              <span className="text-amber-400 font-semibold text-[11px]">Required</span>
            )}
          </div>

          {/* Checklist Item 3: Quiet Environment */}
          <div className="flex items-center justify-between text-xs font-bold p-2.5 rounded-xl border bg-slate-900/40 border-slate-800/80">
            <div className="flex items-center space-x-3">
              <Volume2 size={18} className="text-emerald-400" />
              <span>Quiet Environment Recommended</span>
            </div>
            <span className="text-emerald-400 flex items-center space-x-1 font-extrabold">
              <CheckCircle2 size={16} />
              <span>Ready</span>
            </span>
          </div>

          {/* Checklist Item 4: Local Privacy */}
          <div className="flex items-center justify-between text-xs font-bold p-2.5 rounded-xl border bg-slate-900/40 border-slate-800/80">
            <div className="flex items-center space-x-3">
              <Lock size={18} className="text-emerald-400" />
              <span>100% In-Browser Privacy Protection</span>
            </div>
            <span className="text-emerald-400 text-[10px] uppercase font-extrabold">
              Encrypted
            </span>
          </div>
        </div>

        {/* Error / Denied Message */}
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-2"
          >
            <div className="flex items-center space-x-2 font-bold text-red-400 text-sm">
              <AlertTriangle size={18} />
              <span>Camera & Microphone Access Required</span>
            </div>
            <p className="leading-relaxed">
              {errorMessage ||
                "Camera and microphone access are required to participate in AI interviews. Please grant permissions to continue."}
            </p>
          </motion.div>
        )}

        {/* Help Accordion Details */}
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-2"
          >
            <p className="font-bold flex items-center space-x-1.5 text-amber-300">
              <HelpCircle size={15} />
              <span>How to enable permissions in your browser:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed opacity-90">
              <li>Click the lock or camera icon next to the URL in your browser address bar.</li>
              <li>Toggle both <strong>Camera</strong> and <strong>Microphone</strong> to <strong>Allow</strong>.</li>
              <li>Click <strong>Grant Permission Again</strong> below to re-test your devices.</li>
            </ol>
          </motion.div>
        )}

        {/* Main Action Buttons */}
        <div className="space-y-3">
          {isReady ? (
            <button
              onClick={onProceedToInterview}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2 transform active:scale-98"
            >
              <span>Start Interview Room</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleGrantAgain}
                disabled={loading}
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                <span>{hasError ? "Grant Permission Again" : "Check & Grant Permissions"}</span>
              </button>

              <button
                onClick={() => setShowHelp((prev) => !prev)}
                className={`py-3 px-4 rounded-2xl border font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
                  isDark
                    ? "border-slate-800 hover:bg-slate-800/60 text-slate-300"
                    : "border-slate-300 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <HelpCircle size={15} />
                <span>Help & Troubleshooting</span>
              </button>
            </div>
          )}

          <button
            onClick={onCancel}
            className={`w-full py-2.5 text-xs font-bold transition-colors flex items-center justify-center space-x-1 ${
              isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowLeft size={14} />
            <span>Cancel & Back to Configuration</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

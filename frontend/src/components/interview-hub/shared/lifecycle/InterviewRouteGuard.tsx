"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertOctagon, LogOut, ArrowRight, Play } from "lucide-react";

interface InterviewRouteGuardProps {
  isOpen: boolean;
  onConfirmExit: () => void;
  onCancelExit: () => void;
  isDark?: boolean;
}

export const InterviewRouteGuard: React.FC<InterviewRouteGuardProps> = ({
  isOpen,
  onConfirmExit,
  onCancelExit,
  isDark = true,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
            isDark
              ? "bg-slate-900 text-white border-red-500/30"
              : "bg-white text-slate-900 border-red-300"
          }`}
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertOctagon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-red-400">
                Leave & End Interview?
              </h3>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Session Termination Confirmation
              </p>
            </div>
          </div>

          <p
            className={`text-xs leading-relaxed mb-6 ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}
          >
            Leaving now will immediately end your current AI interview session.
            All camera streams, microphone inputs, speech recognition, timers,
            and background processes will be terminated.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancelExit}
              className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md"
            >
              <Play size={14} className="fill-current" />
              <span>Continue Interview</span>
            </button>

            <button
              onClick={onConfirmExit}
              className="py-3 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
            >
              <LogOut size={14} />
              <span>Leave & End Session</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

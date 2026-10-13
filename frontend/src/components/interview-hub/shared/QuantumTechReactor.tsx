"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Terminal, Cpu, Sparkles } from "lucide-react";

interface QuantumTechReactorProps {
  allComplete: boolean;
  isDark?: boolean;
  iconType?: "code" | "brain" | "terminal";
}

export const QuantumTechReactor: React.FC<QuantumTechReactorProps> = ({
  allComplete,
  isDark = true,
  iconType = "code",
}) => {
  return (
    <div className="relative flex items-center justify-center w-36 h-36 mb-7 select-none">
      {/* ── 1. AMBIENT BACKLIGHT HALO ────────────────────────────────────────── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        animate={{
          scale: allComplete ? [1, 1.3, 1.15] : [1, 1.15, 1],
          opacity: allComplete ? [0.6, 0.9, 0.75] : [0.35, 0.55, 0.35],
        }}
        transition={{
          duration: allComplete ? 0.8 : 2.5,
          repeat: allComplete ? 0 : Infinity,
          ease: "easeInOut",
        }}
        style={{
          width: 140,
          height: 140,
          background: allComplete
            ? "radial-gradient(circle, rgba(16, 185, 129, 0.7) 0%, rgba(6, 182, 212, 0.3) 50%, transparent 70%)"
            : "radial-gradient(circle, rgba(139, 92, 246, 0.65) 0%, rgba(6, 182, 212, 0.35) 50%, transparent 70%)",
          filter: "blur(24px)",
        }}
      />

      {/* ── 2. EXPANDING SONAR RADAR RIPPLES (Radar pulses) ───────────────────── */}
      {!allComplete ? (
        <>
          <motion.div
            className="absolute rounded-full border border-violet-500/40 pointer-events-none"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeOut",
            }}
            style={{ width: 80, height: 80 }}
          />
          <motion.div
            className="absolute rounded-full border border-cyan-400/35 pointer-events-none"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: 1.1,
              ease: "easeOut",
            }}
            style={{ width: 80, height: 80 }}
          />
        </>
      ) : (
        /* Victory Shockwave */
        <motion.div
          className="absolute rounded-full border-2 border-emerald-400/80 pointer-events-none"
          initial={{ scale: 0.7, opacity: 1 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ width: 80, height: 80 }}
        />
      )}

      {/* ── 3. OUTER ORBITAL RING WITH SATELLITE PARTICLES ────────────────────── */}
      <motion.div
        className="absolute w-32 h-32 rounded-full border border-dashed pointer-events-none"
        style={{
          borderColor: allComplete
            ? "rgba(52, 211, 153, 0.4)"
            : "rgba(147, 197, 253, 0.28)",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: allComplete ? 12 : 7,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {/* Orbit particle 1 */}
        <div
          className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow-lg ${
            allComplete
              ? "bg-emerald-400 shadow-[0_0_12px_#34d399]"
              : "bg-cyan-400 shadow-[0_0_12px_#22d3ee]"
          }`}
        />
        {/* Orbit particle 2 */}
        <div
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full opacity-70 ${
            allComplete ? "bg-emerald-300" : "bg-purple-400"
          }`}
        />
      </motion.div>

      {/* ── 4. MIDDLE CYBERNETIC GYRO RING (Counter-rotating) ────────────────── */}
      <motion.div
        className="absolute w-28 h-28 rounded-full pointer-events-none"
        style={{
          border: allComplete
            ? "1.5px solid rgba(16, 185, 129, 0.45)"
            : "1.5px solid rgba(168, 85, 247, 0.4)",
          borderTopColor: allComplete ? "#34d399" : "#a855f7",
          borderBottomColor: allComplete ? "#10b981" : "#06b6d4",
        }}
        animate={{ rotate: -360 }}
        transition={{
          duration: allComplete ? 9 : 4.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* ── 5. INNER ACCELERATOR RING ─────────────────────────────────────────── */}
      <motion.div
        className="absolute w-24 h-24 rounded-full pointer-events-none"
        style={{
          border: allComplete
            ? "2px dotted rgba(52, 211, 153, 0.6)"
            : "2px dotted rgba(56, 189, 248, 0.5)",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: allComplete ? 6 : 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* ── 6. HOLOGRAPHIC QUANTUM CORE SPHERE ─────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center cursor-default shadow-2xl overflow-hidden"
        animate={
          allComplete
            ? { scale: [1, 1.14, 1] }
            : { scale: [1, 1.05, 1] }
        }
        transition={{
          duration: allComplete ? 0.5 : 2,
          repeat: allComplete ? 0 : Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: allComplete
            ? "radial-gradient(circle at 32% 32%, #34d399 0%, #059669 45%, #064e3b 100%)"
            : "radial-gradient(circle at 32% 32%, #38bdf8 0%, #6366f1 45%, #1e1b4b 100%)",
          boxShadow: allComplete
            ? "0 0 35px rgba(16, 185, 129, 0.8), inset 0 0 16px rgba(255, 255, 255, 0.6)"
            : "0 0 35px rgba(99, 102, 241, 0.6), inset 0 0 16px rgba(255, 255, 255, 0.45)",
          border: allComplete
            ? "1px solid rgba(255, 255, 255, 0.4)"
            : "1px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        {/* Inner holographic radar line */}
        {!allComplete && (
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(255, 255, 255, 0.6) 60deg, transparent 90deg)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Center Icon: Animated Checkmark or Glowing Code Icon */}
        <AnimatePresence mode="wait">
          {allComplete ? (
            <motion.div
              key="complete-check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className="relative z-20 flex items-center justify-center"
            >
              <svg
                className="w-10 h-10 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="loading-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-20 flex items-center justify-center text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            >
              {iconType === "terminal" ? (
                <Terminal className="w-8 h-8 animate-pulse text-cyan-200" />
              ) : iconType === "brain" ? (
                <Cpu className="w-8 h-8 animate-pulse text-violet-200" />
              ) : (
                <Code2 className="w-8 h-8 animate-pulse text-cyan-200" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── 7. CELEBRATORY SPARKLES ON COMPLETE ─────────────────────────────── */}
      {allComplete && (
        <>
          <motion.div
            initial={{ scale: 0, opacity: 0, x: -28, y: -28 }}
            animate={{ scale: 1, opacity: 1, x: -38, y: -38 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="absolute text-emerald-300"
          >
            <Sparkles className="w-4 h-4 animate-spin" />
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0, x: 28, y: -24 }}
            animate={{ scale: 1, opacity: 1, x: 38, y: -34 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="absolute text-cyan-300"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0, x: 26, y: 26 }}
            animate={{ scale: 1, opacity: 1, x: 36, y: 36 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="absolute text-teal-300"
          >
            <Sparkles className="w-4 h-4 animate-bounce" />
          </motion.div>
        </>
      )}
    </div>
  );
};

export default QuantumTechReactor;

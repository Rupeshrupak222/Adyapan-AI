"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useEffect, useState } from "react";
import { WeakTopicDetectionDashboard } from "@/components/learning-hub/WeakTopicDetectionDashboard";
import { ArrowLeft, GraduationCap, LayoutDashboard, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function WeakTopicsPage() {
  // Secure client-side route guard
  useRequireAuth("USER");

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawUser =
        localStorage.getItem("adyapan-user") ||
        sessionStorage.getItem("adyapan-user");
      if (rawUser) {
        try {
          setUser(JSON.parse(rawUser));
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#080710] text-white flex flex-col font-sans">
      {/* Immersive Aurora Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0] }}
          transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          className="absolute top-[-8%] left-[-5%] w-[45%] h-[45%] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle, rgba(239,68,68,0.10) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], y: [0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 15, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-8%] right-[-5%] w-[45%] h-[45%] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], x: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: "easeInOut", delay: 5 }}
          className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)" }}
        />
      </div>

      {/* Standalone Nav Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#080710]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/user"
              className="p-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-white/60 hover:text-white transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <AlertTriangle size={15} className="text-white" />
              </div>
              <div>
                <span className="font-black text-base tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  Weak Topic Engine
                </span>
                <span className="hidden sm:block text-[10px] text-white/30 font-bold tracking-widest uppercase">
                  AI Diagnostic Intelligence
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[10px] font-black text-rose-400">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white/70">{user.name}</span>
              </div>
            )}
            <Link
              href="/dashboard/user"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold text-white/70 hover:text-white hover:bg-white/[0.07] transition-all"
            >
              <LayoutDashboard size={13} />
              <span className="hidden sm:inline">Workspace</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Title Banner */}
      <div className="relative z-10 border-b border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 text-xs font-bold text-white/30 tracking-widest uppercase mb-2"
          >
            <GraduationCap size={14} className="text-rose-400" />
            Day 5 Feature · Adyapan AI
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl font-black text-white"
          >
            AI Weak Topic Detection Engine
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm text-white/40 mt-1.5"
          >
            Identify weak topics, track knowledge decay, prioritize revisions, and access targeted practice to close learning gaps faster.
          </motion.p>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-grow w-full relative z-10">
        <WeakTopicDetectionDashboard />
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-white/20 text-[10px] font-bold tracking-widest border-t border-white/[0.04]">
        © {new Date().getFullYear()} ADYAPAN AI · WEAK TOPIC DETECTION ENGINE · DAY 5
      </footer>
    </div>
  );
}


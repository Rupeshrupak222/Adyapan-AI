"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  MessageSquare,
  BookOpen,
  Sparkles,
  Award,
  Bell,
  CheckCircle2,
  Share2,
  Globe
} from "lucide-react";

export function CommunityComingSoonView() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubscribed(true);
  };

  const upcomingFeatures = [
    {
      icon: <Users size={22} className="text-amber-500" />,
      title: "Student Profiles",
      desc: "Connect with peers, showcase learning streaks, badges, and academic accomplishments."
    },
    {
      icon: <MessageSquare size={22} className="text-amber-500" />,
      title: "Direct Messaging",
      desc: "Real-time peer chat, study group messaging, and collaborative problem-solving."
    },
    {
      icon: <BookOpen size={22} className="text-amber-500" />,
      title: "Community Blogs",
      desc: "Publish study guides, project walkthroughs, and career tips for the community."
    },
    {
      icon: <Award size={22} className="text-amber-500" />,
      title: "Skill Endorsements",
      desc: "Give and receive peer endorsements for coding, DSA, and technical skills."
    }
  ];

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-[82vh] w-full p-6 sm:p-10 overflow-hidden rounded-3xl border transition-all duration-300"
      style={{
        background: "var(--bg-card, #ffffff)",
        borderColor: "var(--border-color, #e5e7eb)",
        color: "var(--text-primary, #111827)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)"
      }}
    >
      {/* ── Background Glow Orbs (Amber Gold) ── */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)",
          top: "5%",
          left: "25%",
          filter: "blur(60px)"
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(217, 119, 6, 0.3) 0%, transparent 70%)",
          bottom: "5%",
          right: "20%",
          filter: "blur(50px)"
        }}
      />

      {/* ── Main Content Container ── */}
      <div className="relative z-10 max-w-3xl w-full flex flex-col items-center text-center space-y-8">
        {/* Amber Gold Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider"
          style={{
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            color: "#d97706"
          }}
        >
          <Sparkles size={14} className="animate-pulse text-amber-500" />
          <span>Coming Soon • Community Hub</span>
        </motion.div>

        {/* Hero Icon (Amber Gold Gradient) */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
            boxShadow: "0 15px 40px rgba(245, 158, 11, 0.35)"
          }}
        >
          <Globe size={46} className="text-white font-bold" />
        </motion.div>

        {/* Heading & Subtitle (Theme-Aware Exact Variables) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3"
        >
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary, #111827)" }}
          >
            Connect & Grow Together
          </h1>
          <p
            className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-medium"
            style={{ color: "var(--text-secondary, #4b5563)" }}
          >
            We are building a vibrant space for students and developers to network, share knowledge, write blogs, and collaborate on projects.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left mt-2"
        >
          {upcomingFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border flex gap-4 items-start transition-all hover:border-amber-500/50"
              style={{
                background: "var(--bg-card, #ffffff)",
                borderColor: "var(--border-color, #e5e7eb)",
                backdropFilter: "blur(12px)"
              }}
            >
              <div
                className="p-3 rounded-xl flex-shrink-0"
                style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.25)"
                }}
              >
                {feat.icon}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary, #111827)" }}>
                    {feat.title}
                  </h3>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#d97706",
                      border: "1px solid rgba(245, 158, 11, 0.3)"
                    }}
                  >
                    Soon
                  </span>
                </div>
                <p
                  className="text-xs leading-relaxed font-normal"
                  style={{ color: "var(--text-secondary, #4b5563)" }}
                >
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Email Notification Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-md p-5 rounded-2xl border text-center space-y-3"
          style={{
            background: "rgba(245, 158, 11, 0.04)",
            borderColor: "rgba(245, 158, 11, 0.3)",
            backdropFilter: "blur(12px)"
          }}
        >
          {subscribed ? (
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm py-2">
              <CheckCircle2 size={18} className="text-amber-500" />
              <span>You&apos;re on the early access list! We&apos;ll notify you at launch.</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-amber-600 dark:text-amber-300">
                <Bell size={14} className="text-amber-500" />
                <span>Be the first to get access when Community Hub goes live</span>
              </div>
              <form onSubmit={handleNotify} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  style={{
                    background: "var(--bg-dark, #ffffff)",
                    borderColor: "var(--border-color, rgba(245, 158, 11, 0.3))",
                    color: "var(--text-primary, #111827)"
                  }}
                  required
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-extrabold rounded-xl text-white transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)"
                  }}
                >
                  <span>Notify Me</span>
                  <Share2 size={13} />
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

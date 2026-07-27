"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView, type Variants } from "framer-motion";
import {
  User, Users, Globe, Share2, MessageSquare,
  ExternalLink, BookOpen, Code2, FileText, Trophy, Target,
  TrendingUp, Calendar, Clock, ArrowUpRight, ArrowLeft,
  Zap, GraduationCap, Lightbulb,
  Quote, BadgeCheck, Medal,
  BarChart3, Activity, Folder, Plus, MapPin, Award, Send, ChevronRight
} from "lucide-react";
import CountUp from "react-countup";
import { toast } from "sonner";
import { api } from "@/services/api";
import { getDiceBearUrl } from "@/lib/avatar";
import { useTheme } from "@/hooks/useTheme";
import {
  PremiumBadge, PremiumProgressRing,
  PremiumProgressBar, AnimatedSkeleton, EmptyState
} from "@/components/ui/PremiumComponents";

function GithubSvg({ size = 24, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinSvg({ size = 24, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i = 0) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.07, duration: 0.4, type: "spring", stiffness: 200, damping: 20 },
  }),
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function AnimatedCounter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <span ref={ref} className="tabular-nums">
      {isInView ? (
        <CountUp end={value} duration={2} separator="," prefix={prefix} suffix={suffix} />
      ) : (
        `${prefix}0${suffix}`
      )}
    </span>
  );
}

interface ProfileData {
  id: string;
  userId: string;
  username: string | null;
  phone: string | null;
  location: string | null;
  aboutMe: string | null;
  college: string | null;
  branch: string | null;
  degree: string | null;
  graduationYear: string | null;
  skills: string[];
  interestedDomains: string[];
  targetRole: string | null;
  careerObjective: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  resumeUrl: string | null;
  resumeName: string | null;
  user?: { id: string; name: string; email: string; role: string; createdAt?: string };
}

const SECTION_TABS = [
  { id: "overview", label: "Overview", icon: User },
  { id: "projects", label: "Projects", icon: Folder },
  { id: "skills", label: "Skills", icon: Zap },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "community", label: "Community", icon: Users },
] as const;

type TabId = (typeof SECTION_TABS)[number]["id"];

function GlassCard({ children, className = "", glow = false, glowColor = "rgba(245,158,11,0.06)" }: {
  children: React.ReactNode; className?: string; glow?: boolean; glowColor?: string;
}) {
  const theme = useTheme();
  const isDark = theme === "dark";
  return (
    <div className={`relative rounded-[20px] border overflow-hidden ${className}`}
      style={{
        background: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.85)",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
        backdropFilter: "blur(20px)",
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)"
          : "0 8px 32px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}>
      {glow && (
        <div className="absolute -inset-20 pointer-events-none opacity-40 animate-pulse"
          style={{ background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 60%)` }} />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, gradient = false }: {
  icon: React.ComponentType<{ size?: number; className?: string }>; title: string; subtitle?: string; gradient?: boolean;
}) {
  const theme = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)",
          border: isDark ? "1px solid rgba(245,158,11,0.15)" : "1px solid rgba(245,158,11,0.2)"
        }}>
        <Icon size={16} className="text-amber-500" />
      </div>
      <div>
        <h3 className={`text-sm font-extrabold ${gradient ? "bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent" : ""}`}
          style={{ color: gradient ? undefined : (isDark ? "#ffffff" : "#0f172a") }}>
          {title}
        </h3>
        {subtitle && <p className="text-[10px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.5)" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export function CommunityProfileView({ userId, onViewUser, onBack }: { userId?: string; onViewUser?: (userId: string) => void; onBack?: () => void }) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [communityUsers, setCommunityUsers] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communitySearch, setCommunitySearch] = useState("");

  const isOwnProfile = !userId;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        if (userId) {
          const res = await api.get(`/community/users/${userId}`);
          if (res.data.success && res.data.profile) {
            setProfile(res.data.profile);
            setIsFollowing(res.data.isFollowing || false);
            setFollowStats({ followers: res.data.followers || 0, following: res.data.following || 0 });
            if (res.data.projects) setProjects(res.data.projects);
            if (res.data.activities) setActivities(res.data.activities);
            if (res.data.achievements) setAchievements(res.data.achievements);
          } else {
            setError("Profile not found");
          }
        } else {
          const res = await api.get("/profile/me");
          if (res.data?.profile) {
            setProfile(res.data.profile);
          } else {
            // If profile record isn't in DB yet, fetch auth me details as fallback
            const userRes = await api.get("/auth/me");
            const u = userRes.data.user;
            setProfile({
              id: "temp",
              userId: u.id,
              username: u.name ? u.name.toLowerCase().replace(/\s+/g, "") : `user_${u.id?.slice(0, 6)}`,
              user: u,
              skills: [],
              interestedDomains: [],
            } as any);
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    const targetId = userId || profile?.userId;
    if (!targetId) return;
    const fetchCommunityData = async () => {
      try {
        const [statsRes, actRes, projRes, achRes, recRes] = await Promise.allSettled([
          api.get(`/community/stats/${targetId}`),
          isOwnProfile ? api.get("/community/activity") : Promise.resolve({ status: "fulfilled" as const, value: { data: { success: false } } }),
          isOwnProfile ? api.get("/community/projects") : Promise.resolve({ status: "fulfilled" as const, value: { data: { success: false } } }),
          isOwnProfile ? api.get("/community/achievements") : Promise.resolve({ status: "fulfilled" as const, value: { data: { success: false } } }),
          isOwnProfile ? api.get("/community/recommendations") : Promise.resolve({ status: "fulfilled" as const, value: { data: { success: false } } }),
        ]);
        if (statsRes.status === "fulfilled" && statsRes.value.data.success) {
          const s = statsRes.value.data;
          setFollowStats({ followers: s.followers, following: s.following });
          if (isOwnProfile) setIsFollowing(s.isFollowing);
        }
        if (actRes.status === "fulfilled" && (actRes.value as any).data.success) setActivities((actRes.value as any).data.activities);
        if (projRes.status === "fulfilled" && (projRes.value as any).data.success) setProjects((projRes.value as any).data.projects);
        if (achRes.status === "fulfilled" && (achRes.value as any).data.success) setAchievements((achRes.value as any).data.achievements);
        if (recRes.status === "fulfilled" && (recRes.value as any).data.success) setRecommendations((recRes.value as any).data.recommendations);
      } catch { /* ignore */ }
    };
    fetchCommunityData();
  }, [profile?.userId, userId, isOwnProfile]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied to clipboard!");
  }, []);

  const handleFollow = useCallback(async () => {
    const targetId = userId || profile?.userId;
    if (!targetId) return;
    try {
      const res = await api.post(`/community/follow/${targetId}`);
      if (res.data.success) {
        setIsFollowing(res.data.isFollowing);
        setFollowStats(prev => ({
          followers: res.data.isFollowing ? prev.followers + 1 : Math.max(0, prev.followers - 1),
          following: prev.following,
        }));
        toast.success(res.data.isFollowing ? "Following!" : "Unfollowed");
      }
    } catch {
      toast.error("Failed to update follow status");
    }
  }, [userId, profile?.userId]);

  // Fetch community users when Community tab is selected
  useEffect(() => {
    if (activeTab !== "community") return;
    let cancelled = false;
    (async () => {
      setCommunityLoading(true);
      try {
        const q = communitySearch ? `?q=${encodeURIComponent(communitySearch)}&limit=20` : "?limit=20";
        const res = await api.get(`/community/users${q}`);
        if (!cancelled && res.data.success) setCommunityUsers(res.data.users || []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setCommunityLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, communitySearch]);

  const displayName = profile?.user?.name || profile?.user?.email?.split("@")[0] || profile?.username || "Community Member";
  const username = profile?.username ? `@${profile.username}` : "";
  const bio = profile?.aboutMe || profile?.careerObjective || "";
  const skills = profile?.skills ?? [];
  const domains = profile?.interestedDomains ?? [];
  const linkCount = [profile?.linkedin, profile?.github, profile?.portfolio].filter(Boolean).length;

  if (loading) {
    return (
      <div className="space-y-5 p-1">
        <AnimatedSkeleton type="card" className="h-[280px] rounded-[20px]" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <AnimatedSkeleton key={i} type="card" className="h-[100px] rounded-[20px]" />)}
        </div>
        <AnimatedSkeleton type="card" className="h-[400px] rounded-[20px]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-5 p-1">
        <EmptyState
          title="Failed to load profile"
          description={error || "Something went wrong while loading your profile."}
          illustration={<User className="w-8 h-8" />}
        />
      </div>
    );
  }

  const primaryText = isDark ? "text-white" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const labelColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.55)";
  const labelColorSemi = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.7)";
  const customBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const coverBg = isDark
    ? "linear-gradient(135deg, #070715 0%, rgba(139,92,246,0.3) 30%, rgba(59,130,246,0.2) 60%, rgba(6,182,212,0.15) 80%, #070715 100%)"
    : "linear-gradient(135deg, #f1f5f9 0%, rgba(139,92,246,0.15) 30%, rgba(59,130,246,0.12) 60%, rgba(6,182,212,0.08) 80%, #f1f5f9 100%)";
  const avatarBorderColor = isDark ? "#070715" : "#ffffff";
  const statsCardBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.85)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5 min-h-screen"
      style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif" }}
    >
      {!isOwnProfile && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-2xl">
          <button
            onClick={() => {
              if (onBack) onBack();
              else if (onViewUser) onViewUser("");
            }}
            className="flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Community Profile
          </button>
          <span className="text-[10px] font-semibold text-amber-500/80">Viewing Member Profile</span>
        </div>
      )}
      {/* HERO PROFILE SECTION */}
      <GlassCard glow glowColor="rgba(139,92,246,0.08)">
        <div className="h-36 sm:h-48 relative overflow-hidden rounded-t-[20px]">
          <div className="absolute inset-0" style={{ background: coverBg }} />
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(245,158,11,0.1) 0%, transparent 50%)" }} />
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(139,92,246,0.08) 0%, transparent 50%)" }} />
          <motion.div
            className="absolute top-6 right-12 w-24 h-24 rounded-full bg-purple-500/10 blur-2xl"
            animate={{ scale: [1, 1.3, 1], x: [0, 15, 0], y: [0, -10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-4 left-20 w-32 h-32 rounded-full bg-cyan-500/8 blur-3xl"
            animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        <div className="px-5 sm:px-8 pb-7">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-14">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="relative shrink-0"
            >
              <div className="w-28 h-28 rounded-[22px] overflow-hidden border-4"
                style={{
                  borderColor: avatarBorderColor,
                  boxShadow: isDark
                    ? "0 0 30px rgba(245,158,11,0.25), 0 0 60px rgba(139,92,246,0.1)"
                    : "0 4px 20px rgba(0,0,0,0.08)",
                }}>
                <img src={getDiceBearUrl(displayName)} alt="avatar" width={112} height={112} className="block bg-slate-100" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.5 }}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: `3px solid ${avatarBorderColor}` }}
              >
                <BadgeCheck size={14} className="text-white" />
              </motion.div>
            </motion.div>

            <div className="flex-1 text-center sm:text-left pb-1">
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2.5">
                <h1 className={`text-xl font-extrabold tracking-tight ${primaryText}`}>{displayName}</h1>
                {profile.resumeUrl && <PremiumBadge variant="amber" pulse>Pro</PremiumBadge>}
              </div>
              {username && (
                <p className="text-xs font-bold mt-1" style={{ color: labelColorSemi }}>
                  {username}{profile.targetRole ? ` \u00B7 ${profile.targetRole}` : ""}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-[11px]" style={{ color: labelColor }}>
                {profile.college && (
                  <span className="flex items-center gap-1"><GraduationCap size={12} className="text-amber-400" /> {profile.college}</span>
                )}
                {profile.branch && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-400/30" />
                    <span>{profile.branch}</span>
                  </>
                )}
                {profile.graduationYear && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-400/30" />
                    <span>Class of {profile.graduationYear}</span>
                  </>
                )}
                {profile.location && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-400/30" />
                    <span className="flex items-center gap-1"><MapPin size={11} /> {profile.location}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2.5 shrink-0">
              {!isOwnProfile && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: isFollowing ? "none" : "0 0 20px rgba(245,158,11,0.3)" }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleFollow}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                    style={{
                      background: isFollowing
                        ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)")
                        : "linear-gradient(135deg, #f59e0b, #ea580c)",
                      color: isFollowing ? (isDark ? "rgba(255,255,255,0.7)" : "#334155") : "#000",
                      border: isFollowing ? `1px solid ${customBorder}` : "none",
                    }}
                  >
                    {isFollowing ? <><User size={13} /> Following</> : <><Plus size={13} /> Follow</>}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowMessageInput(prev => !prev)}
                    className="px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors"
                    style={{
                      borderColor: customBorder,
                      color: isDark ? "rgba(255,255,255,0.7)" : "#334155",
                      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
                    }}
                  >
                    <MessageSquare size={13} /> Message
                  </motion.button>
                </>
              )}
              <motion.button
                whileHover={{ scale: 1.08, rotate: 15 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleShare}
                className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                style={{
                  borderColor: customBorder,
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.45)",
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
                }}
              >
                <Share2 size={14} />
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {showMessageInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 mt-4">
                  <input
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={async e => {
                      const targetId = userId || profile?.userId;
                      if (e.key === "Enter" && messageInput.trim() && targetId) {
                        try {
                          const res = await api.post("/community/messages", { receiverId: targetId, content: messageInput.trim() });
                          if (res.data.success) {
                            setChatMessages(prev => [...prev, res.data.message]);
                            setMessageInput("");
                            toast.success("Message sent!");
                          }
                        } catch {
                          toast.error("Failed to send message");
                        }
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold outline-none"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                      border: `1px solid ${customBorder}`,
                      color: isDark ? "rgba(255,255,255,0.8)" : "#1e293b",
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      if (messageInput.trim() && profile?.userId) {
                        try {
                          const res = await api.post("/community/messages", { receiverId: profile.userId, content: messageInput.trim() });
                          if (res.data.success) {
                            setChatMessages(prev => [...prev, res.data.message]);
                            setMessageInput("");
                            toast.success("Message sent!");
                          }
                        } catch {
                          toast.error("Failed to send message");
                        }
                      }
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
                  >
                    <Send size={14} className="text-white" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {bio && (
            <p className="text-[11px] mt-5 max-w-2xl leading-relaxed" style={{ color: labelColorSemi }}>
              {bio}
            </p>
          )}

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {skills.slice(0, 8).map((s, i) => (
                <motion.span
                  key={s}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ scale: 1.08, backgroundColor: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.35)" }}
                  className="px-3 py-1 rounded-lg text-[10px] font-bold cursor-default transition-all"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    border: `1px solid ${customBorder}`,
                    color: isDark ? "rgba(255,255,255,0.65)" : "rgba(15,23,42,0.65)"
                  }}
                >
                  {s}
                </motion.span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-4 mt-4">
            {profile.portfolio && (
              <a href={profile.portfolio} target="_blank" rel="noreferrer"
                className="text-[11px] font-bold flex items-center gap-1.5 hover:text-amber-500 transition-colors"
                style={{ color: labelColorSemi }}>
                <Globe size={12} /> Portfolio <ArrowUpRight size={10} />
              </a>
            )}
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noreferrer"
                className="text-[11px] font-bold flex items-center gap-1.5 hover:text-amber-500 transition-colors"
                style={{ color: labelColorSemi }}>
                <GithubSvg size={12} /> GitHub <ArrowUpRight size={10} />
              </a>
            )}
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer"
                className="text-[11px] font-bold flex items-center gap-1.5 hover:text-amber-500 transition-colors"
                style={{ color: labelColorSemi }}>
                <LinkedinSvg size={12} /> LinkedIn <ArrowUpRight size={10} />
              </a>
            )}
          </div>
        </div>
      </GlassCard>

      {/* STATS ROW */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Followers", val: followStats.followers, icon: Users, color: "#06b6d4", gradient: "from-cyan-500 to-blue-500" },
          { label: "Following", val: followStats.following, icon: User, color: "#8b5cf6", gradient: "from-purple-500 to-indigo-500" },
          { label: "Skills", val: skills.length, icon: Zap, color: "#f59e0b", gradient: "from-amber-500 to-orange-500" },
          { label: "Domains", val: domains.length, icon: Target, color: "#f43f5e", gradient: "from-rose-500 to-pink-500" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={staggerItem}
            whileHover={{ y: -4, scale: 1.02, boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.3)" : "0 12px 25px rgba(0,0,0,0.06)" }}
            className="relative rounded-[20px] border p-4 flex items-center justify-between overflow-hidden shadow-sm"
            style={{ background: statsCardBg, borderColor: customBorder }}
          >
            <div className="absolute inset-0 opacity-20"
              style={{ background: `radial-gradient(circle at 80% 20%, ${stat.color}15 0%, transparent 50%)` }} />
            <div className="relative z-10 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: labelColor }}>
                {stat.label}
              </span>
              <span className={`text-xl font-extrabold block ${primaryText}`}>
                <AnimatedCounter value={stat.val} />
              </span>
            </div>
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 18, delay: i * 0.05 }}
              className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${stat.gradient} shadow-md`}
              style={{ boxShadow: `0 4px 15px ${stat.color}25` }}
            >
              <stat.icon size={16} className="text-white" />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* TAB NAVIGATION */}
      <div className="flex gap-1 p-1.5 rounded-2xl overflow-x-auto"
        style={{
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)",
          border: `1px solid ${customBorder}`,
          backdropFilter: "blur(20px)"
        }}
      >
        {SECTION_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer"
              style={{ color: isActive ? "#f59e0b" : (isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.5)") }}
            >
              {isActive && (
                <motion.div
                  layoutId="community-tab"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.2)"
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5"><tab.icon size={13} />{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === "overview" && <OverviewTab profile={profile} activities={activities} recommendations={recommendations} />}
          {activeTab === "projects" && <ProjectsTab projects={projects} />}
          {activeTab === "skills" && <SkillsTab skills={skills} />}
          {activeTab === "activity" && <ActivityTab activities={activities} />}
          {activeTab === "achievements" && <AchievementsTab achievements={achievements} />}
          {activeTab === "community" && (
            <CommunityTab
              users={communityUsers}
              loading={communityLoading}
              search={communitySearch}
              onSearchChange={setCommunitySearch}
              onSelectUser={(id) => onViewUser?.(id)}
              currentUserId={profile?.userId}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function CommunityTab({ users, loading, search, onSearchChange, onSelectUser, currentUserId }: {
  users: any[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onSelectUser: (userId: string) => void;
  currentUserId?: string;
}) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const subText = isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.5)";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  const filtered = users.filter(u => u.id !== currentUserId && u.userId !== currentUserId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users size={16} className="text-amber-500 shrink-0" />
        <h3 className={`text-sm font-bold ${primaryText}`}>Community Members</h3>
      </div>

      <input
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search members by name, username, or college..."
        className="w-full px-4 py-2.5 rounded-xl text-xs font-medium outline-none border transition-colors focus:border-amber-500/50"
        style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor, color: isDark ? "#fff" : "#0f172a" }}
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: cardBg }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-xs" style={{ color: subText }}>
          {search ? "No members found matching your search." : "No other community members yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((userItem: any) => {
            const memberName = userItem.user?.name || userItem.name || userItem.username || userItem.user?.email?.split("@")[0] || "Community Member";
            const targetId = userItem.userId || userItem.id;
            return (
              <motion.button
                key={userItem.id || userItem.userId}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectUser(targetId)}
                className="p-4 rounded-2xl border text-left transition-all hover:shadow-lg cursor-pointer"
                style={{ background: cardBg, borderColor }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                    <img src={getDiceBearUrl(memberName)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${primaryText}`}>{memberName}</p>
                    {userItem.username && <p className="text-[10px] truncate" style={{ color: subText }}>@{userItem.username}</p>}
                    {userItem.aboutMe && <p className="text-[10px] mt-1 line-clamp-2" style={{ color: subText }}>{userItem.aboutMe}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {userItem.college && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b" }}>{userItem.college}</span>}
                      {userItem.skills?.slice(0, 2).map((s: string) => (
                        <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: subText }} className="shrink-0 mt-1" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mail({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function OverviewTab({ profile, activities, recommendations }: { profile: ProfileData; activities: any[]; recommendations: any[] }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const labelColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.55)";
  const labelColorSemi = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.7)";
  const customBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  const domains = profile.interestedDomains ?? [];

  return (
    <div className="space-y-5">
      {domains.length > 0 && (
        <GlassCard>
          <div className="p-6">
            <SectionHeader icon={Lightbulb} title="Interests" subtitle="Topics you're passionate about" />
            <div className="flex flex-wrap gap-2 mt-2">
              {domains.map((interest, i) => (
                <motion.span
                  key={interest}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.08, backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.25)", color: "#f59e0b" }}
                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold cursor-default transition-all"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    border: `1px solid ${customBorder}`,
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)"
                  }}
                >
                  {interest}
                </motion.span>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {domains.length === 0 && (
        <GlassCard>
          <div className="p-6">
            <EmptyState
              title="No interests added yet"
              description="Add your interested domains to showcase your focus areas."
              illustration={<Lightbulb className="w-8 h-8" />}
            />
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="p-6">
          <SectionHeader icon={Clock} title="Activity Timeline" subtitle="Recent activity" />
          {activities.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Your recent activity will appear here as you engage with the platform."
              illustration={<Activity className="w-8 h-8" />}
            />
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2.5 mt-2">
              {activities.slice(0, 5).map((act, i) => (
                <motion.div key={act.id} variants={staggerItem}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                  style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${customBorder}` }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)" }}>
                    <Activity size={14} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-bold block ${primaryText}`}>{act.title}</span>
                    {act.detail && <span className="text-[10px]" style={{ color: labelColor }}>{act.detail}</span>}
                  </div>
                  {act.xp > 0 && (
                    <span className="text-[10px] font-bold text-amber-500 shrink-0">+{act.xp} XP</span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="p-6">
          <SectionHeader icon={Quote} title="AI Recommendations" subtitle="Personalized suggestions for you" />
          {recommendations.length === 0 ? (
            <EmptyState
              title="No recommendations yet"
              description="AI-powered recommendations will appear here based on your profile."
              illustration={<Quote className="w-8 h-8" />}
            />
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2.5 mt-2">
              {recommendations.map((rec, i) => (
                <motion.div key={i} variants={staggerItem}
                  className="p-3 rounded-xl"
                  style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${customBorder}` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${primaryText}`}>{rec.title}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)", color: "#f59e0b" }}>
                      {rec.category}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: labelColor }}>{rec.description}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function ProjectsTab({ projects }: { projects: any[] }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const labelColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.55)";
  const labelColorSemi = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.7)";
  const customBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="p-6">
          <SectionHeader icon={Folder} title="Featured Projects" subtitle="Your best work" />
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Start building amazing projects and they'll be showcased here."
              illustration={<Folder className="w-8 h-8" />}
            />
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {projects.map((proj, i) => (
                <motion.div key={proj.id} variants={staggerItem}
                  whileHover={{ y: -3, boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.3)" : "0 12px 25px rgba(0,0,0,0.06)" }}
                  className="p-4 rounded-xl border"
                  style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)", borderColor: customBorder }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${primaryText}`}>{proj.title}</span>
                    {proj.url && (
                      <a href={proj.url} target="_blank" rel="noreferrer" className="text-amber-500 hover:text-amber-400">
                        <ArrowUpRight size={13} />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] mb-3 line-clamp-2" style={{ color: labelColor }}>{proj.description}</p>
                  {proj.techStack?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {proj.techStack.map((t: string) => (
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)", color: "#f59e0b" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function ResearchTab() {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="p-6">
          <SectionHeader icon={BookOpen} title="Research Publications" subtitle="Your academic contributions" gradient />
          <EmptyState
            title="No publications yet"
            description="Your research papers and publications will appear here."
            illustration={<BookOpen className="w-8 h-8" />}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <div className="p-6">
          <SectionHeader icon={Medal} title="Certifications" subtitle="Professional credentials" />
          <EmptyState
            title="No certifications yet"
            description="Add your professional certifications to build credibility."
            illustration={<Medal className="w-8 h-8" />}
          />
        </div>
      </GlassCard>
    </div>
  );
}

function SkillsTab({ skills }: { skills: string[] }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const labelColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.55)";
  const labelColorSemi = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.7)";
  const customBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="p-6">
          <SectionHeader icon={Zap} title="Skills Showcase" subtitle="Your technical expertise" gradient />

          {skills.length === 0 ? (
            <EmptyState
              title="No skills added yet"
              description="Add your skills to showcase your technical expertise."
              illustration={<Zap className="w-8 h-8" />}
            />
          ) : (
            <div className="flex flex-wrap gap-3 mt-2">
              {skills.map((skill, i) => (
                <motion.div
                  key={skill}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                  whileHover={{ y: -3, borderColor: "rgba(245,158,11,0.25)", scale: 1.05 }}
                  className="p-4 rounded-[16px] border transition-all shadow-sm min-w-[140px]"
                  style={{
                    borderColor: customBorder,
                    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)"
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.15)"
                      }}>
                      <Zap size={14} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold block ${primaryText}`}>{skill}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function ActivityTab({ activities }: { activities: any[] }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const labelColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.55)";
  const customBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="p-6">
          <SectionHeader icon={BarChart3} title="Contribution Heatmap" subtitle="Your coding consistency" />
          {activities.length === 0 ? (
            <EmptyState
              title="No contributions yet"
              description="Start coding to fill your contribution heatmap."
              illustration={<BarChart3 className="w-8 h-8" />}
            />
          ) : (
            <div className="grid grid-cols-7 gap-1.5 mt-2">
              {Array.from({ length: 35 }, (_, i) => {
                const hasActivity = activities.some((_, j) => j % 7 === i % 7 && j % 5 !== 0);
                return (
                  <div key={i} className="w-full aspect-square rounded-sm"
                    style={{
                      background: hasActivity
                        ? (i % 3 === 0 ? "rgba(245,158,11,0.6)" : i % 2 === 0 ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.12)")
                        : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"),
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard>
          <div className="p-6">
            <SectionHeader icon={Calendar} title="Weekly Activity" subtitle="Hours per day" />
            {activities.length === 0 ? (
              <EmptyState
                title="No activity data"
                description="Weekly activity will be tracked as you use the platform."
                illustration={<Calendar className="w-8 h-8" />}
              />
            ) : (
              <div className="space-y-2 mt-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                  const count = activities.filter((_, j) => j % 7 === i).length;
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold w-8" style={{ color: labelColor }}>{day}</span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, count * 20)}%` }}
                          transition={{ delay: i * 0.05, duration: 0.6 }}
                          className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #f59e0b, #ea580c)" }} />
                      </div>
                      <span className={`text-[10px] font-bold ${primaryText}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-6">
            <SectionHeader icon={TrendingUp} title="Monthly Growth" subtitle="Progress over time" />
            {activities.length === 0 ? (
              <EmptyState
                title="No growth data"
                description="Monthly progress will appear as you continue learning."
                illustration={<TrendingUp className="w-8 h-8" />}
              />
            ) : (
              <div className="mt-2">
                <div className="flex items-end gap-1.5 h-24">
                  {Array.from({ length: 12 }, (_, i) => {
                    const h = Math.min(100, 10 + activities.filter((_, j) => j % 12 === i).length * 15);
                    return (
                      <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.04, duration: 0.5 }}
                        className="flex-1 rounded-t-md" style={{ background: "linear-gradient(180deg, #f59e0b, #ea580c)" }} />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map(m => (
                    <span key={m} className="text-[8px] font-bold flex-1 text-center" style={{ color: labelColor }}>{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="p-6">
          <SectionHeader icon={Users} title="Community Contributions" subtitle="Your impact on the community" />
          {activities.length === 0 ? (
            <EmptyState
              title="No community contributions yet"
              description="Engage with the community through discussions, Q&A, and sharing resources."
              illustration={<Users className="w-8 h-8" />}
            />
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2.5 mt-2">
              {activities.slice(0, 5).map((act, i) => (
                <motion.div key={act.id} variants={staggerItem}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${customBorder}` }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isDark ? "rgba(6,182,212,0.1)" : "rgba(6,182,212,0.08)" }}>
                    <Activity size={14} className="text-cyan-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-bold block ${primaryText}`}>{act.title}</span>
                    <span className="text-[10px]" style={{ color: labelColor }}>{act.type}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function AchievementsTab({ achievements }: { achievements: any[] }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const labelColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.55)";
  const customBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="p-6">
          <SectionHeader icon={Trophy} title="Community Achievements" subtitle="Your earned badges and milestones" gradient />
          {achievements.length === 0 ? (
            <EmptyState
              title="No achievements yet"
              description="Complete challenges, contribute to the community, and earn badges."
              illustration={<Trophy className="w-8 h-8" />}
            />
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {achievements.map((ach, i) => (
                <motion.div key={ach.id} variants={staggerItem}
                  whileHover={{ y: -3, scale: 1.02 }}
                  className="p-4 rounded-xl border text-center"
                  style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)", borderColor: customBorder }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.15))", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <Trophy size={20} className="text-amber-500" />
                  </div>
                  <span className={`text-xs font-bold block ${primaryText}`}>{ach.title}</span>
                  <p className="text-[10px] mt-1" style={{ color: labelColor }}>{ach.description}</p>
                  {ach.xp > 0 && (
                    <span className="text-[10px] font-bold text-amber-500 mt-2 block">+{ach.xp} XP</span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, MapPin, GraduationCap, Zap, UserPlus, UserCheck, MessageSquare, ExternalLink, ArrowLeft, Trophy, Target, Folder, Activity, Calendar } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { getDiceBearUrl } from "@/lib/avatar";
import { useTheme } from "@/hooks/useTheme";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { PremiumBadge, AnimatedSkeleton, EmptyState } from "@/components/ui/PremiumComponents";

const CARD = (isDark: boolean) => ({
  background: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.85)",
  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
  backdropFilter: "blur(20px)" as const,
});

export function CommunityProfilesView({ onViewProfile, onMessage }: { onViewProfile?: (userId: string) => void; onMessage?: (userId: string) => void }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

  const fetchUsers = useCallback(async (q = "") => {
    setSearching(true);
    try {
      const res = await api.get(`/community/users?q=${encodeURIComponent(q)}&limit=50`);
      if (res.data.success) setUsers(res.data.users);
    } catch { /* silent */ }
    finally { setSearching(false); setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  const pc = CARD(isDark);
  const txt = isDark ? "text-white" : "text-slate-900";
  const sub = isDark ? "text-slate-400" : "text-slate-500";
  const muted = isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.5)";

  if (loading) return (
    <div className="space-y-4 p-1">
      <AnimatedSkeleton type="card" className="h-20 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <AnimatedSkeleton key={i} type="card" className="h-48 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 min-h-screen">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl font-extrabold ${txt}`}>Community</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>Discover and connect with fellow learners</p>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: muted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, username, or college..."
          className="w-full pl-9 pr-4 py-3 rounded-xl text-xs font-bold outline-none" style={{ ...pc, color: isDark ? "#fff" : "#0f172a" }} />
      </div>

      {users.length === 0 && !searching ? (
        <EmptyState title="No community members found" description="Be the first to set up your profile!" illustration={<Users className="w-8 h-8" />} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u: any, i: number) => (
            <motion.div key={u.userId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4, boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.3)" : "0 12px 25px rgba(0,0,0,0.06)" }}
              className="rounded-2xl overflow-hidden cursor-pointer" style={pc}
              onClick={() => onViewProfile?.(u.userId)}>
              <div className="h-16 relative" style={{ background: `linear-gradient(135deg, ${isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)"}, ${isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)"})` }} />
              <div className="px-4 pb-4 -mt-8">
                <div className="flex items-end gap-3 mb-3">
                  <img src={getDiceBearUrl(u.user?.name || "")} alt="" width={48} height={48} className="rounded-xl border-2 shrink-0" style={{ borderColor: isDark ? "#111" : "#fff" }} />
                  <div className="flex-1 min-w-0 pb-1">
                    <h3 className={`text-sm font-extrabold truncate ${txt}`}>{u.user?.name || "Unknown"}</h3>
                    {u.username && <p className="text-[10px] font-bold" style={{ color: muted }}>@{u.username}</p>}
                  </div>
                </div>
                {u.aboutMe && <p className="text-[10px] leading-relaxed mb-2 line-clamp-2" style={{ color: muted }}>{stripMarkdown(u.aboutMe)}</p>}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(u.skills || []).slice(0, 4).map((s: string) => (
                    <span key={s} className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)", color: "#f59e0b" }}>{s}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: muted }}>
                  {u.college && <span className="flex items-center gap-1"><GraduationCap size={10} />{u.college}</span>}
                  {u.location && <span className="flex items-center gap-1"><MapPin size={10} />{u.location}</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={e => { e.stopPropagation(); onMessage?.(u.userId); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-colors"
                    style={{ background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <MessageSquare size={11} /> Message
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function UserProfileView({ userId, onBack, onMessage }: { userId: string; onBack: () => void; onMessage: (userId: string) => void }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/community/users/${userId}`);
        if (res.data.success) {
          setData(res.data);
          setIsFollowing(res.data.isFollowing);
          setFollowers(res.data.followers);
          setFollowing(res.data.following);
        }
      } catch { toast.error("Failed to load profile"); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const handleFollow = async () => {
    try {
      const res = await api.post(`/community/follow/${userId}`);
      if (res.data.success) {
        setIsFollowing(res.data.isFollowing);
        setFollowers((p: number) => res.data.isFollowing ? p + 1 : Math.max(0, p - 1));
        toast.success(res.data.isFollowing ? "Following!" : "Unfollowed");
      }
    } catch { toast.error("Failed"); }
  };

  const pc = CARD(isDark);
  const txt = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.5)";
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  if (loading) return <div className="p-1 space-y-4"><AnimatedSkeleton type="card" className="h-[300px] rounded-2xl" /></div>;
  if (!data || !data.profile) return <EmptyState title="Profile not found" illustration={<Users className="w-8 h-8" />} />;

  const p = data.profile;
  const name = p.user?.name || p.user?.email?.split("@")[0] || p.username || "Community Member";
  const skills = p.skills || [];
  const domains = p.interestedDomains || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 min-h-screen">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold" style={{ color: "#f59e0b" }}>
        <ArrowLeft size={14} /> Back to Community
      </button>

      {/* Profile Header */}
      <div className="rounded-2xl overflow-hidden" style={pc}>
        <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.12)"}, ${isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)"})` }} />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-4">
            <img src={getDiceBearUrl(name)} alt="" width={80} height={80} className="rounded-2xl border-4 shrink-0" style={{ borderColor: isDark ? "#111" : "#fff" }} />
            <div className="flex-1 text-center sm:text-left pb-1">
              <h1 className={`text-lg font-extrabold ${txt}`}>{name}</h1>
              {p.username && <p className="text-[10px] font-bold" style={{ color: muted }}>@{p.username}{p.targetRole ? ` · ${p.targetRole}` : ""}</p>}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1 text-[10px]" style={{ color: muted }}>
                {p.college && <span className="flex items-center gap-1"><GraduationCap size={10} />{p.college}</span>}
                {p.location && <span className="flex items-center gap-1"><MapPin size={10} />{p.location}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleFollow} className="px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5"
                style={{ background: isFollowing ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") : "linear-gradient(135deg, #f59e0b, #ea580c)", color: isFollowing ? (isDark ? "rgba(255,255,255,0.7)" : "#334155") : "#000", border: isFollowing ? `1px solid ${border}` : "none" }}>
                {isFollowing ? <><UserCheck size={11} /> Following</> : <><UserPlus size={11} /> Follow</>}
              </button>
              <button onClick={() => onMessage(userId)} className="px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5"
                style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `1px solid ${border}`, color: isDark ? "rgba(255,255,255,0.7)" : "#334155" }}>
                <MessageSquare size={11} /> Message
              </button>
            </div>
          </div>
          {p.aboutMe && <p className="text-[11px] leading-relaxed mb-3" style={{ color: muted }}>{stripMarkdown(p.aboutMe)}</p>}
          <div className="flex gap-4 text-[10px] font-bold" style={{ color: muted }}>
            <span><span className={txt}>{followers}</span> Followers</span>
            <span><span className={txt}>{following}</span> Following</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {skills.length > 0 && (
          <div className="rounded-2xl p-5" style={pc}>
            <h3 className="text-xs font-extrabold mb-3 flex items-center gap-2" style={{ color: "#f59e0b" }}><Zap size={13} /> Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s: string) => <span key={s} className="text-[9px] px-2.5 py-1 rounded-full font-bold" style={{ background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)", color: "#f59e0b" }}>{s}</span>)}
            </div>
          </div>
        )}
        {domains.length > 0 && (
          <div className="rounded-2xl p-5" style={pc}>
            <h3 className="text-xs font-extrabold mb-3 flex items-center gap-2" style={{ color: "#8b5cf6" }}><Target size={13} /> Domains</h3>
            <div className="flex flex-wrap gap-1.5">
              {domains.map((d: string) => <span key={d} className="text-[9px] px-2.5 py-1 rounded-full font-bold" style={{ background: isDark ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.08)", color: "#8b5cf6" }}>{d}</span>)}
            </div>
          </div>
        )}
      </div>

      {data.projects?.length > 0 && (
        <div className="rounded-2xl p-5" style={pc}>
          <h3 className="text-xs font-extrabold mb-3 flex items-center gap-2" style={{ color: "#06b6d4" }}><Folder size={13} /> Projects</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.projects.map((proj: any) => (
              <div key={proj.id} className="p-3 rounded-xl" style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${border}` }}>
                <span className={`text-xs font-bold block ${txt}`}>{proj.title}</span>
                <p className="text-[10px] mt-1 line-clamp-2" style={{ color: muted }}>{proj.description}</p>
                {proj.techStack?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {proj.techStack.slice(0, 3).map((t: string) => <span key={t} className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.activities?.length > 0 && (
        <div className="rounded-2xl p-5" style={pc}>
          <h3 className="text-xs font-extrabold mb-3 flex items-center gap-2" style={{ color: "#10b981" }}><Activity size={13} /> Recent Activity</h3>
          <div className="space-y-2">
            {data.activities.slice(0, 5).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${border}` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.1)" }}>
                  <Activity size={12} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] font-bold block ${txt}`}>{a.title}</span>
                  {a.detail && <span className="text-[9px]" style={{ color: muted }}>{a.detail}</span>}
                </div>
                {a.xp > 0 && <span className="text-[9px] font-bold text-amber-500">+{a.xp} XP</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.achievements?.length > 0 && (
        <div className="rounded-2xl p-5" style={pc}>
          <h3 className="text-xs font-extrabold mb-3 flex items-center gap-2" style={{ color: "#f59e0b" }}><Trophy size={13} /> Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.achievements.map((a: any) => (
              <div key={a.id} className="p-3 rounded-xl text-center" style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${border}` }}>
                <Trophy size={16} className="text-amber-500 mx-auto mb-1" />
                <span className={`text-[10px] font-bold block ${txt}`}>{a.title}</span>
                <span className="text-[9px]" style={{ color: muted }}>{a.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

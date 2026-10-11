"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Award, Globe, ExternalLink, Star, BookOpen, Code2, FileText,
  Target, Calendar, Download, GraduationCap, Layers, Edit3, Save, X,
  Upload, Trash2, Link2, Camera, CheckCircle2, AlertCircle,
  Loader2, Briefcase, MapPin, Phone, Mail, RefreshCw, AtSign, LogOut
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { getDiceBearUrl } from "@/lib/avatar";
import { AnimatedSkeleton } from "@/components/ui/PremiumComponents";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

// ─── Profile Interface ─────────────────────────────────────────────────────
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
  year: string | null;
  graduationYear: string | null;
  skills: string[];
  interestedDomains: string[];
  targetRole: string | null;
  careerGoal: string | null;
  careerObjective: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  resumeUrl: string | null;
  resumeName: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string; createdAt: string };
}

// ─── Animations ────────────────────────────────────────────────────────────
const cardHover = {
  rest: { y: 0, scale: 1, boxShadow: "0 10px 30px -15px rgba(0,0,0,0.3)" },
  hover: { 
    y: -4, 
    scale: 1.01, 
    boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)",
    borderColor: "rgba(245, 158, 11, 0.25)",
    transition: { type: "spring" as const, stiffness: 300, damping: 20 }
  }
};

const tabContentVariants = {
  hidden: { opacity: 0, x: 15 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit: { opacity: 0, x: -15, transition: { duration: 0.25, ease: "easeIn" as const } }
};

// ─── Helper: Completion % ──────────────────────────────────────────────────
function calcCompletion(p: ProfileData | null): number {
  if (!p) return 0;
  const fields = [
    p.user?.name, p.user?.email, p.username, p.phone, p.location, p.aboutMe,
    p.college, p.branch, p.degree, p.graduationYear,
    p.skills?.length > 0 ? "y" : "", p.interestedDomains?.length > 0 ? "y" : "",
    p.targetRole, p.careerObjective, p.linkedin, p.github, p.resumeUrl
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

// ─── Field Display ─────────────────────────────────────────────────────────
function FieldDisplay({ label, value, c, icon }: {
  label: string; value?: string | null; c: Record<string, string>; icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon && <span style={{ color: c.primary }}>{icon}</span>}
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
          {label}
        </span>
      </div>
      <div className={`px-4 py-3.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${value ? "" : "italic"}`}
        style={{
          background: value ? "rgba(255,255,255,0.02)" : "transparent",
          borderColor: c.border,
          color: value ? c.text : c.textMuted
        }}>
        {value || "Not specified"}
      </div>
    </div>
  );
}

// ─── Form Input ────────────────────────────────────────────────────────────
function FormInput({ label, value, onChange, placeholder, c, type = "text", hint, icon, disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  c: Record<string, string>; type?: string; hint?: string; icon?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>
        {icon && <span style={{ color: c.primary }}>{icon}</span>}
        {label}
      </label>
      {hint && <p className="text-[9px]" style={{ color: c.textMuted }}>{hint}</p>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3.5 rounded-xl text-xs font-semibold outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed border"
        style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
        onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = c.primary; }}
        onBlur={e => e.currentTarget.style.borderColor = c.border}
      />
    </div>
  );
}

// ─── Form Textarea ─────────────────────────────────────────────────────────
function FormTextarea({ label, value, onChange, placeholder, c, hint, icon }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  c: Record<string, string>; hint?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>
        {icon && <span style={{ color: c.primary }}>{icon}</span>}
        {label}
      </label>
      {hint && <p className="text-[9px]" style={{ color: c.textMuted }}>{hint}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
        className="w-full px-4 py-3.5 rounded-xl text-xs font-semibold outline-none transition-all duration-200 resize-y border"
        style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
        onFocus={e => e.currentTarget.style.borderColor = c.primary}
        onBlur={e => e.currentTarget.style.borderColor = c.border}
      />
    </div>
  );
}

// ─── Tag Chip ──────────────────────────────────────────────────────────────
function TagChip({ label, c, onRemove }: { label: string; c: Record<string, string>; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all hover:scale-[1.03]"
      style={{ background: "rgba(245,158,11,0.06)", color: c.primary, borderColor: "rgba(245,158,11,0.18)" }}>
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 hover:opacity-75 transition-opacity cursor-pointer bg-transparent border-none p-0 flex items-center"
          style={{ color: c.primary }}>
          <X size={12} />
        </button>
      )}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROFILE VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function ProfileView() {
  const theme = useTheme();
  const { logout } = useAuth();
  const isDark = theme === "dark";
  const fileRef = useRef<HTMLInputElement>(null);

  const c = useMemo(() => ({
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.75)" : "#334155",
    textMuted: isDark ? "rgba(255,255,255,0.45)" : "#64748b",
    cardBg: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.8)",
    cardBgHover: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.95)",
    border: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
    primary: "#f59e0b",
    primaryGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    secondaryGradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    inputBg: isDark ? "rgba(0,0,0,0.2)" : "#f8fafc",
  }), [isDark]);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Tab Management
  const [activeTab, setActiveTab] = useState<"profile" | "academic" | "resume">("profile");

  const [f, setF] = useState({
    username: "", phone: "", location: "", aboutMe: "",
    college: "", branch: "", degree: "", graduationYear: "",
    skills: "", interestedDomains: "",
    targetRole: "", careerObjective: "",
    linkedin: "", github: "", portfolio: ""
  });

  const setField = useCallback((key: keyof typeof f) => (val: string) => {
    setF(p => ({ ...p, [key]: val }));
    setHasChanges(true);
  }, []);

  const populate = useCallback((data: ProfileData) => {
    setF({
      username: data.username ?? "",
      phone: data.phone ?? "",
      location: data.location ?? "",
      aboutMe: data.aboutMe ?? "",
      college: data.college ?? "",
      branch: data.branch ?? "",
      degree: data.degree ?? "",
      graduationYear: data.graduationYear ?? "",
      skills: (data.skills ?? []).join(", "),
      interestedDomains: (data.interestedDomains ?? []).join(", "),
      targetRole: data.targetRole ?? "",
      careerObjective: data.careerObjective ?? "",
      linkedin: data.linkedin ?? "",
      github: data.github ?? "",
      portfolio: data.portfolio ?? ""
    });
    setHasChanges(false);
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/profile/me");
      const data = res.data.profile as ProfileData;
      setProfile(data);
      populate(data);
    } catch (error) {
      const msg = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as Error)?.message || "Failed to load profile";
      console.error("[ProfileView] Fetch error:", error);
      setError(msg);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [populate]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        ...f,
        skills: f.skills.split(",").map(s => s.trim()).filter(Boolean),
        interestedDomains: f.interestedDomains.split(",").map(d => d.trim()).filter(Boolean)
      };
      await api.put("/profile/me", payload);
      toast.success("Profile updated successfully!");
      setEditMode(false);
      setHasChanges(false);
      await fetchProfile();
    } catch (error) {
      const msg = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as Error)?.message || "Failed to save profile";
      console.error("[ProfileView] Save error:", error);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [f, fetchProfile]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      if (!confirm("Discard unsaved changes?")) return;
    }
    setEditMode(false);
    setHasChanges(false);
    if (profile) populate(profile);
  }, [hasChanges, profile, populate]);

  const handleResumeUpload = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      await api.post("/profile/upload-resume", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Resume uploaded successfully!");
      await fetchProfile();
    } catch (error) {
      const msg = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || "Upload failed";
      console.error("[ProfileView] Upload error:", error);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, [fetchProfile]);

  const handleRemoveResume = useCallback(async () => {
    try {
      await api.post("/profile/remove-resume");
      toast.success("Resume removed");
      await fetchProfile();
    } catch (error) {
      console.error("[ProfileView] Remove resume error:", error);
      toast.error("Could not remove resume");
    }
  }, [fetchProfile]);

  // ── Derived ──
  const completion = calcCompletion(profile);
  const displayName = profile?.user?.name ?? "User";
  const email = profile?.user?.email ?? "";
  const skills = profile?.skills ?? [];
  const domains = profile?.interestedDomains ?? [];
  const memberSince = profile?.user?.createdAt ? new Date(profile.user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "";

  // ── Loading State ──
  if (loading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <AnimatedSkeleton className="h-4 w-24 rounded-full" />
            <AnimatedSkeleton className="h-10 w-64 rounded-xl" />
          </div>
          <AnimatedSkeleton className="h-11 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          <div className="space-y-6">
            <AnimatedSkeleton className="h-[360px] rounded-3xl" />
            <AnimatedSkeleton className="h-44 rounded-3xl" />
          </div>
          <div className="space-y-6">
            <AnimatedSkeleton className="h-14 rounded-2xl" />
            <AnimatedSkeleton className="h-[400px] rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4 relative z-10">
      
      {/* Background ambient blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-72 h-72 rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b"
        style={{ borderColor: c.border }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: c.primary }}>
              Account Settings
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.1em]">Active</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: c.text, fontFamily: "var(--font-outfit)" }}>
            Profile Configuration
          </h1>
          <p className="text-xs" style={{ color: c.textMuted }}>
            {memberSince && `Registered on ${memberSince}`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {editMode ? (
            <>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer bg-white/5 hover:bg-white/10"
                style={{ borderColor: c.border, color: c.textSec }}>
                <X size={14} /> Cancel
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleSave} disabled={saving || !hasChanges}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/10"
                style={{ background: hasChanges ? c.primaryGradient : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: hasChanges ? "#000" : c.textMuted }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving..." : "Save Config"}
              </motion.button>
            </>
          ) : (
            <>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-lg shadow-amber-500/10"
                style={{ background: c.primaryGradient, color: "#000" }}>
                <Edit3 size={14} /> Edit Profile
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer hover:bg-red-500/10 border-red-500/20 text-red-400 bg-transparent">
                <LogOut size={14} /> Logout
              </motion.button>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Error Banner ── */}
      {error && !profile && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border p-5 flex items-start gap-4"
          style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}>
          <AlertCircle size={20} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-500">Initialization failed</p>
            <p className="text-[11px] mt-1" style={{ color: c.textMuted }}>{error}</p>
            <p className="text-[11px] mt-1" style={{ color: c.textMuted }}>Ensure backend server connection is active. You can still set custom fields offline.</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={fetchProfile}
            className="px-3.5 py-2 rounded-xl text-[11px] font-bold border-none cursor-pointer bg-red-500/10 hover:bg-red-500/20"
            style={{ color: "#ef4444" }}>
            <RefreshCw size={12} className="inline mr-1" /> Re-sync
          </motion.button>
        </motion.div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">

        {/* ═══ LEFT SIDEBAR: PROFILE SUMMARY ═══ */}
        <div className="space-y-6">
          
          {/* Glassmorphic User Card */}
          <motion.div variants={cardHover} initial="rest" whileHover="hover"
            className="rounded-3xl border overflow-hidden backdrop-blur-xl transition-all duration-300"
            style={{ background: c.cardBg, borderColor: c.border }}>
            
            {/* Ambient Accent Header */}
            <div className="h-28 relative overflow-hidden" style={{
              background: `linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(99,102,241,0.08) 100%)`
            }}>
              <div className="absolute inset-0 opacity-30"
                style={{ backgroundImage: `radial-gradient(circle at 10% 20%, rgba(245,158,11,0.4) 0%, transparent 60%)` }} />
            </div>
            
            {/* Avatar & Identifiers */}
            <div className="px-6 -mt-12 pb-6 text-center relative">
              <div className="relative w-24 h-24 mx-auto mb-4 group">
                {/* Rotating double neon rings */}
                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-500 opacity-60 blur-sm group-hover:opacity-100 group-hover:rotate-180 transition-all duration-1000" />
                <div className="w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden relative z-10"
                  style={{ borderColor: "#111827", background: "#111827" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getDiceBearUrl(displayName)} alt="avatar" width={96} height={96}
                    style={{ borderRadius: "50%", display: "block" }} />
                </div>
              </div>

              <h2 className="text-lg font-black tracking-tight" style={{ color: c.text, fontFamily: "var(--font-outfit)" }}>
                {displayName}
              </h2>
              <p className="text-[11px] font-semibold mt-1 flex items-center justify-center gap-1.5" style={{ color: c.textMuted }}>
                <Mail size={11} /> {email}
              </p>

              {profile?.targetRole && (
                <div className="inline-block mt-3 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border"
                  style={{ background: "rgba(245,158,11,0.05)", color: c.primary, borderColor: "rgba(245,158,11,0.18)" }}>
                  {profile.targetRole}
                </div>
              )}
              {profile?.location && (
                <div className="flex items-center justify-center gap-1 mt-3" style={{ color: c.textMuted }}>
                  <MapPin size={11} className="shrink-0" />
                  <span className="text-xs font-semibold">{profile.location}</span>
                </div>
              )}
            </div>

            {/* Profile Completion Bar */}
            <div className="px-6 pb-6 border-t" style={{ borderColor: c.border }}>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mt-5 mb-2.5">
                <span style={{ color: c.textMuted }}>Profile Integrity</span>
                <span style={{ color: c.primary }}>{completion}%</span>
              </div>
              <div className="relative h-2 w-full rounded-full overflow-hidden bg-white/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${completion}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: c.primaryGradient }} />
              </div>
              {completion < 100 && (
                <p className="text-[10px] mt-2.5 italic" style={{ color: c.textMuted }}>
                  Fill in all fields to reach 100% config completion.
                </p>
              )}
            </div>

            {/* Metadata Stats Grid */}
            {profile && (
              <div className="px-6 pb-6 border-t grid grid-cols-2 gap-3" style={{ borderColor: c.border }}>
                {[
                  { label: "Skills Set", value: skills.length, icon: <Code2 size={12} /> },
                  { label: "Domains", value: domains.length, icon: <Layers size={12} /> },
                  { label: "Socials", value: [profile.linkedin, profile.github, profile.portfolio].filter(Boolean).length, icon: <Globe size={12} /> },
                  { label: "Resume Upload", value: profile.resumeUrl ? "1 File" : "None", icon: <FileText size={12} /> },
                ].map((stat) => (
                  <div key={stat.label} className="text-center py-3 rounded-2xl border bg-white/[0.01]"
                    style={{ borderColor: c.border }}>
                    <div className="flex items-center justify-center gap-1.5 mb-1.5" style={{ color: c.primary }}>
                      {stat.icon}
                    </div>
                    <div className="text-sm font-black" style={{ color: c.text }}>{stat.value}</div>
                    <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Social Links Panel */}
          {profile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="rounded-3xl border p-5 space-y-3.5 backdrop-blur-xl"
              style={{ background: c.cardBg, borderColor: c.border }}>
              <h3 className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
                Professional Outlets
              </h3>
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all no-underline bg-white/5 hover:bg-white/10 group"
                  style={{ color: c.textSec }}>
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    LinkedIn
                  </span>
                  <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </a>
              )}
              {profile.github && (
                <a href={profile.github} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all no-underline bg-white/5 hover:bg-white/10 group"
                  style={{ color: c.textSec }}>
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    GitHub
                  </span>
                  <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </a>
              )}
              {profile.portfolio && (
                <a href={profile.portfolio} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all no-underline bg-white/5 hover:bg-white/10 group"
                  style={{ color: c.textSec }}>
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    Portfolio
                  </span>
                  <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </a>
              )}
              {!profile.linkedin && !profile.github && !profile.portfolio && (
                <p className="text-[11px] italic" style={{ color: c.textMuted }}>
                  No professional links configured.
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* ═══ RIGHT SIDEBAR: DETAILED FORMS & TABS ═══ */}
        <div className="space-y-6">
          
          {/* Tab Selection Header */}
          <div className="flex border-b" style={{ borderColor: c.border }}>
            {[
              { id: "profile", label: "Profile & Bio", icon: <User size={14} /> },
              { id: "academic", label: "Academic & Skills", icon: <GraduationCap size={14} /> },
              { id: "resume", label: "Resume Manager", icon: <FileText size={14} /> },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className="flex-1 py-4 flex items-center justify-center gap-2 text-xs font-bold tracking-tight uppercase relative transition-colors focus:outline-none cursor-pointer bg-transparent border-none"
                  style={{ color: active ? c.text : c.textMuted }}>
                  {tab.icon}
                  {tab.label}
                  {active && (
                    <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: c.primaryGradient }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Interactive Form Panel */}
          <div className="rounded-3xl border p-6 backdrop-blur-xl"
            style={{ background: c.cardBg, borderColor: c.border }}>
            
            <AnimatePresence mode="wait">
              <motion.div key={activeTab + (editMode ? "-edit" : "-view")}
                variants={tabContentVariants} initial="hidden" animate="visible" exit="exit"
                className="space-y-6">
                
                {/* ─── TAB 1: PROFILE & BIO ─── */}
                {activeTab === "profile" && (
                  editMode ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Full Name" value={profile?.user?.name ?? ""} onChange={() => {}} placeholder="" c={c} icon={<User size={11} />} disabled />
                        <FormInput label="Username" value={f.username} onChange={setField("username")} placeholder="@username" c={c} icon={<AtSign size={11} />} />
                        <FormInput label="Email Address" value={profile?.user?.email ?? ""} onChange={() => {}} placeholder="" c={c} icon={<Mail size={11} />} disabled />
                        <FormInput label="Phone Number" value={f.phone} onChange={setField("phone")} placeholder="+91 XXXXX XXXXX" c={c} icon={<Phone size={11} />} />
                        <FormInput label="Location" value={f.location} onChange={setField("location")} placeholder="City, Country" c={c} icon={<MapPin size={11} />} />
                        <FormInput label="Personal Website" value={f.portfolio} onChange={setField("portfolio")} placeholder="https://yoursite.com" c={c} icon={<Globe size={11} />} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="LinkedIn Link" value={f.linkedin} onChange={setField("linkedin")} placeholder="https://linkedin.com/in/..." c={c} icon={<Link2 size={11} />} />
                        <FormInput label="GitHub Link" value={f.github} onChange={setField("github")} placeholder="https://github.com/..." c={c} icon={<Link2 size={11} />} />
                      </div>
                      <FormTextarea label="About Me" value={f.aboutMe} onChange={setField("aboutMe")} placeholder="Write a short summary profile bio..." c={c} icon={<User size={11} />} />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldDisplay label="Full Name" value={profile?.user?.name} c={c} icon={<User size={11} />} />
                        <FieldDisplay label="Username" value={profile?.username} c={c} icon={<AtSign size={11} />} />
                        <FieldDisplay label="Email Address" value={profile?.user?.email} c={c} icon={<Mail size={11} />} />
                        <FieldDisplay label="Phone Number" value={profile?.phone} c={c} icon={<Phone size={11} />} />
                        <FieldDisplay label="Location" value={profile?.location} c={c} icon={<MapPin size={11} />} />
                        <FieldDisplay label="Personal Website" value={profile?.portfolio} c={c} icon={<Globe size={11} />} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldDisplay label="LinkedIn Link" value={profile?.linkedin} c={c} icon={<Link2 size={11} />} />
                        <FieldDisplay label="GitHub Link" value={profile?.github} c={c} icon={<Link2 size={11} />} />
                      </div>
                      <FieldDisplay label="About Me" value={profile?.aboutMe} c={c} />
                    </div>
                  )
                )}

                {/* ─── TAB 2: ACADEMIC & SKILLS ─── */}
                {activeTab === "academic" && (
                  editMode ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="College / University" value={f.college} onChange={setField("college")} placeholder="e.g. Stanford University" c={c} icon={<GraduationCap size={11} />} />
                        <FormInput label="Branch / Specialization" value={f.branch} onChange={setField("branch")} placeholder="e.g. Computer Science" c={c} icon={<BookOpen size={11} />} />
                        <FormInput label="Degree Type" value={f.degree} onChange={setField("degree")} placeholder="e.g. B.S. or M.S." c={c} icon={<Award size={11} />} />
                        <FormInput label="Graduation Year" value={f.graduationYear} onChange={setField("graduationYear")} placeholder="e.g. 2025" c={c} icon={<Calendar size={11} />} />
                      </div>

                      <div className="border-t pt-5" style={{ borderColor: c.border }}>
                        <FormInput label="Skills" value={f.skills} onChange={setField("skills")} placeholder="React, Node.js, Python, TypeScript" c={c} hint="Provide a comma-separated list of skills" icon={<Code2 size={11} />} />
                        {f.skills && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {f.skills.split(",").map(s => s.trim()).filter(Boolean).map((skill, i) => (
                              <TagChip key={i} label={skill} c={c} />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-5" style={{ borderColor: c.border }}>
                        <FormInput
                          label="Interested Domains"
                          value={f.interestedDomains}
                          onChange={setField("interestedDomains")}
                          placeholder="e.g. Artificial Intelligence, Cloud Computing, Cybersecurity"
                          c={c}
                          hint="Provide a comma-separated list of interested domains"
                          icon={<Layers size={11} />}
                        />
                        {f.interestedDomains && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {f.interestedDomains.split(",").map(d => d.trim()).filter(Boolean).map((domain, i) => (
                              <TagChip key={i} label={domain} c={c} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldDisplay label="College / University" value={profile?.college} c={c} icon={<GraduationCap size={11} />} />
                        <FieldDisplay label="Branch / Specialization" value={profile?.branch} c={c} icon={<BookOpen size={11} />} />
                        <FieldDisplay label="Degree Type" value={profile?.degree} c={c} icon={<Award size={11} />} />
                        <FieldDisplay label="Graduation Year" value={profile?.graduationYear} c={c} icon={<Calendar size={11} />} />
                      </div>

                      <div className="border-t pt-5" style={{ borderColor: c.border }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider block mb-3.5" style={{ color: c.textMuted }}>Technical Skill Set</span>
                        {skills.length ? (
                          <div className="flex flex-wrap gap-2.5">
                            {skills.map(s => <TagChip key={s} label={s} c={c} />)}
                          </div>
                        ) : (
                          <p className="text-xs italic" style={{ color: c.textMuted }}>No technical skills listed.</p>
                        )}
                      </div>

                      <div className="border-t pt-5" style={{ borderColor: c.border }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider block mb-3.5" style={{ color: c.textMuted }}>Configured Domain Focus</span>
                        {domains.length ? (
                          <div className="flex flex-wrap gap-2.5">
                            {domains.map(d => <TagChip key={d} label={d} c={c} />)}
                          </div>
                        ) : (
                          <p className="text-xs italic" style={{ color: c.textMuted }}>No domain focuses selected.</p>
                        )}
                      </div>
                    </div>
                  )
                )}

                {/* ─── TAB 3: CAREER & RESUME ─── */}
                {activeTab === "resume" && (
                  <div className="space-y-6">
                    {editMode ? (
                      <div className="space-y-6">
                        <FormInput label="Target Professional Role" value={f.targetRole} onChange={setField("targetRole")} placeholder="e.g. Staff Software Engineer" c={c} icon={<Briefcase size={11} />} />
                        <FormTextarea label="Career Objective" value={f.careerObjective} onChange={setField("careerObjective")} placeholder="Briefly write your primary career goals..." c={c} icon={<Target size={11} />} />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <FieldDisplay label="Target Professional Role" value={profile?.targetRole} c={c} icon={<Briefcase size={11} />} />
                        <FieldDisplay label="Career Objective" value={profile?.careerObjective} c={c} icon={<Target size={11} />} />
                      </div>
                    )}

                    <div className="border-t pt-5 space-y-4.5" style={{ borderColor: c.border }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: c.textMuted }}>Curriculum Vitae (PDF)</span>
                      
                      {profile?.resumeUrl ? (
                        <div className="flex items-center gap-4.5 p-4.5 rounded-2xl border"
                          style={{ background: "rgba(255,255,255,0.01)", borderColor: c.border }}>
                          <div className="p-3.5 rounded-xl shrink-0" style={{ background: "rgba(245,158,11,0.08)", color: c.primary }}>
                            <FileText size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: c.text }}>
                              {profile.resumeName || "Uploaded_Resume.pdf"}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>PDF Resume document active</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={profile.resumeUrl} target="_blank" rel="noreferrer"
                              className="px-4 py-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border no-underline transition-all hover:bg-white/5"
                              style={{ background: "transparent", color: c.text, borderColor: c.border }}>
                              <Download size={13} /> View
                            </a>
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              onClick={handleRemoveResume}
                              className="px-4 py-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border-none cursor-pointer transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20">
                              <Trash2 size={13} /> Delete
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 rounded-2xl border border-dashed flex flex-col items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.01)", borderColor: c.border }}>
                          <Upload size={32} className="mb-3.5 opacity-40 animate-pulse" style={{ color: c.textMuted }} />
                          <p className="text-xs mb-4 font-semibold" style={{ color: c.textMuted }}>Upload a PDF resume (Max 5MB)</p>
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="px-5 py-2.5 rounded-xl border-none text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-amber-500/10"
                            style={{ background: c.primaryGradient, color: "#000" }}>
                            {uploading ? <><Loader2 size={13} className="inline mr-1.5 animate-spin" /> Transmitting...</> : <><Upload size={13} className="inline mr-1.5" /> Select File</>}
                          </motion.button>
                        </div>
                      )}
                      
                      <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                        onChange={e => { const file = e.target.files?.[0]; if (file) handleResumeUpload(file); e.target.value = ""; }} />
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

          </div>

        </div>

      </div>

    </div>
  );
}

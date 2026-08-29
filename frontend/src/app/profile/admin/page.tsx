"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User, Mail, Phone, MapPin, Briefcase, Link2, ExternalLink, Save, Loader2,
  ArrowLeft, ShieldCheck, AlertCircle, CheckCircle2, Edit3, Calendar, Globe,
  Sparkles, X, Plus, Award,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTheme } from "@/hooks/useTheme";
import { getDiceBearUrl } from "@/lib/avatar";
import { AdminHeader } from "@/components/admin/AdminHeader";

interface AdminProfile {
  id?: string;
  userId?: string;
  username: string | null;
  phone: string | null;
  location: string | null;
  aboutMe: string | null;
  targetRole: string | null;
  careerObjective: string | null;
  skills: string[];
  interestedDomains: string[];
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  user?: { id: string; name: string; email: string; role: string; createdAt: string };
}

const EMPTY: AdminProfile = {
  username: null, phone: null, location: null, aboutMe: null, targetRole: null,
  careerObjective: null, skills: [], interestedDomains: [],
  linkedin: null, github: null, portfolio: null,
};

function isProfileEmpty(p: AdminProfile): boolean {
  return (
    !p.phone && !p.location && !p.aboutMe && !p.targetRole && !p.careerObjective &&
    !p.linkedin && !p.github && !p.portfolio &&
    (p.skills?.length ?? 0) === 0
  );
}

function completeness(p: AdminProfile): number {
  const checks = [p.phone, p.location, p.aboutMe, p.targetRole, p.careerObjective, p.linkedin, p.github, p.portfolio, p.skills?.length ? "y" : ""];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export default function AdminProfilePage() {
  useRequireAuth("ADMIN");
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme !== "light";

  // ─── Liquid-glass theme tokens ────────────────────────────────
  // Frosted translucent surfaces, soft borders, layered blur — Apple style.
  const t = useMemo(() => ({
    text: isDark ? "text-white" : "text-slate-900",
    // Glass panel: semi-transparent bg + blur + hairline border + soft shadow
    glass: isDark
      ? "bg-white/[0.06] border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
      : "bg-white/60 border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.12)] backdrop-blur-2xl",
    glassHero: isDark
      ? "bg-white/[0.08] border-white/[0.14] shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-3xl"
      : "bg-white/70 border-white/80 shadow-[0_16px_48px_rgba(31,38,135,0.16)] backdrop-blur-3xl",
    sectionTitle: isDark ? "text-white/90" : "text-slate-800",
    label: isDark ? "text-white/50" : "text-slate-500",
    valueText: isDark ? "text-white/90" : "text-slate-800",
    bodyText: isDark ? "text-white/70" : "text-slate-600",
    muted: isDark ? "text-white/35" : "text-slate-400",
    input: isDark
      ? "bg-white/[0.06] border-white/[0.14] text-white placeholder:text-white/30 focus:border-amber-400/60 focus:bg-white/[0.09]"
      : "bg-white/70 border-white/80 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white/90",
    chip: isDark ? "bg-white/[0.08] border-white/[0.14] text-white/80" : "bg-white/70 border-white/80 text-slate-700",
    track: isDark ? "bg-white/[0.10]" : "bg-slate-900/[0.08]",
    ghostBtn: isDark ? "bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.14] text-white" : "bg-white/60 hover:bg-white/90 border-white/80 text-slate-800",
    ring: isDark ? "ring-white/10" : "ring-white/60",
    divider: isDark ? "border-white/[0.10]" : "border-slate-900/[0.08]",
  }), [isDark]);

  const [profile, setProfile] = useState<AdminProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleTheme = useCallback(() => {
    const next = isDark ? "light" : "dark";
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }, [isDark]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/profile/me");
      const data = (res.data?.profile ?? res.data ?? {}) as Partial<AdminProfile>;
      setProfile({
        ...EMPTY,
        ...data,
        skills: Array.isArray(data.skills) ? data.skills : [],
        interestedDomains: Array.isArray(data.interestedDomains) ? data.interestedDomains : [],
      });
    } catch {
      setError("Could not load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const emptyProfile = useMemo(() => isProfileEmpty(profile), [profile]);
  const pct = useMemo(() => completeness(profile), [profile]);
  useEffect(() => { if (!loading && emptyProfile) setEditing(true); }, [loading, emptyProfile]);

  const setField = (key: keyof AdminProfile, value: string) => setProfile((p) => ({ ...p, [key]: value }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (!profile.skills.includes(s)) setProfile((p) => ({ ...p, skills: [...p.skills, s] }));
    setSkillInput("");
  };
  const removeSkill = (s: string) => setProfile((p) => ({ ...p, skills: p.skills.filter((x) => x !== s) }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put("/profile/me", {
        username: profile.username, phone: profile.phone, location: profile.location,
        aboutMe: profile.aboutMe, targetRole: profile.targetRole, careerObjective: profile.careerObjective,
        skills: profile.skills, linkedin: profile.linkedin, github: profile.github, portfolio: profile.portfolio,
      });
      toast.success("Profile saved");
      setEditing(false);
      await load();
    } catch {
      setError("Failed to save profile. Please try again.");
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const joined = user && (user as { createdAt?: string }).createdAt
    ? new Date((user as { createdAt?: string }).createdAt as string).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : null;
  const avatar = getDiceBearUrl(user?.email || user?.name || "admin");

  const links = [
    { key: "linkedin" as const, label: "LinkedIn", icon: <ExternalLink size={14} />, val: profile.linkedin },
    { key: "github" as const, label: "GitHub", icon: <Link2 size={14} />, val: profile.github },
    { key: "portfolio" as const, label: "Portfolio", icon: <Globe size={14} />, val: profile.portfolio },
  ];

  return (
    <div className={`relative min-h-screen overflow-hidden ${t.text} ${isDark ? "bg-[#05070c]" : "bg-[#eef1f7]"}`}>
      {/* ── Ambient liquid-glass backdrop: layered blurred color blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={`absolute -top-32 -left-24 w-[38rem] h-[38rem] rounded-full blur-[120px] ${isDark ? "bg-amber-500/20" : "bg-amber-400/40"}`} />
        <div className={`absolute top-1/3 -right-32 w-[34rem] h-[34rem] rounded-full blur-[130px] ${isDark ? "bg-orange-600/15" : "bg-orange-300/40"}`} />
        <div className={`absolute -bottom-40 left-1/4 w-[36rem] h-[36rem] rounded-full blur-[140px] ${isDark ? "bg-indigo-600/15" : "bg-sky-300/40"}`} />
      </div>

      <AdminHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        theme={isDark ? "dark" : "light"}
        toggleTheme={toggleTheme}
        onRefresh={load}
        onAddJob={() => router.push("/dashboard/admin")}
        onIngestJobs={() => router.push("/dashboard/admin")}
      />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-8 pt-[94px] pb-20">
        {/* Back link */}
        <button
          onClick={() => router.push("/dashboard/admin")}
          className={`inline-flex items-center gap-2 text-sm font-semibold mb-5 transition-colors ${t.label} hover:${isDark ? "text-white" : "text-slate-900"}`}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* ── Identity glass card ── */}
        <div className={`relative rounded-[28px] border ${t.glassHero} overflow-hidden`}>
          {/* top glossy sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/25 to-transparent" />
          {/* brand accent strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative shrink-0 mx-auto sm:mx-0">
                <div className={`w-28 h-28 rounded-[26px] ring-4 ${t.ring} overflow-hidden bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-xl`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full ring-2 ${isDark ? "ring-[#05070c]" : "ring-white"} whitespace-nowrap shadow`}>ACTIVE</span>
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-[28px] font-black tracking-tight truncate">{user?.name || "Admin"}</h1>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 border border-amber-500/40 bg-amber-500/15 rounded-full px-2.5 py-1 backdrop-blur">
                    <ShieldCheck size={12} /> ADMIN
                  </span>
                </div>
                <p className={`text-sm font-medium mt-1 ${t.label}`}>{profile.targetRole || "Platform Administrator"}</p>
                <div className={`flex items-center gap-x-5 gap-y-1.5 mt-3 text-xs flex-wrap justify-center sm:justify-start ${t.label}`}>
                  <span className="inline-flex items-center gap-1.5"><Mail size={13} /> {user?.email || "—"}</span>
                  {profile.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {profile.phone}</span>}
                  {profile.location && <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {profile.location}</span>}
                  {joined && <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> Joined {joined}</span>}
                </div>
              </div>

              {!loading && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 shrink-0"
                >
                  <Edit3 size={15} /> Edit Profile
                </button>
              )}
            </div>

            {!loading && (
              <div className={`mt-6 pt-6 border-t ${t.divider}`}>
                <div className={`flex items-center justify-between text-xs font-semibold mb-2 ${t.label}`}>
                  <span className="inline-flex items-center gap-1.5"><Sparkles size={13} className="text-amber-500" /> Profile completeness</span>
                  <span className={pct === 100 ? "text-emerald-500" : "text-amber-500"}>{pct}%</span>
                </div>
                <div className={`h-2 w-full rounded-full ${t.track} overflow-hidden`}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className={`flex items-center justify-center py-24 ${t.label}`}>
            <Loader2 className="animate-spin mr-2" size={18} /> Loading profile…
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-6 flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 backdrop-blur">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {emptyProfile && !editing && (
              <div className={`mt-6 rounded-2xl border ${t.glass} p-6 flex flex-col sm:flex-row items-center justify-between gap-4`}>
                <p className={`text-sm ${t.bodyText}`}>Your admin profile isn&apos;t set up yet. Add your details, skills and links.</p>
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 shrink-0">
                  <User size={15} /> Create profile
                </button>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-5">
                <Section t={t} title="About" icon={<User size={15} />}>
                  {editing ? (
                    <textarea value={profile.aboutMe ?? ""} onChange={(e) => setField("aboutMe", e.target.value)} rows={4}
                      placeholder="A short professional bio…"
                      className={`w-full rounded-2xl border px-3.5 py-2.5 text-sm outline-none transition-all ${t.input}`} />
                  ) : (
                    <p className={`text-sm leading-relaxed ${t.bodyText}`}>{profile.aboutMe || <span className={t.muted}>No bio added yet.</span>}</p>
                  )}
                </Section>

                <Section t={t} title="Details" icon={<Briefcase size={15} />}>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                    <Field t={t} icon={<User size={14} />} label="Username" value={profile.username} editing={editing} onChange={(v) => setField("username", v)} placeholder="admin-handle" />
                    <Field t={t} icon={<Phone size={14} />} label="Phone" value={profile.phone} editing={editing} onChange={(v) => setField("phone", v)} placeholder="+91 …" />
                    <Field t={t} icon={<MapPin size={14} />} label="Location" value={profile.location} editing={editing} onChange={(v) => setField("location", v)} placeholder="City, Country" />
                    <Field t={t} icon={<Briefcase size={14} />} label="Role / Title" value={profile.targetRole} editing={editing} onChange={(v) => setField("targetRole", v)} placeholder="Platform Administrator" />
                    <div className="sm:col-span-2">
                      <FieldLabel t={t} icon={<Award size={14} />} label="Objective" />
                      {editing ? (
                        <input value={profile.careerObjective ?? ""} onChange={(e) => setField("careerObjective", e.target.value)}
                          placeholder="Short professional objective"
                          className={`w-full rounded-2xl border px-3.5 py-2.5 text-sm outline-none transition-all ${t.input}`} />
                      ) : (
                        <p className={`text-sm ${t.bodyText}`}>{profile.careerObjective || <span className={t.muted}>Not set</span>}</p>
                      )}
                    </div>
                  </div>
                </Section>

                <Section t={t} title="Skills" icon={<Sparkles size={15} />}>
                  {editing && (
                    <div className="flex items-center gap-2 mb-3">
                      <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                        placeholder="Add a skill and press Enter"
                        className={`flex-1 rounded-2xl border px-3.5 py-2.5 text-sm outline-none transition-all ${t.input}`} />
                      <button onClick={addSkill} className="inline-flex items-center gap-1 text-xs font-bold px-3.5 py-2.5 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 shrink-0 shadow shadow-amber-500/20">
                        <Plus size={13} /> Add
                      </button>
                    </div>
                  )}
                  {profile.skills.length ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((s) => (
                        <span key={s} className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3 py-1.5 backdrop-blur ${t.chip}`}>
                          {s}
                          {editing && <button onClick={() => removeSkill(s)} className={`${t.muted} hover:text-red-500`}><X size={12} /></button>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${t.muted}`}>No skills added.</p>
                  )}
                </Section>

                {editing && (
                  <div className="flex items-center gap-3">
                    <button onClick={save} disabled={saving}
                      className="inline-flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 disabled:opacity-60 transition-all shadow-lg shadow-amber-500/25">
                      {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                      {saving ? "Saving…" : "Save profile"}
                    </button>
                    {!emptyProfile && (
                      <button onClick={() => { setEditing(false); load(); }} disabled={saving}
                        className={`text-sm font-bold px-5 py-2.5 rounded-2xl border transition-colors backdrop-blur ${t.ghostBtn}`}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-5">
                <Section t={t} title="Links" icon={<Globe size={15} />}>
                  <div className="space-y-4">
                    {links.map((l) => (
                      <div key={l.key}>
                        <FieldLabel t={t} icon={l.icon} label={l.label} />
                        {editing ? (
                          <input value={l.val ?? ""} onChange={(e) => setField(l.key, e.target.value)} placeholder="https://…"
                            className={`w-full rounded-2xl border px-3.5 py-2.5 text-sm outline-none transition-all ${t.input}`} />
                        ) : l.val ? (
                          <a href={l.val} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-amber-500 hover:underline break-all inline-flex items-center gap-1">
                            {l.val} <ExternalLink size={11} className="shrink-0" />
                          </a>
                        ) : (
                          <p className={`text-sm ${t.muted}`}>Not linked</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>

                <Section t={t} title="Account" icon={<ShieldCheck size={15} />}>
                  <div className="space-y-3 text-sm">
                    <Row t={t} label="Role"><span className="text-amber-500 font-bold">Administrator</span></Row>
                    <Row t={t} label="Email">{user?.email || "—"}</Row>
                    <Row t={t} label="Status"><span className="inline-flex items-center gap-1 text-emerald-500"><CheckCircle2 size={13} /> Active</span></Row>
                    {joined && <Row t={t} label="Member since">{joined}</Row>}
                  </div>
                </Section>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

type Tokens = Record<string, string>;

function Section({ t, title, icon, children }: { t: Tokens; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`relative rounded-3xl border p-6 overflow-hidden ${t.glass}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/15 to-transparent" />
      <h2 className={`relative text-sm font-bold flex items-center gap-2 mb-4 ${t.sectionTitle}`}>
        <span className="text-amber-500">{icon}</span> {title}
      </h2>
      <div className="relative">{children}</div>
    </div>
  );
}

function FieldLabel({ t, icon, label }: { t: Tokens; icon: React.ReactNode; label: string }) {
  return <label className={`text-xs font-semibold flex items-center gap-1.5 mb-1.5 ${t.label}`}>{icon} {label}</label>;
}

function Field({ t, icon, label, value, editing, onChange, placeholder }: {
  t: Tokens; icon: React.ReactNode; label: string; value: string | null; editing: boolean; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel t={t} icon={icon} label={label} />
      {editing ? (
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full rounded-2xl border px-3.5 py-2.5 text-sm outline-none transition-all ${t.input}`} />
      ) : value ? (
        <p className={`text-sm ${t.valueText}`}>{value}</p>
      ) : (
        <p className={`text-sm ${t.muted}`}>Not set</p>
      )}
    </div>
  );
}

function Row({ t, label, children }: { t: Tokens; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={t.label}>{label}</span>
      <span className={`font-medium text-right truncate ${t.valueText}`}>{children}</span>
    </div>
  );
}

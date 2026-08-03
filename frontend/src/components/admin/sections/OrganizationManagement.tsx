"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Building2, Plus, Search, RefreshCw,
  Users, Mail, MapPin, Globe, Loader2, Trash2, Edit2,
  X, CheckCircle2, UserPlus, Upload, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

interface Organization {
  id: string;
  name: string;
  type: "UNIVERSITY" | "COMPANY";
  code?: string | null;
  location?: string | null;
  domain?: string | null;
  contactEmail?: string | null;
  status: string;
  studentCount: number;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  createdAt: string;
  profile?: {
    college?: string;
    branch?: string;
    degree?: string;
    graduationYear?: string;
    phone?: string;
    location?: string;
  } | null;
}

export default function OrganizationManagement() {
  const theme = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [stats, setStats] = useState({ total: 0, totalUniversities: 0, totalCompanies: 0, totalStudents: 0 });
  const [activeTab, setActiveTab] = useState<"ALL" | "UNIVERSITY" | "COMPANY">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<"UNIVERSITY" | "COMPANY">("UNIVERSITY");
  const [formData, setFormData] = useState({ name: "", code: "", location: "", domain: "", contactEmail: "" });
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<Organization | null>(null);

  // View Students Modal State
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Bulk Add Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkBranch, setBulkBranch] = useState("");
  const [bulkDegree, setBulkDegree] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/organizations");
      if (res.data.success) {
        setOrgs(res.data.organizations || []);
        setStats(res.data.stats || { total: 0, totalUniversities: 0, totalCompanies: 0, totalStudents: 0 });
      }
    } catch {
      toast.error("Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Organization name is required.");
    setSubmitting(true);
    try {
      const res = await api.post("/admin/organizations", {
        ...formData,
        type: createType,
      });
      if (res.data.success) {
        toast.success(res.data.message || "Organization created!");
        setCreateModalOpen(false);
        setFormData({ name: "", code: "", location: "", domain: "", contactEmail: "" });
        fetchOrganizations();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create organization.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrg || !editOrg.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/admin/organizations/${editOrg.id}`, {
        name: editOrg.name,
        location: editOrg.location,
        domain: editOrg.domain,
        contactEmail: editOrg.contactEmail,
        code: editOrg.code,
      });
      if (res.data.success) {
        toast.success("Organization updated!");
        setEditModalOpen(false);
        setEditOrg(null);
        fetchOrganizations();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update organization.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrg = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await api.delete(`/admin/organizations/${id}`);
      if (res.data.success) {
        toast.success("Organization deleted.");
        fetchOrganizations();
      }
    } catch {
      toast.error("Failed to delete organization.");
    }
  };

  const handleViewStudents = async (org: Organization) => {
    setSelectedOrg(org);
    setStudentsModalOpen(true);
    setStudentsLoading(true);
    try {
      const res = await api.get(`/admin/organizations/${encodeURIComponent(org.name)}/students`);
      if (res.data.success) {
        setStudents(res.data.students || []);
      }
    } catch {
      toast.error("Failed to fetch students.");
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleBulkAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !bulkEmails.trim()) return toast.error("Please enter at least one email address.");
    setBulkSubmitting(true);

    const emailList = bulkEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 3 && e.includes("@"));

    if (emailList.length === 0) {
      setBulkSubmitting(false);
      return toast.error("No valid email addresses found.");
    }

    const studentsPayload = emailList.map((email) => ({
      email,
      branch: bulkBranch,
      degree: bulkDegree,
    }));

    try {
      const res = await api.post("/admin/organizations/bulk-students", {
        orgName: selectedOrg.name,
        students: studentsPayload,
      });

      if (res.data.success) {
        toast.success(`Successfully registered ${res.data.registeredCount} students under ${selectedOrg.name}!`);
        setBulkModalOpen(false);
        setBulkEmails("");
        setBulkBranch("");
        setBulkDegree("");
        fetchOrganizations();
        if (studentsModalOpen) handleViewStudents(selectedOrg);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Bulk student registration failed.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const filteredOrgs = orgs.filter((org) => {
    const matchesTab = activeTab === "ALL" || org.type === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      org.name.toLowerCase().includes(q) ||
      (org.location && org.location.toLowerCase().includes(q)) ||
      (org.domain && org.domain.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase().trim();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.profile?.branch && s.profile.branch.toLowerCase().includes(q))
    );
  });

  const inputStyle = {
    background: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
    borderColor: isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1",
    color: "var(--text-primary)",
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <SectionHeader
        title="Organization Management"
        description="Manage universities, partner companies, student bulk enrollments, and institution analytics"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setCreateType("UNIVERSITY");
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
            >
              <Plus size={14} /> Add University
            </button>
            <button
              onClick={() => {
                setCreateType("COMPANY");
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff" }}
            >
              <Plus size={14} /> Add Company
            </button>
            <button
              onClick={fetchOrganizations}
              className="p-2 rounded-xl transition-all cursor-pointer hover:bg-white/10"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
              title="Refresh Organizations"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-4 shadow-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500">
              <GraduationCap size={15} />
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Universities</span>
          </div>
          <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{stats.totalUniversities}</p>
        </div>

        <div className="rounded-2xl border p-4 shadow-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500">
              <Building2 size={15} />
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Companies</span>
          </div>
          <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{stats.totalCompanies}</p>
        </div>

        <div className="rounded-2xl border p-4 shadow-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
              <Users size={15} />
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Total Students</span>
          </div>
          <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{stats.totalStudents}</p>
        </div>

        <div className="rounded-2xl border p-4 shadow-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-500">
              <ShieldCheck size={15} />
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Total Organizations</span>
          </div>
          <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{stats.total}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          {(["ALL", "UNIVERSITY", "COMPANY"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab ? "bg-amber-500 text-slate-950 shadow-sm" : "hover:bg-white/5"
              }`}
              style={{ color: activeTab === tab ? "#000" : isDark ? "var(--text-secondary)" : "#475569" }}
            >
              {tab === "ALL" ? "All Organizations" : tab === "UNIVERSITY" ? "Universities" : "Companies"}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search by university, company, location, or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border transition-all"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
        </div>
      ) : filteredOrgs.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-amber-500/10 text-amber-500">
            <GraduationCap size={32} />
          </div>
          <h3 className="text-base font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>No Organizations Found</h3>
          <p className="text-xs max-w-sm mx-auto mb-5" style={{ color: "var(--text-muted)" }}>
            No matching universities or companies found. Click below to add a university or company.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setCreateType("UNIVERSITY"); setCreateModalOpen(true); }}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              style={{ background: "#f59e0b", color: "#000" }}
            >
              + Add University
            </button>
            <button
              onClick={() => { setCreateType("COMPANY"); setCreateModalOpen(true); }}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              style={{ background: "#6366f1", color: "#fff" }}
            >
              + Add Company
            </button>
          </div>
        </div>
      ) : (
        /* Organization Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map((org) => {
            const isUni = org.type === "UNIVERSITY";
            return (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border p-5 flex flex-col justify-between transition-all hover:border-amber-500/40 shadow-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: isUni ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)",
                          border: `1px solid ${isUni ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.3)"}`,
                          color: isUni ? "#f59e0b" : "#818cf8",
                        }}
                      >
                        {isUni ? <GraduationCap size={20} /> : <Building2 size={20} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
                          {org.name}
                        </h4>
                        {org.code && <span className="text-[10px] font-mono font-bold text-amber-500">{org.code}</span>}
                      </div>
                    </div>
                    <StatusBadge variant={isUni ? "warning" : "info"}>
                      {org.type}
                    </StatusBadge>
                  </div>

                  {/* Metadata info */}
                  <div className="space-y-1.5 my-3 text-[11px]" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>
                    {org.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-amber-500 shrink-0" />
                        <span>{org.location}</span>
                      </div>
                    )}
                    {org.domain && (
                      <div className="flex items-center gap-1.5">
                        <Globe size={12} className="text-indigo-400 shrink-0" />
                        <span>{org.domain}</span>
                      </div>
                    )}
                    {org.contactEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-emerald-400 shrink-0" />
                        <span>{org.contactEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t flex items-center justify-between gap-2 mt-2" style={{ borderColor: "var(--border-color)" }}>
                  <button
                    onClick={() => handleViewStudents(org)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer hover:bg-amber-500/15"
                    style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <Users size={12} />
                    {org.studentCount} Students
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedOrg(org);
                        setBulkModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg transition-all hover:bg-emerald-500/20 text-emerald-500 cursor-pointer"
                      title="Bulk Add Students"
                    >
                      <UserPlus size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditOrg(org);
                        setEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg transition-all hover:bg-white/10 cursor-pointer"
                      style={{ color: "var(--text-secondary)" }}
                      title="Edit Organization"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteOrg(org.id, org.name)}
                      className="p-1.5 rounded-lg transition-all hover:bg-rose-500/20 text-rose-500 cursor-pointer"
                      title="Delete Organization"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[74px] bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
              style={{
                background: isDark ? "#0c131a" : "#ffffff",
                borderColor: isDark ? "rgba(245,158,11,0.3)" : "rgba(203,213,225,0.8)",
                boxShadow: isDark ? "0 25px 50px rgba(0,0,0,0.8)" : "0 20px 40px rgba(0,0,0,0.12)",
              }}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,1)" }}>
                <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  {createType === "UNIVERSITY" ? <GraduationCap size={18} className="text-amber-500" /> : <Building2 size={18} className="text-indigo-400" />}
                  Add New {createType === "UNIVERSITY" ? "University" : "Company"}
                </h3>
                <button onClick={() => setCreateModalOpen(false)} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                  <X size={16} style={{ color: "var(--text-secondary)" }} />
                </button>
              </div>

              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>
                    {createType === "UNIVERSITY" ? "University Name *" : "Company Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={createType === "UNIVERSITY" ? "e.g. Indian Institute of Technology Bombay" : "e.g. Google India"}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                    style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Code / Abbreviation</label>
                    <input
                      type="text"
                      placeholder="e.g. IITB"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai, India"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Domain</label>
                    <input
                      type="text"
                      placeholder="e.g. iitb.ac.in"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Contact Email</label>
                    <input
                      type="email"
                      placeholder="admin@iitb.ac.in"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,1)" }}>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    style={{ background: createType === "UNIVERSITY" ? "#f59e0b" : "#6366f1", color: createType === "UNIVERSITY" ? "#000" : "#fff" }}
                  >
                    {submitting && <Loader2 size={12} className="animate-spin" />}
                    Save {createType === "UNIVERSITY" ? "University" : "Company"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editModalOpen && editOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[74px] bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
              style={{
                background: isDark ? "#0c131a" : "#ffffff",
                borderColor: isDark ? "rgba(245,158,11,0.3)" : "rgba(203,213,225,0.8)",
                boxShadow: isDark ? "0 25px 50px rgba(0,0,0,0.8)" : "0 20px 40px rgba(0,0,0,0.12)",
              }}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,1)" }}>
                <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Edit2 size={16} className="text-amber-500" /> Edit {editOrg.name}
                </h3>
                <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                  <X size={16} style={{ color: "var(--text-secondary)" }} />
                </button>
              </div>

              <form onSubmit={handleUpdateOrg} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Name</label>
                  <input
                    type="text"
                    required
                    value={editOrg.name}
                    onChange={(e) => setEditOrg({ ...editOrg, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                    style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Code</label>
                    <input
                      type="text"
                      value={editOrg.code || ""}
                      onChange={(e) => setEditOrg({ ...editOrg, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Location</label>
                    <input
                      type="text"
                      value={editOrg.location || ""}
                      onChange={(e) => setEditOrg({ ...editOrg, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Domain</label>
                    <input
                      type="text"
                      value={editOrg.domain || ""}
                      onChange={(e) => setEditOrg({ ...editOrg, domain: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Contact Email</label>
                    <input
                      type="email"
                      value={editOrg.contactEmail || ""}
                      onChange={(e) => setEditOrg({ ...editOrg, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,1)" }}>
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    style={{ background: "#f59e0b", color: "#000" }}
                  >
                    {submitting && <Loader2 size={12} className="animate-spin" />}
                    Update Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW STUDENTS MODAL */}
      <AnimatePresence>
        {studentsModalOpen && selectedOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[74px] bg-black/60 backdrop-blur-md">

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl rounded-3xl border"
              style={{
                height: "min(650px, calc(100vh - 90px))",
                background: isDark ? "#0c131a" : "#ffffff",
                borderColor: isDark ? "rgba(245,158,11,0.3)" : "rgba(203,213,225,0.8)",
                boxShadow: isDark ? "0 25px 50px rgba(0,0,0,0.85)" : "0 25px 50px rgba(0,0,0,0.15)",
              }}
            >

              {/* Modal Header */}
              <div
                className="px-6 py-4 border-b flex items-center justify-between shrink-0"
                style={{
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,1)",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,1)",
                }}
              >
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <GraduationCap size={18} className="text-amber-500" /> {selectedOrg.name} — Registered Students
                  </h3>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {students.length} students enrolled under this institution
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBulkModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                  >
                    <UserPlus size={14} /> Bulk Add Students
                  </button>
                  <button onClick={() => setStudentsModalOpen(false)} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                    <X size={18} style={{ color: "var(--text-secondary)" }} />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div
                className="p-4 border-b shrink-0"
                style={{
                  background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(226,232,240,1)",
                }}
              >
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search student by name, email, or branch..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Student Table Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-16">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>No students found for this institution.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border transition-all"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(248,250,252,1)",
                          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(226,232,240,1)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xs">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{s.name}</h5>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-[11px] font-medium block" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>
                              {s.profile?.degree ? `${s.profile.degree} ` : ""}{s.profile?.branch || "Student"}
                            </span>
                            <span className="text-[9px] text-amber-500 font-mono">
                              Joined {new Date(s.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <StatusBadge variant={s.plan === "premium" ? "success" : "default"}>
                            {s.plan}
                          </StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULK ADD STUDENTS MODAL */}
      <AnimatePresence>
        {bulkModalOpen && selectedOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[74px] bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
              style={{
                background: isDark ? "#0c131a" : "#ffffff",
                borderColor: isDark ? "rgba(16,185,129,0.4)" : "rgba(203,213,225,0.8)",
                boxShadow: isDark ? "0 25px 50px rgba(0,0,0,0.8)" : "0 20px 40px rgba(0,0,0,0.12)",
              }}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,1)" }}>
                <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <UserPlus size={18} className="text-emerald-500" /> Bulk Add Students — {selectedOrg.name}
                </h3>
                <button onClick={() => setBulkModalOpen(false)} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                  <X size={16} style={{ color: "var(--text-secondary)" }} />
                </button>
              </div>

              <form onSubmit={handleBulkAddStudents} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>
                    Student Email Addresses * (Comma or Newline separated)
                  </label>
                  <textarea
                    rows={5}
                    required
                    placeholder="student1@university.edu&#10;student2@university.edu&#10;student3@university.edu"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    className="w-full p-3 rounded-xl text-xs outline-none border font-mono"
                    style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Branch / Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={bulkBranch}
                      onChange={(e) => setBulkBranch(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? "var(--text-secondary)" : "#475569" }}>Degree Program</label>
                    <input
                      type="text"
                      placeholder="e.g. B.Tech / M.Tech"
                      value={bulkDegree}
                      onChange={(e) => setBulkDegree(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,1)" }}>
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    style={{ background: "#10b981", color: "#fff" }}
                  >
                    {bulkSubmitting && <Loader2 size={12} className="animate-spin" />}
                    Register Students
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

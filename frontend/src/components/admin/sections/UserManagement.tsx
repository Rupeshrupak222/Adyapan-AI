"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Users, Shield, Crown, Star, X, ChevronLeft, ChevronRight,
  Lock, Trash2, ArrowUpDown, Loader2, CheckCircle, AlertTriangle,
  UserPlus, UserMinus, MoreVertical, RefreshCw, Edit3
} from "lucide-react";
import { api } from "@/services/api";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  role: string;
  createdAt: string;
  profile?: { college?: string; branch?: string; phone?: string };
  storage?: {
    limitMb: number;
    usedMb: number;
    percentUsed: number;
  };
  _count?: {
    resumes?: number;
    chatSessions?: number;
    interviewSessions?: number;
    codingSessions?: number;
    studySessions?: number;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface UsersResponse {
  success: boolean;
  users: AdminUser[];
  pagination: PaginationInfo;
}

type FilterChip = "all" | "admin" | "premium" | "free" | "active" | "suspended";

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  college: string;
  branch: string;
  year: string;
  degree: string;
  country: string;
  state: string;
  city: string;
  department: string;
  course: string;
  semester: string;
  studentId: string;
  plan: string;
}

function getEmptyUserForm(): UserFormData {
  return {
    name: "", email: "", password: "", role: "USER",
    firstName: "", lastName: "", phone: "",
    college: "", branch: "", year: "", degree: "",
    country: "", state: "", city: "",
    department: "", course: "", semester: "", studentId: "",
    plan: "free",
  };
}

const filterChips: { id: FilterChip; label: string }[] = [
  { id: "all", label: "All Users" },
  { id: "admin", label: "Admins" },
  { id: "premium", label: "Premium" },
  { id: "free", label: "Free" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
];

const roleMap: Record<string, { label: string; variant: "success" | "warning" | "info" | "default" }> = {
  ADMIN: { label: "Admin", variant: "warning" },
  USER: { label: "User", variant: "info" },
};

const planMap: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" | "default" }> = {
  premium: { label: "Premium", variant: "success" },
  pro: { label: "Pro", variant: "success" },
  pro_yearly: { label: "Pro Yearly", variant: "success" },
  pro_monthly: { label: "Pro Monthly", variant: "success" },
  free: { label: "Free", variant: "default" },
  enterprise: { label: "Enterprise", variant: "warning" },
};

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" | "default" }> = {
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "error" },
  cancelled: { label: "Cancelled", variant: "default" },
  inactive: { label: "Inactive", variant: "default" },
  expired: { label: "Expired", variant: "warning" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function totalUsage(user: AdminUser): number {
  const c = user._count;
  if (!c) return 0;
  return (c.resumes ?? 0) + (c.chatSessions ?? 0) + (c.interviewSessions ?? 0) + (c.codingSessions ?? 0) + (c.studySessions ?? 0);
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ show: false, message: "", type: "success" });

  // Add/Edit User modal state
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userForm, setUserForm] = useState<UserFormData>(getEmptyUserForm());

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (activeFilter === "admin") params.role = "ADMIN";
      else if (activeFilter === "premium") params.plan = "premium";
      else if (activeFilter === "free") params.plan = "free";
      else if (activeFilter === "active") params.status = "active";
      else if (activeFilter === "suspended") params.status = "suspended";

      const res = await api.get<UsersResponse>("/admin/users", { params });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilter, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, activeFilter]);

  const handleAction = async (userId: string, action: string, extra: Record<string, string> = {}) => {
    setActionLoading(userId);
    try {
      await api.post(`/admin/users/${userId}/action`, { action, ...extra });
      showToast(`${action.replace(/[_-]/g, " ")} successful`);
      fetchUsers();
    } catch {
      showToast(`Failed to ${action.replace(/[_-]/g, " ")}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    setResetLoading(true);
    try {
      await api.post(`/admin/users/${resetPasswordUser.id}/action`, {
        action: "reset_password",
        newPassword,
      });
      showToast("Password reset successful");
      setResetPasswordUser(null);
      setNewPassword("");
      setShowPassword(false);
    } catch {
      showToast("Failed to reset password", "error");
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = (user: AdminUser) => {
    if (window.confirm(`Are you sure you want to delete "${user.name}" (${user.email})? This action cannot be undone.`)) {
      handleAction(user.id, "delete_user");
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 14; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewPassword(pwd);
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm(getEmptyUserForm());
    setShowUserForm(true);
  };

  const openEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "USER",
      firstName: "",
      lastName: "",
      phone: user.profile?.phone || "",
      college: user.profile?.college || "",
      branch: user.profile?.branch || "",
      year: "",
      degree: "",
      country: "",
      state: "",
      city: "",
      department: "",
      course: "",
      semester: "",
      studentId: "",
      plan: user.plan || "free",
    });
    setShowUserForm(true);
  };

  const handleUserFormSubmit = async () => {
    if (!userForm.name || !userForm.email) {
      showToast("Name and email are required", "error");
      return;
    }
    if (!editingUser && !userForm.password) {
      showToast("Password is required for new users", "error");
      return;
    }

    setUserFormLoading(true);
    try {
      if (editingUser) {
        // Edit existing user
        const payload: Record<string, string> = {};
        if (userForm.name !== editingUser.name) payload.name = userForm.name;
        if (userForm.email !== editingUser.email) payload.email = userForm.email;
        if (userForm.role !== editingUser.role) payload.role = userForm.role;
        if (userForm.password) payload.password = userForm.password;
        if (userForm.plan !== (editingUser.plan || "free")) payload.plan = userForm.plan;
        if (userForm.phone) payload.phone = userForm.phone;
        if (userForm.college) payload.college = userForm.college;
        if (userForm.branch) payload.branch = userForm.branch;
        if (userForm.year) payload.year = userForm.year;
        if (userForm.degree) payload.degree = userForm.degree;
        if (userForm.country) payload.country = userForm.country;
        if (userForm.state) payload.state = userForm.state;
        if (userForm.city) payload.city = userForm.city;
        if (userForm.department) payload.department = userForm.department;
        if (userForm.course) payload.course = userForm.course;
        if (userForm.semester) payload.semester = userForm.semester;
        if (userForm.studentId) payload.studentId = userForm.studentId;

        await api.put(`/admin/users/${editingUser.id}`, payload);
        showToast("User updated successfully");
      } else {
        // Create new user
        await api.post("/admin/users", userForm);
        showToast("User created successfully");
      }
      setShowUserForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || (editingUser ? "Failed to update user" : "Failed to create user");
      showToast(msg, "error");
    } finally {
      setUserFormLoading(false);
    }
  };

  const pageNumbers: (number | "...")[] = [];
  const totalPages = pagination.pages;
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pageNumbers.push(i);
    if (page < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="User Management"
        description={`${pagination.total} registered users on the platform`}
        actions={
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={openAddUser}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", border: "1px solid transparent" }}
            >
              <UserPlus size={14} />
              Add User
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={fetchUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </motion.button>
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4" style={{ borderColor: "var(--border-color)" }}>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium outline-none transition-all"
              style={{
                background: "var(--bg-dark)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pb-3 flex flex-wrap gap-2" style={{ paddingTop: "0.75rem" }}>
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <motion.button
                key={chip.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveFilter(chip.id)}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                style={{
                  background: isActive ? "rgba(245,158,11,0.15)" : "transparent",
                  color: isActive ? "#f59e0b" : "var(--text-secondary)",
                  border: `1px solid ${isActive ? "rgba(245,158,11,0.3)" : "var(--border-color)"}`,
                }}
              >
                {chip.label}
              </motion.button>
            );
          })}
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full" style={{ background: "var(--bg-card-hover)" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-48 rounded" style={{ background: "var(--bg-card-hover)" }} />
                  <div className="h-2.5 w-32 rounded" style={{ background: "var(--bg-card-hover)" }} />
                </div>
                <div className="h-5 w-16 rounded-full" style={{ background: "var(--bg-card-hover)" }} />
                <div className="h-5 w-20 rounded-full" style={{ background: "var(--bg-card-hover)" }} />
                <div className="h-3 w-24 rounded" style={{ background: "var(--bg-card-hover)" }} />
                <div className="h-3 w-20 rounded" style={{ background: "var(--bg-card-hover)" }} />
                <div className="h-8 w-24 rounded-lg" style={{ background: "var(--bg-card-hover)" }} />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={40} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No users found</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["User", "Role", "Plan & Status", "Assigned Storage", "Hub Usage", "Created", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {users.map((user, idx) => {
                    const roleStyle = roleMap[user.role] ?? { label: user.role, variant: "default" as const };
                    const rawPlan = (user.plan || "").toLowerCase();
                    const planStyle = planMap[rawPlan] ?? {
                      label: (user.plan || "Free").replace(/_/g, " ").toUpperCase(),
                      variant: rawPlan !== "free" && rawPlan !== "" ? ("success" as const) : ("default" as const),
                    };
                    const statusStyle = statusMap[user.subscriptionStatus] ?? { label: user.subscriptionStatus, variant: "default" as const };
                    const usageTotal = totalUsage(user);
                    const isPremium = (rawPlan !== "" && rawPlan !== "free") || user.subscriptionStatus === "active";
                    const storageLimit = user.storage?.limitMb ?? (isPremium ? 200 : 50);
                    const storageUsed = user.storage?.usedMb ?? 0;
                    const storagePercent = user.storage?.percentUsed ?? Math.min(100, Math.round((storageUsed / storageLimit) * 100));

                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        style={{ borderBottom: "1px solid var(--border-color)" }}
                        className="transition-all hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                              style={{
                                background: user.role === "ADMIN"
                                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                  : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                color: "#000",
                              }}
                            >
                              {user.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate max-w-[180px]" style={{ color: "var(--text-primary)" }}>
                                {user.name}
                              </div>
                              <div className="text-[11px] font-medium truncate max-w-[180px]" style={{ color: "var(--text-muted)" }}>
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge variant={roleStyle.variant}>
                            {user.role === "ADMIN" ? <Shield size={10} /> : <UserMinus size={10} />}
                            {roleStyle.label}
                          </StatusBadge>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge variant={planStyle.variant}>
                              {isPremium ? <Crown size={10} /> : <Star size={10} />}
                              {planStyle.label}
                            </StatusBadge>
                            <StatusBadge variant={statusStyle.variant} pulse={user.subscriptionStatus === "active"}>
                              {statusStyle.label}
                            </StatusBadge>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold text-[11px]" style={{ color: isPremium ? "#f59e0b" : "var(--text-primary)" }}>
                                {storageLimit} MB
                              </span>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                {storageUsed} MB
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.max(4, storagePercent)}%`,
                                  background: isPremium
                                    ? "linear-gradient(90deg, #f59e0b, #ea580c)"
                                    : "linear-gradient(90deg, #3b82f6, #06b6d4)",
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <div
                                className="text-xs font-bold tabular-nums"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {usageTotal}
                              </div>
                              <div className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>total</div>
                            </div>
                            <div className="flex gap-1.5 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                              {user._count && (
                                <>
                                  {user._count.resumes !== undefined && user._count.resumes > 0 && <span>{user._count.resumes}R</span>}
                                  {user._count.chatSessions !== undefined && user._count.chatSessions > 0 && <span>{user._count.chatSessions}C</span>}
                                  {user._count.interviewSessions !== undefined && user._count.interviewSessions > 0 && <span>{user._count.interviewSessions}I</span>}
                                  {user._count.codingSessions !== undefined && user._count.codingSessions > 0 && <span>{user._count.codingSessions}Cd</span>}
                                  {user._count.studySessions !== undefined && user._count.studySessions > 0 && <span>{user._count.studySessions}S</span>}
                                </>
                              )}
                              {(!user._count || usageTotal === 0) && <span>—</span>}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                            {formatDate(user.createdAt)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <ActionBtn
                              icon={<Edit3 size={13} />}
                              tooltip="Edit User"
                              loading={false}
                              onClick={() => openEditUser(user)}
                            />
                            {user.plan !== "premium" ? (
                              <ActionBtn
                                icon={<Crown size={13} />}
                                tooltip="Upgrade to Premium"
                                loading={actionLoading === user.id}
                                onClick={() => handleAction(user.id, "upgrade_plan", { plan: "premium" })}
                              />
                            ) : (
                              <ActionBtn
                                icon={<Star size={13} />}
                                tooltip="Downgrade to Free"
                                loading={actionLoading === user.id}
                                onClick={() => handleAction(user.id, "downgrade_plan")}
                              />
                            )}
                            <ActionBtn
                              icon={<Lock size={13} />}
                              tooltip="Reset Password"
                              loading={false}
                              onClick={() => { setResetPasswordUser(user); setNewPassword(""); setShowPassword(false); }}
                            />
                            <ActionBtn
                              icon={<Trash2 size={13} />}
                              tooltip="Delete User"
                              loading={actionLoading === user.id}
                              onClick={() => handleDelete(user)}
                              danger
                            />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="flex items-center justify-between rounded-2xl border px-4 py-3"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Page {pagination.page} of {totalPages} &middot; {pagination.total} total
          </span>
          <div className="flex items-center gap-1">
            <PageBtn disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={15} />
            </PageBtn>
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-xs" style={{ color: "var(--text-muted)" }}>...</span>
              ) : (
                <PageBtn
                  key={p}
                  active={page === p}
                  onClick={() => setPage(p)}
                >
                  {p}
                </PageBtn>
              )
            )}
            <PageBtn disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight size={15} />
            </PageBtn>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {resetPasswordUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={() => !resetLoading && setResetPasswordUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="w-full max-w-md rounded-3xl border p-6 shadow-2xl"
              style={{ background: "var(--bg-dark)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <Lock size={18} style={{ color: "#f59e0b" }} />
                </div>
                <div>
                  <h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>Reset Password</h3>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {resetPasswordUser.name} &middot; {resetPasswordUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>New Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all pr-20"
                      style={{
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-color)",
                      }}
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                        style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                      <button
                        onClick={generatePassword}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                        style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>

                {newPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 rounded-xl text-xs font-mono font-bold tracking-wider text-center"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
                  >
                    {newPassword}
                  </motion.div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setResetPasswordUser(null)}
                  disabled={resetLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleResetPassword}
                  disabled={resetLoading || !newPassword}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: newPassword ? "linear-gradient(135deg, #f59e0b, #d97706)" : "var(--bg-card-hover)",
                    color: newPassword ? "#000" : "var(--text-muted)",
                    border: "1px solid transparent",
                  }}
                >
                  {resetLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {resetLoading ? "Resetting..." : "Reset Password"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {showUserForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={() => !userFormLoading && setShowUserForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border p-6 shadow-2xl"
              style={{ background: "var(--bg-dark)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  {editingUser ? <Edit3 size={18} style={{ color: "#f59e0b" }} /> : <UserPlus size={18} style={{ color: "#f59e0b" }} />}
                </div>
                <div>
                  <h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>
                    {editingUser ? "Edit User" : "Add New User"}
                  </h3>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {editingUser ? `Editing ${editingUser.name} (${editingUser.email})` : "Create a new user with full details and plan assignment"}
                  </p>
                </div>
                <button
                  onClick={() => setShowUserForm(false)}
                  className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Account Info</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Full Name *" value={userForm.name} onChange={(v) => setUserForm({ ...userForm, name: v })} placeholder="John Doe" />
                    <FormField label="Email *" value={userForm.email} onChange={(v) => setUserForm({ ...userForm, email: v })} placeholder="john@example.com" type="email" />
                    <FormField label={editingUser ? "New Password (leave blank to keep)" : "Password *"} value={userForm.password} onChange={(v) => setUserForm({ ...userForm, password: v })} placeholder={editingUser ? "••••••••" : "Min 6 characters"} type="password" />
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Role</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="w-full mt-1.5 px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all"
                        style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Plan Assignment */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Plan Assignment</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Plan</label>
                      <select
                        value={userForm.plan}
                        onChange={(e) => setUserForm({ ...userForm, plan: e.target.value })}
                        className="w-full mt-1.5 px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all"
                        style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                      >
                        <option value="free">Free</option>
                        <option value="pro_monthly">Pro Monthly</option>
                        <option value="pro_yearly">Pro Yearly</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Personal Details */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Personal Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="First Name" value={userForm.firstName} onChange={(v) => setUserForm({ ...userForm, firstName: v })} placeholder="John" />
                    <FormField label="Last Name" value={userForm.lastName} onChange={(v) => setUserForm({ ...userForm, lastName: v })} placeholder="Doe" />
                    <FormField label="Phone" value={userForm.phone} onChange={(v) => setUserForm({ ...userForm, phone: v })} placeholder="+91 9876543210" />
                    <FormField label="Student ID" value={userForm.studentId} onChange={(v) => setUserForm({ ...userForm, studentId: v })} placeholder="STU001" />
                  </div>
                </div>

                {/* Academic Info */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Academic Info</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="College/University" value={userForm.college} onChange={(v) => setUserForm({ ...userForm, college: v })} placeholder="IIT Hyderabad" />
                    <FormField label="Branch" value={userForm.branch} onChange={(v) => setUserForm({ ...userForm, branch: v })} placeholder="Computer Science" />
                    <FormField label="Degree" value={userForm.degree} onChange={(v) => setUserForm({ ...userForm, degree: v })} placeholder="B.Tech" />
                    <FormField label="Year" value={userForm.year} onChange={(v) => setUserForm({ ...userForm, year: v })} placeholder="3rd Year" />
                    <FormField label="Department" value={userForm.department} onChange={(v) => setUserForm({ ...userForm, department: v })} placeholder="CSE" />
                    <FormField label="Course" value={userForm.course} onChange={(v) => setUserForm({ ...userForm, course: v })} placeholder="B.Tech CSE" />
                    <FormField label="Semester" value={userForm.semester} onChange={(v) => setUserForm({ ...userForm, semester: v })} placeholder="5" />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Location</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormField label="Country" value={userForm.country} onChange={(v) => setUserForm({ ...userForm, country: v })} placeholder="India" />
                    <FormField label="State" value={userForm.state} onChange={(v) => setUserForm({ ...userForm, state: v })} placeholder="Telangana" />
                    <FormField label="City" value={userForm.city} onChange={(v) => setUserForm({ ...userForm, city: v })} placeholder="Hyderabad" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-6 pt-4" style={{ borderTop: "1px solid var(--border-color)" }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowUserForm(false)}
                  disabled={userFormLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleUserFormSubmit}
                  disabled={userFormLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#000",
                    border: "1px solid transparent",
                  }}
                >
                  {userFormLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {userFormLoading ? (editingUser ? "Updating..." : "Creating...") : (editingUser ? "Update User" : "Create User")}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed bottom-6 left-1/2 z-[300] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shadow-2xl"
            style={{
              background: toast.type === "success"
                ? "rgba(16,185,129,0.12)"
                : "rgba(239,68,68,0.12)",
              borderColor: toast.type === "success"
                ? "rgba(16,185,129,0.3)"
                : "rgba(239,68,68,0.3)",
              color: toast.type === "success" ? "#10b981" : "#ef4444",
              backdropFilter: "blur(16px)",
            }}
          >
            {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span className="text-xs font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionBtn({
  icon, tooltip, loading, onClick, danger,
}: {
  icon: React.ReactNode;
  tooltip: string;
  loading: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title={tooltip}
      onClick={onClick}
      disabled={loading}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
      style={{
        background: "transparent",
        color: danger ? "#ef4444" : "var(--text-muted)",
        border: "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(239,68,68,0.1)"
          : "rgba(255,255,255,0.05)";
        e.currentTarget.style.borderColor = danger
          ? "rgba(239,68,68,0.2)"
          : "var(--border-color)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : icon}
    </motion.button>
  );
}

function PageBtn({
  children, active, disabled, onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all"
      style={{
        background: active ? "rgba(245,158,11,0.15)" : "transparent",
        color: active ? "#f59e0b" : disabled ? "var(--text-muted)" : "var(--text-secondary)",
        border: active ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </motion.button>
  );
}

function FormField({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1.5 px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all"
        style={{
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
        }}
      />
    </div>
  );
}

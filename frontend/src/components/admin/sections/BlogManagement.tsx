"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Search, RefreshCw, Eye, EyeOff, Trash2, Clock, 
  Heart, MessageCircle, AlertTriangle, FileText, CheckCircle2, User, Filter
} from "lucide-react";
import { api } from "@/services/api";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { toast } from "sonner";

interface BlogStats {
  totalBlogs: number;
  totalPublished: number;
  totalDrafts: number;
  totalViews: number;
}

const CATEGORIES = ["All", "General", "Technology", "Career", "Study Tips", "Project", "Opinion", "Tutorial", "Experience"];

export default function BlogManagement() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<BlogStats>({ totalBlogs: 0, totalPublished: 0, totalDrafts: 0, totalViews: 0 });
  const [selectedBlog, setSelectedBlog] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchBlogs = useCallback(async (p = 1, q = "", cat = "All", st = "all") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "15" });
      if (q) params.set("q", q);
      if (cat !== "All") params.set("category", cat);
      if (st !== "all") params.set("status", st);

      const res = await api.get(`/admin/blogs?${params}`);
      if (res.data?.success) {
        setBlogs(res.data.blogs || []);
        setTotalPages(res.data.pages || 1);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch {
      toast.error("Failed to load user blogs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogs(page, search, category, statusFilter);
  }, [page, search, category, statusFilter, fetchBlogs]);

  const togglePublishStatus = async (blog: any) => {
    setTogglingId(blog.id);
    try {
      const newStatus = !blog.published;
      const res = await api.put(`/admin/blogs/${blog.id}/status`, { published: newStatus });
      if (res.data?.success) {
        setBlogs(prev => prev.map(b => b.id === blog.id ? { ...b, published: newStatus } : b));
        setStats(prev => ({
          ...prev,
          totalPublished: prev.totalPublished + (newStatus ? 1 : -1),
          totalDrafts: prev.totalDrafts + (newStatus ? -1 : 1),
        }));
        toast.success(newStatus ? "Blog published!" : "Blog set to draft");
      }
    } catch {
      toast.error("Failed to update blog status");
    } finally {
      setTogglingId(null);
    }
  };

  const deleteBlog = async (id: string) => {
    try {
      const res = await api.delete(`/admin/blogs/${id}`);
      if (res.data?.success) {
        setBlogs(prev => prev.filter(b => b.id !== id));
        setStats(prev => ({ ...prev, totalBlogs: Math.max(0, prev.totalBlogs - 1) }));
        toast.success("Blog post deleted");
      }
    } catch {
      toast.error("Failed to delete blog post");
    } finally {
      setDeleteId(null);
      if (selectedBlog?.id === id) setSelectedBlog(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="User Blog Management"
        description="Monitor, moderate, publish, and manage all community user blog posts"
        actions={
          <button
            onClick={() => fetchBlogs(page, search, category, statusFilter)}
            disabled={loading}
            className="p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all hover:opacity-80"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-amber-500" : "text-amber-500"} /> Refresh
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard title="Total Blogs" value={stats.totalBlogs} icon={<BookOpen size={16} />} color="#f59e0b" />
        <MetricCard title="Published" value={stats.totalPublished} icon={<CheckCircle2 size={16} />} color="#10b981" />
        <MetricCard title="Drafts" value={stats.totalDrafts} icon={<Clock size={16} />} color="#6366f1" />
        <MetricCard title="Total Read Views" value={stats.totalViews} icon={<Eye size={16} />} color="#ec4899" />
      </div>

      {/* Controls & Search */}
      <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search blogs by title, content, or author..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium outline-none transition-all focus:ring-1 focus:ring-amber-500"
              style={{ background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Category Select */}
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer"
              style={{ background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c} style={{ background: "#0f172a", color: "#f8fafc" }}>Category: {c}</option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer"
              style={{ background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            >
              <option value="all" style={{ background: "#0f172a", color: "#f8fafc" }}>Status: All</option>
              <option value="published" style={{ background: "#0f172a", color: "#f8fafc" }}>Status: Published</option>
              <option value="draft" style={{ background: "#0f172a", color: "#f8fafc" }}>Status: Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blogs Table / Cards */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading community blogs...</div>
        ) : blogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No blog posts found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b uppercase text-[10px] font-bold tracking-wider" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
                <tr>
                  <th className="px-4 py-3">Blog Title</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stats</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                {blogs.map(blog => (
                  <tr key={blog.id} className="hover:bg-amber-500/5 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-2.5">
                        {blog.coverImage ? (
                          <img src={blog.coverImage} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                            <BookOpen size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold line-clamp-1 block cursor-pointer hover:text-amber-500" style={{ color: "var(--text-primary)" }} onClick={() => setSelectedBlog(blog)}>
                            {blog.title}
                          </span>
                          <span className="text-[10px] text-slate-400 line-clamp-1">{blog.summary || blog.content.slice(0, 60)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-amber-500" />
                        <div>
                          <span className="font-semibold block" style={{ color: "var(--text-primary)" }}>{blog.author?.name || "Unknown"}</span>
                          <span className="text-[9px] text-slate-400">{blog.author?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                        {blog.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Eye size={10} />{blog.views}</span>
                        <span className="flex items-center gap-1"><Heart size={10} />{blog._count?.likes || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={10} />{blog._count?.comments || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={blog.published ? "success" : "warning"}>
                        {blog.published ? "Published" : "Draft"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-400">
                      {new Date(blog.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedBlog(blog)}
                          className="p-1.5 rounded-lg border hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 transition-colors"
                          style={{ borderColor: "var(--border-color)" }}
                          title="Preview Post"
                        >
                          <FileText size={13} />
                        </button>
                        <button
                          onClick={() => togglePublishStatus(blog)}
                          disabled={togglingId === blog.id}
                          className="p-1.5 rounded-lg border hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 transition-colors"
                          style={{ borderColor: "var(--border-color)" }}
                          title={blog.published ? "Unpublish Post" : "Publish Post"}
                        >
                          {blog.published ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          onClick={() => setDeleteId(blog.id)}
                          className="p-1.5 rounded-lg border hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                          style={{ borderColor: "var(--border-color)" }}
                          title="Delete Blog"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-3 border-t text-xs" style={{ borderColor: "var(--border-color)" }}>
            <span className="text-slate-400">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1 rounded-lg border disabled:opacity-40 text-xs font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1 rounded-lg border disabled:opacity-40 text-xs font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Blog Preview Modal */}
      <AnimatePresence>
        {selectedBlog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-3xl p-6 space-y-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>{selectedBlog.category}</span>
                  <h2 className="text-xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{selectedBlog.title}</h2>
                  <p className="text-xs text-slate-400">By {selectedBlog.author?.name} ({selectedBlog.author?.email}) · {new Date(selectedBlog.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setSelectedBlog(null)} className="p-1.5 rounded-xl border text-slate-400 hover:text-white" style={{ borderColor: "var(--border-color)" }}>✕</button>
              </div>

              {selectedBlog.coverImage && (
                <img src={selectedBlog.coverImage} alt="" className="w-full h-44 object-cover rounded-2xl" />
              )}

              <div className="prose prose-sm max-w-none text-xs leading-relaxed font-sans whitespace-pre-wrap p-4 rounded-2xl border" style={{ background: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                {selectedBlog.content}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setSelectedBlog(null)} className="px-4 py-2 rounded-xl text-xs font-semibold border" style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>Close</button>
                <button onClick={() => togglePublishStatus(selectedBlog)} className="px-4 py-2 rounded-xl text-xs font-bold text-black" style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}>
                  {selectedBlog.published ? "Set to Draft" : "Publish Blog"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="max-w-sm w-full p-5 rounded-2xl space-y-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-3 text-red-500">
                <AlertTriangle size={22} />
                <h3 className="text-base font-extrabold" style={{ color: "var(--text-primary)" }}>Delete User Blog?</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to delete this blog post? This action will permanently remove the post and its comments.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700">Cancel</button>
                <button onClick={() => deleteBlog(deleteId)} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl border p-4 flex items-center justify-between" style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}>
      <div>
        <span className="text-xs font-medium block" style={{ color: "var(--text-muted)" }}>{title}</span>
        <span className="text-xl font-extrabold font-mono mt-0.5 block" style={{ color: "var(--text-primary)" }}>{value}</span>
      </div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
        {icon}
      </div>
    </div>
  );
}

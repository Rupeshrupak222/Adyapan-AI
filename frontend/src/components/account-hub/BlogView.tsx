"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, Plus, Heart, MessageCircle, Eye, Clock, Tag, Send, ArrowLeft, 
  Search, X, ChevronDown, Sparkles, Image as ImageIcon, Upload, Bold, 
  Italic, Code, Quote, List, Link as LinkIcon, Heading, Eye as EyeIcon, Edit3, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { AnimatedSkeleton, EmptyState } from "@/components/ui/PremiumComponents";

const BLOG_CATEGORIES = ["All", "General", "Technology", "Career", "Study Tips", "Project", "Opinion", "Tutorial", "Experience"];

export function BlogView() {
  const theme = useTheme();
  const isDark = theme === "dark";
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState<"list" | "create" | "read">("list");
  const [activeBlog, setActiveBlog] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [myBlogs, setMyBlogs] = useState<any[]>([]);
  const [showMyBlogs, setShowMyBlogs] = useState(false);

  const fetchBlogs = useCallback(async (p = 1, cat = "All", q = "") => {
    try {
      const params = new URLSearchParams({ page: String(p), limit: "12" });
      if (cat !== "All") params.set("category", cat);
      if (q) params.set("q", q);
      const res = await api.get(`/blog?${params}`);
      if (res.data.success) { setBlogs(res.data.blogs); setTotalPages(res.data.pages); }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBlogs(page, category, search); }, [page, category, search, fetchBlogs]);

  const fetchMyBlogs = async () => {
    try {
      const res = await api.get("/blog/my/blogs");
      if (res.data.success) setMyBlogs(res.data.blogs);
    } catch { /* */ }
  };

  const openBlog = async (id: string) => {
    try {
      const [blogRes, commentsRes] = await Promise.all([
        api.get(`/blog/${id}`),
        api.get(`/blog/${id}/comments`),
      ]);
      if (blogRes.data.success) { setActiveBlog(blogRes.data.blog); setView("read"); }
      if (commentsRes.data.success) setComments(commentsRes.data.comments);
    } catch { toast.error("Failed to load blog"); }
  };

  const toggleLike = async (id: string) => {
    try {
      const res = await api.post(`/blog/${id}/like`);
      if (res.data.success) {
        setBlogs(prev => prev.map(b => b.id === id ? { ...b, likedByMe: res.data.liked, _count: { ...b._count, likes: b._count.likes + (res.data.liked ? 1 : -1) } } : b));
        if (activeBlog?.id === id) setActiveBlog((prev: any) => ({ ...prev, likedByMe: res.data.liked, _count: { ...prev._count, likes: prev._count.likes + (res.data.liked ? 1 : -1) } }));
      }
    } catch { toast.error("Failed"); }
  };

  const addComment = async () => {
    if (!commentInput.trim() || !activeBlog) return;
    try {
      const res = await api.post(`/blog/${activeBlog.id}/comments`, { content: commentInput.trim() });
      if (res.data.success) { setComments(prev => [res.data.comment, ...prev]); setCommentInput(""); toast.success("Comment added!"); }
    } catch { toast.error("Failed to add comment"); }
  };

  const cardStyle = {
    background: isDark ? "rgba(15, 23, 42, 0.75)" : "#ffffff",
    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(226, 232, 240, 0.8)"}`,
    boxShadow: isDark ? "0 10px 25px rgba(0,0,0,0.4)" : "0 8px 20px rgba(0,0,0,0.03)",
    backdropFilter: "blur(16px)",
  };

  const txtPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const borderClr = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(226, 232, 240, 1)";

  // Blog detail view
  if (view === "read" && activeBlog) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-3xl mx-auto min-h-screen pb-12">
        <button onClick={() => { setView("list"); setActiveBlog(null); }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all"
          style={{ background: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
          <ArrowLeft size={13} /> Back to Blogs
        </button>

        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          {activeBlog.coverImage && (
            <div className="relative h-48 w-full overflow-hidden">
              <img src={activeBlog.coverImage} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
          <div className="p-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                {activeBlog.category}
              </span>
              {activeBlog.tags?.map((t: string) => (
                <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: isDark ? "#cbd5e1" : "#64748b" }}>
                  #{t}
                </span>
              ))}
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold leading-tight ${txtPrimary}`}>{activeBlog.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs pt-2 border-t" style={{ borderColor: borderClr, color: isDark ? "#94a3b8" : "#64748b" }}>
              <span className="flex items-center gap-1"><Clock size={12} className="text-amber-500" />{new Date(activeBlog.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
              <span className="flex items-center gap-1"><Eye size={12} className="text-amber-500" />{activeBlog.views} views</span>
              <button onClick={() => toggleLike(activeBlog.id)} className="flex items-center gap-1 transition-transform active:scale-95" style={{ color: activeBlog.likedByMe ? "#ef4444" : undefined }}>
                <Heart size={12} fill={activeBlog.likedByMe ? "#ef4444" : "none"} className={activeBlog.likedByMe ? "text-red-500" : ""} />
                <span className="font-bold">{activeBlog._count?.likes || 0}</span> Likes
              </button>
              <span className="flex items-center gap-1"><MessageCircle size={12} className="text-amber-500" />{comments.length} Comments</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="prose prose-sm max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans" style={{ color: isDark ? "#e2e8f0" : "#334155" }}>
            {activeBlog.content}
          </div>
        </div>

        {/* Comments */}
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "#f59e0b" }}>
            <MessageCircle size={16} /> Discussion ({comments.length})
          </h3>
          <div className="flex gap-2">
            <input value={commentInput} onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addComment(); }}
              placeholder="Share your thoughts on this post..." className="flex-1 px-3.5 py-2 rounded-xl text-xs font-medium outline-none transition-all focus:ring-1 focus:ring-amber-500/50"
              style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)", border: `1px solid ${borderClr}`, color: isDark ? "#fff" : "#0f172a" }} />
            <button onClick={addComment} className="px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs text-black shadow transition-transform active:scale-95" style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}>
              <Send size={12} /> Comment
            </button>
          </div>
          <div className="space-y-2 pt-1">
            {comments.map((c: any) => (
              <div key={c.id} className="p-3 rounded-xl transition-all" style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)", border: `1px solid ${borderClr}` }}>
                <p className="text-[10px] font-bold" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>User · {new Date(c.createdAt).toLocaleDateString()}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: isDark ? "#cbd5e1" : "#475569" }}>{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Create blog view
  if (view === "create") {
    return <CreateBlogView onBack={() => setView("list")} onCreated={() => { setView("list"); fetchBlogs(); }} />;
  }

  // Blog list
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 min-h-screen pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold tracking-tight ${txtPrimary}`}>Community Blog</h1>
          <p className="text-xs mt-0.5" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Discover stories, tutorials, and insights shared by peers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => { await fetchMyBlogs(); setShowMyBlogs(!showMyBlogs); }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ ...cardStyle, color: isDark ? "#cbd5e1" : "#475569" }}>
            My Posts
          </button>
          <button onClick={() => setView("create")} className="px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-transform active:scale-95"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)", color: "#000" }}>
            <Plus size={14} /> Write Blog
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: isDark ? "#64748b" : "#94a3b8" }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search articles..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium outline-none transition-all focus:ring-1 focus:ring-amber-500/40"
          style={{ ...cardStyle, color: isDark ? "#fff" : "#0f172a" }} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {BLOG_CATEGORIES.map(c => (
          <button key={c} onClick={() => { setCategory(c); setPage(1); }}
            className="px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
            style={{
              background: category === c ? "rgba(245,158,11,0.15)" : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"),
              color: category === c ? "#f59e0b" : (isDark ? "#94a3b8" : "#64748b"),
              border: `1px solid ${category === c ? "rgba(245,158,11,0.35)" : borderClr}`,
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* My Blogs dropdown */}
      <AnimatePresence>
        {showMyBlogs && myBlogs.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="rounded-2xl p-4 space-y-2" style={cardStyle}>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#f59e0b" }}>My Posts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {myBlogs.map(b => (
                  <button key={b.id} onClick={() => openBlog(b.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg text-left transition-all" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${borderClr}` }}>
                    <span className={`text-xs font-medium line-clamp-1 ${txtPrimary}`}>{b.title}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-2" style={{ background: b.published ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: b.published ? "#10b981" : "#f59e0b" }}>
                      {b.published ? "Published" : "Draft"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <AnimatedSkeleton key={i} type="card" className="h-52 rounded-2xl" />)}
        </div>
      ) : blogs.length === 0 ? (
        <EmptyState title="No blogs found" description="Be the first to write and share an article!" illustration={<BookOpen className="w-8 h-8 text-amber-500" />} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blogs.map((blog: any, i: number) => (
            <motion.div key={blog.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between" style={cardStyle}
              onClick={() => openBlog(blog.id)}>
              <div>
                {blog.coverImage && <img src={blog.coverImage} alt="" className="w-full h-32 object-cover" />}
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                      {blog.category}
                    </span>
                  </div>
                  <h3 className={`text-sm font-bold line-clamp-2 mb-1.5 leading-snug ${txtPrimary}`}>{blog.title}</h3>
                  <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>{stripMarkdown(blog.summary || blog.content.slice(0, 140))}</p>
                </div>
              </div>
              <div className="px-4 pb-3 pt-2 flex items-center justify-between text-[10px] border-t" style={{ borderColor: borderClr, color: isDark ? "#64748b" : "#94a3b8" }}>
                <span className="flex items-center gap-1"><Clock size={10} />{new Date(blog.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1"><Eye size={10} />{blog.views}</span>
                  <span className="flex items-center gap-1"><Heart size={10} />{blog._count?.likes || 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={10} />{blog._count?.comments || 0}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 pt-2">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
              style={{ background: page === i + 1 ? "rgba(245,158,11,0.2)" : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"), color: page === i + 1 ? "#f59e0b" : (isDark ? "#94a3b8" : "#64748b"), border: `1px solid ${page === i + 1 ? "rgba(245,158,11,0.4)" : borderClr}` }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CreateBlogView({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("General");
  const [tagsInput, setTagsInput] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const cardStyle = {
    background: isDark ? "rgba(15, 23, 42, 0.85)" : "#ffffff",
    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(226, 232, 240, 0.9)"}`,
    boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.04)",
    backdropFilter: "blur(16px)",
  };

  const inputBg = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(248, 250, 252, 1)";
  const inputBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(226, 232, 240, 1)";
  const txtPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const txtMuted = isDark ? "text-slate-400" : "text-slate-500";

  const inputStyle = {
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    color: isDark ? "#f8fafc" : "#0f172a",
  };

  // Handle local file image upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverImage(event.target?.result as string);
      toast.success("Cover image loaded!");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Word count & read time calculation
  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { words, minutes };
  }, [content]);

  // Insert markdown snippet into content
  const insertMarkdown = (prefix: string, suffix = "") => {
    setContent(prev => prev + `${prefix}text${suffix}`);
  };

  const publish = async (published: boolean) => {
    if (!title.trim() || !content.trim()) { 
      toast.error("Title and content are required."); 
      return; 
    }
    published ? setPublishing(true) : setSavingDraft(true);
    try {
      const parsedTags = tagsInput.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean);
      const res = await api.post("/blog", {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || content.slice(0, 180).trim(),
        category,
        tags: parsedTags,
        coverImage: coverImage.trim() || undefined,
        published,
      });
      if (res.data.success) { 
        toast.success(published ? "Blog post published!" : "Draft saved!"); 
        onCreated(); 
      }
    } catch { 
      toast.error("Failed to save blog post."); 
    } finally { 
      setPublishing(false); 
      setSavingDraft(false); 
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-2xl mx-auto min-h-screen pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b" style={{ borderColor: inputBorder }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} 
            className="p-1.5 rounded-lg transition-colors hover:bg-amber-500/10 text-amber-500" 
            title="Back">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className={`text-lg font-extrabold tracking-tight ${txtPrimary}`}>Write a Blog Post</h1>
            <p className="text-[11px] text-slate-400">{stats.words} words · ~{stats.minutes} min read</p>
          </div>
        </div>

        {/* Tab Switcher: Write vs Preview */}
        <div className="flex items-center p-0.5 rounded-xl" style={{ background: inputBg, border: `1px solid ${inputBorder}` }}>
          <button onClick={() => setActiveTab("write")}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTab === "write" ? "bg-amber-500 text-black shadow" : txtMuted}`}>
            <Edit3 size={12} /> Edit
          </button>
          <button onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTab === "preview" ? "bg-amber-500 text-black shadow" : txtMuted}`}>
            <EyeIcon size={12} /> Preview
          </button>
        </div>
      </div>

      {/* Main Form Container - Compact Width & Proportions */}
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        
        {/* Cover Image Upload / Preview Box */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: isDark ? "#cbd5e1" : "#475569" }}>
            Cover Image <span className="text-[10px] font-normal lowercase text-slate-400">(optional)</span>
          </label>
          
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />

          {coverImage ? (
            <div className="relative rounded-xl overflow-hidden group h-32 w-full border" style={{ borderColor: inputBorder }}>
              <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 rounded-lg bg-white/20 backdrop-blur-md text-white text-xs font-bold hover:bg-white/30">
                  Change Image
                </button>
                <button onClick={() => setCoverImage("")} className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button onClick={() => fileInputRef.current?.click()}
                className="flex-1 w-full py-2.5 px-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-semibold transition-all hover:border-amber-500/50 hover:text-amber-500"
                style={{ borderColor: inputBorder, color: isDark ? "#cbd5e1" : "#475569", background: inputBg }}>
                <Upload size={14} className="text-amber-500" /> Click to Upload Cover Image
              </button>
              <button onClick={() => setImageMode(imageMode === "url" ? "upload" : "url")}
                className="px-3 py-2.5 rounded-xl text-xs font-medium border text-slate-400 hover:text-amber-500 transition-colors"
                style={{ borderColor: inputBorder, background: inputBg }}>
                {imageMode === "url" ? "Use File Upload" : "Paste URL"}
              </button>
            </div>
          )}

          {!coverImage && imageMode === "url" && (
            <div className="mt-2">
              <input value={coverImage} onChange={e => setCoverImage(e.target.value)} 
                placeholder="Paste image URL (https://...)"
                className="w-full px-3 py-2 rounded-xl text-xs font-medium outline-none" style={inputStyle} />
            </div>
          )}
        </div>

        {/* Title Input */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: isDark ? "#cbd5e1" : "#475569" }}>
            Title <span className="text-amber-500">*</span>
          </label>
          <input value={title} onChange={e => setTitle(e.target.value)} 
            placeholder="Your blog title..."
            className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none transition-all focus:ring-1 focus:ring-amber-500/50" 
            style={inputStyle} />
        </div>

        {/* Category & Tags Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Custom Styled Category Select - Perfectly Theme Compatible */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: isDark ? "#cbd5e1" : "#475569" }}>
              Category
            </label>
            <div className="relative">
              <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full pl-8 pr-8 py-2 rounded-xl text-xs font-semibold outline-none appearance-none cursor-pointer transition-all focus:ring-1 focus:ring-amber-500/50"
                style={inputStyle}>
                {BLOG_CATEGORIES.filter(c => c !== "All").map(c => (
                  <option key={c} value={c} style={{ background: isDark ? "#0f172a" : "#ffffff", color: isDark ? "#f8fafc" : "#0f172a" }}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: txtMuted }} />
            </div>
          </div>

          {/* Tags Input */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: isDark ? "#cbd5e1" : "#475569" }}>
              Tags <span className="text-[9px] font-normal lowercase text-slate-400">(comma separated)</span>
            </label>
            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} 
              placeholder="react, javascript, tips"
              className="w-full px-3 py-2 rounded-xl text-xs font-medium outline-none transition-all focus:ring-1 focus:ring-amber-500/50" 
              style={inputStyle} />
          </div>
        </div>

        {/* Summary Input */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: isDark ? "#cbd5e1" : "#475569" }}>
            Summary <span className="text-[9px] font-normal lowercase text-slate-400">(optional)</span>
          </label>
          <input value={summary} onChange={e => setSummary(e.target.value)} 
            placeholder="Brief summary (optional, auto-generated if empty)"
            className="w-full px-3 py-2 rounded-xl text-xs font-medium outline-none transition-all focus:ring-1 focus:ring-amber-500/50" 
            style={inputStyle} />
        </div>

        {/* Content Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDark ? "#cbd5e1" : "#475569" }}>
              Content <span className="text-amber-500">*</span> <span className="text-[9px] font-normal lowercase text-slate-400">(markdown supported)</span>
            </label>
            <span className="text-[10px] font-medium text-amber-500">{stats.words} words</span>
          </div>

          {activeTab === "write" ? (
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: inputBorder }}>
              {/* Markdown Formatting Toolbar */}
              <div className="flex items-center gap-1 p-1.5 border-b overflow-x-auto" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: inputBorder }}>
                <button type="button" onClick={() => insertMarkdown("**", "**")} className="p-1 rounded hover:bg-amber-500/10 text-slate-400 hover:text-amber-500" title="Bold"><Bold size={13} /></button>
                <button type="button" onClick={() => insertMarkdown("*", "*")} className="p-1 rounded hover:bg-amber-500/10 text-slate-400 hover:text-amber-500" title="Italic"><Italic size={13} /></button>
                <button type="button" onClick={() => insertMarkdown("### ")} className="p-1 rounded hover:bg-amber-500/10 text-slate-400 hover:text-amber-500" title="Heading"><Heading size={13} /></button>
                <button type="button" onClick={() => insertMarkdown("```\n", "\n```")} className="p-1 rounded hover:bg-amber-500/10 text-slate-400 hover:text-amber-500" title="Code"><Code size={13} /></button>
                <button type="button" onClick={() => insertMarkdown("> ")} className="p-1 rounded hover:bg-amber-500/10 text-slate-400 hover:text-amber-500" title="Quote"><Quote size={13} /></button>
                <button type="button" onClick={() => insertMarkdown("- ")} className="p-1 rounded hover:bg-amber-500/10 text-slate-400 hover:text-amber-500" title="List"><List size={13} /></button>
                <button type="button" onClick={() => insertMarkdown("[", "](https://)")} className="p-1 rounded hover:bg-amber-500/10 text-slate-400 hover:text-amber-500" title="Link"><LinkIcon size={13} /></button>
              </div>

              <textarea value={content} onChange={e => setContent(e.target.value)} 
                placeholder="Write your blog content here... Markdown is supported."
                rows={8} className="w-full px-3.5 py-3 text-xs font-mono leading-relaxed outline-none resize-none"
                style={{ background: inputBg, color: isDark ? "#f8fafc" : "#0f172a", minHeight: 180 }} />
            </div>
          ) : (
            <div className="rounded-xl p-4 border min-h-[180px] max-h-[350px] overflow-y-auto prose prose-sm max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans"
              style={{ background: inputBg, borderColor: inputBorder, color: isDark ? "#e2e8f0" : "#334155" }}>
              {content ? content : <span className="text-slate-400 italic">No content entered yet. Switch to Edit mode to write your blog.</span>}
            </div>
          )}
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: inputBorder }}>
          <button onClick={() => publish(false)} disabled={savingDraft || publishing}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 border hover:bg-slate-500/10"
            style={{ borderColor: inputBorder, color: isDark ? "#cbd5e1" : "#475569" }}>
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>
          <button onClick={() => publish(true)} disabled={publishing || savingDraft}
            className="px-5 py-2 rounded-xl text-xs font-bold text-black shadow flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}>
            <Sparkles size={13} /> {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

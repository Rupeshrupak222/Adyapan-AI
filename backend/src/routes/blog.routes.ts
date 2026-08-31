import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";

const router = Router();
router.use(requireAuth);

// List published blogs (with search)
router.get("/", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const { q, category, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, Math.min(Number(page) || 1, 10000));
    const pageSize = Math.max(1, Math.min(Number(limit) || 20, 100));
    const skip = (pageNum - 1) * pageSize;
    const where: any = { published: true };
    if (q) where.OR = [{ title: { contains: String(q), mode: "insensitive" } }, { content: { contains: String(q), mode: "insensitive" } }, { tags: { has: String(q) } }];
    if (category && category !== "All") where.category = String(category);
    const [blogs, total] = await Promise.all([
      userPrisma.blog.findMany({
        where,
        include: { _count: { select: { comments: true, likes: true } }, likes: { where: { userId: req.user.userId }, select: { id: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      userPrisma.blog.count({ where }),
    ]);
    const enriched = blogs.map((b: any) => ({ ...b, likedByMe: b.likes.length > 0, likes: undefined }));
    res.json({ success: true, blogs: enriched, total, page: pageNum, pages: Math.ceil(total / pageSize) });
  } catch (error) {
    handleRouteError(res, error, "Blog.list", "Failed to fetch blogs");
  }
});

// My blogs (must be before /:id to avoid conflict)
router.get("/my/blogs", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const blogs = await userPrisma.blog.findMany({
      where: { userId: req.user.userId },
      include: { _count: { select: { comments: true, likes: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, blogs });
  } catch (error) {
    handleRouteError(res, error, "Blog.myBlogs", "Failed to fetch blogs");
  }
});

// Get single blog
router.get("/:id", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const blog = await userPrisma.blog.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { comments: true, likes: true } }, likes: { where: { userId: req.user.userId }, select: { id: true } } },
    });
    if (!blog) return res.status(404).json({ success: false, error: "Blog not found" });
    // Drafts are only visible to their author; other users see 404
    if (!blog.published && blog.userId !== req.user.userId) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }
    await userPrisma.blog.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
    res.json({ success: true, blog: { ...blog, likedByMe: blog.likes.length > 0, likes: undefined } });
  } catch (error) {
    handleRouteError(res, error, "Blog.get", "Failed to fetch blog");
  }
});

// Create blog
router.post("/", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const { title, content, summary, category, tags, coverImage, published } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Title and content required" });
    const blog = await userPrisma.blog.create({
      data: { userId: req.user.userId, title, content, summary: summary || content.slice(0, 200), category: category || "General", tags: tags || [], coverImage: coverImage || null, published: !!published },
    });
    res.json({ success: true, blog });
  } catch (error) {
    handleRouteError(res, error, "Blog.create", "Failed to create blog");
  }
});

// Update blog
router.put("/:id", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const existing = await userPrisma.blog.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: "Not authorized" });
    const { title, content, summary, category, tags, coverImage, published } = req.body;
    const blog = await userPrisma.blog.update({
      where: { id: req.params.id },
      data: { ...(title !== undefined && { title }), ...(content !== undefined && { content }), ...(summary !== undefined && { summary }), ...(category !== undefined && { category }), ...(tags !== undefined && { tags }), ...(coverImage !== undefined && { coverImage }), ...(published !== undefined && { published }) },
    });
    res.json({ success: true, blog });
  } catch (error) {
    handleRouteError(res, error, "Blog.update", "Failed to update blog");
  }
});

// Delete blog
router.delete("/:id", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const existing = await userPrisma.blog.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: "Not authorized" });
    await userPrisma.blog.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, "Blog.delete", "Failed to delete blog");
  }
});

// Toggle like
router.post("/:id/like", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const existing = await userPrisma.blogLike.findUnique({
      where: { blogId_userId: { blogId: req.params.id, userId: req.user.userId } },
    });
    if (existing) {
      await userPrisma.blogLike.delete({ where: { id: existing.id } });
      res.json({ success: true, liked: false });
    } else {
      await userPrisma.blogLike.create({ data: { blogId: req.params.id, userId: req.user.userId } });
      res.json({ success: true, liked: true });
    }
  } catch (error) {
    handleRouteError(res, error, "Blog.like", "Failed to toggle like");
  }
});

// Get comments
router.get("/:id/comments", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const comments = await userPrisma.blogComment.findMany({
      where: { blogId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, comments });
  } catch (error) {
    handleRouteError(res, error, "Blog.comments", "Failed to fetch comments");
  }
});

// Add comment
router.post("/:id/comments", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });
    const comment = await userPrisma.blogComment.create({
      data: { blogId: req.params.id, userId: req.user.userId, content },
    });
    res.json({ success: true, comment });
  } catch (error) {
    handleRouteError(res, error, "Blog.addComment", "Failed to add comment");
  }
});

export const blogRouter = router;

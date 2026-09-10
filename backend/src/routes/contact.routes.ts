import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { handleRouteError } from "../utils/routeError";
import { sendAdminContactAlert, sendUserContactConfirmation } from "../utils/mailer";

export const contactRouter = Router();

// In-memory store fallback if DB table not yet migrated
const contactStore: Array<{
  id: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
}> = [];

// Submit contact form
contactRouter.post("/submit", async (req, res) => {
  try {
    const { fullName, email, phone, subject, message } = req.body;

    if (!fullName || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, phone, and message are required",
      });
    }

    let contact: any;
    try {
      if ((prisma as any).contactSubmission) {
        contact = await (prisma as any).contactSubmission.create({
          data: {
            fullName,
            email,
            phone,
            subject: subject || "General Inquiry",
            message,
            status: "pending",
          },
        });
      }
    } catch {
      // Fallback in-memory save
    }

    if (!contact) {
      contact = {
        id: `contact-${Date.now()}`,
        fullName,
        email,
        phone,
        subject: subject || "General Inquiry",
        message,
        status: "pending",
        createdAt: new Date(),
      };
      contactStore.push(contact);
    }

    // Send emails (non-blocking — don't fail the request if email fails)
    const emailData = {
      fullName,
      email,
      phone,
      subject: subject || "General Inquiry",
      message,
      submittedAt: contact.createdAt as Date,
    };

    // Send emails with proper error handling
    const emailPromises = Promise.all([
      sendAdminContactAlert(emailData),
      sendUserContactConfirmation(emailData),
    ]).catch((err) => {
      // Log detailed error for debugging
      console.error("[Contact] Email send error:", {
        error: err?.message || err,
        code: err?.code,
        command: err?.command,
        stack: err?.stack,
      });
      
      // In production, alert admins that email system is down
      if (process.env.NODE_ENV === "production") {
        console.error("[Contact] ⚠️  ALERT: Email system failure in production!");
      }
    });

    // Optional: Wait for email in development for better debugging
    if (process.env.NODE_ENV === "development") {
      try {
        await emailPromises;
        console.log("[Contact] ✅ Emails sent successfully");
      } catch (e) {
        // Error already logged above
      }
    }

    res.json({
      success: true,
      message: "Contact form submitted successfully",
      data: {
        id: contact.id,
        submittedAt: contact.createdAt,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Contact.submit", "Failed to submit contact form");
  }
});

// Get all contact submissions (Admin only)
contactRouter.get("/list", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;

    const where: any = {};
    if (status && typeof status === "string") {
      where.status = status;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let submissions: any[] = [];
    let total = 0;

    try {
      if ((prisma as any).contactSubmission) {
        [submissions, total] = await Promise.all([
          (prisma as any).contactSubmission.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limitNum,
          }),
          (prisma as any).contactSubmission.count({ where }),
        ]);
      }
    } catch {
      submissions = contactStore;
      total = contactStore.length;
    }

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Contact.list", "Failed to fetch contact submissions");
  }
});

// Update contact submission status (Admin only)
contactRouter.patch("/:id/status", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "in-progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    let submission: any;
    try {
      if ((prisma as any).contactSubmission) {
        submission = await (prisma as any).contactSubmission.update({
          where: { id },
          data: { status },
        });
      }
    } catch {
      const found = contactStore.find((c) => c.id === id);
      if (found) {
        found.status = status;
        submission = found;
      }
    }

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    res.json({
      success: true,
      message: "Status updated successfully",
      data: submission,
    });
  } catch (error) {
    handleRouteError(res, error, "Contact.updateStatus", "Failed to update status");
  }
});

import { Router } from "express";
import { prisma } from "../config/prisma";
import { handleRouteError } from "../middleware/error";

export const contactRouter = Router();

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

    // Save to database
    const contact = await prisma.contactSubmission.create({
      data: {
        fullName,
        email,
        phone,
        subject: subject || "General Inquiry",
        message,
        status: "pending",
      },
    });

    // TODO: Send email notification to admin
    // You can integrate email service here (e.g., Resend, SendGrid, etc.)

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
contactRouter.get("/list", async (req, res) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;

    const where: any = {};
    if (status && typeof status === "string") {
      where.status = status;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

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
contactRouter.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "in-progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const submission = await prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });

    res.json({
      success: true,
      message: "Status updated successfully",
      data: submission,
    });
  } catch (error) {
    handleRouteError(res, error, "Contact.updateStatus", "Failed to update status");
  }
});

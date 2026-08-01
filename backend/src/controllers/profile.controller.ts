import type { NextFunction, Request, Response } from "express";
import { cloudinary } from "../config/cloudinary";
import { getProfile, upsertProfile, clearResume } from "../services/profile.service";
import { AdminAuditService } from "../services/admin-audit.service";

export async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getProfile(req.user?.userId ?? "");
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

export async function updateMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await upsertProfile(req.user?.userId ?? "", req.body);
    try {
      await AdminAuditService.log({
        action: "Profile Updated",
        module: "Settings",
        targetId: req.user?.userId,
        details: { changedFields: Object.keys(req.body), userEmail: req.user?.email || "" },
        ipAddress: req.ip,
      });
    } catch {
      // Audit logging is best-effort
    }
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

export async function uploadResume(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    // Cloudinary puts the full URL in req.file.path and public_id in req.file.filename
    const resumeUrl = (req.file as Express.Multer.File & { path: string }).path;
    const resumeName = req.file.originalname;

    const profile = await upsertProfile(req.user?.userId ?? "", { resumeUrl, resumeName });
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

export async function removeResume(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await getProfile(req.user?.userId ?? "");

    // Delete from Cloudinary if we have a URL
    if (existing?.resumeUrl) {
      try {
        // Extract public_id from the Cloudinary URL
        // URL format: https://res.cloudinary.com/<cloud>/raw/upload/v.../adyapan-resumes/<publicId>
        const urlParts = existing.resumeUrl.split("/");
        const folderIndex = urlParts.indexOf("adyapan-resumes");
        if (folderIndex !== -1) {
          const publicId = `adyapan-resumes/${urlParts.slice(folderIndex + 1).join("/").split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
        }
      } catch {
        // Don't fail the request if Cloudinary delete fails
      }
    }

    const profile = await clearResume(req.user?.userId ?? "");
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

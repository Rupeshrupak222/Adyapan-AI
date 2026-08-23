import { Router } from "express";
import multer from "multer";
import {
  uploadAndParseResume,
  listUploadedResumes,
  getUploadedResume,
  setActiveUploadedResume,
  deleteUploadedResume,
  getActiveProfile,
} from "../controllers/resume-upload.controller";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";

export const resumeUploadRouter = Router();

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

resumeUploadRouter.post("/upload", requireAuth, requireFeatureQuota("RESUME_UPLOAD"), uploadMemory.single("resume"), uploadAndParseResume);
resumeUploadRouter.get("/list", requireAuth, listUploadedResumes);
resumeUploadRouter.get("/active", requireAuth, getActiveProfile);
resumeUploadRouter.get("/:id", requireAuth, getUploadedResume);
resumeUploadRouter.post("/set-active/:id", requireAuth, setActiveUploadedResume);
resumeUploadRouter.delete("/:id", requireAuth, deleteUploadedResume);

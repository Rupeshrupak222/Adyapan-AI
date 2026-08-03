import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getMyUsage, getMyUsageHistory } from "../controllers/usage.controller";

export const usageRouter = Router();

usageRouter.use(requireAuth);
usageRouter.get("/", getMyUsage);
usageRouter.get("/history", getMyUsageHistory);

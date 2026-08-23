import { Router } from "express";
import {
  listSessions,
  createSession,
  getSession,
  deleteSession,
  updateSession,
  sendMessage,
  uploadFile,
  uploadChatFile,
} from "../controllers/ady-chat.controller";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";

export const adyChatRouter = Router();

adyChatRouter.use(requireAuth);

adyChatRouter.get("/sessions", listSessions);
// Creating a session is the billable "new AI chat" event (1 credit); messages
// inside an existing session are not metered.
adyChatRouter.post("/sessions", requireFeatureQuota("AI_CHAT_ASSISTANT"), createSession);
adyChatRouter.get("/sessions/:id", getSession);
adyChatRouter.delete("/sessions/:id", deleteSession);
adyChatRouter.patch("/sessions/:id", updateSession);

adyChatRouter.post("/send", sendMessage);
adyChatRouter.post("/upload", uploadChatFile, uploadFile);

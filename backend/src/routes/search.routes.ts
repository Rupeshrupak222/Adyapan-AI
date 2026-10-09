import { Router } from "express";
import { optionalAuth } from "../middleware/auth";
import { globalSearch } from "../controllers/search.controller";

export const searchRouter = Router();

searchRouter.get("/", optionalAuth, globalSearch);

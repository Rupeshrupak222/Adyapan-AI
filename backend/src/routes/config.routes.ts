import { Router } from "express";
import { getPlatformConfig, updatePlatformConfig } from "../config/platform-config";
import { getSystemSettingsMemory } from "../controllers/admin.controller";
import { requireUserId } from "../utils/request";
import { getUserPrismaFromRequest } from "../utils/prisma";

export const configRouter = Router();

configRouter.get("/", async (_req, res) => {
  try {
    const config = getPlatformConfig();
    const adminSettings = getSystemSettingsMemory();
    res.json({
      success: true,
      config: {
        ...config,
        ...adminSettings,
      },
    });
  } catch (error) {
    res.json({ success: true, config: { ...getPlatformConfig(), ...getSystemSettingsMemory() } });
  }
});

configRouter.get("/:key", async (req, res) => {
  const { key } = req.params;
  const config = getPlatformConfig();
  const value = (config as any)[key];
  if (value === undefined) {
    res.status(404).json({ success: false, error: `Unknown config key: ${key}` });
    return;
  }
  res.json({ success: true, key, value });
});

configRouter.put("/:key", async (req, res) => {
  try {
    requireUserId(req);
    const { key } = req.params;
    const { value } = req.body;
    if (!value || !Array.isArray(value)) {
      res.status(400).json({ success: false, error: "value must be a non-empty array" });
      return;
    }
    const config = getPlatformConfig();
    if (!(key in config)) {
      res.status(400).json({ success: false, error: `Unknown config key: ${key}` });
      return;
    }
    updatePlatformConfig({ [key]: value });
    res.json({ success: true, key, value });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update config" });
  }
});

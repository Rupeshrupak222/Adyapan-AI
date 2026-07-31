import type { Request, Response } from "express";
import { adminDbService } from "../services/admin-db.service";

export async function getUserDatabases(req: Request, res: Response) {
  const databases = await adminDbService.listUserDatabases();
  res.json(databases);
}

export async function getUserDatabaseStats(req: Request, res: Response) {
  const stats = await adminDbService.getUserStats();
  res.json(stats);
}

export async function queryUserDb(req: Request, res: Response) {
  const userId = req.params.userId as string;
  const query = req.body?.query as string | undefined;
  
  if (!query) {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  const result = await adminDbService.queryUserDatabase(userId, query);
  res.json(result);
}

export async function deleteUserDatabase(req: Request, res: Response) {
  const userId = req.params.userId as string;
  await adminDbService.deleteUserDatabase(userId);
  res.json({ message: "Database deleted successfully" });
}

export async function getAggregatedStats(req: Request, res: Response) {
  const stats = await adminDbService.getAggregatedStats();
  res.json(stats);
}
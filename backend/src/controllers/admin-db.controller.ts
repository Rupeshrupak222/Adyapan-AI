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

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  // Only allow read-only SELECT statements. Reject any DDL (CREATE, DROP, ALTER),
  // DML (INSERT, UPDATE, DELETE), or multiple statements that could cause
  // destructive changes via SQL injection through this admin endpoint.
  const normalised = query.trim().replace(/\s+/g, " ").toUpperCase();
  if (!normalised.startsWith("SELECT ")) {
    res.status(400).json({ error: "Only SELECT queries are permitted." });
    return;
  }
  // Block statement terminators that could chain multiple queries.
  if (query.includes(";") && query.trim().lastIndexOf(";") < query.trim().length - 1) {
    res.status(400).json({ error: "Multiple statements are not allowed." });
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
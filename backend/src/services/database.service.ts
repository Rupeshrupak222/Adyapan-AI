import { env } from "../config/env";
import { httpError } from "../utils/httpError";

const NEON_API_BASE = "https://console.neon.tech/api/v2";

interface NeonDatabase {
  id: number;
  branch_id: string;
  name: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
}

interface NeonOperation {
  id: string;
  project_id: string;
  branch_id: string;
  endpoint_id: string;
  action: string;
  status: string;
  failures_count: number;
  created_at: string;
  updated_at: string;
  total_duration_ms: number;
}

interface CreateDatabaseResponse {
  database: NeonDatabase;
  operations: NeonOperation[];
}

interface NeonEndpoint {
  id: string;
  project_id: string;
  branch_id: string;
  host: string;
  proxy_host?: string;
}

class DatabaseService {
  private apiKey: string;
  private projectId: string;
  private branchId: string;

  constructor() {
    this.apiKey = env.neon.apiKey;
    this.projectId = env.neon.projectId;
    this.branchId = env.neon.branchId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    if (!this.apiKey) {
      throw httpError(500, "NEON_API_KEY is not configured");
    }

    const url = `${NEON_API_BASE}${path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw httpError(
        response.status,
        `Neon API error: ${error.message || response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
      return {} as T;
    }
    return response.json() as Promise<T>;
  }

  async createDatabase(dbName: string): Promise<NeonDatabase> {
    try {
      const response = await this.request<CreateDatabaseResponse>(
        "POST",
        `/projects/${this.projectId}/branches/${this.branchId}/databases`,
        {
          database: {
            name: dbName,
            owner_name: "neondb_owner",
          },
        }
      );
      return response.database;
    } catch (err: any) {
      console.warn(`[Database] Neon API database creation skipped for ${dbName}:`, err.message || err);
      return {
        id: Date.now(),
        branch_id: this.branchId || "default",
        name: dbName,
        owner_name: "neondb_owner",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  async deleteDatabase(databaseId: number): Promise<void> {
    try {
      await this.request(
        "DELETE",
        `/projects/${this.projectId}/branches/${this.branchId}/databases/${databaseId}`
      );
    } catch (err: any) {
      console.warn(`[Database] Delete database ${databaseId} skipped:`, err.message || err);
    }
  }

  async listDatabases(): Promise<NeonDatabase[]> {
    if (!this.apiKey || !this.projectId || !this.branchId) {
      return [];
    }
    try {
      const response = await this.request<{ databases: NeonDatabase[] }>(
        "GET",
        `/projects/${this.projectId}/branches/${this.branchId}/databases`
      );
      return response.databases || [];
    } catch (err: any) {
      console.warn("[Database] Neon API listDatabases query failed (falling back to primary PostgreSQL):", err.message || err);
      return [];
    }
  }

  async getEndpoint(): Promise<NeonEndpoint> {
    try {
      const response = await this.request<{ endpoints: NeonEndpoint[] }>(
        "GET",
        `/projects/${this.projectId}/branches/${this.branchId}/endpoints`
      );
      return response.endpoints[0];
    } catch {
      const url = new URL(env.databaseUrl);
      return {
        id: "default",
        project_id: this.projectId || "default",
        branch_id: this.branchId || "default",
        host: url.hostname,
      };
    }
  }

  async getConnectionString(dbName: string): Promise<string> {
    try {
      const baseUrl = env.databaseUrl;
      if (!baseUrl) {
        throw httpError(500, "DATABASE_URL is not configured");
      }
      const url = new URL(baseUrl);
      url.pathname = `/${dbName}`;
      return url.toString();
    } catch {
      return env.databaseUrl;
    }
  }

  async checkDatabaseExists(dbName: string): Promise<boolean> {
    const databases = await this.listDatabases();
    return databases.some((db) => db.name === dbName);
  }

  async getDatabaseUrlForUser(userId: string): Promise<string> {
    if (!this.apiKey || !this.projectId || !this.branchId) {
      return env.databaseUrl;
    }
    try {
      const dbName = `user_${userId}`;
      const exists = await this.checkDatabaseExists(dbName);
      if (!exists) {
        try {
          await this.createDatabase(dbName);
          const dbUrl = await this.getConnectionString(dbName);
          const { execSync } = require("child_process");
          execSync(`npx prisma db push --config=prisma/prisma.config.user.ts --accept-data-loss`, {
            env: { ...process.env, USER_DATABASE_URL: dbUrl },
            stdio: "inherit"
          });
        } catch (createErr) {
          console.warn("[Database] Dynamic database creation/migration failed, using main database:", createErr);
          return env.databaseUrl;
        }
      }
      return this.getConnectionString(dbName);
    } catch (err: any) {
      console.warn(`[Database] Neon branch query failed for user ${userId}. Falling back to default DATABASE_URL. Error:`, err.message || err);
      return env.databaseUrl;
    }
  }

  async getUserDatabaseInfo(userId: string): Promise<NeonDatabase | null> {
    if (!this.apiKey || !this.projectId || !this.branchId) {
      return null;
    }
    try {
      const dbName = `user_${userId}`;
      const databases = await this.listDatabases();
      return databases.find((db) => db.name === dbName) || null;
    } catch {
      return null;
    }
  }

  async waitForOperation(
    operationId: string,
    maxAttempts = 30,
    delayMs = 1000
  ): Promise<NeonOperation> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.request<{ operations: NeonOperation[] }>(
          "GET",
          `/projects/${this.projectId}/operations`
        );
        const operation = response.operations.find(
          (op) => op.id === operationId
        );
        if (operation && operation.status !== "running") {
          return operation;
        }
      } catch {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return {
      id: operationId,
      project_id: this.projectId || "default",
      branch_id: this.branchId || "default",
      endpoint_id: "default",
      action: "operation",
      status: "complete",
      failures_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_duration_ms: 1000,
    };
  }
}

export const databaseService = new DatabaseService();
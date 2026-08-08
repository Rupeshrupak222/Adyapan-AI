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
    console.log(`[Database] Skipping per-user database creation for ${dbName} — all user data is stored in master database (neondb).`);
    return {
      id: Date.now(),
      branch_id: this.branchId || "default",
      name: dbName,
      owner_name: "neondb_owner",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
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

  private userDbUrlCache = new Map<string, string>();
  private dbListCache: { databases: NeonDatabase[]; timestamp: number } | null = null;
  private DB_LIST_TTL_MS = 60_000; // Cache database list for 60 seconds

  async listDatabases(): Promise<NeonDatabase[]> {
    if (!this.apiKey || !this.projectId || !this.branchId) {
      return [];
    }
    const now = Date.now();
    if (this.dbListCache && now - this.dbListCache.timestamp < this.DB_LIST_TTL_MS) {
      return this.dbListCache.databases;
    }
    try {
      const response = await this.request<{ databases: NeonDatabase[] }>(
        "GET",
        `/projects/${this.projectId}/branches/${this.branchId}/databases`
      );
      const databases = response.databases || [];
      this.dbListCache = { databases, timestamp: now };
      return databases;
    } catch (err: any) {
      console.warn("[Database] Neon API listDatabases query failed (falling back to primary PostgreSQL):", err.message || err);
      return this.dbListCache?.databases || [];
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

  async getDatabaseUrlForUser(_userId: string): Promise<string> {
    // All users save data in the single master database (neondb)
    return env.databaseUrl;
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
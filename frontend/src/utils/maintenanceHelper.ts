/**
 * Utility to identify infrastructure quota, Railway, Supabase,
 * and database limit errors so that internal platform errors are never
 * leaked to users in the UI, and "Site under maintenance" is shown instead.
 */

export const MAINTENANCE_MESSAGE = "Site under maintenance. Please try again shortly.";

export function isMaintenanceOrQuotaError(errOrMsg: unknown, status?: number): boolean {
  if (status === 402 || status === 503 || status === 507) {
    return true;
  }

  let text = "";

  if (typeof errOrMsg === "string") {
    text = errOrMsg;
  } else if (errOrMsg && typeof errOrMsg === "object") {
    const anyErr = errOrMsg as any;
    const pieces = [
      anyErr?.response?.data?.message,
      anyErr?.response?.data?.error,
      anyErr?.response?.data?.code,
      typeof anyErr?.response?.data === "string" ? anyErr.response.data : "",
      anyErr?.message,
      anyErr?.error,
      anyErr?.code,
      anyErr?.statusText,
    ];
    text = pieces.filter(Boolean).join(" ");
  }

  const lower = text.toLowerCase();

  return (
    lower.includes("exceeded the quota") ||
    lower.includes("exceeded quota") ||
    lower.includes("quota exceeded") ||
    lower.includes("upgrade your plan") ||
    lower.includes("plan to increase limits") ||
    lower.includes("site_maintenance") ||
    lower.includes("site under maintenance") ||
    lower.includes("railway") ||
    lower.includes("supabase") ||
    lower.includes("database is paused") ||
    lower.includes("project is paused") ||
    lower.includes("compute hours") ||
    lower.includes("too many connections") ||
    lower.includes("max client connections") ||
    lower.includes("connection pool") ||
    lower.includes("limit exceed") ||
    lower.includes("usage limit")
  );
}

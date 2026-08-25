import { createHash } from "crypto";
import { prisma } from "../config/prisma";

// ─── Force-Logout Registry ──────────────────────────────────────────────────
// When Device B logs in, Device A's token is added here.
// On Device A's next API call, middleware checks this registry and returns 401 FORCE_LOGOUT.
// Bounded Map with automatic expiry cleanup.

const FORCE_LOGOUT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours max retention
const FORCE_LOGOUT_MAX_ENTRIES = 10_000;

type ForceLogoutEntry = { userId: string; reason: string; createdAt: number };

// Key = tokenHash (sha256 of the JWT), Value = metadata
const forceLogoutRegistry = new Map<string, ForceLogoutEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [hash, entry] of forceLogoutRegistry) {
    if (now - entry.createdAt > FORCE_LOGOUT_TTL_MS) {
      forceLogoutRegistry.delete(hash);
    }
  }
}, 5 * 60 * 1000).unref();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Mark a token for force-logout.
 * Called when a new device logs in and the old device's token needs to be invalidated.
 */
export function markTokenForForceLogout(token: string, userId: string, reason = "Another device logged in"): void {
  const hash = hashToken(token);
  forceLogoutRegistry.set(hash, { userId, reason, createdAt: Date.now() });

  // Evict oldest entries if over limit
  if (forceLogoutRegistry.size > FORCE_LOGOUT_MAX_ENTRIES) {
    const oldest = forceLogoutRegistry.keys().next().value;
    if (oldest) forceLogoutRegistry.delete(oldest);
  }
}

/**
 * Check if a token is in the force-logout registry.
 * Returns the reason string if found, null otherwise.
 */
export function checkForceLogout(token: string): string | null {
  const hash = hashToken(token);
  const entry = forceLogoutRegistry.get(hash);
  if (!entry) return null;

  // Remove from registry after detection (one-time use)
  forceLogoutRegistry.delete(hash);
  return entry.reason;
}

/**
 * Mark all tokens for a given user as force-logged-out.
 * Used when admin deactivates a user or for security revocation.
 */
export function forceLogoutAllForUser(userId: string, reason = "Account deactivated"): void {
  // We can't enumerate all tokens for a user from the registry alone,
  // but we track it by userId in the session table. For the in-memory registry,
  // we mark a special key so the middleware can check by userId.
  forceLogoutRegistry.set(`user:${userId}`, { userId, reason, createdAt: Date.now() });
}

/**
 * Check if a user has a blanket force-logout (admin deactivation).
 */
export function checkUserForceLogout(userId: string): string | null {
  const entry = forceLogoutRegistry.get(`user:${userId}`);
  if (!entry) return null;
  return entry.reason;
}

/**
 * Clear user-level force-logout (e.g., after reactivation).
 */
export function clearUserForceLogout(userId: string): void {
  forceLogoutRegistry.delete(`user:${userId}`);
}

// ─── Activity Tracking ──────────────────────────────────────────────────────

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Update the lastActiveAt timestamp for the user's active session.
 * Called on every authenticated request (debounced to avoid DB thrash).
 */
const activityUpdateDebounce = new Map<string, number>(); // userId -> last update timestamp
const ACTIVITY_DEBOUNCE_MS = 60_000; // Only update DB once per minute per user

export async function recordActivity(userId: string): Promise<void> {
  const now = Date.now();
  const lastUpdate = activityUpdateDebounce.get(userId) || 0;

  if (now - lastUpdate < ACTIVITY_DEBOUNCE_MS) return;
  activityUpdateDebounce.set(userId, now);

  try {
    // Update the user's most recent active session
    const session = await prisma.session.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      });
    }
  } catch {
    // Non-critical — silently ignore activity tracking failures
  }
}

// Cleanup debounce map every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, ts] of activityUpdateDebounce) {
    if (now - ts > 10 * 60 * 1000) activityUpdateDebounce.delete(userId);
  }
}, 30 * 60 * 1000).unref();

/**
 * Check if a session is idle (no activity for > 15 minutes).
 * Returns true if idle, false if active.
 * 
 * Falls back to checking the activity debounce map if no Session record exists
 * (backward compatibility with logins from before session tracking was added).
 */
export async function isSessionIdle(userId: string): Promise<boolean> {
  try {
    const session = await prisma.session.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { lastActiveAt: true, createdAt: true },
    });

    if (!session) {
      // No Session record — check the in-memory activity debounce as fallback.
      // If we've seen activity from this user recently, they're not idle.
      const lastKnownActivity = activityUpdateDebounce.get(userId);
      if (lastKnownActivity && Date.now() - lastKnownActivity < IDLE_TIMEOUT_MS) {
        return false; // Active recently
      }
      // No recent activity data at all — assume NOT idle to be safe
      // (forces the confirmation popup rather than silently clearing)
      return false;
    }

    const lastActive = session.lastActiveAt || session.createdAt;
    return Date.now() - lastActive.getTime() > IDLE_TIMEOUT_MS;
  } catch {
    return false; // On error, assume not idle (safer — shows popup)
  }
}

/**
 * Revoke all active sessions for a user (used for theft detection / admin deactivation).
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Also clear the activeSessionId
  await prisma.user.update({
    where: { id: userId },
    data: { activeSessionId: null },
  });
}

// ─── Refresh Token Hashing ──────────────────────────────────────────────────

/**
 * Hash a refresh token for storage in the DB (sha256).
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

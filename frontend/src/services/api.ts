import axios from "axios";

const DEFAULT_API_URL = "http://localhost:5000/api";

export function normalizeApiBaseUrl(raw?: string): string {
  const input = (raw ?? "").trim();
  if (!input) return DEFAULT_API_URL;
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try { url = new URL(withScheme); } catch { return DEFAULT_API_URL; }
  const path = url.pathname.replace(/\/+$/, "");
  if (!path) url.pathname = "/api";
  return url.toString().replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// Request interceptor — attach token, session ID, timezone
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("adyapan-token") || localStorage.getItem("adyapan-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const sessionId = sessionStorage.getItem("adyapan-session-id") || localStorage.getItem("adyapan-session-id");
    if (sessionId) config.headers["X-Session-Id"] = sessionId;
    try { config.headers["x-timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"; } catch {}
  }
  return config;
});

// Token refresh state
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];
function subscribeToRefresh(cb: (token: string) => void) { refreshSubscribers.push(cb); }
function onRefreshComplete(newToken: string) { refreshSubscribers.forEach((cb) => cb(newToken)); refreshSubscribers = []; }
function onRefreshFailed() { refreshSubscribers = []; }

// Response interceptor
api.interceptors.response.use(
  (res) => {
    if (typeof window !== "undefined") {
      const featureKey = res.headers?.["x-feature-key"] || res.data?.featureUsage?.featureKey;
      if (featureKey) {
        import("@/store/feature-usage-store").then(({ useFeatureUsageStore }) => {
          useFeatureUsageStore.getState().fetchFeatureUsage();
        });
      }
    }
    return res;
  },
  async (err) => {
    const { config, response } = err;

    if (typeof window !== "undefined" && response?.data?.code === "LIMIT_EXCEEDED") {
      import("@/store/usage-store").then(({ useUsageStore }) => useUsageStore.getState().openLimitModal(response.data));
      return Promise.reject(err);
    }
    if (typeof window !== "undefined" && response?.data?.code === "PREMIUM_REQUIRED") {
      import("@/store/usage-store").then(({ useUsageStore }) => useUsageStore.getState().openPremiumRequiredModal(response.data));
      return Promise.reject(err);
    }

    if (typeof window !== "undefined" && response?.status === 401) {
      const path = window.location.pathname;
      const isAuthPage = path.startsWith("/login") || path.startsWith("/admin-login") || path.startsWith("/admin-register");
      if (isAuthPage) return Promise.reject(err);

      const responseCode = response?.data?.code || "";
      const msg = response?.data?.message || "";

      // FORCE_LOGOUT — skip refresh, redirect immediately
      if (responseCode === "FORCE_LOGOUT" || msg.includes("Session ended") || msg.includes("Session ID is required")) {
        performForceLogout(path, msg);
        return Promise.reject(err);
      }

      // Don't retry the refresh endpoint itself
      if (config?.url?.includes("/auth/refresh")) { performLogout(path, "session_expired"); return Promise.reject(err); }
      if (config?.__refreshAttempted) { performLogout(path, "session_expired"); return Promise.reject(err); }

      const refreshToken = sessionStorage.getItem("adyapan-refresh-token") || localStorage.getItem("adyapan-refresh-token");
      if (!refreshToken) { performLogout(path, "session_expired"); return Promise.reject(err); }

      // Queue if already refreshing
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToRefresh((newToken: string) => { config.headers.Authorization = `Bearer ${newToken}`; config.__refreshAttempted = true; resolve(api(config)); });
        });
      }

      isRefreshing = true;
      config.__refreshAttempted = true;

      try {
        const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { token: newToken, refreshToken: newRefreshToken } = refreshRes.data;
        const { updateStoredTokens } = await import("@/hooks/useAuth");
        updateStoredTokens(newToken, newRefreshToken);
        isRefreshing = false;
        onRefreshComplete(newToken);
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch {
        isRefreshing = false;
        onRefreshFailed();
        performLogout(path, "session_expired");
        return Promise.reject(err);
      }
    }

    if (!config) return Promise.reject(err);

    // Retry on 5xx
    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount < 3 && (!response || (response.status >= 500 && response.status <= 599))) {
      config.__retryCount += 1;
      const delay = 1000 * Math.pow(2, config.__retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(err);
  }
);

function clearAllAuthStorage() {
  ["adyapan-token", "adyapan-user", "adyapan-session-id", "adyapan-refresh-token"].forEach((k) => {
    localStorage.removeItem(k); sessionStorage.removeItem(k);
  });
  document.cookie = "adyapan-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
  document.cookie = "adyapan-user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
}

function performLogout(currentPath: string, reason: string) {
  clearAllAuthStorage();
  const target = (currentPath.startsWith("/dashboard/admin") || currentPath.startsWith("/profile/admin")) ? "/admin-login" : `/login?reason=${reason}`;
  window.location.href = target;
}

function performForceLogout(currentPath: string, message: string) {
  // If on a dashboard page, dispatch event to show popup before redirecting
  const isDashboard = currentPath.startsWith("/dashboard");
  if (isDashboard) {
    try {
      const event = new CustomEvent("force-logout", { detail: { message: message || "This account has been logged in on another device." } });
      window.dispatchEvent(event);
      return; // Popup will handle the redirect after user clicks OK
    } catch {}
  }
  // Fallback: direct redirect for non-dashboard pages
  clearAllAuthStorage();
  try { sessionStorage.setItem("adyapan-force-logout-msg", message || "Session ended. You have been logged in on another device."); } catch {}
  const target = (currentPath.startsWith("/dashboard/admin") || currentPath.startsWith("/profile/admin")) ? "/admin-login?reason=force_logout" : "/login?reason=force_logout";
  window.location.href = target;
}

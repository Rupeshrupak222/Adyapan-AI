import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
  timeout: 120000, // 2 minutes for long AI operations like document analysis
});

// Attach JWT token to every request if present (check both storages)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Inject local timezone
    try {
      config.headers["x-timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {}
  }
  return config;
});

// Custom Axios Retry logic & 401 Redirect handler
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { config, response } = err;

    // Surface premium limit enforcement to the upgrade modal (never retried)
    if (typeof window !== "undefined" && response?.data?.code === "LIMIT_EXCEEDED") {
      import("@/store/usage-store").then(({ useUsageStore }) =>
        useUsageStore.getState().openLimitModal(response.data)
      );
      return Promise.reject(err);
    }

    // Redirect to login on 401 (only if not already on an authentication page)
    if (typeof window !== "undefined" && response?.status === 401) {
      const path = window.location.pathname;
      const isAuthPage = path.startsWith("/login") || path.startsWith("/admin-login") || path.startsWith("/admin-register");
      if (!isAuthPage) {
        localStorage.removeItem("adyapan-token");
        localStorage.removeItem("adyapan-user");
        sessionStorage.removeItem("adyapan-token");
        sessionStorage.removeItem("adyapan-user");
        document.cookie = "adyapan-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
        document.cookie = "adyapan-user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
        const redirectTarget = (path.startsWith("/dashboard/admin") || path.startsWith("/profile/admin")) ? "/admin-login" : "/login";
        window.location.href = redirectTarget;
      }
      return Promise.reject(err);
    }

    if (!config) return Promise.reject(err);

    // Initialize retry count
    config.__retryCount = config.__retryCount || 0;

    // Retry up to 3 times on network errors or 5xx status codes
    const shouldRetry = config.__retryCount < 3 && (!response || (response.status >= 500 && response.status <= 599));

    if (shouldRetry) {
      config.__retryCount += 1;
      const delay = 1000 * Math.pow(2, config.__retryCount);
      console.warn(`[API] Retrying request to ${config.url} (${config.__retryCount}/3) in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(err);
  }
);


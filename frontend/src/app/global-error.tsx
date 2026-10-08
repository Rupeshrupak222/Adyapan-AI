"use client";

import { useEffect } from "react";
import { isMaintenanceOrQuotaError } from "@/utils/maintenanceHelper";

// Global error boundary. Required to catch errors thrown in the root layout,
// which the nested `error.tsx` cannot reach. Must render its own <html>/<body>.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[Adyapan] Global error:", error);
  }, [error]);

  const isMaintenance = isMaintenanceOrQuotaError(error);

  return (
    <html lang="en">
      <body>
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center"
          style={{ background: "#070913", color: "#f3f4f6" }}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              isMaintenance
                ? "bg-gradient-to-br from-amber-500/80 to-orange-600/80 shadow-amber-500/20"
                : "bg-gradient-to-br from-red-500/80 to-orange-600/80 shadow-red-500/20"
            }`}
          >
            {isMaintenance ? (
              <svg className="w-7 h-7 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </div>
          <h1 className="text-xl font-extrabold">
            {isMaintenance ? "Site Under Maintenance" : "Something went wrong"}
          </h1>
          <p className="text-sm max-w-md" style={{ color: "#9ca3af" }}>
            {isMaintenance
              ? "We are performing scheduled maintenance and capacity upgrades. Please check back shortly."
              : "An unexpected error occurred. Please try again."}
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
          >
            {isMaintenance ? "Refresh Page" : "Try again"}
          </button>
        </div>
      </body>
    </html>
  );
}

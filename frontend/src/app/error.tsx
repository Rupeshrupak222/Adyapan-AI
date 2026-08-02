"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[Adyapan] Route error:", error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center"
      style={{ background: "var(--bg-dark)", color: "var(--text-primary)" }}
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/80 to-orange-600/80 flex items-center justify-center shadow-lg shadow-red-500/20">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Something went wrong
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          An unexpected error occurred while rendering this page.
          {error?.digest ? <span className="block mt-1 text-xs" style={{ color: "var(--text-muted)" }}>Error ID: {error.digest}</span> : null}
        </p>
      </div>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="rounded-xl px-5 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
      >
        Try again
      </button>
    </div>
  );
}

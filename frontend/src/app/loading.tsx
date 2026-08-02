// Route-level loading boundary.
// Replaces the previous page the instant a navigation starts, so stale content
// is never visible while the next route's payload streams in.
export default function RootLoading() {
  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-6"
      style={{ background: "var(--bg-dark)", color: "var(--text-primary)" }}
      role="status"
      aria-label="Loading"
    >
      <div className="relative">
        <div
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25"
          style={{ animation: "adyapan-loading-pulse 1.2s ease-in-out infinite" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z"
              fill="rgba(0,0,0,0.85)"
            />
            <path
              d="M12 6.5a.9.9 0 0 1 .9.9v4.32l2.93 1.83a.9.9 0 1 1-.9 1.56l-3.38-2.1V7.4a.9.9 0 0 1 .45-.9Z"
              fill="#fbbf24"
            />
          </svg>
        </div>
        <div
          className="absolute -inset-2 rounded-3xl border-2 border-amber-500/25"
          style={{ animation: "adyapan-loading-ring 1.4s ease-out infinite" }}
        />
      </div>

      <div
        className="h-2.5 w-44 rounded-full overflow-hidden"
        style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
      >
        <div
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
          style={{ animation: "adyapan-loading-slide 1s ease-in-out infinite" }}
        />
      </div>

      <p
        className="text-[10px] font-black tracking-[0.35em] uppercase"
        style={{ color: "color-mix(in srgb, var(--primary) 80%, transparent)" }}
      >
        Adyapan AI
      </p>

      <style>{`
        @keyframes adyapan-loading-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.94); opacity: 0.92; }
        }
        @keyframes adyapan-loading-ring {
          0% { transform: scale(0.9); opacity: 0.9; }
          70%, 100% { transform: scale(1.18); opacity: 0; }
        }
        @keyframes adyapan-loading-slide {
          0% { transform: translateX(-120%); }
          50% { transform: translateX(120%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}

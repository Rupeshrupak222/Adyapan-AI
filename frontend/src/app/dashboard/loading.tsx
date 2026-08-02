// Dashboard loading boundary.
// Renders a dashboard-styled shell so entering /dashboard/* feels instant and
// never flashes a blank or previously mounted page.
export default function DashboardLoading() {
  return (
    <div
      className="relative overflow-hidden font-sans"
      style={{ minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-primary)" }}
      role="status"
      aria-label="Loading dashboard"
    >
      {/* Fixed top navigation placeholder */}
      <div
        className="fixed top-0 left-0 w-full h-[70px] flex items-center justify-between px-4"
        style={{ background: "color-mix(in srgb, var(--bg-dark) 92%, transparent)", borderBottom: "1px solid var(--border-color)", zIndex: 105 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 animate-pulse" />
          <div className="h-3 w-28 rounded-md animate-pulse" style={{ background: "var(--border-hover)" }} />
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
          <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
          <div className="h-8 w-28 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/70 to-orange-500/70 animate-pulse" />
      </div>

      {/* Sidebar placeholder */}
      <aside
        className="fixed left-0 top-[70px] bottom-0 w-[240px] hidden md:flex flex-col gap-3 p-4"
        style={{ borderRight: "1px solid var(--border-color)", zIndex: 104 }}
      >
        <div className="h-9 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        <div className="h-9 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        <div className="h-9 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        <div className="h-9 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        <div className="h-9 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        <div className="h-9 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
      </aside>

      {/* Content skeleton */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-[100px] md:pl-[280px] py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="h-10 w-56 rounded-lg animate-pulse" style={{ background: "var(--border-hover)" }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-32 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }} />
              <div className="h-32 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }} />
            </div>
            <div className="h-64 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }} />
          </div>
          <div className="space-y-6">
            <div className="h-48 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }} />
            <div className="h-40 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }} />
          </div>
        </div>
      </main>
    </div>
  );
}

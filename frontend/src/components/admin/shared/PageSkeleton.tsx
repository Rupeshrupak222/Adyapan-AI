export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 rounded-2xl" style={{ background: "var(--bg-card)" }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl" style={{ background: "var(--bg-card)" }} />
        ))}
      </div>
      <div className="h-64 rounded-2xl" style={{ background: "var(--bg-card)" }} />
    </div>
  );
}

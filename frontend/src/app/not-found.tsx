import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center"
      style={{ background: "var(--bg-dark)", color: "var(--text-primary)" }}
    >
      <p
        className="text-[10px] font-black tracking-[0.35em] uppercase"
        style={{ color: "color-mix(in srgb, var(--primary) 80%, transparent)" }}
      >
        Adyapan AI
      </p>
      <h1 className="text-7xl font-black tracking-tight" style={{ backgroundImage: "linear-gradient(135deg, #f59e0b, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        404
      </h1>
      <div>
        <h2 className="text-lg font-extrabold">Page not found</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-xl px-5 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
      >
        Back to home
      </Link>
    </div>
  );
}

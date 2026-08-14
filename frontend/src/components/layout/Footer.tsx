import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        background: "var(--bg-dark)",
        borderColor: "var(--border-color)",
        padding: "5rem 0 2rem",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans), sans-serif",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-5 lg:col-span-1">
            <Link href="/" className="text-xl font-bold text-gradient" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              Adyapan AI
            </Link>
            <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              Your ultimate intelligent educational suite helping you navigate college, refine
              profiles, build portfolios, and match with recruiters.
            </p>
            <div className="flex gap-3">
              {[
                { icon: "𝕏", label: "Twitter" },
                { icon: "in", label: "LinkedIn" },
                { icon: "⌥", label: "GitHub" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border text-xs font-bold transition-all hover:-translate-y-1"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="mb-6 text-base font-bold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              Explore
            </h4>
            <ul className="flex flex-col gap-4">
              {[
                { label: "Home", href: "/#home" },
                { label: "Features", href: "/#features" },
                { label: "How It Works", href: "/#how-it-works" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm transition-all hover:pl-1" style={{ color: "var(--text-secondary)" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h4 className="mb-6 text-base font-bold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              Tools
            </h4>
            <ul className="flex flex-col gap-4">
              {["Study Assistant", "Resume Builder", "Interview Coach"].map((tool) => (
                <li key={tool}>
                  <Link href="/login" className="text-sm transition-all hover:pl-1" style={{ color: "var(--text-secondary)" }}>
                    {tool}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-6 text-base font-bold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              Support
            </h4>
            <ul className="flex flex-col gap-4">
              {[
                { label: "FAQ", href: "/#faq" },
                { label: "Contact Us", href: "#" },
                { label: "Privacy Policy", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm transition-all hover:pl-1" style={{ color: "var(--text-secondary)" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col items-center justify-between gap-3 border-t pt-8 text-sm sm:flex-row"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
        >
          <p>&copy; 2026 Adyapan AI. All rights reserved.</p>
          <p>Built for users globally.</p>
        </div>
      </div>
    </footer>
  );
}


import Image from "next/image";
import Link from "next/link";

const InstagramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export function Footer() {
  const socialLinks = [
    {
      icon: <InstagramIcon />,
      label: "Instagram",
      href: "https://www.instagram.com/adyapan_",
      bg: "linear-gradient(135deg, #c13584 0%, #e1306c 50%, #f77737 100%)",
      shadow: "0 6px 18px rgba(225, 48, 108, 0.4)",
    },
    {
      icon: <LinkedInIcon />,
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/adyapan-edutech-pvt-ltd/",
      bg: "#1865f2",
      shadow: "0 6px 18px rgba(24, 101, 242, 0.4)",
    },
    {
      icon: <YoutubeIcon />,
      label: "YouTube",
      href: "https://www.youtube.com/@adyapan21",
      bg: "#d91d1c",
      shadow: "0 6px 18px rgba(217, 29, 28, 0.4)",
    },
  ];

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
            <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-gradient" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              <Image src="/assets/logo.png" alt="Adyapan AI" width={36} height={36} style={{ width: 36, height: 36, borderRadius: "50%" }} />
              <span>Adyapan AI</span>
            </Link>
            <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              Your ultimate intelligent educational suite helping you navigate college, refine
              profiles, build portfolios, and match with recruiters.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:scale-105 cursor-pointer"
                  style={{
                    background: s.bg,
                    boxShadow: s.shadow,
                    color: "#ffffff",
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
                { label: "Contact Us", href: "/contact" },
                { label: "Privacy Policy", href: "/privacy" },
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


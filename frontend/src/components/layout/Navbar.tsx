"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Load saved theme on mount
  useEffect(() => {
    const saved = (localStorage.getItem("adyapan-theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("adyapan-theme", next);
  };

  const navBg = theme === "dark" ? "#171717" : "#ffffff";
  const navBorder = theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
  const linkColor = theme === "dark" ? "#c5c5c5" : "#475569";
  const linkHover = theme === "dark" ? "#ffffff" : "#0f172a";
  const logoColor = theme === "dark" ? "#ffffff" : "#0f172a";
  const loginBg = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const getStartedBg = theme === "dark" ? "#ffffff" : "#0f172a";
  const getStartedText = theme === "dark" ? "#0d0d0d" : "#ffffff";

  return (
    <header
      className="sticky top-0 z-50 border-b transition-colors"
      style={{ background: navBg, borderBottomColor: navBorder }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold" style={{ color: logoColor }}>
          <Image src="/assets/logo.png" alt="Adyapan AI" width={32} height={32} style={{ borderRadius: "50%" }} />
          <span style={{ fontSize: "1.05rem", letterSpacing: "-0.3px" }}>Adyapan AI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {[
            { label: "Home", href: "/#home" },
            { label: "Features", href: "/#features" },
            { label: "How It Works", href: "/#how-it-works" },
            { label: "Pricing", href: "/#pricing" },
            { label: "FAQ", href: "/#faq" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors"
              style={{ color: linkColor }}
              onMouseEnter={(e) => (e.currentTarget.style.color = linkHover)}
              onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            style={{ background: loginBg, color: linkColor }}
          >
            {theme === "dark" ? (
              /* Sun icon */
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon icon */
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <Link
            href="/login"
            className="hidden md:inline-block rounded-full px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: logoColor }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = loginBg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            Login
          </Link>

          <Link
            href="/login?tab=register"
            className="hidden md:inline-block rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: getStartedBg, color: getStartedText }}
          >
            Get Started
          </Link>

          {/* Hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors md:hidden"
            style={{ background: loginBg, color: logoColor }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1 items-center justify-center">
              <span
                className="block h-0.5 w-4 rounded-full transition-all"
                style={{
                  background: logoColor,
                  transform: menuOpen ? "translateY(6px) rotate(45deg)" : "none",
                }}
              />
              <span
                className="block h-0.5 w-4 rounded-full transition-all"
                style={{
                  background: logoColor,
                  opacity: menuOpen ? 0 : 1,
                }}
              />
              <span
                className="block h-0.5 w-4 rounded-full transition-all"
                style={{
                  background: logoColor,
                  transform: menuOpen ? "translateY(-6px) rotate(-45deg)" : "none",
                }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          className="border-t px-6 py-6 md:hidden"
          style={{ background: navBg, borderColor: navBorder }}
        >
          <ul className="flex flex-col gap-5">
            {[
              { label: "Home", href: "/#home" },
              { label: "Features", href: "/#features" },
              { label: "How It Works", href: "/#how-it-works" },
              { label: "Pricing", href: "/#pricing" },
              { label: "FAQ", href: "/#faq" },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-sm font-medium"
                  style={{ color: linkColor }}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3 pt-6 border-t border-dashed" style={{ borderColor: navBorder }}>
            <Link
              href="/login"
              className="w-full text-center rounded-full py-2 text-sm font-medium transition-colors border"
              style={{ color: logoColor, borderColor: navBorder }}
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
            <Link
              href="/login?tab=register"
              className="w-full text-center rounded-full py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: getStartedBg, color: getStartedText }}
              onClick={() => setMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}


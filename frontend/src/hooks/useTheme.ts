"use client";
import { useState, useEffect } from "react";
export function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    // SSR safe: default to dark, will be updated in useEffect
    return "dark";
  });

  useEffect(() => {
    // Read from localStorage first (most authoritative), then fall back to data-theme attr
    const fromStorage = localStorage.getItem("adyapan-theme");
    const fromAttr = document.documentElement.getAttribute("data-theme");
    const t = fromStorage || fromAttr || "dark";
    setTheme(t);

    // Ensure data-theme attribute is in sync
    if (fromStorage && fromAttr !== fromStorage) {
      document.documentElement.setAttribute("data-theme", fromStorage);
    }

    // Watch for attribute mutations (theme toggle via toggle button)
    const obs = new MutationObserver(() => {
      const next = document.documentElement.getAttribute("data-theme") || "dark";
      setTheme(next);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Also watch for storage changes (cross-tab sync)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "adyapan-theme" && e.newValue) {
        setTheme(e.newValue);
        document.documentElement.setAttribute("data-theme", e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      obs.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return theme;
}

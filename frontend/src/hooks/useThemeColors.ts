"use client";

import { useState, useEffect } from "react";
import { mkColors, type ThemeColors } from "@/utils/themeColors";

export function useThemeColors(): ThemeColors {
  const [theme, setTheme] = useState<string>("dark");

  useEffect(() => {
    const fromStorage = localStorage.getItem("adyapan-theme");
    const fromAttr = document.documentElement.getAttribute("data-theme");
    const t = fromStorage || fromAttr || "dark";
    setTheme(t);
    if (fromStorage && fromAttr !== fromStorage) {
      document.documentElement.setAttribute("data-theme", fromStorage);
    }
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return mkColors(theme);
}

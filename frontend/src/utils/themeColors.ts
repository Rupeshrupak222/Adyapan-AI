export const mkColors = (theme: string) => {
  const d = theme === "dark";
  return {
    d,
    isDark: d,
    text:          d ? "#e5e7eb"                    : "#111827",
    textSec:       d ? "#9ca3af"                    : "#4b5563",
    textMuted:     d ? "#828fa3"                    : "#9ca3af",
    textOnAmber:   "#000000",
    bg:            d ? "transparent"                : "#f9fafb",
    bgGradient:    d
      ? "transparent"
      : "linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)",
    bgHover:       d ? "rgba(255,255,255,0.04)"    : "#f3f4f6",
    surface:       d ? "rgba(255,255,255,0.03)"    : "#f9fafb",
    surfaceHover:  d ? "rgba(255,255,255,0.06)"    : "#f3f4f6",
    border:        d ? "rgba(255,255,255,0.07)"    : "#e5e7eb",
    borderHover:   d ? "rgba(255,255,255,0.15)"    : "#d1d5db",
    borderFocus:   d ? "rgba(245,158,11,0.45)"     : "rgba(245,158,11,0.5)",
    borderLight:   d ? "rgba(255,255,255,0.05)"    : "#f3f4f6",
    inputBg:       d ? "rgba(0,0,0,0.35)"          : "#ffffff",
    cardBg:        d ? "rgba(255,255,255,0.025)"   : "#ffffff",
    cardBgAlt:     d ? "rgba(0,0,0,0.25)"          : "#f9fafb",
    stickyBg:      d ? "rgba(10,10,20,0.88)"       : "rgba(255,255,255,0.95)",
    amber:         "#f59e0b",
    amberDark:     "#d97706",
    amberBg:       d ? "rgba(245,158,11,0.07)"     : "#fffbeb",
    amberBorder:   d ? "rgba(245,158,11,0.18)"     : "rgba(245,158,11,0.3)",
    amberActive:   d ? "rgba(245,158,11,0.12)"     : "#fef3c7",
    rose:          "#f43f5e",
    roseBg:        d ? "rgba(244,63,94,0.07)"      : "#fff1f2",
    roseBorder:    d ? "rgba(244,63,94,0.18)"      : "rgba(244,63,94,0.25)",
    red:           "#ef4444",
    redBg:         d ? "rgba(239,68,68,0.1)"       : "#fef2f2",
    redBorder:     d ? "rgba(239,68,68,0.2)"       : "rgba(239,68,68,0.25)",
    purple:        "#8b5cf6",
    purpleBg:      d ? "rgba(139,92,246,0.06)"     : "#f5f3ff",
    purpleBorder:  d ? "rgba(139,92,246,0.14)"     : "rgba(139,92,246,0.2)",
    cyan:          "#06b6d4",
    cyanBg:        d ? "rgba(6,182,212,0.06)"      : "#ecfeff",
    cyanBorder:    d ? "rgba(6,182,212,0.14)"      : "rgba(6,182,212,0.2)",
    blue:          "#3b82f6",
    blueBg:        d ? "rgba(59,130,246,0.1)"      : "#eff6ff",
    blueBorder:    d ? "rgba(59,130,246,0.2)"      : "rgba(59,130,246,0.2)",
    green:         "#10b981",
    greenBg:       d ? "rgba(16,185,129,0.1)"      : "#ecfdf5",
    greenBorder:   d ? "rgba(16,185,129,0.2)"      : "rgba(16,185,129,0.25)",
    divider:       d ? "rgba(255,255,255,0.06)"    : "#e5e7eb",
    pill:          d ? "rgba(255,255,255,0.05)"    : "#f3f4f6",
    pillBorder:    d ? "rgba(255,255,255,0.1)"     : "#e5e7eb",
    glass:         d ? "rgba(255,255,255,0.03)"    : "rgba(255,255,255,0.8)",
    glassBorder:   d ? "rgba(255,255,255,0.06)"    : "#e5e7eb",
    shadow:        d
      ? "0 4px 24px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)"
      : "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    shadowLg:      d
      ? "0 16px 48px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)"
      : "0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)",
    shadowGlow:    "0 0 30px rgba(245,158,11,0.25)",
    orb1:          d ? "rgba(245,158,11,0.07)"     : "rgba(245,158,11,0.04)",
    orb2:          d ? "rgba(139,92,246,0.06)"     : "rgba(139,92,246,0.03)",
    orb3:          d ? "rgba(59,130,246,0.05)"     : "rgba(59,130,246,0.03)",
  };
};

export type ThemeColors = ReturnType<typeof mkColors>;

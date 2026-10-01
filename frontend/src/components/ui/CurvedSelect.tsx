"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search } from "lucide-react";

export interface CurvedSelectOption {
  value: string;
  label: string;
}

export interface CurvedSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | CurvedSelectOption)[] | readonly (string | CurvedSelectOption)[];
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  isDark?: boolean;
  accentColor?: string;
  dropUp?: boolean;
}

export function CurvedSelect({
  label,
  value,
  onChange,
  options,
  icon,
  placeholder = "Select an option...",
  className = "",
  isDark = true,
  accentColor = "#f59e0b",
  dropUp = false,
}: CurvedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to { value, label }
  const normalizedOptions: CurvedSelectOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "string" ? { value: opt, label: opt } : opt
    );
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, search]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation (Escape to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearch("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && normalizedOptions.length > 7) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, normalizedOptions.length]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  const bgTrigger = isDark ? "rgba(18, 16, 38, 0.85)" : "#ffffff";
  const bgMenu = isDark ? "#0d0b1e" : "#ffffff";
  const borderCol = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.1)";
  const textColor = isDark ? "#f3f4f6" : "#111827";
  const textMuted = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label
          className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 pl-0.5 mb-1.5"
          style={{ color: textMuted }}
        >
          {icon && <span style={{ color: accentColor }}>{icon}</span>}
          {label}
        </label>
      )}

      {/* Trigger Button with curved corners */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          backgroundColor: bgTrigger,
          borderColor: isOpen ? accentColor : borderCol,
          boxShadow: isOpen ? `0 0 0 2px ${accentColor}33` : "none",
        }}
        className="w-full text-xs font-semibold rounded-xl px-3.5 py-2.5 flex items-center justify-between border transition-all duration-150 cursor-pointer outline-none select-none text-left"
      >
        <span
          className="truncate pr-2"
          style={{ color: selectedOption ? textColor : textMuted }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: accentColor,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          className="shrink-0"
        />
      </button>

      {/* Curved Dropdown Menu Popup Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{
              backgroundColor: bgMenu,
              borderColor: `${accentColor}35`,
              borderRadius: "16px", // ── CURVED CORNERS ──
              boxShadow:
                "0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
              backdropFilter: "blur(18px)",
              top: dropUp ? "auto" : "calc(100% + 6px)",
              bottom: dropUp ? "calc(100% + 6px)" : "auto",
              zIndex: 1000,
            }}
            className="absolute left-0 right-0 p-1.5 border overflow-hidden"
          >
            {/* Search filter for long lists (e.g. companies, professions) */}
            {normalizedOptions.length > 7 && (
              <div className="p-1 mb-1 border-b" style={{ borderColor: borderCol }}>
                <div
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    borderColor: borderCol,
                  }}
                >
                  <Search size={12} style={{ color: textMuted }} className="shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-transparent outline-none text-xs"
                    style={{ color: textColor }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Scrollable list of curved options */}
            <div
              className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar"
              style={{
                borderRadius: "12px",
              }}
            >
              {filteredOptions.length === 0 ? (
                <div
                  className="px-3 py-3 text-center text-xs"
                  style={{ color: textMuted }}
                >
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      style={{
                        backgroundColor: isSelected
                          ? `${accentColor}20`
                          : "transparent",
                        color: isSelected ? accentColor : textColor,
                        borderRadius: "10px", // ── CURVED OPTION ITEM CORNERS ──
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors duration-100 hover:bg-amber-500/10 cursor-pointer outline-none font-medium"
                    >
                      <span className="truncate pr-2">{opt.label}</span>
                      {isSelected && (
                        <Check
                          size={13}
                          style={{ color: accentColor }}
                          className="shrink-0"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

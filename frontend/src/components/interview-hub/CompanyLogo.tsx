"use client";

import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";

const COMPANY_DOMAINS: Record<string, string> = {
  google: "google.com",
  microsoft: "microsoft.com",
  amazon: "amazon.com",
  meta: "meta.com",
  apple: "apple.com",
  netflix: "netflix.com",
  tcs: "tcs.com",
  infosys: "infosys.com",
  accenture: "accenture.com",
  wipro: "wipro.com",
  capgemini: "capgemini.com",
  deloitte: "deloitte.com",
  uber: "uber.com",
  tesla: "tesla.com",
  adobe: "adobe.com",
  nvidia: "nvidia.com",
  salesforce: "salesforce.com",
  ibm: "ibm.com",
  goldmansachs: "goldmansachs.com",
  morganstanley: "morganstanley.com",
  spotify: "spotify.com",
  stripe: "stripe.com",
  linkedin: "linkedin.com",
  oracle: "oracle.com",
  cisco: "cisco.com",
};

const BRAND_SVGS: Record<string, string> = {
  google: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg",
  microsoft: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
  amazon: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  meta: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
  apple: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apple/apple-original.svg",
  netflix: "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
  tcs: "https://www.google.com/s2/favicons?domain=tcs.com&sz=128",
  infosys: "https://www.google.com/s2/favicons?domain=infosys.com&sz=128",
  accenture: "https://www.google.com/s2/favicons?domain=accenture.com&sz=128",
  wipro: "https://www.google.com/s2/favicons?domain=wipro.com&sz=128",
  capgemini: "https://www.google.com/s2/favicons?domain=capgemini.com&sz=128",
  deloitte: "https://www.google.com/s2/favicons?domain=deloitte.com&sz=128",
};

interface CompanyLogoProps {
  companyId?: string;
  companyName: string;
  logo?: string;
  color?: string;
  size?: number;
  theme?: string;
  className?: string;
}

export default function CompanyLogo({
  companyId,
  companyName,
  logo,
  color = "#3b82f6",
  size = 48,
  theme: themeProp,
  className = "",
}: CompanyLogoProps) {
  const currentTheme = useTheme();
  const theme = themeProp || currentTheme;
  const isDark = theme === "dark";

  const [imgError, setImgError] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);

  const key = (companyId || companyName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const domain = COMPANY_DOMAINS[key] || `${key}.com`;

  // Image candidate fallback chain
  const sources = [
    BRAND_SVGS[key],
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://unavatar.io/${domain}?fallback=false`,
  ].filter(Boolean) as string[];

  const currentSrc = sources[srcIndex];

  const handleImageError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(prev => prev + 1);
    } else {
      setImgError(true);
    }
  };

  const containerBg = isDark
    ? "rgba(255, 255, 255, 0.96)"
    : "#ffffff";

  const containerBorder = isDark
    ? `1px solid ${color}60`
    : `1px solid rgba(0, 0, 0, 0.12)`;

  const containerShadow = isDark
    ? `0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px ${color}30`
    : `0 4px 14px rgba(0, 0, 0, 0.08)`;

  if (currentSrc && !imgError) {
    return (
      <div
        className={`rounded-2xl flex items-center justify-center p-2 transition-all shrink-0 hover:scale-105 ${className}`}
        style={{
          width: size,
          height: size,
          background: containerBg,
          border: containerBorder,
          boxShadow: containerShadow,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={`${companyName} logo`}
          width={size - 14}
          height={size - 14}
          className="max-w-full max-h-full object-contain filter drop-shadow-sm"
          onError={handleImageError}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl flex items-center justify-center font-black text-base shrink-0 transition-transform hover:scale-105 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        color: "#ffffff",
        border: `1px solid ${color}`,
        boxShadow: `0 4px 14px ${color}40`,
      }}
    >
      {logo || companyName.charAt(0).toUpperCase()}
    </div>
  );
}

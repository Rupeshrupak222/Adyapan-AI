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
  cognizant: "cognizant.com",
  ey: "ey.com",
  pwc: "pwc.com",
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
  google: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
  microsoft: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
  amazon: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  meta: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
  apple: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  netflix: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
  tcs: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Tata_Consultancy_Services_Logo.svg",
  infosys: "https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg",
  accenture: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Accenture.svg",
  wipro: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Wipro_Primary_Logo_Color_RGB.svg",
  capgemini: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Capgemini_201x_logo.svg",
  deloitte: "https://upload.wikimedia.org/wikipedia/commons/5/56/Deloitte.svg",
  cognizant: "https://upload.wikimedia.org/wikipedia/commons/4/43/Cognizant_logo_2022.svg",
  ey: "https://upload.wikimedia.org/wikipedia/commons/3/34/EY_logo_2019.svg",
  pwc: "https://upload.wikimedia.org/wikipedia/commons/f/fb/PwC_logo.svg",
  uber: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.svg",
  tesla: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png",
  adobe: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Adobe_Corporate_Logo.svg",
  nvidia: "https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg",
  salesforce: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
  ibm: "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg",
  goldmansachs: "https://upload.wikimedia.org/wikipedia/commons/6/61/Goldman_Sachs.svg",
  morganstanley: "https://upload.wikimedia.org/wikipedia/commons/3/34/Morgan_Stanley_Logo_1.svg",
  spotify: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
  stripe: "https://upload.wikimedia.org/wikipedia/commons/ba/ba/Stripe_Logo%2C_revised_2016.svg",
  linkedin: "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png",
  oracle: "https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg",
  cisco: "https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg",
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
    `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${key}.svg`,
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
          width={size - 12}
          height={size - 12}
          className="max-w-full max-h-full object-contain filter drop-shadow-sm"
          onError={handleImageError}
        />
      </div>
    );
  }

  // Specialized SVG render for TCS fallback
  if (key === "tcs") {
    return (
      <div
        className={`rounded-2xl flex items-center justify-center p-1 shrink-0 transition-transform hover:scale-105 ${className}`}
        style={{
          width: size,
          height: size,
          background: containerBg,
          border: containerBorder,
          boxShadow: containerShadow,
        }}
      >
        <svg viewBox="0 0 100 40" className="w-full h-full object-contain">
          <text x="50" y="26" textAnchor="middle" fill="#0066B3" fontSize="26" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-1">TCS</text>
        </svg>
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

"use client";

import { useState } from "react";

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
  className?: string;
}

export default function CompanyLogo({
  companyId,
  companyName,
  logo,
  color = "#3b82f6",
  size = 40,
  className = "",
}: CompanyLogoProps) {
  const [imgError, setImgError] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);

  const key = (companyId || companyName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const domain = COMPANY_DOMAINS[key] || `${key}.com`;

  // Image source candidate chain
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

  if (currentSrc && !imgError) {
    return (
      <div
        className={`rounded-xl flex items-center justify-center mb-2 overflow-hidden bg-white/5 border p-1.5 transition-transform shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          borderColor: `${color}30`,
          boxShadow: `0 4px 12px ${color}15`,
        }}
      >
        <img
          src={currentSrc}
          alt={`${companyName} logo`}
          width={size - 10}
          height={size - 10}
          className="w-full h-full object-contain"
          onError={handleImageError}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl flex items-center justify-center mb-2 text-sm font-extrabold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}25, ${color}10)`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {logo || companyName.charAt(0).toUpperCase()}
    </div>
  );
}

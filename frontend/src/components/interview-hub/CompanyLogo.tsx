"use client";

import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";

const COMPANY_DOMAINS: Record<string, string> = {
  // Global FAANG+ & Major Tech
  google: "google.com",
  microsoft: "microsoft.com",
  amazon: "amazon.com",
  aws: "amazon.com",
  meta: "meta.com",
  facebook: "meta.com",
  apple: "apple.com",
  netflix: "netflix.com",
  uber: "uber.com",
  tesla: "tesla.com",
  adobe: "adobe.com",
  nvidia: "nvidia.com",
  salesforce: "salesforce.com",
  ibm: "ibm.com",
  oracle: "oracle.com",
  cisco: "cisco.com",
  intel: "intel.com",
  amd: "amd.com",
  qualcomm: "qualcomm.com",
  samsung: "samsung.com",
  sony: "sony.com",
  spotify: "spotify.com",
  stripe: "stripe.com",
  linkedin: "linkedin.com",
  github: "github.com",
  gitlab: "gitlab.com",
  atlassian: "atlassian.com",
  slack: "slack.com",
  zoom: "zoom.us",
  dropbox: "dropbox.com",
  airbnb: "airbnb.com",
  doordash: "doordash.com",
  coinbase: "coinbase.com",
  robinhood: "robinhood.com",
  databricks: "databricks.com",
  snowflake: "snowflake.com",
  mongodb: "mongodb.com",
  redis: "redis.io",
  elastic: "elastic.co",
  twilio: "twilio.com",
  cloudflare: "cloudflare.com",
  fastly: "fastly.com",
  okta: "okta.com",
  datadog: "datadog.com",
  servicenow: "servicenow.com",
  workday: "workday.com",
  sap: "sap.com",
  siemens: "siemens.com",
  bosch: "bosch.com",

  // Global Finance & Consulting
  goldmansachs: "goldmansachs.com",
  morganstanley: "morganstanley.com",
  jpmorgan: "jpmorgan.com",
  jpmorganchase: "jpmorganchase.com",
  bankofamerica: "bankofamerica.com",
  citi: "citigroup.com",
  citigroup: "citigroup.com",
  hsbc: "hsbc.com",
  barclays: "barclays.com",
  ubs: "ubs.com",
  creditsuisse: "credit-suisse.com",
  deutschebank: "db.com",
  standardchartered: "sc.com",
  deloitte: "deloitte.com",
  ey: "ey.com",
  ernstyoung: "ey.com",
  pwc: "pwc.com",
  pricewaterhousecoopers: "pwc.com",
  kpmg: "kpmg.com",
  accenture: "accenture.com",
  capgemini: "capgemini.com",
  cognizant: "cognizant.com",

  // Indian Tech Giants & IT Services
  tcs: "tcs.com",
  tataconsultancy: "tcs.com",
  tataconsultancyservices: "tcs.com",
  infosys: "infosys.com",
  wipro: "wipro.com",
  hcl: "hcltech.com",
  hcltech: "hcltech.com",
  hcltechnologies: "hcltech.com",
  techmahindra: "techmahindra.com",
  ltimindtree: "ltimindtree.com",
  mindtree: "mindtree.com",
  mphasis: "mphasis.com",
  persistent: "persistent.com",
  coforge: "coforge.com",
  ltts: "ltts.com",
  hexaware: "hexaware.com",
  zs: "zs.com",
  zssociates: "zs.com",

  // Indian Unicorns, E-Commerce & Startups
  flipkart: "flipkart.com",
  myntra: "myntra.com",
  swiggy: "swiggy.com",
  zomato: "zomato.com",
  zepto: "zepto.gr",
  blinkit: "blinkit.com",
  bigbasket: "bigbasket.com",
  paytm: "paytm.com",
  phonepe: "phonepe.com",
  razorpay: "razorpay.com",
  cred: "cred.club",
  bharatpe: "bharatpe.com",
  pinelabs: "pinelabs.com",
  zerodha: "zerodha.com",
  groww: "groww.in",
  upstox: "upstox.com",
  meesho: "meesho.com",
  ola: "olacabs.com",
  olacabs: "olacabs.com",
  rapido: "rapido.bike",
  urbancompany: "urbancompany.com",
  makemytrip: "makemytrip.com",
  oyorooms: "oyorooms.com",
  oyo: "oyorooms.com",
  nykaa: "nykaa.com",
  lenskart: "lenskart.com",
  firstcry: "firstcry.com",
  boat: "boat-lifestyle.com",
  unacademy: "unacademy.com",
  byjus: "byjus.com",
  pw: "pw.live",
  physicswallah: "pw.live",
  upgrad: "upgrad.com",
  scaler: "scaler.com",
  codingninjas: "codingninjas.com",
  geeksforgeeks: "geeksforgeeks.org",
  leetcode: "leetcode.com",
  hackerrank: "hackerrank.com",
  postman: "postman.com",
  zoho: "zoho.com",
  freshworks: "freshworks.com",
  browserstack: "browserstack.com",
  chargebee: "chargebee.com",
  darwinbox: "darwinbox.com",
  gupshup: "gupshup.io",
  inmobi: "inmobi.com",
  hasura: "hasura.io",

  // Additional commonly scraped companies
  swiggyinstamart: "swiggy.com",
  dunzo: "dunzo.com",
  delhivery: "delhivery.com",
  shiprocket: "shiprocket.in",
  shadowfax: "shadowfax.in",
  ecom: "ecomexpress.in",
  bluedart: "bluedart.com",
  dtdc: "dtdc.com",
  jio: "jio.com",
  reliance: "relianceindustries.com",
  reliancejio: "jio.com",
  relianceretail: "relianceretail.com",
  tatadigital: "tata.com",
  tata: "tata.com",
  mahindra: "mahindra.com",
  bajaj: "bajaj.com",
  bajajfinserv: "bajajfinserv.in",
  hdfc: "hdfc.com",
  hdfcbank: "hdfcbank.com",
  icicibank: "icicibank.com",
  axisbank: "axisbank.com",
  sbi: "sbi.co.in",
  kotak: "kotak.com",
  kotakbank: "kotak.com",
  indusindbank: "indusind.com",
  yesbank: "yesbank.in",
  navi: "navi.com",
  jupiter: "jupiter.money",
  slice: "sliceit.com",
  niyo: "niyo.co",
  fi: "fi.money",
  mswipe: "mswipe.com",
  cashfree: "cashfree.com",
  payu: "payu.in",
  juspay: "juspay.in",
  setu: "setu.co",
  openfinancial: "open.money",
  smallcase: "smallcase.com",
  kuvera: "kuvera.in",
  angelbroking: "angelbroking.com",
  angelone: "angelone.in",
  sharekhan: "sharekhan.com",
  fivepaisa: "5paisa.com",
  icici: "icicibank.com",
  icicisecurities: "icicisecurities.com",
  motilaloswal: "motilaloswal.com",
  zebpay: "zebpay.com",
  wazirx: "wazirx.com",
  coindcx: "coindcx.com",
  bybit: "bybit.com",
  binance: "binance.com",
  shopify: "shopify.com",
  razorpayx: "razorpay.com",
  freshdesk: "freshdesk.com",
  zendesk: "zendesk.com",
  intercom: "intercom.com",
  hubspot: "hubspot.com",
  notion: "notion.so",
  figma: "figma.com",
  canva: "canva.com",
  miro: "miro.com",
  airtable: "airtable.com",
  asana: "asana.com",
  jira: "atlassian.com",
  confluence: "atlassian.com",
  trello: "trello.com",
  clickup: "clickup.com",
  linear: "linear.app",
  vercel: "vercel.com",
  netlify: "netlify.com",
  heroku: "heroku.com",
  digitalocean: "digitalocean.com",
  linode: "linode.com",
  vultr: "vultr.com",
  hetzner: "hetzner.com",
  docker: "docker.com",
  kubernetes: "kubernetes.io",
  terraform: "hashicorp.com",
  hashicorp: "hashicorp.com",
  ansible: "ansible.com",
  redhat: "redhat.com",
  vmware: "vmware.com",
  paloalto: "paloaltonetworks.com",
  crowdstrike: "crowdstrike.com",
  sentinelone: "sentinelone.com",
  splunk: "splunk.com",
  dynatrace: "dynatrace.com",
  newrelic: "newrelic.com",
  grafana: "grafana.com",
  supabase: "supabase.com",
  planetscale: "planetscale.com",
  neon: "neon.tech",
  cockroachdb: "cockroachlabs.com",
  tidb: "pingcap.com",
  confluent: "confluent.io",
  dbt: "getdbt.com",
  airbyte: "airbyte.com",
  fivetran: "fivetran.com",
  talend: "talend.com",
  informatica: "informatica.com",
  mulesoft: "mulesoft.com",
  boomi: "boomi.com",
  apigee: "cloud.google.com",
  kong: "konghq.com",
  openai: "openai.com",
  anthropic: "anthropic.com",
  cohere: "cohere.com",
  huggingface: "huggingface.co",
  mistral: "mistral.ai",
  perplexity: "perplexity.ai",
  replicate: "replicate.com",
  stability: "stability.ai",
  midjourney: "midjourney.com",
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
  jpmorgan: "https://upload.wikimedia.org/wikipedia/commons/0/07/JPMorgan_Chase_Logo_2008.svg",
  spotify: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
  stripe: "https://upload.wikimedia.org/wikipedia/commons/ba/ba/Stripe_Logo%2C_revised_2016.svg",
  linkedin: "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png",
  oracle: "https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg",
  cisco: "https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg",
  flipkart: "https://upload.wikimedia.org/wikipedia/commons/7/7a/Flipkart_logo.svg",
  swiggy: "https://upload.wikimedia.org/wikipedia/en/1/12/Swiggy_logo.svg",
  zomato: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Zomato_Logo.svg",
  paytm: "https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo.svg",
  razorpay: "https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg",
  zoho: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Zoho_logo.svg",
  freshworks: "https://upload.wikimedia.org/wikipedia/commons/0/07/Freshworks_Logo.svg",
  atlassian: "https://upload.wikimedia.org/wikipedia/commons/0/00/Atlassian-logo-blue-medium.svg",
  github: "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg",
  gitlab: "https://upload.wikimedia.org/wikipedia/commons/e/e1/GitLab_logo.svg",
  shopify: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg",
  figma: "https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg",
  slack: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Slack_Technologies_Logo.svg",
  docker: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Docker_%28container_engine%29_logo.svg",
  mongodb: "https://upload.wikimedia.org/wikipedia/commons/9/93/MongoDB_Logo.svg",
  postgresql: "https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg",
  redis: "https://upload.wikimedia.org/wikipedia/en/6/6b/Redis_Logo.svg",
  zoom: "https://upload.wikimedia.org/wikipedia/commons/1/11/Zoom_Logo_2022.svg",
  samsung: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
  intel: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg",
  airbnb: "https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_Bélo.svg",
  dropbox: "https://upload.wikimedia.org/wikipedia/commons/7/74/Dropbox_Icon.svg",
  coinbase: "https://upload.wikimedia.org/wikipedia/commons/1/1a/24x7ndef.svg",
};

interface CompanyLogoProps {
  companyId?: string;
  companyName?: string;
  company?: string;   // alias for companyName
  logo?: string;
  logoUrl?: string;  // alias for logo
  color?: string;
  size?: number;
  theme?: string;
  className?: string;
}

export function resolveCompanyInfo(rawName?: string, rawId?: string): { key: string; domain: string } {
  const name = (rawName || "").trim();
  const idStr = (rawId || "").replace(/^c-/, "").trim();

  // 1. Direct ID match
  const idKey = idStr.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (COMPANY_DOMAINS[idKey]) {
    return { key: idKey, domain: COMPANY_DOMAINS[idKey] };
  }

  // 2. Direct name match
  const nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (COMPANY_DOMAINS[nameKey]) {
    return { key: nameKey, domain: COMPANY_DOMAINS[nameKey] };
  }

  // 3. Remove legal entity fluff
  const stripped = name
    .replace(/\b(pvt|private|ltd|limited|inc|incorporated|llc|corp|corporation|technologies|solutions|services|software|india|group|holdings|systems|labs|networks|co|company|enterprises|global)\b/gi, "")
    .trim();
  
  const strippedKey = stripped.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (COMPANY_DOMAINS[strippedKey]) {
    return { key: strippedKey, domain: COMPANY_DOMAINS[strippedKey] };
  }

  // 4. Partial dictionary lookup
  for (const k of Object.keys(COMPANY_DOMAINS)) {
    if (strippedKey && (strippedKey.startsWith(k) || k.startsWith(strippedKey))) {
      return { key: k, domain: COMPANY_DOMAINS[k] };
    }
  }

  const fallbackDomain = strippedKey ? `${strippedKey}.com` : (nameKey ? `${nameKey}.com` : "");
  return { key: strippedKey || nameKey || idKey, domain: fallbackDomain };
}

export default function CompanyLogo({
  companyId,
  companyName,
  company,
  logo,
  logoUrl,
  color = "#3b82f6",
  size = 44,
  theme: themeProp,
  className = "",
}: CompanyLogoProps) {
  const currentTheme = useTheme();
  const theme = themeProp || currentTheme;
  const isDark = theme === "dark";

  const name = companyName || company || "Company";
  const explicitLogo = logoUrl || logo;

  const [imgError, setImgError] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);

  const { key, domain } = resolveCompanyInfo(name, companyId);

  // Candidate sources in order of preference
  const sources: string[] = [];

  // 1. High-res Brand SVG (Wikimedia / official) — most reliable, no network dependency issues
  if (BRAND_SVGS[key]) {
    sources.push(BRAND_SVGS[key]);
  }

  // 2. Explicit passed logo URL (if provided and valid) — after brand SVG since many scraped URLs are broken
  if (explicitLogo && explicitLogo.startsWith("http")) {
    sources.push(explicitLogo);
  }

  // 3. Clearbit Logo API (free, no auth, high quality PNG, very reliable)
  if (domain) {
    sources.push(`https://logo.clearbit.com/${domain}`);
  }

  // 4. Logo.dev API
  if (domain) {
    sources.push(`https://img.logo.dev/${domain}?token=pk_X6D7oqEASZ6tAIOG41dEoQ&size=128`);
  }

  // 5. Simple Icons SVG Repository
  if (key) {
    sources.push(`https://cdn.simpleicons.org/${key}`);
  }

  // 6. Unavatar API (multiple social sources aggregated)
  if (domain) {
    sources.push(`https://unavatar.io/${domain}?fallback=false`);
  }

  // 7. DuckDuckGo favicon API
  if (domain) {
    sources.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
  }

  // 8. Google Favicons API (most reliable fallback)
  if (domain) {
    sources.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }

  const currentSrc = sources[srcIndex];

  const handleImageError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(prev => prev + 1);
    } else {
      setImgError(true);
    }
  };

  const containerBg = isDark ? "rgba(255, 255, 255, 0.96)" : "#ffffff";
  const containerBorder = isDark ? `1px solid ${color}50` : `1px solid rgba(0, 0, 0, 0.1)`;
  const containerShadow = isDark ? `0 4px 16px rgba(0, 0, 0, 0.35)` : `0 2px 10px rgba(0, 0, 0, 0.06)`;

  if (currentSrc && !imgError) {
    return (
      <div
        className={`rounded-xl flex items-center justify-center p-1.5 transition-all shrink-0 hover:scale-105 ${className}`}
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
          alt={`${name} logo`}
          width={size - 10}
          height={size - 10}
          className="max-w-full max-h-full object-contain filter drop-shadow-sm"
          onError={handleImageError}
        />
      </div>
    );
  }

  // TCS special SVG fallback
  if (key === "tcs") {
    return (
      <div
        className={`rounded-xl flex items-center justify-center p-1 shrink-0 transition-transform hover:scale-105 ${className}`}
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

  // Elegant letter badge fallback using company name initials
  const cleanName = name.trim();
  const initials = cleanName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join("") || cleanName.substring(0, 2).toUpperCase() || "C";

  const colorPalette = getCompanyColor(cleanName);
  const fontSize = Math.max(10, Math.floor(size * 0.38));

  return (
    <div
      className={`rounded-xl flex items-center justify-center font-black shrink-0 transition-transform hover:scale-105 select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: colorPalette.bg,
        color: colorPalette.text,
        border: `1px solid ${colorPalette.border}`,
        boxShadow: `0 4px 14px ${colorPalette.border}`,
        fontSize,
      }}
      title={cleanName}
    >
      {initials}
    </div>
  );
}

const COLOR_GRADIENTS = [
  { bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", border: "rgba(245,158,11,0.4)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", border: "rgba(59,130,246,0.4)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #10b981 0%, #047857 100%)", border: "rgba(16,185,129,0.4)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", border: "rgba(139,92,246,0.4)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", border: "rgba(236,72,153,0.4)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)", border: "rgba(6,182,212,0.4)", text: "#ffffff" },
];

function getCompanyColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % COLOR_GRADIENTS.length;
  return COLOR_GRADIENTS[idx];
}

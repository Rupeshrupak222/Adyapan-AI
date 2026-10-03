"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";

const COMPANY_DOMAINS: Record<string, string> = {
  // Global FAANG+ & Major Tech
  google: "google.com",
  microsoft: "microsoft.com",
  amazon: "amazon.com",
  aws: "amazon.com",
  meta: "meta.com",
  facebook: "facebook.com",
  apple: "apple.com",
  bytedance: "bytedance.com",
  citadel: "citadel.com",
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

  bloomberg: "bloomberg.com",
  paypal: "paypal.com",
  walmart: "walmart.com",

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

  // Global Quant & Trading Firms
  janestreet: "janestreet.com",
  twosigma: "twosigma.com",
  deshaw: "deshaw.com",
  jumptrading: "jumptrading.com",
  hrt: "hudsonrivertrading.com",
  hudsonrivertrading: "hudsonrivertrading.com",
  optiver: "optiver.com",
  flowtraders: "flowtraders.com",
  drw: "drw.com",
  imc: "imc.com",
  sig: "sig.com",
  susquehanna: "susquehanna.com",
  towerresearch: "tower-research.com",
  akunacapital: "akunacapital.com",

  // Global Consumer Tech, Media & Gaming
  palantir: "palantir.com",
  duolingo: "duolingo.com",
  discord: "discord.com",
  reddit: "reddit.com",
  pinterest: "pinterest.com",
  snap: "snap.com",
  snapchat: "snapchat.com",
  roblox: "roblox.com",
  epicgames: "epicgames.com",
  unity: "unity.com",
  ea: "ea.com",
  electronicarts: "ea.com",
  americanexpress: "americanexpress.com",
  amex: "americanexpress.com",

  // Indian Enterprises & High-Growth Startups
  tatasteel: "tatasteel.com",
  tatamotors: "tatamotors.com",
  tatapower: "tatapower.com",
  noise: "gonoise.com",
  mamaearth: "mamaearth.in",
};

const COMPANY_INLINE_SVGS: Record<string, () => React.ReactNode> = {
  google: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.37 7.34 24 12 24z" />
      <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.02-3.13z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.63 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
    </svg>
  ),
  microsoft: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="#F25022" d="M1.5 1.5h9.5v9.5H1.5z"/>
      <path fill="#7FBA00" d="M13 1.5h9.5v9.5H13z"/>
      <path fill="#00A4EF" d="M1.5 13h9.5v9.5H1.5z"/>
      <path fill="#FFB900" d="M13 13h9.5v9.5H13z"/>
    </svg>
  ),
  amazon: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="#131921" d="M13.62 13.94c-1.78 0-3.32-.47-4.63-1.42l1.04-1.78c1.08.79 2.34 1.18 3.77 1.18 1.48 0 2.22-.52 2.22-1.55 0-.54-.26-.95-.78-1.23-.52-.28-1.4-.53-2.64-.75-1.57-.28-2.73-.78-3.48-1.5-.75-.72-1.12-1.67-1.12-2.85 0-1.4.54-2.51 1.62-3.33C10.68.91 12.16.5 14.04.5c1.47 0 2.8.35 3.99 1.05l-.99 1.79c-1-.59-2.07-.88-3.21-.88-1.32 0-1.98.5-1.98 1.5 0 .49.25.87.75 1.14.5.27 1.34.5 2.52.7 1.62.27 2.82.76 3.6 1.47.78.71 1.17 1.68 1.17 2.91 0 1.42-.56 2.55-1.68 3.39-1.12.84-2.65 1.26-4.59 1.26z"/>
      <path fill="#FF9900" d="M21.93 18.06c-3.13 2.3-7.38 3.52-12.01 3.52-6.19 0-11.75-2.22-15.92-5.94-.33-.29-.04-.69.36-.46 4.54 2.63 10.02 4.22 15.65 4.22 4.14 0 8.24-.95 11.51-2.87.62-.36 1.15.54.41 1.53z"/>
      <path fill="#FF9900" d="M22.95 16.53c-.39-.5-2.59-.36-3.86-.21-.38.05-.44-.28-.1-.52 2.2-1.57 5.81-1.12 6.16-.68.35.45-.09 4.13-2.18 5.83-.32.26-.63.12-.49-.22.47-1.14 1.5-3.35.47-4.2z"/>
    </svg>
  ),
  aws: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="#232F3E" d="M6.5 8h2l1 4 1-4h2l-2 6.5H8.5L6.5 8z"/>
      <path fill="#FF9900" d="M20 18c-2.5 1.8-6 2.8-10 2.8-5 0-9.5-1.8-13-4.8-.3-.2 0-.6.3-.4 3.7 2.1 8.2 3.4 12.7 3.4 3.3 0 6.6-.8 9.3-2.3.5-.3.9.4.7 1.3z"/>
    </svg>
  ),
  apple: () => (
    <svg viewBox="0 0 170 170" className="w-full h-full" fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.97-14.42-6.1-9.37-10.89-20.19-14.35-32.48-3.46-12.28-5.19-23.75-5.19-34.41 0-14.13 3.58-25.79 10.74-34.98 7.15-9.19 16.29-13.88 27.42-14.08 4.35 0 9.35 1.25 15 3.75 5.66 2.5 9.4 3.79 11.23 3.87 1.83 0 5.75-1.34 11.75-4.04 6-2.7 10.97-3.95 14.92-3.75 14.12.76 25.13 6.13 33.02 16.12-12.4 7.5-18.49 17.65-18.27 30.45.22 10.33 4.24 19.04 12.07 26.13 7.83 7.08 17.07 11.13 27.72 12.16-2.39 7.4-5.22 14.58-8.49 21.56zm-36.63-108.62c0-4.57 1.2-9.35 3.6-14.35 2.4-5 5.86-9.13 10.37-12.4 4.51-3.26 9.4-5.08 14.68-5.46.22 1.3.33 2.5.33 3.6 0 4.79-1.25 9.68-3.75 14.68-2.5 5-5.98 9.13-10.45 12.4-4.46 3.26-9.4 5.12-14.78 5.53z" />
    </svg>
  ),
  facebook: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#FFFFFF" d="M14.5 12h-2v7h-3v-7h-1.5v-2.5h1.5V7.8c0-2.1 1.2-3.3 3.2-3.3.9 0 1.9.1 1.9.1v2.1h-1.1c-1 0-1.3.6-1.3 1.3v1.5h2.4l-.4 2.5z"/>
    </svg>
  ),
  meta: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="#0668E1" d="M16.98 4c-1.8 0-3.4.8-4.5 2-1.1-1.2-2.7-2-4.5-2C4.3 4 1.5 6.8 1.5 10.3c0 4.1 3.8 7.8 9.3 11.1.7.4 1.7.4 2.4 0 5.5-3.3 9.3-7 9.3-11.1C22.5 6.8 19.7 4 16.98 4zm-4.98 12.8c-3.8-2.5-6.5-5.2-6.5-8 0-1.8 1.4-3.3 3.3-3.3 1.3 0 2.5.7 3.2 1.8.3.4.9.4 1.2 0 .7-1.1 1.9-1.8 3.2-1.8 1.9 0 3.3 1.5 3.3 3.3 0 2.8-2.7 5.5-6.5 8z" />
    </svg>
  ),
  bloomberg: () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" rx="20" fill="#000000" />
      <text x="46" y="70" textAnchor="middle" fill="#FFFFFF" fontSize="62" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-1">B</text>
      <circle cx="78" cy="34" r="8" fill="#FF1744" />
    </svg>
  ),
  adobe: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FA0F00" />
      <polygon points="14.8,4 19.5,4 19.5,20" fill="#FFFFFF" />
      <polygon points="9.2,4 4.5,4 4.5,20" fill="#FFFFFF" />
      <polygon points="12,11.2 15.6,20 13.2,20 12,16.8 9.8,16.8" fill="#FFFFFF" />
    </svg>
  ),
  accenture: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#111111" />
      <path fill="#A100FF" d="M4 17.5l8.5-5.5L4 6.5h3.8l8.5 5.5-8.5 5.5H4z"/>
      <circle cx="17.5" cy="7.5" r="1.5" fill="#A100FF" />
    </svg>
  ),
  linkedin: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path fill="#FFFFFF" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  ),
  netflix: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <path fill="#E50914" d="M6 3h3.5v18H6z" />
      <path fill="#E50914" d="M14.5 3H18v18h-3.5z" />
      <path fill="#B81D24" d="M6 3l12 18h-3.5L6 6z" />
    </svg>
  ),
  uber: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000"/>
      <text x="12" y="15.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.8">UBER</text>
    </svg>
  ),
  oracle: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#EA1B25" />
      <path fill="#FFFFFF" d="M7 8h10c2.2 0 4 1.8 4 4s-1.8 4-4 4H7c-2.2 0-4-1.8-4-4s1.8-4 4-4zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2h10c1.1 0 2-.9 2-2s-.9-2-2-2H7z"/>
    </svg>
  ),
  nvidia: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <path fill="#76B900" d="M10.87 18.4c-3.15-.36-5.59-2.92-5.59-6.04s2.44-5.68 5.59-6.04V4.28C6.67 4.67 3.32 8.08 3.32 12.36s3.35 7.69 7.55 8.08v-2.04zm2.26-12.08c1.88.29 3.33 1.9 3.33 3.86 0 1.96-1.45 3.57-3.33 3.86V6.32zm0-4.04v2.04c3.15.36 5.59 2.92 5.59 6.04s-2.44 5.68-5.59 6.04v2.04c4.2-.39 7.55-3.8 7.55-8.08s-3.35-7.69-7.55-8.08z"/>
    </svg>
  ),
  paypal: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#003087" />
      <path fill="#0079C1" d="M8 5h5.5c2.5 0 4 1.3 3.7 3.5-.4 2.5-2.2 4-4.7 4H10l-1 6H6.5L8 5z"/>
      <path fill="#00457C" d="M10.5 8h4.5c2 0 3.2 1 3 2.8-.3 2-1.8 3.2-3.8 3.2H12l-1 5H8.5l2-11z" opacity="0.7"/>
    </svg>
  ),
  walmart: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0071CE" />
      <g fill="#FFC220" transform="translate(12, 12)">
        <rect x="-1" y="-8.5" width="2" height="5" rx="1"/>
        <rect x="-1" y="3.5" width="2" height="5" rx="1"/>
        <rect x="-1" y="-8.5" width="2" height="5" rx="1" transform="rotate(60)"/>
        <rect x="-1" y="3.5" width="2" height="5" rx="1" transform="rotate(60)"/>
        <rect x="-1" y="-8.5" width="2" height="5" rx="1" transform="rotate(120)"/>
        <rect x="-1" y="3.5" width="2" height="5" rx="1" transform="rotate(120)"/>
      </g>
    </svg>
  ),
  spotify: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <circle cx="12" cy="12" r="11" fill="#1ED760" />
      <path fill="#000000" d="M16.5 16.2c-.2 0-.4-.1-.5-.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 4.1-1 7.6-.5 10.4 1.2.3.2.4.7.2 1.1-.1.2-.2.3-.4.3zm1.2-2.7c-.2 0-.4-.1-.6-.2-3-1.8-7.5-2.4-11-1.3-.5.1-1-.1-1.2-.6-.1-.5.1-1 .6-1.2 4.1-1.2 9.1-.6 12.6 1.5.4.3.6.8.3 1.3-.2.3-.4.5-.7.5zm.1-2.9c-.3 0-.5-.1-.7-.2-3.5-2.1-9.3-2.3-12.7-1.3-.6.2-1.2-.2-1.4-.8-.2-.6.2-1.2.8-1.4 4-1.2 10.4-1 14.4 1.4.5.3.7 1 .4 1.5-.2.5-.5.8-.8.8z"/>
    </svg>
  ),
  salesforce: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#00A1E0" />
      <path fill="#FFFFFF" d="M10.2 6.5c1.2-1 2.8-1.5 4.5-1.3 2.2.3 4 2 4.4 4.2.7.3 1.3.9 1.8 1.6 1 1.4 1 3.2.3 4.7-.8 1.5-2.3 2.4-4 2.4H6.5c-2.1 0-3.8-1.6-4.1-3.6-.3-2.2 1-4.2 3.1-4.8.4-1.6 1.5-2.8 3-3.3.6-.3 1.3-.3 1.7-.1z"/>
    </svg>
  ),
  twitter: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <path fill="#FFFFFF" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <path fill="#FFFFFF" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  airbnb: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FF5A5F" />
      <path fill="#FFFFFF" d="M12 4.5c-1.3 0-2.3 1-2.3 2.4 0 1.9 1.6 4.3 2.3 5.4.7-1.1 2.3-3.5 2.3-5.4 0-1.4-1-2.4-2.3-2.4zm0 15c-3.1 0-5.5-2.2-5.5-5.3 0-3.3 3.6-7.8 5.5-9.7 1.9 1.9 5.5 6.4 5.5 9.7 0 3.1-2.4 5.3-5.5 5.3zm0-8.5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5z"/>
    </svg>
  ),
  tcs: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FFFFFF" />
      <text x="12" y="16" textAnchor="middle" fill="#0066B3" fontSize="8" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="-0.5">TCS</text>
    </svg>
  ),
  capgemini: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0070AD" />
      <path fill="#FFFFFF" d="M12 4c-3.5 0-6 2.5-6 6 0 2.5 1.5 4.5 3.5 5.5L8 19h8l-1.5-3.5c2-1 3.5-3 3.5-5.5 0-3.5-2.5-6-6-6zm0 2c2.2 0 4 1.8 4 4 0 1.5-.8 2.8-2 3.5L12 11l-2 2.5c-1.2-.7-2-2-2-3.5 0-2.2 1.8-4 4-4z"/>
    </svg>
  ),
  doordash: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FF3008" />
      <path fill="#FFFFFF" d="M19.7 10.3c-.6-2.2-2.6-3.8-5-3.8H4.3c-.4 0-.7.3-.7.7s.3.7.7.7h10.4c1.8 0 3.3 1.2 3.8 2.9.5 1.7-.3 3.5-1.9 4.3L8 19.5c-.3.2-.5.5-.4.8.1.4.4.6.8.6h1.2c.3 0 .6-.1.8-.3l8.8-4.6c1.7-1 2.5-3.1 2-5l-.5-.7z"/>
    </svg>
  ),
  goldmansachs: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#7399C6" />
      <text x="12" y="11" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="900" fontFamily="system-ui, sans-serif">Goldman</text>
      <text x="12" y="18" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="900" fontFamily="system-ui, sans-serif">Sachs</text>
    </svg>
  ),
  cisco: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#049FD9" />
      <g fill="#FFFFFF" transform="translate(3, 7)">
        <rect x="1" y="5" width="1.5" height="5" rx="0.75"/>
        <rect x="4" y="2" width="1.5" height="8" rx="0.75"/>
        <rect x="7" y="0" width="1.5" height="10" rx="0.75"/>
        <rect x="10" y="2" width="1.5" height="8" rx="0.75"/>
        <rect x="13" y="0" width="1.5" height="10" rx="0.75"/>
        <rect x="16" y="5" width="1.5" height="5" rx="0.75"/>
      </g>
    </svg>
  ),
  citadel: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#002D62" />
      <g fill="#FFFFFF" transform="translate(5, 5)">
        <rect x="0" y="8" width="3.5" height="6" rx="0.5"/>
        <rect x="5" y="4" width="3.5" height="10" rx="0.5"/>
        <rect x="10" y="0" width="3.5" height="14" rx="0.5"/>
      </g>
    </svg>
  ),
  bytedance: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <g transform="translate(4, 5)">
        <rect x="0" y="2" width="3.5" height="10" rx="1.5" fill="#3A5BFF"/>
        <rect x="4.2" y="0" width="3.5" height="14" rx="1.5" fill="#00D2D3"/>
        <rect x="8.4" y="3" width="3.5" height="9" rx="1.5" fill="#00E5FF"/>
        <rect x="12.6" y="5" width="3.5" height="6" rx="1.5" fill="#5F27CD"/>
      </g>
    </svg>
  ),
  paloalto: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FA582D" />
      <text x="12" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="900" fontFamily="system-ui, sans-serif">paloalto</text>
    </svg>
  ),
  paloaltonetworks: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FA582D" />
      <text x="12" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="900" fontFamily="system-ui, sans-serif">paloalto</text>
    </svg>
  ),
  infosys: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#007CC3" />
      <text x="12" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="system-ui, sans-serif">Infosys</text>
    </svg>
  ),
  wipro: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FFFFFF" />
      <circle cx="9" cy="9" r="2.5" fill="#D32F2F" />
      <circle cx="15" cy="9" r="2.5" fill="#1976D2" />
      <circle cx="9" cy="15" r="2.5" fill="#388E3C" />
      <circle cx="15" cy="15" r="2.5" fill="#FBC02D" />
    </svg>
  ),
  flipkart: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#2874F0" />
      <text x="12" y="16" textAnchor="middle" fill="#FFE500" fontSize="13" fontStyle="italic" fontWeight="900" fontFamily="Georgia, serif">f</text>
    </svg>
  ),
  swiggy: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FC8019" />
      <path fill="#FFFFFF" d="M12 4.5c-2.8 0-5 2.2-5 5 0 3.8 5 9.5 5 9.5s5-5.7 5-9.5c0-2.8-2.2-5-5-5zm0 6.8c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8 1.8.8 1.8 1.8-.8 1.8-1.8 1.8z"/>
    </svg>
  ),
  zomato: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#E23744" />
      <text x="12" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontStyle="italic" fontWeight="900" fontFamily="system-ui, sans-serif">zomato</text>
    </svg>
  ),
  paytm: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#002970" />
      <text x="12" y="15" textAnchor="middle" fill="#00BAF2" fontSize="7" fontWeight="900" fontFamily="system-ui, sans-serif">paytm</text>
    </svg>
  ),
  razorpay: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0C2340" />
      <path fill="#02A7E8" d="M12 3L6 14h5l-2 7 9-11h-5l4-7z"/>
    </svg>
  ),
  github: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#24292E" />
      <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M12 3.5C7.3 3.5 3.5 7.3 3.5 12c0 3.7 2.4 6.9 5.8 8 .4.1.6-.2.6-.4v-1.5c-2.3.5-2.8-1.1-2.8-1.1-.4-1-.9-1.3-.9-1.3-.8-.5.1-.5.1-.5.9.1 1.3.9 1.3.9.8 1.3 2 .9 2.5.7.1-.6.3-.9.5-1.1-1.9-.2-3.8-.9-3.8-4.2 0-.9.3-1.7.9-2.3-.1-.2-.4-1.1.1-2.3 0 0 .7-.2 2.3.9.7-.2 1.4-.3 2.1-.3.7 0 1.4.1 2.1.3 1.6-1.1 2.3-.9 2.3-.9.5 1.2.2 2.1.1 2.3.6.6.9 1.4.9 2.3 0 3.3-2 4-3.9 4.2.3.3.6.8.6 1.6v2.3c0 .2.2.5.6.4 3.4-1.1 5.8-4.3 5.8-8 0-4.7-3.8-8.5-8.5-8.5z"/>
    </svg>
  ),
  gitlab: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FC6D26" />
      <path fill="#E24329" d="M12 18.5L7.5 5h9L12 18.5z"/>
      <path fill="#FCA326" d="M12 18.5L7.5 5H3l9 13.5z"/>
      <path fill="#FCA326" d="M12 18.5L16.5 5H21l-9 13.5z"/>
    </svg>
  ),
  atlassian: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0052CC" />
      <path fill="#FFFFFF" d="M11.6 3.2C11.4 3.1 11.2 3 11 3s-.4.1-.6.2L3.2 13.8c-.3.4-.3.9-.1 1.3.2.4.6.7 1.1.7h6.6c.7 0 1.2-.5 1.2-1.2V3.2z" opacity="0.7"/>
      <path fill="#FFFFFF" d="M12.4 20.8c.2.1.4.2.6.2s.4-.1.6-.2l7.2-10.6c.3-.4.3-.9.1-1.3-.2-.4-.6-.7-1.1-.7h-6.6c-.7 0-1.2.5-1.2 1.2v11.4z"/>
    </svg>
  ),
  stripe: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#635BFF" />
      <path fill="#FFFFFF" d="M13.5 10.2c0-.7-.6-1.1-1.6-1.1-1.5 0-2.8.5-3.8 1.1l-.8-2c1.2-.7 2.9-1.2 4.7-1.2 3 0 5 1.6 5 4.3 0 4.2-5.7 3.5-5.7 5.3 0 .8.7 1.2 1.8 1.2 1.7 0 3.2-.6 4.3-1.3l.8 2c-1.3.9-3.2 1.4-5.2 1.4-3.2 0-5.3-1.6-5.3-4.3-.1-4.3 5.8-3.7 5.8-5.4z"/>
    </svg>
  ),
  docker: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#2496ED" />
      <path fill="#FFFFFF" d="M20.5 11.5c-.3-.2-1.2-.3-1.8 0-.2-.6-.7-1.1-1.4-1.3-.4-.2-1-.2-1.5 0-.4-1.2-1.6-2.1-3-2.2v-.5h-1.5v.5h-1.5v-1.5H8.3v1.5H6.8v-1.5H5.3v1.5H3.8v.5c-1.4.1-2.5 1-2.9 2.2-.6 0-1.1.2-1.5.5-.3.2-.4.6-.4.9 0 3.2 2.6 5.9 5.8 5.9 3.5 0 6.5-1.8 8.1-4.7 1.8 0 3.8-1 4.5-2.2.3-.5.1-1.1-.2-1.4z"/>
    </svg>
  ),
  mongodb: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#111111" />
      <path fill="#47A248" d="M12 2.5c-.3 0-.5.2-.6.4C10.2 5 6.5 10.8 6.5 15c0 3.2 2.4 5.8 5.5 5.8s5.5-2.6 5.5-5.8c0-4.2-3.7-10-4.9-12.1-.1-.2-.3-.4-.6-.4zm0 2.2c.8 1.8 3.5 6.8 3.5 10.3 0 1.9-1.5 3.6-3.5 3.6s-3.5-1.7-3.5-3.6c0-3.5 2.7-8.5 3.5-10.3z"/>
    </svg>
  ),
  ibm: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#052FAD" />
      <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="Courier, monospace" letterSpacing="0.5">IBM</text>
    </svg>
  ),
  intel: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0071C5" />
      <text x="12" y="15.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="system-ui, sans-serif">intel</text>
    </svg>
  ),
  samsung: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#1428A0" />
      <text x="12" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.5">SAMSUNG</text>
    </svg>
  ),
  deloitte: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <text x="10.5" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="900" fontFamily="system-ui, sans-serif">Deloitte</text>
      <circle cx="19" cy="14" r="1.2" fill="#86BC25" />
    </svg>
  ),
  cognizant: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0033A0" />
      <text x="12" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="5" fontWeight="900" fontFamily="system-ui, sans-serif">cognizant</text>
    </svg>
  ),
  ey: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#2E2E38" />
      <text x="12" y="16.5" textAnchor="middle" fill="#FFE600" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif">EY</text>
    </svg>
  ),
  pwc: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#D04A02" />
      <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="Georgia, serif">pwc</text>
    </svg>
  ),
};

const BRAND_SVGS: Record<string, string> = {
  google: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
  microsoft: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
  amazon: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  meta: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
  facebook: "https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png",
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
  bloomberg: "https://upload.wikimedia.org/wikipedia/commons/5/52/Bloomberg_logo.svg",
  paypal: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
  walmart: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Walmart_logo.svg",
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
  title?: string;
}

export function resolveCompanyInfo(rawName?: string, rawId?: string): { key: string; domain: string } {
  const name = (rawName || "").trim();
  const idStr = (rawId || "").replace(/^c-/, "").trim();

  // 0. Check if name itself contains a domain pattern (e.g. Booking.com, zepto.gr, cred.club)
  const domainMatch = name.toLowerCase().match(/([a-z0-9-]+\.(com|in|org|io|ai|net|tech|co|app|club|gr|live|so|dev))/i);
  if (domainMatch) {
    return { key: domainMatch[1].replace(/[^a-z0-9]/g, ""), domain: domainMatch[1] };
  }

  // 1. Direct ID match
  const idKey = idStr.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (idKey && COMPANY_DOMAINS[idKey]) {
    return { key: idKey, domain: COMPANY_DOMAINS[idKey] };
  }

  // 2. Direct name match
  const nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (nameKey && COMPANY_DOMAINS[nameKey]) {
    return { key: nameKey, domain: COMPANY_DOMAINS[nameKey] };
  }

  // 3. Remove legal entity fluff
  const stripped = name
    .replace(/\b(pvt|private|ltd|limited|inc|incorporated|llc|corp|corporation|technologies|solutions|services|software|india|group|holdings|systems|labs|networks|co|company|enterprises|global)\b/gi, "")
    .trim();
  
  const strippedKey = stripped.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (strippedKey && COMPANY_DOMAINS[strippedKey]) {
    return { key: strippedKey, domain: COMPANY_DOMAINS[strippedKey] };
  }

  // 4. Check if strippedKey or nameKey matches any inline SVG directly
  if (strippedKey && COMPANY_INLINE_SVGS[strippedKey]) {
    return { key: strippedKey, domain: `${strippedKey}.com` };
  }
  if (nameKey && COMPANY_INLINE_SVGS[nameKey]) {
    return { key: nameKey, domain: `${nameKey}.com` };
  }

  // 5. Partial dictionary lookup
  for (const k of Object.keys(COMPANY_DOMAINS)) {
    if (strippedKey && k.length >= 3 && (strippedKey === k || strippedKey.startsWith(k) || k.startsWith(strippedKey))) {
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
  title: titleProp,
}: CompanyLogoProps) {
  const currentTheme = useTheme();
  const theme = themeProp || currentTheme;
  const isDark = theme === "dark";

  const name = companyName || company || "Company";
  const explicitLogo = logoUrl || logo;
  const displayTitle = titleProp || name;

  const [imgError, setImgError] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);
  const [autoLogo, setAutoLogo] = useState<string | null>(null);

  const { key, domain } = resolveCompanyInfo(name, companyId);

  // Automated background logo discovery for unmapped or arbitrary company names
  useEffect(() => {
    if (explicitLogo || COMPANY_INLINE_SVGS[key]) return;

    const cacheKey = `adyapan_logo_${key || name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setAutoLogo(cached);
          return;
        }
      }
    } catch {}

    let active = true;
    fetch(`/api/company-logo?name=${encodeURIComponent(name)}&key=${encodeURIComponent(key)}`)
      .then(res => res.json())
      .then(data => {
        if (active && data?.logoUrl) {
          setAutoLogo(data.logoUrl);
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(cacheKey, data.logoUrl);
            }
          } catch {}
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [name, key, explicitLogo]);

  const containerBg = isDark ? "rgba(255, 255, 255, 0.96)" : "#ffffff";
  const containerBorder = isDark ? `1px solid ${color}50` : `1px solid rgba(0, 0, 0, 0.1)`;
  const containerShadow = isDark ? `0 4px 16px rgba(0, 0, 0, 0.35)` : `0 2px 10px rgba(0, 0, 0, 0.06)`;

  // 0. Zero-latency vector inline SVG (instant render, offline, never blocked by CORS/hotlinking)
  if (!explicitLogo && COMPANY_INLINE_SVGS[key]) {
    return (
      <div
        className={`rounded-xl flex items-center justify-center p-1.5 transition-all shrink-0 hover:scale-105 select-none ${className}`}
        style={{
          width: size,
          height: size,
          background: containerBg,
          border: containerBorder,
          boxShadow: containerShadow,
        }}
        title={displayTitle}
      >
        <div style={{ width: size - 10, height: size - 10 }} className="flex items-center justify-center shrink-0">
          {COMPANY_INLINE_SVGS[key]()}
        </div>
      </div>
    );
  }

  // Candidate sources in order of preference
  const sources: string[] = [];

  // 1. Explicit passed logo URL (if provided and valid)
  if (explicitLogo && explicitLogo.startsWith("http")) {
    sources.push(explicitLogo);
  }

  // 2. Automated background discovery from /api/company-logo or cache
  if (autoLogo) {
    sources.push(autoLogo);
  }

  // 3. Icon Horse API (specialized domain favicon service)
  if (domain) {
    sources.push(`https://icon.horse/icon/${domain}`);
  }

  // 4. Google Favicons API (high availability 128px PNG)
  if (domain) {
    sources.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }

  // 5. Simple Icons via reliable jsDelivr CDN
  if (key) {
    sources.push(`https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${key}.svg`);
  }

  // 6. DuckDuckGo favicon API
  if (domain) {
    sources.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
  }

  // 7. Unavatar API
  if (domain) {
    sources.push(`https://unavatar.io/${domain}?fallback=false`);
  }

  // 8. Brand SVGs fallback
  if (BRAND_SVGS[key]) {
    sources.push(BRAND_SVGS[key]);
  }

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
        className={`rounded-xl flex items-center justify-center p-1.5 transition-all shrink-0 hover:scale-105 ${className}`}
        style={{
          width: size,
          height: size,
          background: containerBg,
          border: containerBorder,
          boxShadow: containerShadow,
        }}
        title={displayTitle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={`${name} logo`}
          width={size - 10}
          height={size - 10}
          className="max-w-full max-h-full object-contain filter drop-shadow-sm"
          referrerPolicy="no-referrer"
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
        title={displayTitle || "Tata Consultancy Services (TCS)"}
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

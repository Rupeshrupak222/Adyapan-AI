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
      {/* Authentic Amazon lowercase "a" in dark charcoal/black */}
      <path fill="#131921" d="M6.61 11.8c0-1.005.247-1.863.743-2.577.495-.71 1.17-1.25 2.04-1.615.796-.335 1.756-.575 2.912-.72.39-.046 1.033-.103 1.92-.174v-.37c0-.93-.105-1.558-.3-1.875-.302-.43-.78-.65-1.44-.65h-.182c-.48.046-.896.196-1.246.46-.35.27-.575.63-.675 1.096-.06.3-.206.465-.435.51l-2.52-.315c-.248-.06-.372-.18-.372-.39 0-.046.007-.09.022-.15.247-1.29.855-2.25 1.82-2.88.976-.616 2.1-.975 3.39-1.05h.54c1.65 0 2.957.434 3.888 1.29.135.15.27.3.405.48.12.165.224.314.283.45.075.134.15.33.195.57.06.254.105.42.135.51.03.104.062.3.076.615.01.313.02.493.02.553v5.28c0 .376.06.72.165 1.036.105.313.21.54.315.674l.51.674c.09.136.136.256.136.36 0 .12-.06.226-.18.314-1.2 1.05-1.86 1.62-1.963 1.71-.165.135-.375.15-.63.045a6.062 6.062 0 01-.526-.496l-.31-.347a9.391 9.391 0 01-.317-.42l-.3-.435c-.81.886-1.603 1.44-2.4 1.665-.494.15-1.093.227-1.83.227-1.11 0-2.04-.343-2.76-1.034-.72-.69-1.08-1.665-1.08-2.94l-.05-.076zm3.753-.438c0 .566.14 1.02.425 1.364.285.34.675.512 1.155.512.045 0 .106-.007.195-.02.09-.016.134-.023.166-.023.614-.16 1.08-.553 1.424-1.178.165-.28.285-.58.36-.91.09-.32.12-.59.135-.8.015-.195.015-.54.015-1.005v-.54c-.84 0-1.484.06-1.92.18-1.275.36-1.92 1.17-1.92 2.43l-.035-.02z" />
      {/* Iconic Amazon orange smile arrow */}
      <path fill="#FF9900" d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.35c-.1-.074-.151-.15-.151-.22 0-.047.021-.09.051-.13z" />
      <path fill="#FF9900" d="M19.53 18.82c.03-.06.075-.11.132-.17.362-.243.714-.41 1.05-.5a8.094 8.094 0 011.612-.24c.14-.012.28 0 .41.03.65.06 1.05.168 1.172.33.063.09.099.228.099.39v.15c0 .51-.149 1.11-.424 1.8-.278.69-.664 1.248-1.156 1.68-.073.06-.14.09-.197.09-.03 0-.06 0-.09-.012-.09-.044-.107-.12-.064-.24.54-1.26.806-2.143.806-2.64 0-.15-.03-.27-.087-.344-.145-.166-.55-.257-1.224-.257-.243 0-.533.016-.87.046-.363.045-.7.09-1 .135-.09 0-.148-.014-.18-.044-.03-.03-.036-.047-.02-.077 0-.017.006-.03.02-.063v-.06z" />
    </svg>
  ),
  aws: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="#232F3E" d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.51.51 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .415-.758.777.777 0 0 0-.215-.559c-.144-.151-.416-.287-.807-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167z" />
      <path fill="#FF9900" d="M21.698 16.207c-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.272-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.383.607z" />
      <path fill="#FF9900" d="M22.792 14.961c-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.399.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151.32-.79 1.03-2.57.695-2.994z" />
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
  chase: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="#117ACA" d="M0 15.415c0 .468.38.85.848.85h5.937V.575L0 7.72v7.695m15.416 8.582c.467 0 .846-.38.846-.849v-5.937H.573l7.146 6.785h7.697M24 8.587a.844.844 0 0 0-.847-.846h-5.938V23.43l6.782-7.148L24 8.586M8.585.003a.847.847 0 0 0-.847.847v5.94h15.688L16.282.003H8.585Z" />
    </svg>
  ),
  morganstanley: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#002B49" />
      <text x="12" y="11" textAnchor="middle" fill="#FFFFFF" fontSize="5" fontWeight="900" fontFamily="Georgia, serif">Morgan</text>
      <text x="12" y="18" textAnchor="middle" fill="#FFFFFF" fontSize="5" fontWeight="900" fontFamily="Georgia, serif">Stanley</text>
    </svg>
  ),
  deshaw: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0F2D59" />
      <text x="12" y="15.5" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="900" fontFamily="Georgia, serif">D·E·S</text>
    </svg>
  ),
  twosigma: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#14213D" />
      <text x="9" y="16.5" textAnchor="middle" fill="#00D2D3" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif">2</text>
      <text x="16" y="16.5" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif">Σ</text>
    </svg>
  ),
  janestreet: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#003554" />
      <text x="12" y="11" textAnchor="middle" fill="#00A8E8" fontSize="6" fontWeight="900" fontFamily="system-ui, sans-serif">Jane</text>
      <text x="12" y="18" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="900" fontFamily="system-ui, sans-serif">Street</text>
    </svg>
  ),
  hrt: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FF5000" />
      <text x="12" y="16.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.5">HRT</text>
    </svg>
  ),
  optiver: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#001871" />
      <text x="12" y="15.5" textAnchor="middle" fill="#00D4C5" fontSize="5.5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.5">OPTIVER</text>
    </svg>
  ),
  tesla: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#E82127" />
      <path fill="#FFFFFF" d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362l-.004.002H12v-.002zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46v.003z" />
    </svg>
  ),
  slack: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" />
      <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
      <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" />
      <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  ),
  discord: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#5865F2" />
      <path fill="#FFFFFF" d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  ),
  reddit: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FF4500" />
      <path fill="#FFFFFF" d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z" />
    </svg>
  ),
  pinterest: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#E60023" />
      <path fill="#FFFFFF" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    </svg>
  ),
  tiktok: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <path fill="#25F4EE" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  coinbase: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0052FF" />
      <path fill="#FFFFFF" d="M4.844 11.053c-.872 0-1.553.662-1.553 1.548s.664 1.542 1.553 1.542c.889 0 1.564-.667 1.564-1.547 0-.875-.664-1.543-1.564-1.543zm.006 2.452c-.497 0-.86-.386-.86-.904 0-.523.357-.909.854-.909.502 0 .866.392.866.91 0 .517-.364.903-.86.903zm1.749-1.778h.433v2.36h.693V11.11H6.599zm-5.052-.035c.364 0 .653.224.762.558h.734c-.133-.713-.722-1.197-1.49-1.197-.872 0-1.553.662-1.553 1.548 0 .887.664 1.543 1.553 1.543.75 0 1.351-.484 1.484-1.203h-.728a.78.78 0 01-.756.564c-.502 0-.855-.386-.855-.904 0-.523.347-.909.85-.909zm18.215.622l-.508-.075c-.242-.035-.415-.115-.415-.305 0-.207.225-.31.53-.31.336 0 .55.143.595.379h.67c-.075-.599-.537-.95-1.247-.95-.733 0-1.218.375-1.218.904 0 .506.317.8.958.892l.508.075c.249.034.387.132.387.316 0 .236-.242.334-.577.334-.41 0-.641-.167-.676-.42h-.681c.064.581.52.99 1.35.99.757 0 1.26-.346 1.26-.938 0-.53-.364-.806-.936-.892zM7.378 9.885a.429.429 0 00-.444.437c0 .254.19.438.444.438a.429.429 0 00.445-.438.429.429 0 00-.445-.437zm10.167 2.245c0-.645-.392-1.076-1.224-1.076-.785 0-1.224.397-1.31 1.007h.687c.035-.236.22-.432.612-.432.352 0 .525.155.525.345 0 .248-.317.311-.71.351-.531.058-1.19.242-1.19.933 0 .535.4.88 1.034.88.497 0 .809-.207.965-.535.023.293.242.483.548.483h.404v-.616h-.34v-1.34zm-.68.748c0 .397-.347.69-.769.69-.26 0-.48-.11-.48-.34 0-.293.353-.373.676-.408.312-.028.485-.097.572-.23zm-3.679-1.825c-.386 0-.71.162-.94.432V9.856h-.693v4.23h.68v-.391c.232.282.56.449.953.449.832 0 1.461-.656 1.461-1.543 0-.886-.64-1.548-1.46-1.548zm-.103 2.452c-.497 0-.86-.386-.86-.904 0-.517.369-.909.865-.909.503 0 .855.386.855.91 0 .517-.364.903-.86.903zm-3.187-2.452c-.45 0-.745.184-.919.443v-.385H8.29v2.975h.693v-1.617c0-.455.289-.777.716-.777.398 0 .647.282.647.69v1.704h.692v-1.755c0-.748-.386-1.278-1.142-1.278zM24 12.503c0-.851-.624-1.45-1.46-1.45-.89 0-1.542.668-1.542 1.548 0 .927.698 1.543 1.553 1.543.722 0 1.287-.426 1.432-1.03h-.722c-.104.264-.358.414-.699.414-.445 0-.78-.276-.854-.76H24v-.264zm-2.252-.23c.11-.414.422-.615.78-.615.392 0 .693.224.762.615Z" />
    </svg>
  ),
  snowflake: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#29B5E8" />
      <path fill="#FFFFFF" d="M7.602 12.4c.038-.151.076-.304.076-.456 0-.114-.038-.228-.038-.342-.114-.343-.304-.647-.646-.838l-4.87-2.777c-.685-.38-1.56-.152-1.94.533-.381.685-.153 1.56.532 1.94l2.701 1.56-2.701 1.56c-.685.38-.913 1.256-.533 1.94.38.685 1.256.914 1.94.533l4.832-2.777c.343-.267.571-.533.647-.876zm1.332 2.626c-.266-.038-.57.038-.837.19l-4.832 2.777c-.685.38-.913 1.256-.532 1.94.38.686 1.255.914 1.94.533l2.701-1.56v3.12c0 .8.647 1.408 1.446 1.408.799 0 1.407-.647 1.407-1.408v-5.592c0-.761-.57-1.37-1.293-1.408zm4.946-6.088c.266.038.57-.038.837-.19l4.832-2.777c.685-.38.913-1.256.532-1.94-.38-.686-1.255-.914-1.94-.533l-2.701 1.56V1.975c0-.799-.647-1.408-1.446-1.408-.799 0-1.446.609-1.446 1.408V7.53c0 .76.609 1.37 1.332 1.407zM3.265 5.97l4.832 2.777c.266.152.533.19.837.19.723-.038 1.331-.684 1.331-1.407V1.975c0-.799-.646-1.408-1.407-1.408-.799 0-1.446.647-1.446 1.408v3.12l-2.701-1.56c-.685-.38-1.56-.152-1.94.533-.419.646-.19 1.521.494 1.902zm9.093 6.011a.412.412 0 00-.114-.266l-.57-.571a.346.346 0 00-.267-.114.412.412 0 00-.266.114l-.571.57a.411.411 0 00-.114.267c0 .076.038.19.114.267l.57.57a.345.345 0 00.267.114c.076 0 .19-.038.266-.114l.571-.57a.412.412 0 00.114-.267zm1.598.533L11.94 14.53c-.039.038-.153.114-.229.114h-.608a.411.411 0 01-.267-.114L8.82 12.514a.408.408 0 01-.076-.229v-.608c0-.076.038-.19.114-.267l2.016-2.016a.41.41 0 01.267-.114h.608a.41.41 0 01.267.114l2.016 2.016a.347.347 0 01.114.267v.608c-.076.077-.114.19-.19.229zm5.593 5.44l-4.832-2.777c-.266-.152-.57-.19-.837-.152-.723.038-1.332.684-1.332 1.408v5.554c0 .8.647 1.408 1.408 1.408.799 0 1.446-.647 1.446-1.408v-3.12l2.7 1.56c.686.38 1.561.152 1.941-.533.419-.646.19-1.521-.494-1.94zm2.549-7.533l-2.701 1.56 2.7 1.56c.686.38.914 1.256.533 1.94-.38.685-1.255.913-1.94.533l-4.832-2.778a1.644 1.644 0 01-.647-.798c-.037-.153-.076-.305-.076-.457 0-.114.039-.228.039-.342.114-.343.342-.647.646-.837l4.832-2.778c.685-.38 1.56-.152 1.94.533.457.609.19 1.484-.494 1.864" />
    </svg>
  ),
  databricks: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FF3621" />
      <path fill="#FFFFFF" d="M.95 14.184L12 20.403l9.919-5.55v2.21L12 22.662l-10.484-5.96-.565.308v.77L12 24l11.05-6.218v-4.317l-.515-.309L12 19.118l-9.867-5.653v-2.21L12 16.805l11.05-6.218V6.32l-.515-.308L12 11.974 2.647 6.681 12 1.388l7.76 4.368.668-.411v-.566L12 0 .95 6.27v.72L12 13.207l9.919-5.55v2.26L12 15.52 1.516 9.56l-.565.308Z" />
    </svg>
  ),
  palantir: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#101113" />
      <path fill="#FFFFFF" d="M20.147 18L12 21.178 3.853 18 2.5 20.343 12 24l9.5-3.657L20.147 18zM12 0a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zm0 16.078a6.568 6.568 0 1 1 0-13.136 6.568 6.568 0 0 1 0 13.136z" />
    </svg>
  ),
  amd: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#ED1C24" />
      <path fill="#FFFFFF" d="M18.324 9.137l1.559 1.56h2.556v2.557L24 14.814V9.137zM2 9.52l-2 4.96h1.309l.37-.982H3.9l.408.982h1.338L3.432 9.52zm4.209 0v4.955h1.238v-3.092l1.338 1.562h.188l1.338-1.556v3.091h1.238V9.52H10.47l-1.592 1.845L7.287 9.52zm6.283 0v4.96h2.057c1.979 0 2.88-1.046 2.88-2.472 0-1.36-.937-2.488-2.747-2.488zm1.237.91h.792c1.17 0 1.63.711 1.63 1.57 0 .728-.372 1.572-1.616 1.572h-.806zm-10.985.273l.791 1.932H2.008zm17.137.307l-1.604 1.603v2.25h2.246l1.604-1.607h-2.246z" />
    </svg>
  ),
  qualcomm: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#3253DC" />
      <path fill="#FFFFFF" d="M12 0C6.22933 0 1.5761 4.48645 1.5761 10.47394c0 6.00417 4.65323 10.47394 10.4239 10.47394.98402 0 1.93468-.13343 2.8353-.3836l1.13412 2.9187c.11675.31688.35025.51702.7672.51702h1.80125c.43364 0 .75052-.28353.55038-.83391l-1.46768-3.81932c2.88534-1.81793 4.80333-5.03683 4.80333-8.8895C22.4239 4.48644 17.77067 0 12 0m4.53648 16.5615l-1.31758-3.41904c-.11675-.28353-.35024-.55038-.85059-.55038h-1.71786c-.43363 0-.7672.28353-.56706.83391l1.73454 4.48645c-.56706.1501-1.18416.21682-1.81793.21682-4.2196 0-7.22168-3.31897-7.22168-7.65532C4.77832 6.1376 7.7804 2.81862 12 2.81862s7.22168 3.31898 7.22168 7.65532c0 2.5351-1.01737 4.70327-2.6852 6.08756" />
    </svg>
  ),
  dropbox: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0061FF" />
      <path fill="#FFFFFF" d="M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z" />
    </svg>
  ),
  zoom: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0B5CFF" />
      <path fill="#FFFFFF" d="M5.033 14.649H.743a.74.74 0 0 1-.686-.458.74.74 0 0 1 .16-.808L3.19 10.41H1.06A1.06 1.06 0 0 1 0 9.35h3.957c.301 0 .57.18.686.458a.74.74 0 0 1-.161.808L1.51 13.59h2.464c.585 0 1.06.475 1.06 1.06zM24 11.338c0-1.14-.927-2.066-2.066-2.066-.61 0-1.158.265-1.537.686a2.061 2.061 0 0 0-1.536-.686c-1.14 0-2.066.926-2.066 2.066v3.311a1.06 1.06 0 0 0 1.06-1.06v-2.251a1.004 1.004 0 0 1 2.013 0v2.251c0 .586.474 1.06 1.06 1.06v-3.311a1.004 1.004 0 0 1 2.012 0v2.251c0 .586.475 1.06 1.06 1.06zM16.265 12a2.728 2.728 0 1 1-5.457 0 2.728 2.728 0 0 1 5.457 0zm-1.06 0a1.669 1.669 0 1 0-3.338 0 1.669 1.669 0 0 0 3.338 0zm-4.82 0a2.728 2.728 0 1 1-5.458 0 2.728 2.728 0 0 1 5.457 0zm-1.06 0a1.669 1.669 0 1 0-3.338 0 1.669 1.669 0 0 0 3.338 0z" />
    </svg>
  ),
  phonepe: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#5F259F" />
      <text x="12" y="17" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif">पे</text>
    </svg>
  ),
  cred: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#1C1C1E" />
      <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.5">CRED</text>
    </svg>
  ),
  zepto: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#540075" />
      <text x="12" y="16.5" textAnchor="middle" fill="#FF3269" fontSize="13" fontStyle="italic" fontWeight="900" fontFamily="system-ui, sans-serif">Z</text>
    </svg>
  ),
  blinkit: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#F8CB46" />
      <text x="12" y="16" textAnchor="middle" fill="#0C831F" fontSize="7" fontWeight="900" fontFamily="system-ui, sans-serif">blink</text>
    </svg>
  ),
  ola: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <text x="12" y="16" textAnchor="middle" fill="#BAEE00" fontSize="8" fontWeight="900" fontFamily="system-ui, sans-serif">OLA</text>
    </svg>
  ),
  meesho: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#9C175A" />
      <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif">m</text>
    </svg>
  ),
  makemytrip: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#E41E26" />
      <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontWeight="900" fontFamily="system-ui, sans-serif">mmt</text>
    </svg>
  ),
  servicenow: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#293E40" />
      <circle cx="12" cy="12" r="5" fill="#81B5A1" />
    </svg>
  ),
  intuit: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#0D64BA" />
      <text x="12" y="15.5" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="system-ui, sans-serif">Intuit</text>
    </svg>
  ),
  hcl: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#005A9C" />
      <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="system-ui, sans-serif">HCL</text>
    </svg>
  ),
  hcltech: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#005A9C" />
      <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="system-ui, sans-serif">HCL</text>
    </svg>
  ),
  techmahindra: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#E31837" />
      <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="900" fontFamily="system-ui, sans-serif">TechM</text>
    </svg>
  ),
  snapchat: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FFFC00" />
      <path fill="#000000" d="M12.028 3.5c-2.45 0-4.04 1.76-4.04 3.75 0 .54.12 1.07.24 1.57-.46.06-.9.25-1.28.56-.2.17-.18.39.06.49.52.22 1.09.28 1.66.19.14.77.47 1 2.05-.72.2-1.5.5-2.19.9-.22.12-.22.34-.02.48.59.43 1.25.75 1.96.95-.08.41-.09.84-.04 1.27.05.42.34.72.76.77.72.09 1.46.04 2.18-.15.72.19 1.46.24 2.18.15.42-.05.71-.35.76-.77.05-.43.04-.86-.04-1.27.71-.2 1.37-.52 1.96-.95.2-.14.2-.36-.02-.48-.69-.4-1.47-.7-2.19-.9.53-.57.86-1.28 1-2.05.57.09 1.14.03 1.66-.19.24-.1.26-.32.06-.49-.38-.31-.82-.5-1.28-.56.12-.5.24-1.03.24-1.57 0-1.99-1.59-3.75-4.04-3.75z"/>
    </svg>
  ),
  snap: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FFFC00" />
      <path fill="#000000" d="M12.028 3.5c-2.45 0-4.04 1.76-4.04 3.75 0 .54.12 1.07.24 1.57-.46.06-.9.25-1.28.56-.2.17-.18.39.06.49.52.22 1.09.28 1.66.19.14.77.47 1 2.05-.72.2-1.5.5-2.19.9-.22.12-.22.34-.02.48.59.43 1.25.75 1.96.95-.08.41-.09.84-.04 1.27.05.42.34.72.76.77.72.09 1.46.04 2.18-.15.72.19 1.46.24 2.18.15.42-.05.71-.35.76-.77.05-.43.04-.86-.04-1.27.71-.2 1.37-.52 1.96-.95.2-.14.2-.36-.02-.48-.69-.4-1.47-.7-2.19-.9.53-.57.86-1.28 1-2.05.57.09 1.14.03 1.66-.19.24-.1.26-.32.06-.49-.38-.31-.82-.5-1.28-.56.12-.5.24-1.03.24-1.57 0-1.99-1.59-3.75-4.04-3.75z"/>
    </svg>
  ),
  lyft: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#FF00BF" />
      <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="system-ui, sans-serif">lyft</text>
    </svg>
  ),
  cloudflare: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#F38020" />
      <path fill="#FFFFFF" d="M18.5 16.5h-13a3.5 3.5 0 0 1-.3-6.98A5.5 5.5 0 0 1 15.5 7a5.5 5.5 0 0 1 4.3 2.1 3.5 3.5 0 0 1-1.3 7.4z"/>
    </svg>
  ),
  crowdstrike: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#E60000" />
      <path fill="#FFFFFF" d="M12 4l8 12H4l8-12z" opacity="0.9"/>
    </svg>
  ),
  datadog: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#632CA6" />
      <text x="12" y="15.5" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="system-ui, sans-serif">DD</text>
    </svg>
  ),
  splunk: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <text x="12" y="15" textAnchor="middle" fill="#EB1C24" fontSize="12" fontWeight="900" fontFamily="Courier, monospace">&gt;</text>
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

const COMPANY_ALIASES: Record<string, string> = {
  // Amazon variations
  amazon: "amazon",
  "amazon.com": "amazon",
  "amazon inc": "amazon",
  "amazon com": "amazon",
  "amazon web services": "aws",
  "amazon aws": "aws",
  aws: "aws",

  // Google variations
  google: "google",
  "google llc": "google",
  "google inc": "google",
  alphabet: "google",
  "alphabet inc": "google",

  // Microsoft
  microsoft: "microsoft",
  "microsoft corporation": "microsoft",
  "microsoft corp": "microsoft",
  msft: "microsoft",

  // Meta / Facebook
  meta: "meta",
  "meta platforms": "meta",
  "meta platforms inc": "meta",
  facebook: "facebook",
  "facebook inc": "facebook",
  fb: "facebook",

  // Apple
  apple: "apple",
  "apple inc": "apple",
  aapl: "apple",

  // Bloomberg
  bloomberg: "bloomberg",
  "bloomberg lp": "bloomberg",
  "bloomberg l.p.": "bloomberg",

  // Netflix
  netflix: "netflix",
  "netflix inc": "netflix",

  // Uber
  uber: "uber",
  "uber technologies": "uber",

  // Adobe
  adobe: "adobe",
  "adobe inc": "adobe",
  "adobe systems": "adobe",

  // Twitter / X
  twitter: "twitter",
  "twitter inc": "twitter",
  x: "twitter",
  "x corp": "twitter",

  // Goldman Sachs
  goldmansachs: "goldmansachs",
  "goldman sachs": "goldmansachs",
  goldman: "goldmansachs",

  // Morgan Stanley
  morganstanley: "morganstanley",
  "morgan stanley": "morganstanley",

  // JPMorgan
  jpmorgan: "chase",
  "jp morgan": "chase",
  "jpmorgan chase": "chase",
  "jpmorgan chase & co": "chase",
  chase: "chase",

  // Palo Alto
  paloaltonetworks: "paloalto",
  "palo alto networks": "paloalto",
  "palo alto": "paloalto",
  paloalto: "paloalto",

  // Citadel
  citadel: "citadel",
  "citadel securities": "citadel",
  "citadel llc": "citadel",

  // D. E. Shaw
  deshaw: "deshaw",
  "d. e. shaw": "deshaw",
  "d.e. shaw": "deshaw",
  "de shaw": "deshaw",

  // Two Sigma
  twosigma: "twosigma",
  "two sigma": "twosigma",
  "two sigma investments": "twosigma",

  // Jane Street
  janestreet: "janestreet",
  "jane street": "janestreet",
  "jane street capital": "janestreet",

  // Hudson River Trading
  hrt: "hrt",
  "hudson river trading": "hrt",

  // Optiver
  optiver: "optiver",

  // ByteDance / TikTok
  bytedance: "bytedance",
  "bytedance ltd": "bytedance",
  tiktok: "tiktok",

  // Cisco
  cisco: "cisco",
  "cisco systems": "cisco",

  // Oracle
  oracle: "oracle",
  "oracle corporation": "oracle",

  // Walmart
  walmart: "walmart",
  "walmart labs": "walmart",
  "walmart global tech": "walmart",

  // TCS
  tcs: "tcs",
  "tata consultancy services": "tcs",
  "tata consultancy": "tcs",

  // Infosys
  infosys: "infosys",
  "infosys limited": "infosys",

  // Wipro
  wipro: "wipro",
  "wipro technologies": "wipro",

  // Cognizant
  cognizant: "cognizant",
  "cognizant technology solutions": "cognizant",
  cts: "cognizant",

  // Accenture
  accenture: "accenture",

  // Capgemini
  capgemini: "capgemini",

  // HCL
  hcl: "hcl",
  hcltech: "hcl",
  "hcl technologies": "hcl",

  // Tech Mahindra
  techmahindra: "techmahindra",
  "tech mahindra": "techmahindra",

  // Indian Startups
  flipkart: "flipkart",
  swiggy: "swiggy",
  zomato: "zomato",
  paytm: "paytm",
  phonepe: "phonepe",
  "phone pe": "phonepe",
  razorpay: "razorpay",
  cred: "cred",
  zepto: "zepto",
  blinkit: "blinkit",
  grofers: "blinkit",
  ola: "ola",
  "ola cabs": "ola",
  meesho: "meesho",
  makemytrip: "makemytrip",
  "make my trip": "makemytrip",
};

export function resolveCompanyInfo(rawName?: string, rawId?: string): { key: string; domain: string } {
  const name = (rawName || "").trim();
  const idStr = (rawId || "").replace(/^c-/, "").trim();

  // 0. Check alias map first
  const normalizedRaw = name.toLowerCase().replace(/['"\.]/g, "").trim();
  if (COMPANY_ALIASES[normalizedRaw]) {
    const aliased = COMPANY_ALIASES[normalizedRaw];
    return { key: aliased, domain: COMPANY_DOMAINS[aliased] || `${aliased}.com` };
  }

  // 0b. Check if name itself contains a domain pattern (e.g. Booking.com, zepto.gr, cred.club)
  const domainMatch = name.toLowerCase().match(/([a-z0-9-]+\.(com|in|org|io|ai|net|tech|co|app|club|gr|live|so|dev))/i);
  if (domainMatch) {
    return { key: domainMatch[1].replace(/[^a-z0-9]/g, ""), domain: domainMatch[1] };
  }

  // 1. Direct ID match
  const idKey = idStr.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (idKey && COMPANY_ALIASES[idKey]) {
    const aliased = COMPANY_ALIASES[idKey];
    return { key: aliased, domain: COMPANY_DOMAINS[aliased] || `${aliased}.com` };
  }
  if (idKey && COMPANY_DOMAINS[idKey]) {
    return { key: idKey, domain: COMPANY_DOMAINS[idKey] };
  }

  // 2. Direct name match
  const nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (nameKey && COMPANY_ALIASES[nameKey]) {
    const aliased = COMPANY_ALIASES[nameKey];
    return { key: aliased, domain: COMPANY_DOMAINS[aliased] || `${aliased}.com` };
  }
  if (nameKey && COMPANY_INLINE_SVGS[nameKey]) {
    return { key: nameKey, domain: COMPANY_DOMAINS[nameKey] || `${nameKey}.com` };
  }
  if (nameKey && COMPANY_DOMAINS[nameKey]) {
    return { key: nameKey, domain: COMPANY_DOMAINS[nameKey] };
  }

  // 3. Remove legal entity fluff
  const stripped = name
    .replace(/\b(pvt|private|ltd|limited|inc|incorporated|llc|corp|corporation|technologies|solutions|services|software|india|group|holdings|systems|labs|networks|co|company|enterprises|global)\b/gi, "")
    .trim();
  
  const strippedKey = stripped.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (strippedKey && COMPANY_ALIASES[strippedKey]) {
    const aliased = COMPANY_ALIASES[strippedKey];
    return { key: aliased, domain: COMPANY_DOMAINS[aliased] || `${aliased}.com` };
  }
  if (strippedKey && COMPANY_INLINE_SVGS[strippedKey]) {
    return { key: strippedKey, domain: COMPANY_DOMAINS[strippedKey] || `${strippedKey}.com` };
  }
  if (strippedKey && COMPANY_DOMAINS[strippedKey]) {
    return { key: strippedKey, domain: COMPANY_DOMAINS[strippedKey] };
  }

  // 4. Partial dictionary lookup
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

  const isRound = className.includes("rounded-full");
  const roundedClass = isRound ? "rounded-full" : (className.includes("rounded-") ? "" : "rounded-xl");
  const padVal = size <= 22 ? 2 : (size <= 28 ? 3 : 4);
  const innerSize = Math.max(12, size - padVal * 2);

  // 0. Zero-latency vector inline SVG (instant render, offline, never blocked by CORS/hotlinking)
  if (!explicitLogo && COMPANY_INLINE_SVGS[key]) {
    return (
      <div
        className={`${roundedClass} flex items-center justify-center transition-all shrink-0 hover:scale-105 select-none ${className}`}
        style={{
          width: size,
          height: size,
          padding: padVal,
          background: containerBg,
          border: containerBorder,
          boxShadow: containerShadow,
        }}
        title={displayTitle}
      >
        <div style={{ width: innerSize, height: innerSize }} className="flex items-center justify-center shrink-0">
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
        className={`${roundedClass} flex items-center justify-center transition-all shrink-0 hover:scale-105 ${className}`}
        style={{
          width: size,
          height: size,
          padding: padVal,
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
          width={innerSize}
          height={innerSize}
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
        className={`${roundedClass} flex items-center justify-center shrink-0 transition-transform hover:scale-105 ${className}`}
        style={{
          width: size,
          height: size,
          padding: padVal,
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
      className={`${roundedClass} flex items-center justify-center font-black shrink-0 transition-transform hover:scale-105 select-none ${className}`}
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

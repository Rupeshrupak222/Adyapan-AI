/**
 * Automatic Company Logo Resolver for Backend Database Operations.
 * Whenever a new job or company is created or updated in the database,
 * this utility automatically resolves and populates its authentic logo URL.
 */

const COMPANY_DOMAINS: Record<string, string> = {
  // Global Tech & FAANG+
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
};

/**
 * Automatically resolves and returns an official logo URL for any company name or apply link.
 */
export function autoResolveCompanyLogo(
  companyName: string,
  existingLogo?: string | null,
  applyUrl?: string | null
): string {
  if (existingLogo && existingLogo.trim().startsWith("http") && !existingLogo.includes("example.com")) {
    return existingLogo.trim();
  }

  // 1. Extract domain from applyUrl if provided
  let applyDomain = "";
  if (applyUrl && typeof applyUrl === "string" && applyUrl.trim().startsWith("http")) {
    try {
      const parsedUrl = new URL(applyUrl.trim());
      let hostname = parsedUrl.hostname.toLowerCase();
      if (hostname.startsWith("www.")) hostname = hostname.slice(4);
      // Exclude generic aggregator domains
      const aggregators = ["adyapan.ai", "linkedin.com", "indeed.com", "naukri.com", "glassdoor.com", "internshala.com"];
      if (!aggregators.some((ag) => hostname.includes(ag))) {
        applyDomain = hostname;
      }
    } catch {}
  }

  if (!companyName || !companyName.trim()) {
    if (applyDomain) {
      return `https://logo.clearbit.com/${applyDomain}`;
    }
    return "";
  }

  const name = companyName.trim();
  const simpleKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 2. Direct Wikimedia brand SVG match
  if (BRAND_SVGS[simpleKey]) {
    return BRAND_SVGS[simpleKey];
  }

  // 3. Clean legal entity fluff
  const stripped = name
    .replace(/\b(pvt|private|ltd|limited|inc|incorporated|llc|corp|corporation|technologies|solutions|services|software|india|group|holdings|systems|labs|networks|co|company|enterprises|global)\b/gi, "")
    .trim();
  const strippedKey = stripped.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (BRAND_SVGS[strippedKey]) {
    return BRAND_SVGS[strippedKey];
  }

  // 4. Resolve Domain
  let domain = COMPANY_DOMAINS[simpleKey] || COMPANY_DOMAINS[strippedKey] || applyDomain;
  if (!domain) {
    for (const k of Object.keys(COMPANY_DOMAINS)) {
      if (strippedKey && (strippedKey.startsWith(k) || k.startsWith(strippedKey))) {
        domain = COMPANY_DOMAINS[k];
        break;
      }
    }
  }
  if (!domain && (strippedKey || simpleKey)) {
    domain = `${strippedKey || simpleKey}.com`;
  }

  if (domain) {
    return `https://logo.clearbit.com/${domain}`;
  }

  return "";
}

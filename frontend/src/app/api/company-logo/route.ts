import { NextRequest, NextResponse } from "next/server";

// In-memory cache for fast repeated resolution
const logoCache = new Map<string, { logoUrl: string; domain: string }>();

// Common top-level domain extensions to probe
const TLD_CANDIDATES = [".com", ".io", ".ai", ".in", ".org", ".co", ".net", ".tech", ".app"];

// Common words to strip when guessing company domain
const LEGAL_TERMS = [
  "pvt", "private", "ltd", "limited", "inc", "incorporated", "llc", "corp",
  "corporation", "technologies", "technology", "solutions", "services",
  "software", "india", "group", "holdings", "systems", "labs", "networks",
  "co", "company", "enterprises", "global", "capital", "ventures", "partners"
];

function sanitizeCompanyName(raw: string): { slug: string; cleanName: string } {
  let cleanName = (raw || "").trim();
  const lower = cleanName.toLowerCase();
  
  // Remove legal suffix regex
  const regex = new RegExp(`\\b(${LEGAL_TERMS.join("|")})\\b`, "gi");
  const stripped = lower.replace(regex, "").replace(/[^\w\s]/g, " ").trim();
  const words = stripped.split(/\s+/).filter(Boolean);
  
  const slug = words.join("").toLowerCase();
  return { slug: slug || lower.replace(/[^a-z0-9]/g, ""), cleanName };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "";
    const key = searchParams.get("key") || "";

    if (!name && !key) {
      return NextResponse.json({ error: "Company name or key required" }, { status: 400 });
    }

    const cacheKey = (key || name).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (logoCache.has(cacheKey)) {
      return NextResponse.json({ success: true, ...logoCache.get(cacheKey) });
    }

    const { slug, cleanName } = sanitizeCompanyName(name || key);

    // 1. Candidate domains to test
    const candidateDomains: string[] = [
      `${slug}.com`,
      `${slug}.io`,
      `${slug}.ai`,
      `${slug}.in`,
      `${slug}.co`,
      `${slug}.org`,
      `${slug}.tech`
    ];

    // 2. Query DuckDuckGo Instant Answer for official entity image
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanName || name)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl, {
        headers: { "User-Agent": "AdyapanAI/1.0" },
        signal: AbortSignal.timeout(2000),
      });
      if (ddgRes.ok) {
        const ddgData = await ddgRes.json();
        if (ddgData.Image && typeof ddgData.Image === "string" && ddgData.Image.startsWith("http")) {
          const result = { logoUrl: ddgData.Image, domain: candidateDomains[0] };
          logoCache.set(cacheKey, result);
          return NextResponse.json({ success: true, ...result, source: "duckduckgo" });
        }
      }
    } catch {
      // Continue to next probe
    }

    // 3. Test IconHorse / Google S2 on the primary candidate domain
    const primaryDomain = candidateDomains[0];
    const candidateLogoUrl = `https://icon.horse/icon/${primaryDomain}`;
    
    // Quick probe to ensure the domain actually exists
    try {
      const probeRes = await fetch(`https://${primaryDomain}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(1500),
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (probeRes.ok || probeRes.status === 301 || probeRes.status === 302 || probeRes.status === 403) {
        const result = {
          logoUrl: `https://www.google.com/s2/favicons?domain=${primaryDomain}&sz=128`,
          domain: primaryDomain
        };
        logoCache.set(cacheKey, result);
        return NextResponse.json({ success: true, ...result, source: "google_favicon" });
      }
    } catch {
      // Fallback to IconHorse or Google S2 without strict pre-flight
    }

    // Default high-availability Google S2 Favicon URL
    const defaultResult = {
      logoUrl: `https://www.google.com/s2/favicons?domain=${primaryDomain}&sz=128`,
      domain: primaryDomain
    };
    logoCache.set(cacheKey, defaultResult);

    return NextResponse.json({ success: true, ...defaultResult, source: "fallback_domain" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to resolve company logo" },
      { status: 500 }
    );
  }
}

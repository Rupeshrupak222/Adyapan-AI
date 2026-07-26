import { env } from "../config/env";

export interface StockImageResult {
  url: string;
  alt: string;
  author?: string;
  source: "unsplash" | "pexels" | "curated";
}

const CURATED_FALLBACK_IMAGES: Record<string, string[]> = {
  ai: [
    "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1200",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200",
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200",
  ],
  tech: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200",
  ],
  business: [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200",
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200",
  ],
  science: [
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200",
    "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1200",
    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200",
  ]
};

export async function searchStockImage(query: string): Promise<StockImageResult> {
  const cleanQuery = (query || "technology presentation").trim();

  // 1. Try Unsplash API if access key exists
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_API_KEY;
  if (unsplashKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(cleanQuery)}&per_page=3&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${unsplashKey}` } }
      );
      if (res.ok) {
        const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string }; alt_description?: string; user?: { name?: string } }> };
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          if (first?.urls?.regular) {
            return {
              url: first.urls.regular,
              alt: first.alt_description || cleanQuery,
              author: first.user?.name,
              source: "unsplash",
            };
          }
        }
      }
    } catch (err) {
      console.warn("[StockImage] Unsplash fetch warning:", err);
    }
  }

  // 2. Try Pexels API if API key exists
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanQuery)}&per_page=3&orientation=landscape`,
        { headers: { Authorization: pexelsKey } }
      );
      if (res.ok) {
        const data = (await res.json()) as { photos?: Array<{ src?: { large2x?: string; large?: string }; alt?: string; photographer?: string }> };
        if (data.photos && data.photos.length > 0) {
          const first = data.photos[0];
          const imgUrl = first?.src?.large2x || first?.src?.large;
          if (imgUrl) {
            return {
              url: imgUrl,
              alt: first.alt || cleanQuery,
              author: first.photographer,
              source: "pexels",
            };
          }
        }
      }
    } catch (err) {
      console.warn("[StockImage] Pexels fetch warning:", err);
    }
  }

  // 3. Fallback to curated Unsplash high-res collections
  const qLower = cleanQuery.toLowerCase();
  let category = "tech";
  if (qLower.includes("ai") || qLower.includes("intelligence") || qLower.includes("machine")) category = "ai";
  else if (qLower.includes("business") || qLower.includes("market") || qLower.includes("pitch")) category = "business";
  else if (qLower.includes("science") || qLower.includes("biology") || qLower.includes("chem")) category = "science";

  const list = CURATED_FALLBACK_IMAGES[category] || CURATED_FALLBACK_IMAGES.tech;
  const selectedUrl = list[Math.floor(Math.random() * list.length)];

  return {
    url: selectedUrl,
    alt: cleanQuery,
    author: "Unsplash Contributor",
    source: "curated",
  };
}

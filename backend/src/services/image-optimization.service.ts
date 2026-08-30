import sharp from "sharp";
import { lookup } from "dns/promises";
import net from "net";

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  return false;
}

export interface OptimizedImageResult {
  buffer: Buffer;
  base64DataUrl: string;
  width: number;
  height: number;
  format: "jpeg" | "png" | "webp";
}

export async function optimizeSlideImage(
  imageUrl: string,
  targetWidth = 1200,
  targetHeight = 675,
  quality = 82
): Promise<OptimizedImageResult | null> {
  try {
    // SSRF guard: only http(s), and the host must resolve to public addresses.
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      throw new Error("Invalid image URL");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Only http/https image URLs are allowed");
    }
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const resolved = await lookup(host, { all: true });
    if (resolved.length === 0 || resolved.some((entry) => isPrivateAddress(entry.address))) {
      throw new Error("Image host does not resolve to a public address");
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image from ${imageUrl}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Process image via Sharp
    const processedBuffer = await sharp(inputBuffer)
      .resize(targetWidth, targetHeight, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    const base64DataUrl = `data:image/jpeg;base64,${processedBuffer.toString("base64")}`;

    return {
      buffer: processedBuffer,
      base64DataUrl,
      width: targetWidth,
      height: targetHeight,
      format: "jpeg",
    };
  } catch (error) {
    console.warn(`[ImageOptimization] Sharp processing warning for URL (${imageUrl}):`, error);
    return null;
  }
}

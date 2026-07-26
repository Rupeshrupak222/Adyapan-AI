import sharp from "sharp";

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

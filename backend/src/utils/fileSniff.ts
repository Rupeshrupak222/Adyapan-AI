export type DetectedDocumentType = "pdf" | "docx" | "doc";

export function sniffDocumentType(buffer: Buffer): DetectedDocumentType | null {
  if (!buffer || buffer.length < 8) return null;

  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";

  const head = buffer.subarray(0, 2);
  if (head[0] === 0x50 && head[1] === 0x4b) {
    const probe = buffer.subarray(0, Math.min(buffer.length, 96 * 1024));
    if (probe.includes(Buffer.from("word/"))) return "docx";
    return null;
  }

  const oleMagic = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (buffer.subarray(0, 8).equals(oleMagic)) return "doc";

  return null;
}

export function sniffImageType(buffer: Buffer): "jpeg" | "png" | "gif" | "webp" | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer.subarray(0, 8).toString("latin1") === "\x89PNG\r\n\x1a\n") return "png";
  const gif = buffer.subarray(0, 6).toString("latin1");
  if (gif === "GIF87a" || gif === "GIF89a") return "gif";
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}
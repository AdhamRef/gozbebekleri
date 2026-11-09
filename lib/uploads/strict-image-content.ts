/** Server-side magic-byte checks: never trust a browser-supplied image MIME. */
export function assertRasterImageUpload(
  file: { type?: string; name?: string },
  bytes: Uint8Array,
): string | null {
  const mime = (file.type || "").toLowerCase();
  const ext = (file.name || "").split(".").pop()?.toLowerCase();
  const head = (prefix: number[]) => prefix.every((v, i) => bytes[i] === v);
  if (mime === "image/jpeg" && (ext === "jpg" || ext === "jpeg")) {
    return bytes.length > 3 && head([0xff, 0xd8, 0xff]) ? null : "توقيع ملف JPEG غير صالح";
  }
  if (mime === "image/png" && ext === "png") {
    return bytes.length > 8 && head([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      ? null : "توقيع ملف PNG غير صالح";
  }
  if (mime === "image/webp" && ext === "webp") {
    const ascii = (start: number, value: string) =>
      Array.from(value).every((ch, i) => bytes[start + i] === ch.charCodeAt(0));
    return bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")
      ? null : "توقيع ملف WebP غير صالح";
  }
  return "صيغة الملف غير مدعومة. استخدم JPG أو PNG أو WEBP بصيغة فعلية.";
}

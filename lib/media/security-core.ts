export const MEDIA_NAMESPACE = "gozbebekleri/media" as const;

export const MEDIA_SCOPES = [
  "campaigns",
  "blog",
  "slides",
  "categories",
  "ticker",
] as const;

export type MediaScope = (typeof MEDIA_SCOPES)[number];
export type MediaKind = "image" | "video";

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 1;

export type DetectedMediaType = {
  extension: "jpg" | "png" | "webp" | "mp4";
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "video/mp4";
  type: MediaKind;
  maxBytes: number;
};

export class MediaSecurityError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 = 400,
    readonly code = "INVALID_MEDIA",
  ) {
    super(message);
    this.name = "MediaSecurityError";
  }
}

const MIME_BY_EXTENSION: Record<string, DetectedMediaType["mimeType"]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
};

const PERMITTED_BY_SCOPE: Record<MediaScope, readonly DetectedMediaType["mimeType"][]> = {
  campaigns: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
  blog: ["image/jpeg", "image/png", "image/webp"],
  slides: ["image/jpeg", "image/png", "image/webp"],
  categories: ["image/jpeg", "image/png", "image/webp"],
  ticker: ["image/jpeg", "image/png", "image/webp"],
};

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const DANGEROUS_EXTENSIONS = new Set([
  "exe", "dll", "js", "mjs", "cjs", "html", "htm", "svg", "sh", "bat", "cmd", "com", "scr",
]);

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export function parseMediaScope(value: string | null | undefined): MediaScope {
  if (!value || !(MEDIA_SCOPES as readonly string[]).includes(value)) {
    throw new MediaSecurityError("A valid media scope is required", 400, "INVALID_SCOPE");
  }
  return value as MediaScope;
}

export function detectMediaType(bytes: Uint8Array): DetectedMediaType {
  if (bytes.byteLength === 0) {
    throw new MediaSecurityError("Empty files are not allowed", 400, "EMPTY_FILE");
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { extension: "jpg", mimeType: "image/jpeg", type: "image", maxBytes: IMAGE_MAX_BYTES };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: "png", mimeType: "image/png", type: "image", maxBytes: IMAGE_MAX_BYTES };
  }
  if (bytes.byteLength >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return { extension: "webp", mimeType: "image/webp", type: "image", maxBytes: IMAGE_MAX_BYTES };
  }
  if (bytes.byteLength >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    return { extension: "mp4", mimeType: "video/mp4", type: "video", maxBytes: VIDEO_MAX_BYTES };
  }
  const prefix = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.byteLength, 512))).trimStart().toLowerCase();
  if (prefix.startsWith("<svg") || prefix.includes("<svg")) {
    throw new MediaSecurityError("SVG files are not supported", 400, "UNSUPPORTED_TYPE");
  }
  if (prefix.startsWith("<!doctype html") || prefix.startsWith("<html") || prefix.includes("<script")) {
    throw new MediaSecurityError("HTML and script files are not supported", 400, "UNSUPPORTED_TYPE");
  }
  if (startsWith(bytes, [0x4d, 0x5a]) || startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) {
    throw new MediaSecurityError("Executable files are not supported", 400, "UNSUPPORTED_TYPE");
  }
  throw new MediaSecurityError("Unsupported or corrupt media file", 400, "UNSUPPORTED_TYPE");
}

export function extensionFromName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (!normalized || normalized.includes("\0")) {
    throw new MediaSecurityError("Invalid filename", 400, "INVALID_FILENAME");
  }
  const segments = normalized.split(".");
  if (segments.length < 2) {
    throw new MediaSecurityError("A supported file extension is required", 400, "INVALID_EXTENSION");
  }
  if (segments.slice(1, -1).some((part) => DANGEROUS_EXTENSIONS.has(part))) {
    throw new MediaSecurityError("Suspicious double extension", 400, "INVALID_EXTENSION");
  }
  return segments.at(-1) ?? "";
}

export type FileLike = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type ValidatedMedia = {
  bytes: Uint8Array;
  originalName: string;
  mimeType: DetectedMediaType["mimeType"];
  type: MediaKind;
  extension: DetectedMediaType["extension"];
  size: number;
};

export function declaredMediaMaxBytes(file: Pick<FileLike, "name" | "type">, scope: MediaScope): number {
  if (scope !== "campaigns") return IMAGE_MAX_BYTES;
  let extension = "";
  try {
    extension = extensionFromName(file.name);
  } catch {
    return IMAGE_MAX_BYTES;
  }
  return file.type.toLowerCase() === "video/mp4" && extension === "mp4"
    ? VIDEO_MAX_BYTES
    : IMAGE_MAX_BYTES;
}

export function assertContentLength(
  contentLength: string | null | undefined,
  maxPayloadBytes: number,
): void {
  if (!contentLength) return;
  const parsed = Number(contentLength);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new MediaSecurityError("Invalid Content-Length", 400, "INVALID_CONTENT_LENGTH");
  }
  if (parsed > maxPayloadBytes + MAX_MULTIPART_OVERHEAD_BYTES) {
    throw new MediaSecurityError("Request exceeds the allowed size", 413, "REQUEST_TOO_LARGE");
  }
}

export async function validateMediaFile(file: FileLike, scope: MediaScope): Promise<ValidatedMedia> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new MediaSecurityError("No file uploaded", 400, "MISSING_FILE");
  }
  if (file.size <= 0) {
    throw new MediaSecurityError("Empty files are not allowed", 400, "EMPTY_FILE");
  }

  const preReadLimit = declaredMediaMaxBytes(file, scope);
  if (file.size > preReadLimit) {
    throw new MediaSecurityError("File exceeds the allowed size", 413, "FILE_TOO_LARGE");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size) {
    throw new MediaSecurityError("File size mismatch", 400, "SIZE_MISMATCH");
  }
  const detected = detectMediaType(bytes);
  if (file.size > detected.maxBytes) {
    throw new MediaSecurityError("File exceeds the allowed size", 413, "FILE_TOO_LARGE");
  }
  const extension = extensionFromName(file.name);
  if (MIME_BY_EXTENSION[extension] !== detected.mimeType) {
    throw new MediaSecurityError("File extension does not match its content", 400, "EXTENSION_MISMATCH");
  }
  if (file.type.toLowerCase() !== detected.mimeType) {
    throw new MediaSecurityError("Declared MIME type does not match file content", 400, "MIME_MISMATCH");
  }
  if (!PERMITTED_BY_SCOPE[scope].includes(detected.mimeType)) {
    throw new MediaSecurityError("This file type is not allowed for the selected section", 400, "TYPE_NOT_ALLOWED_FOR_SCOPE");
  }
  return {
    bytes,
    originalName: file.name,
    mimeType: detected.mimeType,
    type: detected.type,
    extension: detected.extension,
    size: file.size,
  };
}

export function validateFileCount(files: readonly unknown[]): void {
  if (files.length === 0) {
    throw new MediaSecurityError("No file uploaded", 400, "MISSING_FILE");
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    throw new MediaSecurityError("Only one file can be uploaded per request", 400, "TOO_MANY_FILES");
  }
}

export function buildAssetId(scope: MediaScope, randomId: string, extension: string): string {
  const uuid = new RegExp(`^${UUID_PATTERN}$`, "i");
  if (!uuid.test(randomId)) {
    throw new MediaSecurityError("Invalid generated asset identifier", 400, "INVALID_ASSET_ID");
  }
  return `${MEDIA_NAMESPACE}/${scope}/${randomId}.${extension}`;
}

export function assertSafeAssetId(assetId: string, scope: MediaScope): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(assetId);
  } catch {
    throw new MediaSecurityError("Invalid asset identifier", 400, "INVALID_ASSET_ID");
  }
  if (
    !decoded ||
    decoded.includes("\0") ||
    decoded.includes("..") ||
    decoded.includes("\\") ||
    decoded.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(decoded)
  ) {
    throw new MediaSecurityError("Unsafe asset identifier", 400, "UNSAFE_ASSET_ID");
  }
  const extensions = scope === "campaigns" ? "jpg|png|webp|mp4" : "jpg|png|webp";
  const exact = new RegExp(`^${MEDIA_NAMESPACE}/${scope}/${UUID_PATTERN}\\.(${extensions})$`, "i");
  if (!exact.test(decoded)) {
    throw new MediaSecurityError("Asset is outside the permitted namespace", 400, "OUTSIDE_NAMESPACE");
  }
  return decoded;
}

export function managedAssetIdFromUrl(url: string, scope: MediaScope): string | null {
  try {
    const parsed = new URL(url);
    const marker = "/upload/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    let candidate = parsed.pathname.slice(markerIndex + marker.length);
    candidate = candidate.replace(/^v\d+\//, "");
    candidate = decodeURIComponent(candidate);
    return assertSafeAssetId(candidate, scope);
  } catch {
    return null;
  }
}

export type NormalizedUploadResponse = {
  url: string;
  assetId: string;
  type: MediaKind;
  mimeType: DetectedMediaType["mimeType"];
  size: number;
};

export function normalizeUploadResponse(input: NormalizedUploadResponse): NormalizedUploadResponse {
  return {
    url: input.url,
    assetId: input.assetId,
    type: input.type,
    mimeType: input.mimeType,
    size: input.size,
  };
}

export type SecureDeleteDependencies = {
  lookupUrl(assetId: string, scope: MediaScope): Promise<string | null>;
  isReferenced(url: string): Promise<boolean>;
  remove(assetId: string, scope: MediaScope): Promise<{ deleted: boolean; notFound: boolean }>;
};

export function createSecureMediaDeleter(dependencies: SecureDeleteDependencies) {
  return async (assetId: string, scope: MediaScope) => {
    const safeAssetId = assertSafeAssetId(assetId, scope);
    const url = await dependencies.lookupUrl(safeAssetId, scope);
    if (!url) return { deleted: false, notFound: true };
    if (await dependencies.isReferenced(url)) {
      return { deleted: false, notFound: false, inUse: true };
    }
    const result = await dependencies.remove(safeAssetId, scope);
    return { ...result, inUse: false };
  };
}

import { MediaSecurityError, type FileLike } from "./security-core";

export const ARCHIVE_MEDIA_MAX_BYTES = 30 * 1024 * 1024;

export type ValidatedArchiveMedia = {
  bytes: Uint8Array;
  extension: "pdf" | "xlsx" | "xls";
  mimeType:
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    | "application/vnd.ms-excel";
  size: number;
  originalName: string;
};

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function safeExtension(name: string): "pdf" | "xlsx" | "xls" {
  const normalized = name.trim().toLowerCase();
  if (!normalized || normalized.includes("\0")) {
    throw new MediaSecurityError("Invalid archive filename", 400, "INVALID_FILENAME");
  }
  const parts = normalized.split(".");
  if (parts.length < 2) {
    throw new MediaSecurityError("Archive file extension is required", 400, "INVALID_EXTENSION");
  }
  const dangerous = new Set(["exe", "dll", "js", "mjs", "cjs", "html", "htm", "svg", "sh", "bat", "cmd", "com", "scr"]);
  if (parts.slice(1, -1).some((part) => dangerous.has(part))) {
    throw new MediaSecurityError("Suspicious double extension", 400, "INVALID_EXTENSION");
  }
  const extension = parts.at(-1);
  if (extension !== "pdf" && extension !== "xlsx" && extension !== "xls") {
    throw new MediaSecurityError("Only PDF or Excel files are supported", 400, "UNSUPPORTED_TYPE");
  }
  return extension;
}

function detectArchiveType(bytes: Uint8Array): Pick<ValidatedArchiveMedia, "extension" | "mimeType"> {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { extension: "pdf", mimeType: "application/pdf" };
  }
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return { extension: "xls", mimeType: "application/vnd.ms-excel" };
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return {
      extension: "xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
  throw new MediaSecurityError("Unsupported or corrupt archive file", 400, "UNSUPPORTED_TYPE");
}

export async function validateArchiveMediaFile(file: FileLike): Promise<ValidatedArchiveMedia> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new MediaSecurityError("No archive file uploaded", 400, "MISSING_FILE");
  }
  if (file.size <= 0) {
    throw new MediaSecurityError("Empty files are not allowed", 400, "EMPTY_FILE");
  }
  if (file.size > ARCHIVE_MEDIA_MAX_BYTES) {
    throw new MediaSecurityError("Archive file exceeds 30MB", 413, "FILE_TOO_LARGE");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size) {
    throw new MediaSecurityError("Archive file size mismatch", 400, "SIZE_MISMATCH");
  }
  const expectedExtension = safeExtension(file.name);
  const detected = detectArchiveType(bytes);
  if (expectedExtension !== detected.extension) {
    throw new MediaSecurityError("Archive extension does not match file content", 400, "EXTENSION_MISMATCH");
  }
  if (file.type.toLowerCase() !== detected.mimeType) {
    throw new MediaSecurityError("Archive MIME type does not match file content", 400, "MIME_MISMATCH");
  }
  return {
    bytes,
    extension: detected.extension,
    mimeType: detected.mimeType,
    size: file.size,
    originalName: file.name,
  };
}

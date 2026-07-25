import * as XLSX from "xlsx";
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

function containsAscii(bytes: Uint8Array, needle: string): boolean {
  const encoded = new TextEncoder().encode(needle);
  outer: for (let index = 0; index <= bytes.length - encoded.length; index += 1) {
    for (let offset = 0; offset < encoded.length; offset += 1) {
      if (bytes[index + offset] !== encoded[offset]) continue outer;
    }
    return true;
  }
  return false;
}

function containsUtf16Le(bytes: Uint8Array, needle: string): boolean {
  const encoded = new Uint8Array(needle.length * 2);
  for (let index = 0; index < needle.length; index += 1) {
    encoded[index * 2] = needle.charCodeAt(index);
    encoded[index * 2 + 1] = 0;
  }
  outer: for (let index = 0; index <= bytes.length - encoded.length; index += 1) {
    for (let offset = 0; offset < encoded.length; offset += 1) {
      if (bytes[index + offset] !== encoded[offset]) continue outer;
    }
    return true;
  }
  return false;
}

function parseWorkbook(bytes: Uint8Array): void {
  try {
    const workbook = XLSX.read(Buffer.from(bytes), {
      type: "buffer",
      bookSheets: true,
      bookProps: true,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
    });
    if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
      throw new Error("Workbook contains no sheets");
    }
  } catch {
    throw new MediaSecurityError("Invalid Excel workbook structure", 400, "CORRUPT_WORKBOOK");
  }
}

function verifyPdf(bytes: Uint8Array): void {
  if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    throw new MediaSecurityError("Invalid PDF signature", 400, "CORRUPT_PDF");
  }
  const tailStart = Math.max(0, bytes.length - 2048);
  const tail = new TextDecoder().decode(bytes.slice(tailStart));
  if (!tail.includes("%%EOF")) {
    throw new MediaSecurityError("Incomplete PDF file", 400, "CORRUPT_PDF");
  }
}

function verifyXlsx(bytes: Uint8Array): void {
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    throw new MediaSecurityError("Invalid XLSX container", 400, "CORRUPT_XLSX");
  }
  if (!containsAscii(bytes, "[Content_Types].xml") || !containsAscii(bytes, "xl/workbook.xml")) {
    throw new MediaSecurityError("ZIP file is not an XLSX workbook", 400, "CORRUPT_XLSX");
  }
  parseWorkbook(bytes);
}

function verifyXls(bytes: Uint8Array): void {
  if (!startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    throw new MediaSecurityError("Invalid XLS container", 400, "CORRUPT_XLS");
  }
  if (!containsUtf16Le(bytes, "Workbook") && !containsUtf16Le(bytes, "Book")) {
    throw new MediaSecurityError("OLE file does not contain an Excel workbook stream", 400, "CORRUPT_XLS");
  }
  parseWorkbook(bytes);
}

const EXPECTED_MIME = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
} as const;

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

  const expectedExtension = safeExtension(file.name);
  const expectedMime = EXPECTED_MIME[expectedExtension];
  if (file.type.toLowerCase() !== expectedMime) {
    throw new MediaSecurityError("Archive MIME type does not match its extension", 400, "MIME_MISMATCH");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size) {
    throw new MediaSecurityError("Archive file size mismatch", 400, "SIZE_MISMATCH");
  }

  if (expectedExtension === "pdf") verifyPdf(bytes);
  else if (expectedExtension === "xlsx") verifyXlsx(bytes);
  else verifyXls(bytes);

  return {
    bytes,
    extension: expectedExtension,
    mimeType: expectedMime,
    size: file.size,
    originalName: file.name,
  };
}

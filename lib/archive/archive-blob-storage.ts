import "server-only";

import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";

export const ARCHIVE_BLOB_NAMESPACE = "gozbebekleri/archive";

export type ArchiveBlobStoredFile = {
  storageMode: "BLOB";
  blobUrl: string;
  blobDownloadUrl: string;
  blobPathname: string;
};

export function archiveBlobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function archiveFolder(category: string): "documents" | "marketing" {
  return category === "DOCUMENTS" ? "documents" : "marketing";
}

export function buildArchiveBlobPath(category: string, extension: string): string {
  const normalizedExtension = extension.toLowerCase();
  if (!/^(pdf|xlsx|xls)$/.test(normalizedExtension)) {
    throw new Error("Unsupported archive extension");
  }
  return `${ARCHIVE_BLOB_NAMESPACE}/${archiveFolder(category)}/${randomUUID()}.${normalizedExtension}`;
}

export function assertArchiveBlobPathname(pathname: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new Error("Invalid archive asset identifier");
  }
  if (
    !decoded ||
    decoded.includes("\0") ||
    decoded.includes("..") ||
    decoded.includes("\\") ||
    decoded.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(decoded) ||
    !decoded.startsWith(`${ARCHIVE_BLOB_NAMESPACE}/`) ||
    !/^gozbebekleri\/archive\/(documents|marketing)\/[a-f0-9-]+\.(pdf|xlsx|xls)$/i.test(decoded)
  ) {
    throw new Error("Archive asset is outside the permitted namespace");
  }
  return decoded;
}

export async function storeArchiveBlobFile(args: {
  category: string;
  extension: string;
  contentType: string;
  body: BodyInit | Buffer;
}): Promise<ArchiveBlobStoredFile> {
  const pathname = buildArchiveBlobPath(args.category, args.extension);
  const blob = await put(pathname, args.body, {
    access: "private",
    addRandomSuffix: false,
    contentType: args.contentType,
  });

  return {
    storageMode: "BLOB",
    blobUrl: blob.url,
    blobDownloadUrl: "downloadUrl" in blob && typeof blob.downloadUrl === "string" ? blob.downloadUrl : blob.url,
    blobPathname: blob.pathname,
  };
}

export async function deleteArchiveBlobFile(pathname: string): Promise<{ deleted: boolean; notFound: boolean }> {
  if (!pathname) return { deleted: false, notFound: true };
  const safePathname = assertArchiveBlobPathname(pathname);
  try {
    await del(safePathname);
    return { deleted: true, notFound: false };
  } catch (error) {
    const candidate = error as { status?: number; statusCode?: number };
    if (candidate.status === 404 || candidate.statusCode === 404) {
      return { deleted: false, notFound: true };
    }
    throw error;
  }
}

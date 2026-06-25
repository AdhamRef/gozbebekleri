import { prisma } from "@/lib/prisma";
import { requireArchiveApiAccess, requireArchiveUploadedFileListAccess } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, context: Params) {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const row = await prisma.auditLog.findUnique({ where: { id }, select: { id: true, metadata: true, action: true, entityType: true } });
  if (!row || row.action !== "archive.uploadedFile.create" || row.entityType !== "ArchiveUploadedFile") {
    return new Response("Not found", { status: 404 });
  }

  const metadata = metadataObject(row.metadata);
  if (stringField(metadata.category) === "DOCUMENTS") {
    const docsAccess = await requireArchiveUploadedFileListAccess("DOCUMENTS");
    if (docsAccess.denied) return docsAccess.denied;
  }

  const fileName = safeFileName(stringField(metadata.fileName) || stringField(metadata.title) || "archive-file");
  const mimeType = stringField(metadata.mimeType) || "application/octet-stream";
  const blobDownloadUrl = stringField(metadata.blobDownloadUrl) || stringField(metadata.blobUrl);
  if (stringField(metadata.storageMode) === "BLOB" && blobDownloadUrl) {
    const response = await fetch(blobDownloadUrl, { cache: "no-store" });
    if (!response.ok || !response.body) return new Response("Not found", { status: 404 });
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  }

  const base64 = await readStoredBase64(row.id, metadata);
  if (!base64) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(base64, "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}

async function readStoredBase64(id: string, metadata: Record<string, unknown>) {
  const inline = stringField(metadata.base64);
  if (inline) return inline;

  const rows = await prisma.auditLog.findMany({
    where: { action: "archive.uploadedFile.chunk", entityType: "ArchiveUploadedFileChunk", entityId: id },
    orderBy: { createdAt: "asc" },
    select: { metadata: true },
  });

  return rows
    .map((row) => {
      const chunkMetadata = metadataObject(row.metadata);
      return { index: numberField(chunkMetadata.index), base64: stringField(chunkMetadata.base64) };
    })
    .filter((chunk) => chunk.base64)
    .sort((a, b) => a.index - b.index)
    .map((chunk) => chunk.base64)
    .join("");
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(value: unknown) { return typeof value === "string" ? value : ""; }
function numberField(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function safeFileName(value: string) { return value.replace(/[\\/\u0000-\u001f]/g, "-"); }

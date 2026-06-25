import { archiveBlobEnabled, storeArchiveBlobFile } from "@/lib/archive/archive-blob-storage";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveActionAccess } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function POST(_request: Request, context: Params) {
  const { denied } = await requireArchiveActionAccess("archiveUpload");
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const parent = await prisma.auditLog.findUnique({ where: { id }, select: { id: true, action: true, entityType: true, metadata: true } });
  if (!parent || parent.action !== "archive.uploadedFile.create" || parent.entityType !== "ArchiveUploadedFile") {
    return jsonNoStore({ ok: false, error: "ملف الرفع غير موجود" }, { status: 404 });
  }

  const metadata = metadataObject(parent.metadata);
  const expected = numberField(metadata.chunkCount);
  const chunks = await prisma.auditLog.findMany({
    where: { action: "archive.uploadedFile.chunk", entityType: "ArchiveUploadedFileChunk", entityId: id },
    select: { metadata: true },
  });
  const normalized = chunks.map((row) => metadataObject(row.metadata)).sort((a, b) => numberField(a.index) - numberField(b.index));
  const indexes = new Set(normalized.map((item) => numberField(item.index)));

  if (!expected || indexes.size < expected) {
    return jsonNoStore({ ok: false, error: "لم تكتمل كل أجزاء الملف" }, { status: 400 });
  }

  let storagePatch: Record<string, unknown> = { uploadStatus: "READY" };
  if (archiveBlobEnabled()) {
    const base64 = normalized.map((item) => stringField(item.base64)).join("");
    try {
      const buffer = Buffer.from(base64, "base64");
      const blob = await storeArchiveBlobFile({
        category: stringField(metadata.category),
        fileName: stringField(metadata.fileName) || `archive-${id}`,
        contentType: stringField(metadata.mimeType) || "application/octet-stream",
        body: buffer,
      });
      storagePatch = { ...storagePatch, ...blob, chunkCount: 0, base64: undefined };
      await prisma.auditLog.deleteMany({ where: { action: "archive.uploadedFile.chunk", entityType: "ArchiveUploadedFileChunk", entityId: id } });
    } catch {
      storagePatch = { ...storagePatch, storageMode: "CLIENT_CHUNKED" };
    }
  }

  await prisma.auditLog.update({
    where: { id },
    data: {
      metadata: {
        ...metadata,
        ...storagePatch,
      },
      messageAr: "تم رفع الملف داخل الأرشيف",
      messageEn: "Archive uploaded file completed",
    },
  });

  return jsonNoStore({ ok: true, message: "تم رفع الملف" });
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

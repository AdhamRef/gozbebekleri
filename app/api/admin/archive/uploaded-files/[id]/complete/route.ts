import {
  archiveBlobEnabled,
  deleteArchiveBlobFile,
  storeArchiveBlobFile,
  type ArchiveBlobStoredFile,
} from "@/lib/archive/archive-blob-storage";
import { metadataObject, numberField, stringField } from "@/lib/archive/uploaded-files";
import { validateArchiveMediaFile } from "@/lib/media/archive-security";
import { MediaSecurityError } from "@/lib/media/security-core";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveActionAccess } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function POST(_request: Request, context: Params) {
  const { denied } = await requireArchiveActionAccess("archiveUpload");
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const parent = await prisma.auditLog.findUnique({
    where: { id },
    select: { id: true, action: true, entityType: true, metadata: true },
  });
  if (!parent || parent.action !== "archive.uploadedFile.create" || parent.entityType !== "ArchiveUploadedFile") {
    return jsonNoStore({ ok: false, error: "ملف الرفع غير موجود" }, { status: 404 });
  }

  const metadata = metadataObject(parent.metadata);
  const chunks = await readUploadChunks(id);
  const expected = numberField(metadata.chunkCount);
  const receivedIndexes = new Set(chunks.map((item) => numberField(item.index)));

  if (!expected || receivedIndexes.size < expected) {
    return jsonNoStore({ ok: false, error: "لم تكتمل كل أجزاء الملف" }, { status: 400 });
  }

  try {
    const storagePatch = await buildStoragePatch(metadata, chunks);
    try {
      await prisma.auditLog.update({
        where: { id },
        data: {
          metadata: { ...metadata, ...storagePatch, uploadStatus: "READY" },
          messageAr: "تم رفع الملف داخل الأرشيف",
          messageEn: "Archive uploaded file completed",
        },
      });
      if (storagePatch.storageMode === "BLOB") {
        await prisma.auditLog.deleteMany({
          where: {
            action: "archive.uploadedFile.chunk",
            entityType: "ArchiveUploadedFileChunk",
            entityId: id,
          },
        });
      }
    } catch (error) {
      if (storagePatch.storageMode === "BLOB") {
        await deleteArchiveBlobFile(storagePatch.blobPathname).catch(() => undefined);
      }
      throw error;
    }

    return jsonNoStore({ ok: true, message: "تم رفع الملف" });
  } catch (error) {
    if (error instanceof MediaSecurityError) {
      return jsonNoStore({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Archive completion failed");
    return jsonNoStore({ ok: false, error: "تعذر إكمال رفع الملف" }, { status: 500 });
  }
}

async function readUploadChunks(fileId: string) {
  const rows = await prisma.auditLog.findMany({
    where: {
      action: "archive.uploadedFile.chunk",
      entityType: "ArchiveUploadedFileChunk",
      entityId: fileId,
    },
    select: { metadata: true },
  });
  return rows
    .map((row) => metadataObject(row.metadata))
    .sort((a, b) => numberField(a.index) - numberField(b.index));
}

async function buildStoragePatch(
  metadata: Record<string, unknown>,
  chunks: Record<string, unknown>[],
): Promise<ArchiveBlobStoredFile | { storageMode: "CLIENT_CHUNKED" }> {
  const base64 = chunks.map((item) => stringField(item.base64)).join("");
  const buffer = Buffer.from(base64, "base64");
  const validated = await validateArchiveMediaFile({
    name: stringField(metadata.fileName),
    type: stringField(metadata.mimeType),
    size: buffer.byteLength,
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  });

  if (!archiveBlobEnabled()) return { storageMode: "CLIENT_CHUNKED" };

  return storeArchiveBlobFile({
    category: stringField(metadata.category),
    extension: validated.extension,
    contentType: validated.mimeType,
    body: Buffer.from(validated.bytes),
  });
}

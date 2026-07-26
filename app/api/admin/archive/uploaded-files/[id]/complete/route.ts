import {
  archiveBlobEnabled,
  deleteArchiveBlobFile,
  storeArchiveBlobFile,
  type ArchiveBlobStoredFile,
} from "@/lib/archive/archive-blob-storage";
import { metadataObject, numberField, stringField } from "@/lib/archive/uploaded-files";
import {
  validateArchiveCompletion,
  assembleValidatedChunks,
  type ArchiveUploadParent,
  type ExistingArchiveChunk,
} from "@/lib/media/archive-chunks-core";
import { validateArchiveMediaFile } from "@/lib/media/archive-security";
import { MediaSecurityError } from "@/lib/media/security-core";
import { prisma } from "@/lib/prisma";
import {
  jsonNoStore,
  requireArchiveActionAccess,
  requireArchiveUploadedFileListAccess,
} from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function POST(_request: Request, context: Params) {
  const { denied } = await requireArchiveActionAccess("archiveUpload");
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const parentRow = await prisma.auditLog.findUnique({
    where: { id },
    select: { id: true, action: true, entityType: true, metadata: true },
  });
  if (!parentRow || parentRow.action !== "archive.uploadedFile.create" || parentRow.entityType !== "ArchiveUploadedFile") {
    return jsonNoStore({ ok: false, error: "ملف الرفع غير موجود" }, { status: 404 });
  }

  const metadata = metadataObject(parentRow.metadata);
  const parent: ArchiveUploadParent = {
    uploadStatus: stringField(metadata.uploadStatus),
    category: stringField(metadata.category),
    chunkCount: numberField(metadata.chunkCount),
    sizeBytes: numberField(metadata.sizeBytes),
  };
  if (parent.category === "DOCUMENTS") {
    const documentsAccess = await requireArchiveUploadedFileListAccess("DOCUMENTS");
    if (documentsAccess.denied) return documentsAccess.denied;
  }
  if (parent.uploadStatus !== "UPLOADING") {
    return jsonNoStore({ ok: false, error: "الملف قيد المعالجة أو مكتمل" }, { status: 409 });
  }

  const claimed = await prisma.auditLog.updateMany({
    where: {
      id,
      metadata: { path: ["uploadStatus"], equals: "UPLOADING" },
    },
    data: {
      metadata: { ...metadata, uploadStatus: "PROCESSING" },
    },
  });
  if (claimed.count !== 1) {
    return jsonNoStore({ ok: false, error: "تم بدء إكمال الملف بالفعل" }, { status: 409 });
  }

  let storagePatch: ArchiveBlobStoredFile | { storageMode: "CLIENT_CHUNKED" } | null = null;
  try {
    const processingParent: ArchiveUploadParent = { ...parent, uploadStatus: "PROCESSING" };
    const chunks = await readUploadChunks(id);
    const ordered = validateArchiveCompletion({ parent: { ...processingParent, uploadStatus: "UPLOADING" }, chunks });
    const buffer = assembleValidatedChunks(ordered);
    const bytes = Uint8Array.from(buffer);
    const validated = await validateArchiveMediaFile({
      name: stringField(metadata.fileName),
      type: stringField(metadata.mimeType),
      size: bytes.byteLength,
      arrayBuffer: async () => bytes.buffer,
    });

    storagePatch = await buildStoragePatch(parent.category, validated);
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

    return jsonNoStore({ ok: true, message: "تم رفع الملف" });
  } catch (error) {
    if (storagePatch?.storageMode === "BLOB") {
      await deleteArchiveBlobFile(storagePatch.blobPathname).catch(() => undefined);
    }
    await prisma.auditLog.updateMany({
      where: {
        id,
        metadata: { path: ["uploadStatus"], equals: "PROCESSING" },
      },
      data: { metadata: { ...metadata, uploadStatus: "UPLOADING" } },
    }).catch(() => undefined);

    if (error instanceof MediaSecurityError) {
      return jsonNoStore({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Archive completion failed");
    return jsonNoStore({ ok: false, error: "تعذر إكمال رفع الملف" }, { status: 500 });
  }
}

async function readUploadChunks(fileId: string): Promise<ExistingArchiveChunk[]> {
  const rows = await prisma.auditLog.findMany({
    where: {
      action: "archive.uploadedFile.chunk",
      entityType: "ArchiveUploadedFileChunk",
      entityId: fileId,
    },
    select: { metadata: true },
  });
  return rows.map((row) => {
    const metadata = metadataObject(row.metadata);
    return {
      index: numberField(metadata.index),
      total: numberField(metadata.total),
      sizeBytes: numberField(metadata.sizeBytes),
      base64: stringField(metadata.base64),
    };
  });
}

async function buildStoragePatch(
  category: string,
  validated: Awaited<ReturnType<typeof validateArchiveMediaFile>>,
): Promise<ArchiveBlobStoredFile | { storageMode: "CLIENT_CHUNKED" }> {
  if (!archiveBlobEnabled()) return { storageMode: "CLIENT_CHUNKED" };
  return storeArchiveBlobFile({
    category,
    extension: validated.extension,
    contentType: validated.mimeType,
    body: Buffer.from(validated.bytes),
  });
}

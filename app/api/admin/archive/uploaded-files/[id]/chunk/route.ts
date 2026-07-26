import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { ARCHIVE_CLIENT_CHUNK_MAX_BYTES } from "@/lib/archive/uploaded-files";
import { metadataObject, numberField, stringField } from "@/lib/archive/uploaded-files";
import {
  validateArchiveChunkRequest,
  type ArchiveUploadParent,
  type ExistingArchiveChunk,
} from "@/lib/media/archive-chunks-core";
import { MediaSecurityError, assertContentLength } from "@/lib/media/security-core";
import { prisma } from "@/lib/prisma";
import {
  jsonNoStore,
  requireArchiveActionAccess,
  requireArchiveUploadedFileListAccess,
} from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

function chunkRecordId(uploadId: string, index: number): string {
  return `archive-chunk-${createHash("sha256").update(`${uploadId}:${index}`).digest("hex")}`;
}

function mediaError(error: unknown) {
  if (error instanceof MediaSecurityError) {
    return jsonNoStore({ ok: false, error: error.message, code: error.code }, { status: error.status });
  }
  console.error("Archive chunk upload failed");
  return jsonNoStore({ ok: false, error: "تعذر حفظ جزء الملف" }, { status: 500 });
}

export async function POST(request: Request, context: Params) {
  const { session, denied } = await requireArchiveActionAccess("archiveUpload");
  if (denied) return denied;
  if (!session?.user) return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    assertContentLength(request.headers.get("content-length"), ARCHIVE_CLIENT_CHUNK_MAX_BYTES);
    const { id } = await Promise.resolve(context.params);
    const parentRow = await prisma.auditLog.findUnique({
      where: { id },
      select: { id: true, action: true, entityType: true, metadata: true },
    });
    if (!parentRow || parentRow.action !== "archive.uploadedFile.create" || parentRow.entityType !== "ArchiveUploadedFile") {
      return jsonNoStore({ ok: false, error: "ملف الرفع غير موجود" }, { status: 404 });
    }

    const parentMetadata = metadataObject(parentRow.metadata);
    const parent: ArchiveUploadParent = {
      uploadStatus: stringField(parentMetadata.uploadStatus),
      category: stringField(parentMetadata.category),
      chunkCount: numberField(parentMetadata.chunkCount),
      sizeBytes: numberField(parentMetadata.sizeBytes),
    };
    if (parent.category === "DOCUMENTS") {
      const documentsAccess = await requireArchiveUploadedFileListAccess("DOCUMENTS");
      if (documentsAccess.denied) return documentsAccess.denied;
    }
    if (parent.uploadStatus !== "UPLOADING") {
      return jsonNoStore({ ok: false, error: "الرفع غير متاح في الحالة الحالية" }, { status: 409 });
    }

    const formData = await request.formData();
    const index = Number(formData.get("index"));
    const total = Number(formData.get("total"));
    const chunk = formData.get("chunk");
    if (!(chunk instanceof File)) {
      return jsonNoStore({ ok: false, error: "جزء الملف غير موجود" }, { status: 400 });
    }
    if (chunk.size > ARCHIVE_CLIENT_CHUNK_MAX_BYTES) {
      return jsonNoStore({ ok: false, error: "حجم جزء الملف كبير" }, { status: 413 });
    }

    const existingRows = await prisma.auditLog.findMany({
      where: {
        action: "archive.uploadedFile.chunk",
        entityType: "ArchiveUploadedFileChunk",
        entityId: id,
      },
      select: { metadata: true },
    });
    const existing: ExistingArchiveChunk[] = existingRows.map((row) => {
      const metadata = metadataObject(row.metadata);
      return {
        index: numberField(metadata.index),
        total: numberField(metadata.total),
        sizeBytes: numberField(metadata.sizeBytes),
      };
    });

    const validation = validateArchiveChunkRequest({
      parent,
      index,
      total,
      chunkSize: chunk.size,
      existing,
    });
    if (validation.duplicate) {
      return jsonNoStore({ ok: true, index, duplicate: true });
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    if (buffer.byteLength !== chunk.size) {
      throw new MediaSecurityError("Chunk size mismatch", 400, "SIZE_MISMATCH");
    }
    const actor = auditActorFromDashboardSession(session);
    try {
      await prisma.auditLog.create({
        data: {
          id: chunkRecordId(id, index),
          ...actor,
          action: "archive.uploadedFile.chunk",
          messageAr: "تم حفظ جزء من ملف أرشيفي",
          messageEn: "Archive uploaded file chunk saved",
          entityType: "ArchiveUploadedFileChunk",
          entityId: id,
          metadata: {
            fileId: id,
            index,
            total,
            sizeBytes: buffer.byteLength,
            base64: buffer.toString("base64"),
          },
          stream: "TEAM",
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return jsonNoStore({ ok: true, index, duplicate: true });
      }
      throw error;
    }

    return jsonNoStore({ ok: true, index, duplicate: false });
  } catch (error) {
    return mediaError(error);
  }
}

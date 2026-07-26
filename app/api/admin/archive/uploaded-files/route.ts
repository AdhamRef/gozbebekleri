import { auditActorFromDashboardSession } from "@/lib/audit-log";
import {
  archiveBlobEnabled,
  deleteArchiveBlobFile,
  storeArchiveBlobFile,
  type ArchiveBlobStoredFile,
} from "@/lib/archive/archive-blob-storage";
import { getArchiveRepositorySnapshot, type ArchiveFoundationData } from "@/lib/archive/archive-repository";
import {
  ARCHIVE_BASE64_CHUNK_SIZE,
  ARCHIVE_MAX_FILE_BYTES,
  archiveUploadMessage,
  archiveUploadMessageEn,
  buildArchiveUploadReferences,
  chunkString,
  defaultArchiveFileCategory,
  parseArchiveUploadCategory,
  toArchiveUploadedFileItem,
  validArchiveCollectionId,
  validArchiveProjectId,
  type ArchiveUploadCategory,
  type ArchiveUploadedFileItem,
} from "@/lib/archive/uploaded-files";
import { MediaSecurityError, assertContentLength, validateFileCount } from "@/lib/media/security-core";
import { validateArchiveMediaFile } from "@/lib/media/archive-security";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveActionAccess, requireArchiveUploadedFileListAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY_ARCHIVE_FOUNDATION: ArchiveFoundationData = {
  collections: [], projects: [], driveLinks: [], assets: [], videoFrames: [],
};

export async function GET(request: Request) {
  const category = parseArchiveUploadCategory(new URL(request.url).searchParams.get("category"));
  if (!category) return jsonNoStore({ ok: false, error: "Invalid category" }, { status: 400 });

  const { denied } = await requireArchiveUploadedFileListAccess(category);
  if (denied) return denied;

  const snapshot = await getArchiveRepositorySnapshot(EMPTY_ARCHIVE_FOUNDATION);
  const references = buildArchiveUploadReferences(snapshot.collections, snapshot.projects);
  const rows = await prisma.auditLog.findMany({
    where: { action: "archive.uploadedFile.create", entityType: "ArchiveUploadedFile" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, createdAt: true, actorName: true, metadata: true },
  });

  const files = rows
    .map((row) => toArchiveUploadedFileItem(row, references))
    .filter((file): file is ArchiveUploadedFileItem => file !== null && file.category === category);

  return jsonNoStore({ ok: true, files, references, storage: { blobEnabled: archiveBlobEnabled() } });
}

export async function POST(request: Request) {
  const { session, denied } = await requireArchiveActionAccess("archiveUpload");
  if (denied) return denied;
  if (!session?.user) return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });

  const authorizedCategory = parseArchiveUploadCategory(new URL(request.url).searchParams.get("category"));
  if (!authorizedCategory) {
    return jsonNoStore({ ok: false, error: "اختر نوع الملف" }, { status: 400 });
  }
  if (authorizedCategory === "DOCUMENTS") {
    const docsAccess = await requireArchiveUploadedFileListAccess("DOCUMENTS");
    if (docsAccess.denied) return docsAccess.denied;
  }

  try {
    assertContentLength(request.headers.get("content-length"), ARCHIVE_MAX_FILE_BYTES);
    const formData = await request.formData();
    const files = formData.getAll("file").filter((value): value is File => value instanceof File);
    validateFileCount(files);

    const bodyCategory = parseArchiveUploadCategory(String(formData.get("category") || ""));
    if (!bodyCategory || bodyCategory !== authorizedCategory) {
      return jsonNoStore({ ok: false, error: "نوع الملف لا يطابق القسم المصرح" }, { status: 400 });
    }
    const category = authorizedCategory;
    const title = String(formData.get("title") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const uploadFile = files[0];
    if (!uploadFile) throw new MediaSecurityError("No file uploaded", 400, "MISSING_FILE");
    const validated = await validateArchiveMediaFile(uploadFile);
    const snapshot = await getArchiveRepositorySnapshot(EMPTY_ARCHIVE_FOUNDATION);
    const references = buildArchiveUploadReferences(snapshot.collections, snapshot.projects);
    const linkedCollectionId = validArchiveCollectionId(String(formData.get("linkedCollectionId") || ""), references);
    const linkedProjectId = validArchiveProjectId(String(formData.get("linkedProjectId") || ""), references);
    const actor = auditActorFromDashboardSession(session);
    const buffer = Buffer.from(validated.bytes);
    const blob = await tryStoreBlob({ category, extension: validated.extension, mimeType: validated.mimeType, buffer });
    const base64 = blob ? "" : buffer.toString("base64");
    const chunks = blob ? [] : chunkString(base64, ARCHIVE_BASE64_CHUNK_SIZE);

    try {
      const row = await prisma.auditLog.create({
        data: {
          ...actor,
          action: "archive.uploadedFile.create",
          messageAr: archiveUploadMessage(category, "direct"),
          messageEn: archiveUploadMessageEn(category, "direct"),
          entityType: "ArchiveUploadedFile",
          metadata: {
            category,
            title: title || validated.originalName,
            notes: notes || undefined,
            fileName: validated.originalName,
            mimeType: validated.mimeType,
            sizeBytes: validated.size,
            extension: validated.extension,
            linkedCollectionId,
            linkedProjectId,
            fileCategory: defaultArchiveFileCategory(category),
            reviewStatus: "NEW",
            storageMode: blob?.storageMode || (chunks.length > 1 ? "CHUNKED" : "INLINE"),
            blobUrl: blob?.blobUrl,
            blobDownloadUrl: blob?.blobDownloadUrl,
            blobPathname: blob?.blobPathname,
            chunkCount: blob ? 0 : chunks.length,
            uploadStatus: "READY",
            base64: !blob && chunks.length === 1 ? base64 : undefined,
          },
          stream: "TEAM",
        },
      });

      if (!blob && chunks.length > 1) await saveArchiveChunks(row.id, chunks, actor);
      return jsonNoStore({ ok: true, file: toArchiveUploadedFileItem(row, references), message: "تم رفع الملف" });
    } catch (error) {
      if (blob?.blobPathname) await deleteArchiveBlobFile(blob.blobPathname).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof MediaSecurityError) {
      return jsonNoStore({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Archive upload failed");
    return jsonNoStore({ ok: false, error: "تعذر رفع الملف" }, { status: 500 });
  }
}

async function saveArchiveChunks(fileId: string, chunks: string[], actor: ReturnType<typeof auditActorFromDashboardSession>) {
  for (let index = 0; index < chunks.length; index += 1) {
    await prisma.auditLog.create({
      data: {
        ...actor,
        action: "archive.uploadedFile.chunk",
        messageAr: "تم حفظ جزء من ملف أرشيفي",
        messageEn: "Archive uploaded file chunk saved",
        entityType: "ArchiveUploadedFileChunk",
        entityId: fileId,
        metadata: { fileId, index, total: chunks.length, base64: chunks[index] },
        stream: "TEAM",
      },
    });
  }
}

async function tryStoreBlob(args: {
  category: ArchiveUploadCategory;
  extension: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<ArchiveBlobStoredFile | null> {
  if (!archiveBlobEnabled()) return null;
  try {
    return await storeArchiveBlobFile({
      category: args.category,
      extension: args.extension,
      contentType: args.mimeType,
      body: args.buffer,
    });
  } catch {
    return null;
  }
}

import {
  assertArchiveBlobPathname,
  deleteArchiveBlobFile,
} from "@/lib/archive/archive-blob-storage";
import { getArchiveRepositorySnapshot } from "@/lib/archive/archive-repository";
import {
  buildArchiveUploadReferences,
  cleanText,
  metadataObject,
  stringField,
  validArchiveCollectionId,
  validArchiveProjectId,
  type ArchiveReviewStatus,
} from "@/lib/archive/uploaded-files";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveActionAccess, requireArchiveUploadedFileListAccess } from "../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

const allowedStatuses: ArchiveReviewStatus[] = ["NEW", "REVIEWED", "IMPORTANT"];

export async function PATCH(request: Request, context: Params) {
  const { denied } = await requireArchiveActionAccess("archiveUpload");
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const row = await findArchiveUploadedFile(id);
  if (!row) return jsonNoStore({ ok: false, error: "الملف غير موجود" }, { status: 404 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const metadata = metadataObject(row.metadata);
  const docsDenied = await requireDocumentsAccessIfNeeded(metadata);
  if (docsDenied) return docsDenied;

  const references = await getReferences();
  const title = cleanText(body?.title, 160) || stringField(metadata.title) || stringField(metadata.fileName) || "ملف";
  const notes = cleanText(body?.notes, 500);
  const fileCategory = cleanText(body?.fileCategory, 120) || stringField(metadata.fileCategory) || "عام";
  const reviewStatus = parseReviewStatus(body?.reviewStatus, stringField(metadata.reviewStatus));

  await prisma.auditLog.update({
    where: { id },
    data: {
      metadata: {
        ...metadata,
        title,
        notes: notes || undefined,
        fileCategory,
        reviewStatus,
        linkedCollectionId: validArchiveCollectionId(String(body?.linkedCollectionId || ""), references),
        linkedProjectId: validArchiveProjectId(String(body?.linkedProjectId || ""), references),
      },
      messageAr: "تم تعديل بيانات ملف أرشيفي",
      messageEn: "Archive uploaded file metadata updated",
    },
  });

  return jsonNoStore({ ok: true, message: "تم حفظ التعديل" });
}

export async function DELETE(_request: Request, context: Params) {
  const { denied } = await requireArchiveActionAccess("archiveDelete");
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const row = await findArchiveUploadedFile(id);
  if (!row) {
    return jsonNoStore({ ok: true, deleted: false, notFound: true, message: "الملف غير موجود" });
  }

  const metadata = metadataObject(row.metadata);
  const docsDenied = await requireDocumentsAccessIfNeeded(metadata);
  if (docsDenied) return docsDenied;

  const blobPathname = stringField(metadata.blobPathname);
  if (blobPathname) {
    let safePathname: string;
    try {
      safePathname = assertArchiveBlobPathname(blobPathname);
    } catch {
      return jsonNoStore(
        { ok: false, error: "معرّف الملف خارج نطاق التخزين المسموح" },
        { status: 400 },
      );
    }

    if (await archiveBlobUsedByAnotherRecord(id, safePathname)) {
      return jsonNoStore(
        { ok: false, error: "الملف مستخدم في سجل آخر" },
        { status: 409 },
      );
    }
    await deleteArchiveBlobFile(safePathname);
  }

  await prisma.auditLog.deleteMany({
    where: {
      action: "archive.uploadedFile.chunk",
      entityType: "ArchiveUploadedFileChunk",
      entityId: id,
    },
  });
  await prisma.auditLog.delete({ where: { id } });
  return jsonNoStore({ ok: true, deleted: true, notFound: false, message: "تم حذف الملف" });
}

async function archiveBlobUsedByAnotherRecord(currentId: string, pathname: string): Promise<boolean> {
  const rows = await prisma.auditLog.findMany({
    where: {
      action: "archive.uploadedFile.create",
      entityType: "ArchiveUploadedFile",
      id: { not: currentId },
    },
    select: { metadata: true },
    take: 500,
  });
  return rows.some((candidate) => stringField(metadataObject(candidate.metadata).blobPathname) === pathname);
}

async function findArchiveUploadedFile(id: string) {
  const row = await prisma.auditLog.findUnique({
    where: { id },
    select: { id: true, action: true, entityType: true, metadata: true },
  });
  if (!row || row.action !== "archive.uploadedFile.create" || row.entityType !== "ArchiveUploadedFile") return null;
  return row;
}

async function getReferences() {
  const snapshot = await getArchiveRepositorySnapshot();
  return buildArchiveUploadReferences(snapshot.collections, snapshot.projects);
}

async function requireDocumentsAccessIfNeeded(metadata: Record<string, unknown>) {
  if (stringField(metadata.category) !== "DOCUMENTS") return null;
  const docsAccess = await requireArchiveUploadedFileListAccess("DOCUMENTS");
  return docsAccess.denied;
}

function parseReviewStatus(value: unknown, fallback: string): ArchiveReviewStatus {
  return allowedStatuses.includes(String(value || "") as ArchiveReviewStatus)
    ? String(value) as ArchiveReviewStatus
    : (fallback as ArchiveReviewStatus || "NEW");
}

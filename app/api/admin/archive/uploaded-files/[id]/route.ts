import { deleteArchiveBlobFile } from "@/lib/archive/archive-blob-storage";
import { getArchiveRepositorySnapshot } from "@/lib/archive/archive-repository";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveActionAccess, requireArchiveUploadedFileListAccess } from "../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

const allowedStatuses = ["NEW", "REVIEWED", "IMPORTANT"];

export async function PATCH(request: Request, context: Params) {
  const { denied } = await requireArchiveActionAccess("archiveUpload");
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const row = await prisma.auditLog.findUnique({ where: { id }, select: { id: true, action: true, entityType: true, metadata: true } });
  if (!row || row.action !== "archive.uploadedFile.create" || row.entityType !== "ArchiveUploadedFile") {
    return jsonNoStore({ ok: false, error: "الملف غير موجود" }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const metadata = metadataObject(row.metadata);
  if (stringField(metadata.category) === "DOCUMENTS") {
    const docsAccess = await requireArchiveUploadedFileListAccess("DOCUMENTS");
    if (docsAccess.denied) return docsAccess.denied;
  }

  const snapshot = await getArchiveRepositorySnapshot();
  const collectionIds = new Set(snapshot.collections.map((item) => item.id));
  const projectIds = new Set(snapshot.projects.map((item) => item.id));
  const linkedCollectionId = collectionIds.has(String(body?.linkedCollectionId || "")) ? String(body?.linkedCollectionId) : "";
  const linkedProjectId = projectIds.has(String(body?.linkedProjectId || "")) ? String(body?.linkedProjectId) : "";
  const title = cleanText(body?.title, 160) || stringField(metadata.title) || stringField(metadata.fileName) || "ملف";
  const notes = cleanText(body?.notes, 500);
  const fileCategory = cleanText(body?.fileCategory, 120) || stringField(metadata.fileCategory) || "عام";
  const reviewStatus = allowedStatuses.includes(String(body?.reviewStatus || "")) ? String(body?.reviewStatus) : (stringField(metadata.reviewStatus) || "NEW");

  await prisma.auditLog.update({
    where: { id },
    data: {
      metadata: { ...metadata, title, notes: notes || undefined, fileCategory, reviewStatus, linkedCollectionId, linkedProjectId },
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
  const row = await prisma.auditLog.findUnique({ where: { id }, select: { id: true, action: true, entityType: true, metadata: true } });
  if (!row || row.action !== "archive.uploadedFile.create" || row.entityType !== "ArchiveUploadedFile") {
    return jsonNoStore({ ok: false, error: "الملف غير موجود" }, { status: 404 });
  }
  const metadata = metadataObject(row.metadata);
  if (stringField(metadata.category) === "DOCUMENTS") {
    const docsAccess = await requireArchiveUploadedFileListAccess("DOCUMENTS");
    if (docsAccess.denied) return docsAccess.denied;
  }

  await deleteArchiveBlobFile(stringField(metadata.blobUrl) || stringField(metadata.blobPathname));
  await prisma.auditLog.deleteMany({ where: { action: "archive.uploadedFile.chunk", entityType: "ArchiveUploadedFileChunk", entityId: id } });
  await prisma.auditLog.delete({ where: { id } });
  return jsonNoStore({ ok: true, message: "تم حذف الملف" });
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(value: unknown) { return typeof value === "string" ? value : ""; }
function cleanText(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }

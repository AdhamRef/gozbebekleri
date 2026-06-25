import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { archiveBlobEnabled, storeArchiveBlobFile } from "@/lib/archive/archive-blob-storage";
import { getArchiveRepositorySnapshot } from "@/lib/archive/archive-repository";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveActionAccess, requireArchiveUploadedFileListAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 30 * 1024 * 1024;
const BASE64_CHUNK_SIZE = 3_500_000;
const allowedCategories = ["MARKETING", "DOCUMENTS"] as const;
type ArchiveUploadCategory = (typeof allowedCategories)[number];

const allowedExtensions = ["pdf", "xls", "xlsx"];
const allowedMimeTypes = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
];

export async function GET(request: Request) {
  const category = parseCategory(new URL(request.url).searchParams.get("category"));
  if (!category) return jsonNoStore({ ok: false, error: "Invalid category" }, { status: 400 });

  const { denied } = await requireArchiveUploadedFileListAccess(category);
  if (denied) return denied;

  const snapshot = await getArchiveRepositorySnapshot();
  const references = buildReferences(snapshot.collections, snapshot.projects);
  const rows = await prisma.auditLog.findMany({
    where: { action: "archive.uploadedFile.create", entityType: "ArchiveUploadedFile" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, createdAt: true, actorName: true, metadata: true },
  });

  const files = rows
    .map((row) => toFileItem(row, references))
    .filter((file): file is NonNullable<ReturnType<typeof toFileItem>> => Boolean(file) && file.category === category);

  return jsonNoStore({ ok: true, files, references, storage: { blobEnabled: archiveBlobEnabled() } });
}

export async function POST(request: Request) {
  const { session, denied } = await requireArchiveActionAccess("archiveUpload");
  if (denied) return denied;
  if (!session?.user) return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const category = parseCategory(String(formData.get("category") || ""));
  const file = formData.get("file");
  const title = String(formData.get("title") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!category) return jsonNoStore({ ok: false, error: "اختر نوع الملف" }, { status: 400 });
  if (category === "DOCUMENTS") {
    const docsAccess = await requireArchiveUploadedFileListAccess("DOCUMENTS");
    if (docsAccess.denied) return docsAccess.denied;
  }
  if (!(file instanceof File)) return jsonNoStore({ ok: false, error: "اختر ملفًا أولًا" }, { status: 400 });
  if (file.size <= 0) return jsonNoStore({ ok: false, error: "الملف فارغ" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return jsonNoStore({ ok: false, error: "حجم الملف كبير جدًا. الحد الحالي 30MB" }, { status: 400 });

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!allowedExtensions.includes(extension) && !allowedMimeTypes.includes(file.type)) {
    return jsonNoStore({ ok: false, error: "الملفات المسموحة PDF أو Excel فقط" }, { status: 400 });
  }

  const snapshot = await getArchiveRepositorySnapshot();
  const references = buildReferences(snapshot.collections, snapshot.projects);
  const linkedCollectionId = validCollectionId(String(formData.get("linkedCollectionId") || ""), references);
  const linkedProjectId = validProjectId(String(formData.get("linkedProjectId") || ""), references);
  const actor = auditActorFromDashboardSession(session);
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || mimeFromExtension(extension);
  const blob = await tryStoreBlob({ category, fileName: file.name, mimeType, buffer });
  const base64 = blob ? "" : buffer.toString("base64");
  const chunks = blob ? [] : chunkString(base64, BASE64_CHUNK_SIZE);

  const row = await prisma.auditLog.create({
    data: {
      ...actor,
      action: "archive.uploadedFile.create",
      messageAr: category === "MARKETING" ? "تم رفع ملف مشروع تسويقي" : "تم رفع مستند أرشيفي",
      messageEn: category === "MARKETING" ? "Marketing archive file uploaded" : "Document archive file uploaded",
      entityType: "ArchiveUploadedFile",
      metadata: {
        category,
        title: title || file.name,
        notes: notes || undefined,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        extension,
        linkedCollectionId,
        linkedProjectId,
        fileCategory: defaultFileCategory(category),
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

  if (!blob && chunks.length > 1) {
    for (let index = 0; index < chunks.length; index += 1) {
      await prisma.auditLog.create({
        data: {
          ...actor,
          action: "archive.uploadedFile.chunk",
          messageAr: "تم حفظ جزء من ملف أرشيفي",
          messageEn: "Archive uploaded file chunk saved",
          entityType: "ArchiveUploadedFileChunk",
          entityId: row.id,
          metadata: { fileId: row.id, index, total: chunks.length, base64: chunks[index] },
          stream: "TEAM",
        },
      });
    }
  }

  return jsonNoStore({ ok: true, file: toFileItem(row, references), message: "تم رفع الملف" });
}

function parseCategory(value: string | null): ArchiveUploadCategory | null {
  return allowedCategories.includes(value as ArchiveUploadCategory) ? (value as ArchiveUploadCategory) : null;
}

function defaultFileCategory(category: ArchiveUploadCategory) {
  return category === "MARKETING" ? "ملفات مشاريع" : "أوراق المؤسسة";
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(value: unknown) { return typeof value === "string" ? value : ""; }
function numberField(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : 0; }

function buildReferences(collections: { id: string; name: string }[], projects: { id: string; title: string; collectionId: string; year: number }[]) {
  return {
    collections: collections.map((item) => ({ id: item.id, name: item.name })),
    projects: projects.map((item) => ({ id: item.id, title: item.title, collectionId: item.collectionId, year: item.year })),
  };
}

function validCollectionId(value: string, references: ReturnType<typeof buildReferences>) {
  return references.collections.some((item) => item.id === value) ? value : "";
}

function validProjectId(value: string, references: ReturnType<typeof buildReferences>) {
  return references.projects.some((item) => item.id === value) ? value : "";
}

function referenceName(id: string, items: { id: string; name?: string; title?: string }[]) {
  return items.find((item) => item.id === id)?.name || items.find((item) => item.id === id)?.title || "";
}

function analysisField(value: unknown) {
  const analysis = metadataObject(value);
  if (!analysis.summary) return null;
  return {
    summary: stringField(analysis.summary),
    suggestedCategory: stringField(analysis.suggestedCategory),
    suggestedUse: stringField(analysis.suggestedUse),
    keywords: Array.isArray(analysis.keywords) ? analysis.keywords.map(stringField).filter(Boolean).slice(0, 10) : [],
    teamNotes: Array.isArray(analysis.teamNotes) ? analysis.teamNotes.map(stringField).filter(Boolean).slice(0, 5) : [],
    confidence: stringField(analysis.confidence) || "metadata_only",
  };
}

function toFileItem(row: { id: string; createdAt: Date; actorName?: string | null; metadata: unknown }, references: ReturnType<typeof buildReferences>) {
  const metadata = metadataObject(row.metadata);
  const category = parseCategory(stringField(metadata.category));
  if (!category) return null;
  const linkedCollectionId = stringField(metadata.linkedCollectionId);
  const linkedProjectId = stringField(metadata.linkedProjectId);

  return {
    id: row.id,
    category,
    title: stringField(metadata.title) || stringField(metadata.fileName) || "ملف",
    notes: stringField(metadata.notes),
    fileName: stringField(metadata.fileName),
    mimeType: stringField(metadata.mimeType),
    sizeBytes: numberField(metadata.sizeBytes),
    extension: stringField(metadata.extension),
    fileCategory: stringField(metadata.fileCategory) || defaultFileCategory(category),
    reviewStatus: stringField(metadata.reviewStatus) || "NEW",
    uploadStatus: stringField(metadata.uploadStatus) || "READY",
    storageMode: stringField(metadata.storageMode) || "INLINE",
    chunkCount: numberField(metadata.chunkCount) || 1,
    linkedCollectionId,
    linkedCollectionName: referenceName(linkedCollectionId, references.collections),
    linkedProjectId,
    linkedProjectName: referenceName(linkedProjectId, references.projects),
    aiAnalysis: analysisField(metadata.aiAnalysis),
    aiAnalyzedAt: stringField(metadata.aiAnalyzedAt),
    createdAt: row.createdAt.toISOString(),
    uploadedBy: row.actorName || "الفريق",
  };
}

function mimeFromExtension(extension: string) {
  if (extension === "pdf") return "application/pdf";
  if (extension === "xls") return "application/vnd.ms-excel";
  if (extension === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

function chunkString(value: string, size: number) {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) chunks.push(value.slice(index, index + size));
  return chunks;
}

async function tryStoreBlob(args: { category: string; fileName: string; mimeType: string; buffer: Buffer }) {
  if (!archiveBlobEnabled()) return null;
  try {
    return await storeArchiveBlobFile({ category: args.category, fileName: args.fileName, contentType: args.mimeType, body: args.buffer });
  } catch {
    return null;
  }
}

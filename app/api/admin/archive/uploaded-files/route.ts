import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
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
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;

  const category = parseCategory(new URL(request.url).searchParams.get("category"));
  if (!category) return jsonNoStore({ ok: false, error: "Invalid category" }, { status: 400 });

  const rows = await prisma.auditLog.findMany({
    where: { action: "archive.uploadedFile.create", entityType: "ArchiveUploadedFile" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, createdAt: true, actorName: true, metadata: true },
  });

  const files = rows
    .map((row) => toFileItem(row))
    .filter((file): file is NonNullable<ReturnType<typeof toFileItem>> => Boolean(file) && file.category === category);

  return jsonNoStore({ ok: true, files });
}

export async function POST(request: Request) {
  const { session, denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  if (!session?.user) return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const category = parseCategory(String(formData.get("category") || ""));
  const file = formData.get("file");
  const title = String(formData.get("title") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!category) return jsonNoStore({ ok: false, error: "اختر نوع الملف" }, { status: 400 });
  if (!(file instanceof File)) return jsonNoStore({ ok: false, error: "اختر ملفًا أولًا" }, { status: 400 });
  if (file.size <= 0) return jsonNoStore({ ok: false, error: "الملف فارغ" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return jsonNoStore({ ok: false, error: "حجم الملف كبير جدًا" }, { status: 400 });

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!allowedExtensions.includes(extension) && !allowedMimeTypes.includes(file.type)) {
    return jsonNoStore({ ok: false, error: "الملفات المسموحة PDF أو Excel فقط" }, { status: 400 });
  }

  const actor = auditActorFromDashboardSession(session);
  const buffer = Buffer.from(await file.arrayBuffer());
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
        mimeType: file.type || mimeFromExtension(extension),
        sizeBytes: file.size,
        extension,
        base64: buffer.toString("base64"),
      },
      stream: "TEAM",
    },
  });

  return jsonNoStore({ ok: true, file: toFileItem(row), message: "تم رفع الملف" });
}

function parseCategory(value: string | null): ArchiveUploadCategory | null {
  return allowedCategories.includes(value as ArchiveUploadCategory) ? (value as ArchiveUploadCategory) : null;
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toFileItem(row: { id: string; createdAt: Date; actorName?: string | null; metadata: unknown }) {
  const metadata = metadataObject(row.metadata);
  const category = parseCategory(stringField(metadata.category));
  if (!category) return null;

  return {
    id: row.id,
    category,
    title: stringField(metadata.title) || stringField(metadata.fileName) || "ملف",
    notes: stringField(metadata.notes),
    fileName: stringField(metadata.fileName),
    mimeType: stringField(metadata.mimeType),
    sizeBytes: numberField(metadata.sizeBytes),
    extension: stringField(metadata.extension),
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

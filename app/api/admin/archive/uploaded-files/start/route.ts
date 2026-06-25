import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveApiAccess } from "../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 30 * 1024 * 1024;
const allowedCategories = ["MARKETING", "DOCUMENTS"] as const;
type ArchiveUploadCategory = (typeof allowedCategories)[number];
const allowedExtensions = ["pdf", "xls", "xlsx"];

export async function POST(request: Request) {
  const { session, denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  if (!session?.user) return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const category = parseCategory(String(body?.category || ""));
  const fileName = String(body?.fileName || "").trim();
  const title = String(body?.title || "").trim();
  const notes = String(body?.notes || "").trim();
  const mimeType = String(body?.mimeType || "application/octet-stream").trim();
  const sizeBytes = Number(body?.sizeBytes || 0);
  const totalChunks = Number(body?.totalChunks || 0);
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (!category) return jsonNoStore({ ok: false, error: "اختر نوع الملف" }, { status: 400 });
  if (!fileName) return jsonNoStore({ ok: false, error: "اسم الملف غير واضح" }, { status: 400 });
  if (!allowedExtensions.includes(extension)) return jsonNoStore({ ok: false, error: "الملفات المسموحة PDF أو Excel فقط" }, { status: 400 });
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return jsonNoStore({ ok: false, error: "حجم الملف غير صحيح" }, { status: 400 });
  if (sizeBytes > MAX_FILE_BYTES) return jsonNoStore({ ok: false, error: "حجم الملف كبير جدًا. الحد الحالي 30MB" }, { status: 400 });
  if (!Number.isInteger(totalChunks) || totalChunks <= 0 || totalChunks > 40) return jsonNoStore({ ok: false, error: "عدد أجزاء الملف غير صحيح" }, { status: 400 });

  const actor = auditActorFromDashboardSession(session);
  const row = await prisma.auditLog.create({
    data: {
      ...actor,
      action: "archive.uploadedFile.create",
      messageAr: category === "MARKETING" ? "بدء رفع ملف مشروع تسويقي" : "بدء رفع مستند أرشيفي",
      messageEn: category === "MARKETING" ? "Marketing archive file upload started" : "Document archive file upload started",
      entityType: "ArchiveUploadedFile",
      metadata: {
        category,
        title: title || fileName,
        notes: notes || undefined,
        fileName,
        mimeType,
        sizeBytes,
        extension,
        storageMode: "CLIENT_CHUNKED",
        chunkCount: totalChunks,
        uploadStatus: "UPLOADING",
      },
      stream: "TEAM",
    },
  });

  return jsonNoStore({ ok: true, uploadId: row.id });
}

function parseCategory(value: string | null): ArchiveUploadCategory | null {
  return allowedCategories.includes(value as ArchiveUploadCategory) ? (value as ArchiveUploadCategory) : null;
}

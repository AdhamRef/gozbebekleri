import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveApiAccess } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function POST(_request: Request, context: Params) {
  const { denied } = await requireArchiveApiAccess();
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
  const indexes = new Set(chunks.map((row) => numberField(metadataObject(row.metadata).index)));

  if (!expected || indexes.size < expected) {
    return jsonNoStore({ ok: false, error: "لم تكتمل كل أجزاء الملف" }, { status: 400 });
  }

  await prisma.auditLog.update({
    where: { id },
    data: {
      metadata: {
        ...metadata,
        uploadStatus: "READY",
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

import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireArchiveApiAccess } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHUNK_BYTES = 2 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function POST(request: Request, context: Params) {
  const { session, denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  if (!session?.user) return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(context.params);
  const parent = await prisma.auditLog.findUnique({ where: { id }, select: { id: true, action: true, entityType: true, metadata: true } });
  if (!parent || parent.action !== "archive.uploadedFile.create" || parent.entityType !== "ArchiveUploadedFile") {
    return jsonNoStore({ ok: false, error: "ملف الرفع غير موجود" }, { status: 404 });
  }

  const formData = await request.formData();
  const index = Number(formData.get("index"));
  const total = Number(formData.get("total"));
  const chunk = formData.get("chunk");

  if (!(chunk instanceof File)) return jsonNoStore({ ok: false, error: "جزء الملف غير موجود" }, { status: 400 });
  if (!Number.isInteger(index) || index < 0) return jsonNoStore({ ok: false, error: "رقم الجزء غير صحيح" }, { status: 400 });
  if (!Number.isInteger(total) || total <= 0) return jsonNoStore({ ok: false, error: "عدد الأجزاء غير صحيح" }, { status: 400 });
  if (chunk.size <= 0) return jsonNoStore({ ok: false, error: "جزء الملف فارغ" }, { status: 400 });
  if (chunk.size > MAX_CHUNK_BYTES) return jsonNoStore({ ok: false, error: "حجم جزء الملف كبير" }, { status: 400 });

  const actor = auditActorFromDashboardSession(session);
  const buffer = Buffer.from(await chunk.arrayBuffer());

  await prisma.auditLog.create({
    data: {
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
        base64: buffer.toString("base64"),
      },
      stream: "TEAM",
    },
  });

  return jsonNoStore({ ok: true, index });
}

import { jsonNoStore, requireArchiveApiAccess } from "../../_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function DELETE(_request: Request, context: Params) {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const row = await prisma.auditLog.findUnique({ where: { id }, select: { id: true, action: true, entityType: true } });
  if (!row || row.action !== "archive.uploadedFile.create" || row.entityType !== "ArchiveUploadedFile") {
    return jsonNoStore({ ok: false, error: "الملف غير موجود" }, { status: 404 });
  }

  await prisma.auditLog.delete({ where: { id } });
  return jsonNoStore({ ok: true, message: "تم حذف الملف" });
}

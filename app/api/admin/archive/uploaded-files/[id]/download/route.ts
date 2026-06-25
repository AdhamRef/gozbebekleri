import { prisma } from "@/lib/prisma";
import { requireArchiveApiAccess } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, context: Params) {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const row = await prisma.auditLog.findUnique({ where: { id }, select: { metadata: true, action: true, entityType: true } });
  if (!row || row.action !== "archive.uploadedFile.create" || row.entityType !== "ArchiveUploadedFile") {
    return new Response("Not found", { status: 404 });
  }

  const metadata = metadataObject(row.metadata);
  const base64 = stringField(metadata.base64);
  const fileName = safeFileName(stringField(metadata.fileName) || stringField(metadata.title) || "archive-file");
  const mimeType = stringField(metadata.mimeType) || "application/octet-stream";

  if (!base64) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(base64, "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeFileName(value: string) {
  return value.replace(/[\\/\u0000-\u001f]/g, "-");
}

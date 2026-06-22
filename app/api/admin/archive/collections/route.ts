import { z } from "zod";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { createArchiveCollectionInRepository } from "@/lib/archive/archive-mutation-service";
import { getArchiveSnapshotDbBacked } from "@/lib/archive/archive-service";
import { jsonNoStore, readJson, requireArchiveApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(120).optional(),
  type: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
});

export async function GET() {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  const snapshot = await getArchiveSnapshotDbBacked();
  return jsonNoStore({ ok: true, persistence: snapshot.persistence, collections: snapshot.collections });
}

export async function POST(request: Request) {
  const { session, denied } = await requireArchiveApiAccess();
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonNoStore({ ok: false, error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });

  const result = await createArchiveCollectionInRepository(parsed.data, session?.user?.id);

  if (result.ok && result.data && session?.user) {
    const actor = auditActorFromDashboardSession(session);
    await writeAuditLog({
      ...actor,
      action: "archive.collection.create",
      messageAr: "تم إنشاء مجموعة أرشيف",
      messageEn: "Archive collection created",
      entityType: "ArchiveCollection",
      entityId: result.data.id,
      metadata: {
        name: result.data.name,
        slug: result.data.slug,
        type: result.data.type,
        source: "dashboard.archive.collections",
      },
      stream: "TEAM",
    });
  }

  return jsonNoStore(result, { status: result.ok ? 201 : 503 });
}

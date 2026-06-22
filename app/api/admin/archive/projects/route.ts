import { z } from "zod";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { createArchiveProjectInRepository } from "@/lib/archive/archive-mutation-service";
import { getArchiveSnapshotDbBacked } from "@/lib/archive/archive-service";
import { jsonNoStore, readJson, requireArchiveApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  collectionId: z.string().trim().optional(),
  title: z.string().trim().min(1).max(220),
  year: z.number().int().min(2000).max(2100).optional(),
  country: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  theme: z.string().trim().max(100).optional(),
  projectType: z.string().trim().max(120).optional(),
  description: z.string().trim().max(800).optional(),
  notes: z.string().trim().max(800).optional(),
});

export async function GET() {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  const snapshot = await getArchiveSnapshotDbBacked();
  return jsonNoStore({ ok: true, persistence: snapshot.persistence, projects: snapshot.projects });
}

export async function POST(request: Request) {
  const { session, denied } = await requireArchiveApiAccess();
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonNoStore({ ok: false, error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });

  const result = await createArchiveProjectInRepository(parsed.data, session?.user?.id);

  if (result.ok && result.data && session?.user) {
    const actor = auditActorFromDashboardSession(session);
    await writeAuditLog({
      ...actor,
      action: "archive.project.create",
      messageAr: "تم إنشاء مشروع أرشيف",
      messageEn: "Archive project created",
      entityType: "ArchiveProject",
      entityId: result.data.id,
      metadata: {
        title: result.data.title,
        collectionId: result.data.collectionId,
        year: result.data.year,
        source: "dashboard.archive.projects",
      },
      stream: "TEAM",
    });
  }

  return jsonNoStore(result, { status: result.ok ? 201 : 503 });
}

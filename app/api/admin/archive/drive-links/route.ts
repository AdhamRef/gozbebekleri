import { z } from "zod";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createArchiveDriveLinkInRepository } from "@/lib/archive/archive-mutation-service";
import { getArchiveSnapshotDbBacked } from "@/lib/archive/archive-service";
import { jsonNoStore, readJson, requireArchiveApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().trim().max(160).optional(),
  title: z.string().trim().max(180).optional(),
  driveUrl: z.string().trim().max(1200).optional(),
});

export async function GET() {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  const snapshot = await getArchiveSnapshotDbBacked();
  return jsonNoStore({ ok: true, persistence: snapshot.persistence, driveLinks: snapshot.driveLinks });
}

export async function POST(request: Request) {
  const { session, denied } = await requireArchiveApiAccess();
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonNoStore({ ok: false, error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });

  const actor = session?.user ? auditActorFromDashboardSession(session) : null;
  const result = await createArchiveDriveLinkInRepository(parsed.data, actor);

  return jsonNoStore(result, { status: result.ok ? 201 : 503 });
}

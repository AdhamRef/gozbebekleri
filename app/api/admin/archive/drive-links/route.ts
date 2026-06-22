import { z } from "zod";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createArchiveDriveLinkInRepository } from "@/lib/archive/archive-mutation-service";
import { getArchiveSnapshotDbBacked } from "@/lib/archive/archive-service";
import { jsonNoStore, readJson, requireArchiveApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const googleDriveHostnames = new Set(["drive.google.com"]);

function isGoogleDriveUrl(value: string) {
  try {
    const url = new URL(value);
    return googleDriveHostnames.has(url.hostname) || url.hostname.endsWith(".drive.google.com");
  } catch {
    return false;
  }
}

const schema = z.object({
  projectId: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(180),
  driveUrl: z.string().trim().min(1).max(1200).refine(isGoogleDriveUrl, "Drive URL must be a valid Google Drive URL."),
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
  if (!parsed.success) return jsonNoStore({ ok: false, error: "Invalid archive Drive link payload", issues: parsed.error.flatten() }, { status: 400 });

  const actor = session?.user ? auditActorFromDashboardSession(session) : null;
  const result = await createArchiveDriveLinkInRepository(parsed.data, actor);

  return jsonNoStore(result, { status: result.ok ? 201 : 503 });
}

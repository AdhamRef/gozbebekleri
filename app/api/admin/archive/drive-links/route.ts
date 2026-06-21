import { z } from "zod";
import { createArchiveDriveLink, listArchiveDriveLinks } from "@/lib/archive/archive-service";
import { jsonNoStore, readJson, requireArchiveApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ projectId: z.string().trim().optional(), title: z.string().trim().max(180).optional(), driveUrl: z.string().trim().max(1200).optional() });

export async function GET() {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  return jsonNoStore({ ok: true, driveLinks: listArchiveDriveLinks() });
}

export async function POST(request: Request) {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonNoStore({ ok: false, error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  return jsonNoStore(createArchiveDriveLink(parsed.data));
}

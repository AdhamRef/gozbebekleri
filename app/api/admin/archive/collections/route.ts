import { z } from "zod";
import { createArchiveCollection, listArchiveCollections } from "@/lib/archive/archive-service";
import { jsonNoStore, readJson, requireArchiveApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().trim().min(1).max(160), slug: z.string().trim().max(120).optional(), type: z.string().trim().max(80).optional(), description: z.string().trim().max(500).optional() });

export async function GET() {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  return jsonNoStore({ ok: true, collections: listArchiveCollections() });
}

export async function POST(request: Request) {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonNoStore({ ok: false, error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  return jsonNoStore(createArchiveCollection(parsed.data));
}

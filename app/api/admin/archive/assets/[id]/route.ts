import { getArchiveAsset } from "@/lib/archive/archive-service";
import { jsonNoStore, requireArchiveApiAccess } from "../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  const { id } = await Promise.resolve(context.params);
  const asset = getArchiveAsset(id);
  if (!asset) return jsonNoStore({ ok: false, error: "Asset not found" }, { status: 404 });
  return jsonNoStore({ ok: true, asset });
}

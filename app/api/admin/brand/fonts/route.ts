import { z } from "zod";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createAuditBackedBrandFont } from "@/lib/brand/brand-font-repository";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";
import { jsonNoStore, readJson, requireBrandApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const brandFontSchema = z.object({
  profileId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(120),
  usage: z.string().trim().min(2).max(180),
  fallback: z.string().trim().max(180).optional(),
  source: z.string().trim().max(180).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function GET() {
  const { denied } = await requireBrandApiAccess();
  if (denied) return denied;
  const snapshot = await getBrandCenterSnapshot();
  return jsonNoStore({ ok: true, count: snapshot.fonts.length, persistence: snapshot.persistence, fonts: snapshot.fonts });
}

export async function POST(request: Request) {
  const { session, denied } = await requireBrandApiAccess();
  if (denied) return denied;

  const parsed = brandFontSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonNoStore({ ok: false, error: "Invalid brand font payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createAuditBackedBrandFont(parsed.data, session ? auditActorFromDashboardSession(session) : null);
  return jsonNoStore(result, { status: result.status });
}

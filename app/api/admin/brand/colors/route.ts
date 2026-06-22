import { z } from "zod";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createBrandColor } from "@/lib/brand/brand-color-repository";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";
import { jsonNoStore, readJson, requireBrandApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const brandColorSchema = z.object({
  profileId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(80),
  hex: z.string().trim().regex(/^#?[0-9a-fA-F]{6}$/, "Use a valid #RRGGBB hex color."),
  rgb: z.string().trim().max(60).optional(),
  usage: z.enum(["PRIMARY", "CTA", "BACKGROUND", "ACCENT", "TEXT", "STATUS"]).default("ACCENT"),
  description: z.string().trim().max(300).optional(),
  order: z.coerce.number().int().min(0).max(999).optional(),
});

export async function GET() {
  const { denied } = await requireBrandApiAccess();
  if (denied) return denied;
  const snapshot = await getBrandCenterSnapshot();
  return jsonNoStore({ ok: true, count: snapshot.colors.length, persistence: snapshot.persistence, colors: snapshot.colors });
}

export async function POST(request: Request) {
  const { session, denied } = await requireBrandApiAccess();
  if (denied) return denied;

  const parsed = brandColorSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonNoStore({ ok: false, error: "Invalid brand color payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createBrandColor(parsed.data, session ? auditActorFromDashboardSession(session) : null);
  return jsonNoStore(result, { status: result.status });
}

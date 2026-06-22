import { z } from "zod";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createBrandGuideline } from "@/lib/brand/brand-guideline-repository";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";
import { jsonNoStore, readJson, requireBrandApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const brandGuidelineSchema = z.object({
  profileId: z.string().trim().min(1).max(120),
  section: z.enum(["voice", "copy", "proof", "donor-dignity", "cta", "localization"]).default("copy"),
  title: z.string().trim().min(2).max(140),
  body: z.string().trim().min(10).max(1400),
  examples: z.array(z.string().trim().min(1).max(240)).max(8).optional(),
  order: z.coerce.number().int().min(0).max(999).optional(),
});

export async function GET() {
  const { denied } = await requireBrandApiAccess();
  if (denied) return denied;
  const snapshot = await getBrandCenterSnapshot();
  return jsonNoStore({ ok: true, count: snapshot.guidelines.length, persistence: snapshot.persistence, guidelines: snapshot.guidelines });
}

export async function POST(request: Request) {
  const { session, denied } = await requireBrandApiAccess();
  if (denied) return denied;

  const parsed = brandGuidelineSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonNoStore({ ok: false, error: "Invalid brand guideline payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createBrandGuideline(parsed.data, session ? auditActorFromDashboardSession(session) : null);
  return jsonNoStore(result, { status: result.status });
}

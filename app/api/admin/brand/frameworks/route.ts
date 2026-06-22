import { z } from "zod";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createAuditBackedBrandMessageFramework } from "@/lib/brand/brand-message-framework-repository";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";
import { jsonNoStore, readJson, requireBrandApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const shortTextList = z.array(z.string().trim().min(1).max(180)).max(12).optional();

const brandMessageFrameworkSchema = z.object({
  profileId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(140),
  type: z.enum(["FRIDAY", "THANK_YOU", "ZAKAT", "WAQF", "EMERGENCY", "DONOR_REACTIVATION", "RAMADAN", "GENERAL"]).default("GENERAL"),
  locale: z.enum(["ar", "tr", "en", "fr", "id", "pt", "es", "de"]).default("tr"),
  structure: shortTextList,
  sampleText: z.string().trim().max(1200).optional(),
  doList: shortTextList,
  dontList: shortTextList,
});

export async function GET() {
  const { denied } = await requireBrandApiAccess();
  if (denied) return denied;
  const snapshot = await getBrandCenterSnapshot();
  return jsonNoStore({ ok: true, count: snapshot.messageFrameworks.length, persistence: snapshot.persistence, frameworks: snapshot.messageFrameworks });
}

export async function POST(request: Request) {
  const { session, denied } = await requireBrandApiAccess();
  if (denied) return denied;

  const parsed = brandMessageFrameworkSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonNoStore({ ok: false, error: "Invalid brand message framework payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createAuditBackedBrandMessageFramework(parsed.data, session ? auditActorFromDashboardSession(session) : null);
  return jsonNoStore(result, { status: result.status });
}

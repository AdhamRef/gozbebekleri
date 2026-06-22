import { z } from "zod";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createAuditBackedBrandAsset } from "@/lib/brand/brand-asset-repository";
import { updateAuditBackedBrandAssetStatus } from "@/lib/brand/brand-asset-status-repository";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";
import { jsonNoStore, readJson, requireBrandApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const brandAssetSchema = z.object({
  profileId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(2).max(160),
  type: z.enum(["LOGO", "ICON", "TEMPLATE", "CERTIFICATE", "WATERMARK", "VIDEO_INTRO", "VIDEO_OUTRO", "BRAND_GUIDE"]).default("TEMPLATE"),
  format: z.enum(["SVG", "PNG", "JPG", "PDF", "FIGMA", "VIDEO", "DOC", "URL"]).default("URL"),
  fileUrl: z.string().trim().url().optional(),
  previewUrl: z.string().trim().url().optional(),
  usage: z.string().trim().min(2).max(180).optional(),
  locale: z.enum(["all", "ar", "tr", "en", "fr", "id", "pt", "es", "de"]).default("all"),
  notes: z.string().trim().max(500).optional(),
  downloadable: z.boolean().optional(),
  status: z.enum(["ACTIVE", "FOUNDATION", "TO_VERIFY"]).default("TO_VERIFY"),
});

const brandAssetStatusSchema = z.object({
  id: z.string().trim().min(1).max(160),
  status: z.enum(["ACTIVE", "FOUNDATION", "TO_VERIFY"]).optional(),
  downloadable: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function GET() {
  const { denied } = await requireBrandApiAccess();
  if (denied) return denied;
  const snapshot = await getBrandCenterSnapshot();
  return jsonNoStore({ ok: true, count: snapshot.assets.length, persistence: snapshot.persistence, assets: snapshot.assets });
}

export async function POST(request: Request) {
  const { session, denied } = await requireBrandApiAccess();
  if (denied) return denied;

  const parsed = brandAssetSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonNoStore({ ok: false, error: "Invalid brand asset payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createAuditBackedBrandAsset(parsed.data, session ? auditActorFromDashboardSession(session) : null);
  return jsonNoStore(result, { status: result.status });
}

export async function PATCH(request: Request) {
  const { session, denied } = await requireBrandApiAccess();
  if (denied) return denied;

  const parsed = brandAssetStatusSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonNoStore({ ok: false, error: "Invalid brand asset status payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const snapshot = await getBrandCenterSnapshot();
  const asset = snapshot.assets.find((item) => item.id === parsed.data.id) ?? null;
  if (!asset) return jsonNoStore({ ok: false, error: "Brand asset not found" }, { status: 404 });

  const result = await updateAuditBackedBrandAssetStatus(asset, parsed.data, session ? auditActorFromDashboardSession(session) : null);
  return jsonNoStore(result, { status: result.status });
}

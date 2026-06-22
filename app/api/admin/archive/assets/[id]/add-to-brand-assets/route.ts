import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getArchiveSnapshotDbBacked } from "@/lib/archive/archive-service";
import type { ArchiveAsset } from "@/lib/archive/archive-types";
import { createAuditBackedBrandAsset } from "@/lib/brand/brand-asset-repository";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";
import type { BrandAssetFormat, BrandAssetType } from "@/lib/brand/brand-types";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { jsonNoStore, requireArchiveApiAccess } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safePublicUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatFromArchiveAsset(asset: ArchiveAsset): BrandAssetFormat {
  const mimeType = asset.mimeType.toLowerCase();
  const fileName = asset.fileName.toLowerCase();
  if (mimeType.includes("svg") || fileName.endsWith(".svg")) return "SVG";
  if (mimeType.includes("png") || fileName.endsWith(".png")) return "PNG";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "JPG";
  if (mimeType.includes("pdf") || fileName.endsWith(".pdf")) return "PDF";
  if (asset.fileType === "VIDEO" || mimeType.startsWith("video/")) return "VIDEO";
  if (asset.fileType === "DOCUMENT") return "DOC";
  return "URL";
}

function typeFromArchiveAsset(asset: ArchiveAsset): BrandAssetType {
  if (asset.fileType === "DOCUMENT" || asset.recommendedUse === "REPORT") return "BRAND_GUIDE";
  return "TEMPLATE";
}

function brandAssetBlockReason(asset: ArchiveAsset) {
  if (asset.humanReviewStatus === "REJECTED" || asset.recommendedUse === "DO_NOT_USE") {
    return "Rejected archive assets cannot become Brand Assets.";
  }
  if (asset.isSensitive || asset.needsBlur) {
    return "Sensitive assets or assets that need blur must not be added to Brand Assets.";
  }
  if (!asset.marketingApproved && !asset.documentationApproved) {
    return "Archive asset needs human marketing or documentation approval first.";
  }
  return null;
}

function brandNotes(asset: ArchiveAsset) {
  return [
    `Created from ArchiveAsset ${asset.id}.`,
    `Project ${asset.projectId}.`,
    `Recommended use: ${asset.recommendedUse}.`,
    `Human review: ${asset.humanReviewStatus}.`,
    `Marketing approved: ${asset.marketingApproved ? "yes" : "no"}.`,
    `Documentation approved: ${asset.documentationApproved ? "yes" : "no"}.`,
    "To be verified before public downloads or production use.",
  ].join(" ");
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { session, denied } = await requireArchiveApiAccess();
  if (denied) return denied;

  const brandDenied = requireAdminOrDashboardPermission(session, "brand");
  if (brandDenied) return brandDenied;

  const { id } = await Promise.resolve(context.params);
  const archiveSnapshot = await getArchiveSnapshotDbBacked();
  const asset = archiveSnapshot.assets.find((item) => item.id === id) ?? null;
  if (!asset) return jsonNoStore({ ok: false, error: "Asset not found" }, { status: 404 });

  const blocked = brandAssetBlockReason(asset);
  if (blocked) {
    return jsonNoStore({ ok: false, error: blocked, externalCall: false }, { status: 400 });
  }

  const brandSnapshot = await getBrandCenterSnapshot();
  const fileUrl = safePublicUrl(asset.webViewLink) ?? safePublicUrl(asset.previewUrl) ?? safePublicUrl(asset.thumbnailLink);
  const previewUrl = safePublicUrl(asset.previewUrl) ?? safePublicUrl(asset.thumbnailLink) ?? fileUrl;
  const existing = brandSnapshot.assets.find((item) => item.notes.includes(`ArchiveAsset ${asset.id}`) || (fileUrl && item.fileUrl === fileUrl));

  if (existing) {
    return jsonNoStore({
      ok: true,
      mode: "prisma",
      externalCall: false,
      message: "Archive asset is already saved in Brand Assets.",
      sourceAssetId: asset.id,
      data: existing,
      persistence: { archive: archiveSnapshot.persistence, brand: brandSnapshot.persistence },
    });
  }

  const actor = session ? auditActorFromDashboardSession(session) : null;
  const result = await createAuditBackedBrandAsset(
    {
      profileId: brandSnapshot.activeProfile.id,
      title: `Archive asset: ${asset.fileName}`.slice(0, 160),
      type: typeFromArchiveAsset(asset),
      format: formatFromArchiveAsset(asset),
      fileUrl,
      previewUrl,
      usage: `Archive-approved ${asset.recommendedUse.toLowerCase().replaceAll("_", " ")} asset`,
      locale: "all",
      notes: brandNotes(asset),
      downloadable: false,
      status: "TO_VERIFY",
    },
    actor,
  );

  return jsonNoStore(
    {
      ...result,
      message: result.ok ? "Archive asset saved to Brand Assets and marked to verify." : result.message,
      sourceAssetId: asset.id,
      persistence: { archive: archiveSnapshot.persistence, brand: brandSnapshot.persistence },
    },
    { status: result.status },
  );
}

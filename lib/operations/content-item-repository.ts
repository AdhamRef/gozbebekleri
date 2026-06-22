import { prisma } from "@/lib/prisma";
import type { ArchiveAsset } from "@/lib/archive/archive-types";
import type { OperationsContentItem } from "./types";

const objectIdPattern = /^[a-f\d]{24}$/i;
const archiveContentItemAction = "operations.content-item.create-from-archive-asset";

export type ContentItemProposalActor = {
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
};

export type ContentItemProposalResult = {
  ok: boolean;
  mode: "prisma" | "foundation";
  externalCall: false;
  message: string;
  status: number;
  data?: OperationsContentItem;
};

function safeObjectId(value: string | null | undefined) {
  return value && objectIdPattern.test(value) ? value : undefined;
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function contentTypeForAsset(asset: ArchiveAsset) {
  if (asset.recommendedUse === "REEL") return "REEL";
  if (asset.recommendedUse === "CAROUSEL") return "CAROUSEL";
  if (asset.recommendedUse === "WHATSAPP") return "WHATSAPP";
  if (asset.recommendedUse === "SEO_ARTICLE") return "SEO_ARTICLE";
  if (asset.recommendedUse === "REPORT") return "REPORT";
  if (asset.fileType === "VIDEO") return "VIDEO";
  if (asset.fileType === "DOCUMENT") return "REPORT";
  return "DESIGN";
}

function channelForAsset(asset: ArchiveAsset) {
  if (asset.recommendedUse === "WHATSAPP") return "WhatsApp";
  if (asset.recommendedUse === "SEO_ARTICLE" || asset.recommendedUse === "REPORT") return "Website";
  if (asset.recommendedUse === "ADS") return "Meta Ads";
  if (asset.recommendedUse === "REEL") return "Instagram / TikTok";
  return "Social";
}

function titleForAsset(asset: ArchiveAsset) {
  return asset.fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || asset.fileName;
}

function buildContentItemFromAsset(asset: ArchiveAsset): OperationsContentItem {
  return {
    id: `content_item_archive_${asset.id}_${Date.now()}`,
    title: titleForAsset(asset),
    type: contentTypeForAsset(asset),
    status: asset.marketingApproved ? "APPROVED" : "IDEA",
    channel: channelForAsset(asset),
    due: addDays(asset.marketingApproved ? 3 : 7),
  };
}

function contentItemFromMetadata(metadata: unknown): { item: OperationsContentItem; sourceAssetId: string | null } | null {
  const root = metadataObject(metadata);
  const contentItem = metadataObject(root.contentItem);
  const id = stringField(contentItem.id);
  const title = stringField(contentItem.title);
  if (!id || !title) return null;

  return {
    item: {
      id,
      title,
      type: stringField(contentItem.type) ?? "DESIGN",
      status: stringField(contentItem.status) ?? "IDEA",
      channel: stringField(contentItem.channel) ?? "Social",
      due: stringField(contentItem.due) ?? "to be scheduled",
    },
    sourceAssetId: stringField(root.sourceAssetId),
  };
}

export async function readAuditBackedContentItems(): Promise<OperationsContentItem[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const rows = await prisma.auditLog.findMany({
      where: { entityType: "ContentItem", action: archiveContentItemAction },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, metadata: true },
    });

    const latest = new Map<string, OperationsContentItem>();
    for (const row of rows) {
      const parsed = contentItemFromMetadata(row.metadata);
      if (!parsed) continue;
      const dedupeKey = parsed.sourceAssetId ?? parsed.item.id ?? row.id;
      if (!latest.has(dedupeKey)) latest.set(dedupeKey, parsed.item);
    }

    return [...latest.values()];
  } catch (error) {
    console.error("Audit-backed content item read failed", error);
    return [];
  }
}

export async function persistContentItemProposalFromArchiveAsset(
  asset: ArchiveAsset,
  actor?: ContentItemProposalActor | null,
): Promise<ContentItemProposalResult> {
  if (asset.humanReviewStatus === "REJECTED") {
    return {
      ok: false,
      mode: "foundation",
      externalCall: false,
      status: 409,
      message: "Rejected archive assets cannot create content items.",
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      mode: "foundation",
      externalCall: false,
      status: 503,
      message: "DATABASE_URL is not configured; content item proposal was not saved.",
    };
  }

  const contentItem = buildContentItemFromAsset(asset);

  try {
    await prisma.auditLog.create({
      data: {
        actorId: safeObjectId(actor?.actorId),
        actorName: actor?.actorName ?? undefined,
        actorRole: actor?.actorRole || "ADMIN",
        action: archiveContentItemAction,
        messageAr: "تم إنشاء عنصر محتوى من أصل أرشيف",
        messageEn: "Content item proposal created from archive asset",
        entityType: "ContentItem",
        entityId: safeObjectId(contentItem.id),
        metadata: {
          contentItem,
          sourceType: "ARCHIVE_ASSET",
          sourceAssetId: asset.id,
          sourceProjectId: asset.projectId,
          driveUrl: asset.webViewLink,
          previewUrl: asset.previewUrl,
          fileName: asset.fileName,
          recommendedUse: asset.recommendedUse,
          humanReviewStatus: asset.humanReviewStatus,
          marketingApproved: asset.marketingApproved,
          documentationApproved: asset.documentationApproved,
          externalCall: false,
          autoPublish: false,
          autoSend: false,
          aiGenerated: false,
          humanReviewRequired: true,
        },
        stream: "TEAM",
      },
    });

    return {
      ok: true,
      mode: "prisma",
      externalCall: false,
      status: 200,
      message: "Content item proposal saved from archive asset.",
      data: contentItem,
    };
  } catch (error) {
    console.error("Content item proposal save failed", error);
    return { ok: false, mode: "prisma", externalCall: false, status: 503, message: "Content item proposal save failed." };
  }
}

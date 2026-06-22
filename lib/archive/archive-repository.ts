import { prisma } from "@/lib/prisma";
import type {
  ArchiveAsset,
  ArchiveCollection,
  ArchiveDriveLink,
  ArchiveProject,
  ArchiveRecommendedUse,
  ArchiveVideoFrame,
} from "./archive-types";

export type ArchiveRepositoryPersistenceMode = "db-backed" | "foundation-fallback";

export type ArchiveFoundationData = {
  collections: ArchiveCollection[];
  projects: ArchiveProject[];
  driveLinks: ArchiveDriveLink[];
  assets: ArchiveAsset[];
  videoFrames: ArchiveVideoFrame[];
};

export type ArchiveRepositorySnapshot = ArchiveFoundationData & {
  mode: ArchiveRepositoryPersistenceMode;
  source: "prisma" | "foundation";
  reason: string;
  dbCounts: {
    collections: number;
    projects: number;
    driveLinks: number;
    assets: number;
    videoFrames: number;
  };
};

type ArchiveDriveLinkRow = {
  id: string;
  projectId: string;
  title: string;
  driveUrl: string;
  driveFolderId: string | null;
  driveFileId: string | null;
  sharedDriveId: string | null;
  linkType: string;
  syncStatus: string;
  lastSyncedAt: Date | null;
  lastError: string | null;
  totalFiles: number;
  totalImages: number;
  totalVideos: number;
  totalOther: number;
};

type ArchiveAssetRow = {
  id: string;
  projectId: string;
  driveLinkId: string | null;
  googleFileId: string;
  googleFolderId: string | null;
  fileName: string;
  mimeType: string;
  fileType: string;
  webViewLink: string | null;
  webContentLink: string | null;
  thumbnailLink: string | null;
  previewUrl: string | null;
  sizeBytes: number | null;
  createdTime: Date | null;
  modifiedTime: Date | null;
  aiStatus: string;
  humanReviewStatus: string;
  marketingApproved: boolean;
  documentationApproved: boolean;
  tags: string[];
  aiSummary: string | null;
  aiWarnings: string | null;
  recommendedUse: string;
  marketingScore: number;
  qualityScore: number;
  emotionScore: number;
  clarityScore: number;
  sensitivityScore: number;
  hasChildren: boolean;
  hasFaces: boolean;
  needsBlur: boolean;
  isSensitive: boolean;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewerNote: string | null;
};

type ArchiveVideoFrameRow = {
  id: string;
  assetId: string;
  timestampSec: number;
  frameUrl: string | null;
  thumbnailUrl: string | null;
  aiSummary: string | null;
  recommendedUse: string;
  marketingScore: number;
  tags: string[];
  needsBlur: boolean;
  isSensitive: boolean;
};

type ArchiveDriveLinkAuditRow = {
  id: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
};

type ArchiveDriveLinkDelegate = {
  findMany(args: { orderBy: Array<Record<string, "asc" | "desc">> }): Promise<ArchiveDriveLinkRow[]>;
};

type ArchiveAssetDelegate = {
  findMany(args: { orderBy: Array<Record<string, "asc" | "desc">> }): Promise<ArchiveAssetRow[]>;
};

type ArchiveVideoFrameDelegate = {
  findMany(args: { orderBy: Array<Record<string, "asc" | "desc">> }): Promise<ArchiveVideoFrameRow[]>;
};

const projectStatuses: ArchiveProject["status"][] = ["PLANNED", "ACTIVE", "COMPLETED", "PAUSED"];
const documentationStatuses: ArchiveProject["documentationStatus"][] = ["NOT_STARTED", "PARTIAL", "READY", "MISSING_PROOF"];
const marketingStatuses: ArchiveProject["marketingStatus"][] = ["NOT_REVIEWED", "NEEDS_REVIEW", "READY", "IN_USE"];
const linkTypes: ArchiveDriveLink["linkType"][] = ["FOLDER", "FILE", "UNKNOWN"];
const syncStatuses: ArchiveDriveLink["syncStatus"][] = ["FOUNDATION", "READY_FOR_SYNC", "SYNC_SKIPPED", "FAILED"];
const fileTypes: ArchiveAsset["fileType"][] = ["IMAGE", "VIDEO", "DOCUMENT", "FOLDER", "OTHER"];
const aiStatuses: ArchiveAsset["aiStatus"][] = ["NOT_ANALYZED", "DRAFT_REVIEW_REQUIRED", "ANALYSIS_SKIPPED"];
const reviewStatuses: ArchiveAsset["humanReviewStatus"][] = ["PENDING", "APPROVED", "REJECTED", "DOCUMENTATION_ONLY"];
const recommendedUses: ArchiveRecommendedUse[] = [
  "ADS",
  "SOCIAL_POST",
  "REEL",
  "CAROUSEL",
  "REPORT",
  "SEO_ARTICLE",
  "HERO",
  "WHATSAPP",
  "DOCUMENTATION_ONLY",
  "DO_NOT_USE",
];

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function asProjectStatus(value: string | null | undefined): ArchiveProject["status"] {
  return projectStatuses.includes(value as ArchiveProject["status"]) ? (value as ArchiveProject["status"]) : "PLANNED";
}

function asDocumentationStatus(value: string | null | undefined): ArchiveProject["documentationStatus"] {
  return documentationStatuses.includes(value as ArchiveProject["documentationStatus"]) ? (value as ArchiveProject["documentationStatus"]) : "NOT_STARTED";
}

function asMarketingStatus(value: string | null | undefined): ArchiveProject["marketingStatus"] {
  return marketingStatuses.includes(value as ArchiveProject["marketingStatus"]) ? (value as ArchiveProject["marketingStatus"]) : "NOT_REVIEWED";
}

function asLinkType(value: string | null | undefined): ArchiveDriveLink["linkType"] {
  return linkTypes.includes(value as ArchiveDriveLink["linkType"]) ? (value as ArchiveDriveLink["linkType"]) : "UNKNOWN";
}

function asSyncStatus(value: string | null | undefined): ArchiveDriveLink["syncStatus"] {
  return syncStatuses.includes(value as ArchiveDriveLink["syncStatus"]) ? (value as ArchiveDriveLink["syncStatus"]) : "FOUNDATION";
}

function asFileType(value: string | null | undefined): ArchiveAsset["fileType"] {
  return fileTypes.includes(value as ArchiveAsset["fileType"]) ? (value as ArchiveAsset["fileType"]) : "OTHER";
}

function asAiStatus(value: string | null | undefined): ArchiveAsset["aiStatus"] {
  return aiStatuses.includes(value as ArchiveAsset["aiStatus"]) ? (value as ArchiveAsset["aiStatus"]) : "NOT_ANALYZED";
}

function asReviewStatus(value: string | null | undefined): ArchiveAsset["humanReviewStatus"] {
  return reviewStatuses.includes(value as ArchiveAsset["humanReviewStatus"]) ? (value as ArchiveAsset["humanReviewStatus"]) : "PENDING";
}

function asRecommendedUse(value: string | null | undefined): ArchiveRecommendedUse {
  return recommendedUses.includes(value as ArchiveRecommendedUse) ? (value as ArchiveRecommendedUse) : "DOCUMENTATION_ONLY";
}

function getArchiveDriveLinkDelegate(): ArchiveDriveLinkDelegate | null {
  const prismaWithArchiveDriveLink = prisma as unknown as { archiveDriveLink?: ArchiveDriveLinkDelegate };
  return prismaWithArchiveDriveLink.archiveDriveLink ?? null;
}

function getArchiveAssetDelegate(): ArchiveAssetDelegate | null {
  const prismaWithArchiveAsset = prisma as unknown as { archiveAsset?: ArchiveAssetDelegate };
  return prismaWithArchiveAsset.archiveAsset ?? null;
}

function getArchiveVideoFrameDelegate(): ArchiveVideoFrameDelegate | null {
  const prismaWithArchiveVideoFrame = prisma as unknown as { archiveVideoFrame?: ArchiveVideoFrameDelegate };
  return prismaWithArchiveVideoFrame.archiveVideoFrame ?? null;
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapAuditDriveLink(
  row: ArchiveDriveLinkAuditRow,
  validProjectIds: Set<string>,
  fallbackProjectId: string,
): ArchiveDriveLink | null {
  const metadata = metadataObject(row.metadata);
  const id = stringField(metadata.id) ?? row.entityId ?? row.id;
  const projectId = stringField(metadata.projectId);
  const title = stringField(metadata.title);
  const driveUrl = stringField(metadata.driveUrl);

  if (!title || !driveUrl) return null;

  return {
    id,
    projectId: projectId && validProjectIds.has(projectId) ? projectId : fallbackProjectId,
    title,
    driveUrl,
    driveFolderId: stringField(metadata.driveFolderId),
    driveFileId: stringField(metadata.driveFileId),
    sharedDriveId: stringField(metadata.sharedDriveId),
    linkType: asLinkType(stringField(metadata.linkType)),
    syncStatus: asSyncStatus(stringField(metadata.syncStatus)),
    lastSyncedAt: stringField(metadata.lastSyncedAt),
    lastError: stringField(metadata.lastError),
    totalFiles: numberField(metadata.totalFiles),
    totalImages: numberField(metadata.totalImages),
    totalVideos: numberField(metadata.totalVideos),
    totalOther: numberField(metadata.totalOther),
  };
}

function fallback(foundation: ArchiveFoundationData, reason: string): ArchiveRepositorySnapshot {
  return {
    mode: "foundation-fallback",
    source: "foundation",
    reason,
    collections: foundation.collections,
    projects: foundation.projects,
    driveLinks: foundation.driveLinks,
    assets: foundation.assets,
    videoFrames: foundation.videoFrames,
    dbCounts: {
      collections: 0,
      projects: 0,
      driveLinks: 0,
      assets: 0,
      videoFrames: 0,
    },
  };
}

export async function getArchiveRepositorySnapshot(foundation: ArchiveFoundationData): Promise<ArchiveRepositorySnapshot> {
  if (!process.env.DATABASE_URL) {
    return fallback(foundation, "DATABASE_URL is not configured; using foundation archive collections, projects, links, assets, and frames.");
  }

  try {
    const archiveDriveLinkDelegate = getArchiveDriveLinkDelegate();
    const archiveAssetDelegate = getArchiveAssetDelegate();
    const archiveVideoFrameDelegate = getArchiveVideoFrameDelegate();
    const [collectionRows, projectRows, driveLinkRows, driveLinkAuditRows, assetRows, videoFrameRows] = await Promise.all([
      prisma.archiveCollection.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
      prisma.archiveProject.findMany({ orderBy: [{ year: "desc" }, { title: "asc" }] }),
      archiveDriveLinkDelegate ? archiveDriveLinkDelegate.findMany({ orderBy: [{ title: "asc" }] }) : Promise.resolve([]),
      archiveDriveLinkDelegate
        ? Promise.resolve([])
        : prisma.auditLog.findMany({
            where: { entityType: "ArchiveDriveLink", action: "archive.drive-link.create" },
            orderBy: { createdAt: "desc" },
            take: 200,
            select: { id: true, entityId: true, metadata: true, createdAt: true },
          }),
      archiveAssetDelegate ? archiveAssetDelegate.findMany({ orderBy: [{ fileName: "asc" }] }) : Promise.resolve([]),
      archiveVideoFrameDelegate ? archiveVideoFrameDelegate.findMany({ orderBy: [{ timestampSec: "asc" }] }) : Promise.resolve([]),
    ]);

    const hasDbArchiveData =
      collectionRows.length > 0 ||
      projectRows.length > 0 ||
      driveLinkRows.length > 0 ||
      driveLinkAuditRows.length > 0 ||
      assetRows.length > 0 ||
      videoFrameRows.length > 0;

    if (!hasDbArchiveData) {
      return fallback(foundation, "Archive runtime collections are empty; using foundation archive data.");
    }

    const collections: ArchiveCollection[] = collectionRows.length > 0
      ? collectionRows.map((collection) => ({
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          type: collection.type,
          description: collection.description ?? "to be verified",
          order: collection.order,
          isActive: collection.isActive,
        }))
      : foundation.collections;

    const validCollectionIds = new Set(collections.map((collection) => collection.id));
    const fallbackCollectionId = collections[0]?.id ?? foundation.collections[0]?.id ?? "archive_collection_unknown";

    const projects: ArchiveProject[] = projectRows.length > 0
      ? projectRows.map((project) => ({
          id: project.id,
          collectionId: project.collectionId && validCollectionIds.has(project.collectionId) ? project.collectionId : fallbackCollectionId,
          title: project.title,
          year: project.year ?? new Date().getFullYear(),
          country: project.country ?? "to be verified",
          city: project.city ?? "to be verified",
          theme: project.theme ?? "general",
          projectType: project.projectType ?? "General",
          description: project.description ?? "to be verified",
          implementationDate: toIso(project.implementationDate),
          startDate: toIso(project.startDate),
          endDate: toIso(project.endDate),
          status: asProjectStatus(project.status),
          documentationStatus: asDocumentationStatus(project.documentationStatus),
          marketingStatus: asMarketingStatus(project.marketingStatus),
          notes: project.notes ?? "to be verified",
          createdBy: project.createdBy ?? "archive-db",
        }))
      : foundation.projects;

    const validProjectIds = new Set(projects.map((project) => project.id));
    const fallbackProjectId = projects[0]?.id ?? foundation.projects[0]?.id ?? "archive_project_unknown";

    const delegatedDriveLinks = driveLinkRows.map((link): ArchiveDriveLink => ({
      id: link.id,
      projectId: validProjectIds.has(link.projectId) ? link.projectId : fallbackProjectId,
      title: link.title,
      driveUrl: link.driveUrl,
      driveFolderId: link.driveFolderId,
      driveFileId: link.driveFileId,
      sharedDriveId: link.sharedDriveId,
      linkType: asLinkType(link.linkType),
      syncStatus: asSyncStatus(link.syncStatus),
      lastSyncedAt: toIso(link.lastSyncedAt),
      lastError: link.lastError,
      totalFiles: link.totalFiles,
      totalImages: link.totalImages,
      totalVideos: link.totalVideos,
      totalOther: link.totalOther,
    }));
    const auditDriveLinks = driveLinkAuditRows
      .map((row) => mapAuditDriveLink(row, validProjectIds, fallbackProjectId))
      .filter((link): link is ArchiveDriveLink => Boolean(link));
    const driveLinks = delegatedDriveLinks.length > 0 ? delegatedDriveLinks : auditDriveLinks;

    const validDriveLinkIds = new Set(driveLinks.map((link) => link.id));
    const assets = assetRows.map((asset): ArchiveAsset => ({
      id: asset.id,
      projectId: validProjectIds.has(asset.projectId) ? asset.projectId : fallbackProjectId,
      driveLinkId: asset.driveLinkId && validDriveLinkIds.has(asset.driveLinkId) ? asset.driveLinkId : null,
      googleFileId: asset.googleFileId,
      googleFolderId: asset.googleFolderId,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileType: asFileType(asset.fileType),
      webViewLink: asset.webViewLink,
      webContentLink: asset.webContentLink,
      thumbnailLink: asset.thumbnailLink,
      previewUrl: asset.previewUrl,
      sizeBytes: asset.sizeBytes,
      createdTime: toIso(asset.createdTime),
      modifiedTime: toIso(asset.modifiedTime),
      aiStatus: asAiStatus(asset.aiStatus),
      humanReviewStatus: asReviewStatus(asset.humanReviewStatus),
      marketingApproved: asset.marketingApproved,
      documentationApproved: asset.documentationApproved,
      tags: asset.tags,
      aiSummary: asset.aiSummary,
      aiWarnings: asset.aiWarnings,
      recommendedUse: asRecommendedUse(asset.recommendedUse),
      marketingScore: asset.marketingScore,
      qualityScore: asset.qualityScore,
      emotionScore: asset.emotionScore,
      clarityScore: asset.clarityScore,
      sensitivityScore: asset.sensitivityScore,
      hasChildren: asset.hasChildren,
      hasFaces: asset.hasFaces,
      needsBlur: asset.needsBlur,
      isSensitive: asset.isSensitive,
      reviewedBy: asset.reviewedBy,
      reviewedAt: toIso(asset.reviewedAt),
      reviewerNote: asset.reviewerNote,
    }));

    const validAssetIds = new Set(assets.map((asset) => asset.id));
    const videoFrames = videoFrameRows
      .map((frame): ArchiveVideoFrame | null => {
        if (!validAssetIds.has(frame.assetId)) return null;
        return {
          id: frame.id,
          assetId: frame.assetId,
          timestampSec: frame.timestampSec,
          frameUrl: frame.frameUrl,
          thumbnailUrl: frame.thumbnailUrl,
          aiSummary: frame.aiSummary,
          recommendedUse: asRecommendedUse(frame.recommendedUse),
          marketingScore: frame.marketingScore,
          tags: frame.tags,
          needsBlur: frame.needsBlur,
          isSensitive: frame.isSensitive,
        };
      })
      .filter((frame): frame is ArchiveVideoFrame => Boolean(frame));

    const availableOptionalModels = [
      archiveDriveLinkDelegate ? "ArchiveDriveLink" : driveLinks.length > 0 ? "ArchiveDriveLink audit-backed records" : null,
      archiveAssetDelegate ? "ArchiveAsset" : null,
      archiveVideoFrameDelegate ? "ArchiveVideoFrame" : null,
    ].filter((model): model is string => Boolean(model));
    const reason = availableOptionalModels.length > 0
      ? `Archive repository can read ${availableOptionalModels.join(", ")}; Drive sync, file downloads, and AI analysis remain disabled.`
      : "ArchiveCollection and ArchiveProject are read from Prisma; Drive links, assets, and video frames use foundation fallback until generated Prisma delegates exist.";

    return {
      mode: "db-backed",
      source: "prisma",
      reason,
      collections,
      projects,
      driveLinks: driveLinks.length > 0 ? driveLinks : foundation.driveLinks,
      assets: assets.length > 0 ? assets : foundation.assets,
      videoFrames: videoFrames.length > 0 ? videoFrames : foundation.videoFrames,
      dbCounts: {
        collections: collectionRows.length,
        projects: projectRows.length,
        driveLinks: driveLinkRows.length + auditDriveLinks.length,
        assets: assetRows.length,
        videoFrames: videoFrameRows.length,
      },
    };
  } catch (error) {
    console.error("Archive repository DB read failed", error);
    return fallback(foundation, "Archive repository DB read failed; using foundation archive data.");
  }
}

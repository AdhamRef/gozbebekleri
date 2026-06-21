import { prisma } from "@/lib/prisma";
import type { ArchiveCollection, ArchiveProject } from "./archive-types";

export type ArchiveRepositoryPersistenceMode = "db-backed" | "foundation-fallback";

export type ArchiveFoundationData = {
  collections: ArchiveCollection[];
  projects: ArchiveProject[];
};

export type ArchiveRepositorySnapshot = ArchiveFoundationData & {
  mode: ArchiveRepositoryPersistenceMode;
  source: "prisma" | "foundation";
  reason: string;
  dbCounts: {
    collections: number;
    projects: number;
  };
};

const projectStatuses: ArchiveProject["status"][] = ["PLANNED", "ACTIVE", "COMPLETED", "PAUSED"];
const documentationStatuses: ArchiveProject["documentationStatus"][] = ["NOT_STARTED", "PARTIAL", "READY", "MISSING_PROOF"];
const marketingStatuses: ArchiveProject["marketingStatus"][] = ["NOT_REVIEWED", "NEEDS_REVIEW", "READY", "IN_USE"];

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

function fallback(foundation: ArchiveFoundationData, reason: string): ArchiveRepositorySnapshot {
  return {
    mode: "foundation-fallback",
    source: "foundation",
    reason,
    collections: foundation.collections,
    projects: foundation.projects,
    dbCounts: {
      collections: 0,
      projects: 0,
    },
  };
}

export async function getArchiveRepositorySnapshot(foundation: ArchiveFoundationData): Promise<ArchiveRepositorySnapshot> {
  if (!process.env.DATABASE_URL) {
    return fallback(foundation, "DATABASE_URL is not configured; using foundation archive collections and projects.");
  }

  try {
    const [collectionRows, projectRows] = await Promise.all([
      prisma.archiveCollection.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
      prisma.archiveProject.findMany({ orderBy: [{ year: "desc" }, { title: "asc" }] }),
    ]);

    if (collectionRows.length === 0) {
      return fallback(foundation, "ArchiveCollection collection is empty; using foundation archive collections and projects.");
    }

    const collections: ArchiveCollection[] = collectionRows.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      type: collection.type,
      description: collection.description ?? "to be verified",
      order: collection.order,
      isActive: collection.isActive,
    }));

    const validCollectionIds = new Set(collections.map((collection) => collection.id));
    const fallbackCollectionId = collections[0]?.id ?? foundation.collections[0]?.id ?? "archive_collection_unknown";

    const projects: ArchiveProject[] = projectRows.map((project) => ({
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
    }));

    return {
      mode: "db-backed",
      source: "prisma",
      reason: "ArchiveCollection and ArchiveProject are read through the repository layer. Drive links, assets, video frames, and AI remain foundation/manual-first.",
      collections,
      projects: projects.length > 0 ? projects : foundation.projects,
      dbCounts: {
        collections: collectionRows.length,
        projects: projectRows.length,
      },
    };
  } catch (error) {
    console.error("Archive repository DB read failed", error);
    return fallback(foundation, "Archive repository DB read failed; using foundation archive collections and projects.");
  }
}

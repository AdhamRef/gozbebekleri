import { prisma } from "@/lib/prisma";
import type { ArchiveCollection, ArchiveProject } from "./archive-types";

const objectIdPattern = /^[a-f\d]{24}$/i;

export type ArchivePersistenceMutationResult<T> = {
  ok: boolean;
  mode: "prisma" | "foundation";
  message: string;
  externalCall: false;
  data?: T;
};

type ArchiveCollectionInput = Partial<Pick<ArchiveCollection, "name" | "slug" | "type" | "description" | "order" | "isActive">>;
type ArchiveProjectInput = Partial<ArchiveProject> & { title?: string };

function safeObjectId(value: string | null | undefined) {
  return value && objectIdPattern.test(value) ? value : undefined;
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `archive-${Date.now()}`;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function mapCollection(row: {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  order: number;
  isActive: boolean;
}): ArchiveCollection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    description: row.description ?? "to be verified",
    order: row.order,
    isActive: row.isActive,
  };
}

function mapProject(row: {
  id: string;
  collectionId: string | null;
  title: string;
  year: number | null;
  country: string | null;
  city: string | null;
  theme: string | null;
  projectType: string | null;
  description: string | null;
  implementationDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  documentationStatus: string;
  marketingStatus: string;
  notes: string | null;
  createdBy: string | null;
}): ArchiveProject {
  return {
    id: row.id,
    collectionId: row.collectionId ?? "archive_collection_unassigned",
    title: row.title,
    year: row.year ?? new Date().getFullYear(),
    country: row.country ?? "to be verified",
    city: row.city ?? "to be verified",
    theme: row.theme ?? "general",
    projectType: row.projectType ?? "General",
    description: row.description ?? "to be verified",
    implementationDate: toIso(row.implementationDate),
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    status: row.status as ArchiveProject["status"],
    documentationStatus: row.documentationStatus as ArchiveProject["documentationStatus"],
    marketingStatus: row.marketingStatus as ArchiveProject["marketingStatus"],
    notes: row.notes ?? "to be verified",
    createdBy: row.createdBy ?? "archive-db",
  };
}

function unavailable<T>(message: string): ArchivePersistenceMutationResult<T> {
  return {
    ok: false,
    mode: "foundation",
    externalCall: false,
    message,
  };
}

export async function createArchiveCollectionInRepository(
  input: ArchiveCollectionInput,
  actorId?: string | null,
): Promise<ArchivePersistenceMutationResult<ArchiveCollection>> {
  if (!process.env.DATABASE_URL) {
    return unavailable("DATABASE_URL is not configured; ArchiveCollection was not created.");
  }

  try {
    const order = input.order ?? (await prisma.archiveCollection.count()) + 1;
    const row = await prisma.archiveCollection.create({
      data: {
        name: input.name || "Collection to be verified",
        slug: input.slug ? slugify(input.slug) : `${slugify(input.name || "archive-collection")}-${Date.now()}`,
        type: input.type || "GENERAL",
        description: input.description || "to be verified",
        order,
        isActive: input.isActive ?? true,
        createdBy: safeObjectId(actorId),
      },
    });

    return {
      ok: true,
      mode: "prisma",
      externalCall: false,
      message: "ArchiveCollection created.",
      data: mapCollection(row),
    };
  } catch (error) {
    console.error("ArchiveCollection create failed", error);
    return { ok: false, mode: "prisma", externalCall: false, message: "ArchiveCollection create failed." };
  }
}

export async function createArchiveProjectInRepository(
  input: ArchiveProjectInput,
  actorId?: string | null,
): Promise<ArchivePersistenceMutationResult<ArchiveProject>> {
  if (!process.env.DATABASE_URL) {
    return unavailable("DATABASE_URL is not configured; ArchiveProject was not created.");
  }

  try {
    const row = await prisma.archiveProject.create({
      data: {
        collectionId: safeObjectId(input.collectionId),
        title: input.title || "Project to be verified",
        year: input.year || new Date().getFullYear(),
        country: input.country || "to be verified",
        city: input.city || "to be verified",
        theme: input.theme || "general",
        projectType: input.projectType || "General",
        description: input.description || "to be verified",
        implementationDate: input.implementationDate ? new Date(input.implementationDate) : undefined,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        status: input.status || "PLANNED",
        documentationStatus: input.documentationStatus || "NOT_STARTED",
        marketingStatus: input.marketingStatus || "NOT_REVIEWED",
        notes: input.notes || "to be verified",
        createdBy: safeObjectId(actorId),
      },
    });

    return {
      ok: true,
      mode: "prisma",
      externalCall: false,
      message: "ArchiveProject created.",
      data: mapProject(row),
    };
  } catch (error) {
    console.error("ArchiveProject create failed", error);
    return { ok: false, mode: "prisma", externalCall: false, message: "ArchiveProject create failed." };
  }
}

import { prisma } from "@/lib/prisma";
import type { OperationsContentItem } from "./types";

type RuntimeContentItem = {
  id?: string;
  title?: string;
  format?: string | null;
  status?: string | null;
  theme?: string | null;
  dueAt?: Date | string | null;
  publishAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type RuntimeContentItemInput = {
  title: string;
  type?: string;
  format?: string;
  status?: string;
  channel?: string;
  due?: string;
  sourceType?: string;
  sourceAssetId?: string;
  sourceProjectId?: string;
  driveUrl?: string;
  previewUrl?: string;
  notes?: string;
};

type ContentItemDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<RuntimeContentItem[]>;
  create?: (args: Record<string, unknown>) => Promise<RuntimeContentItem>;
};

type PrismaWithContentItem = typeof prisma & {
  contentItem?: ContentItemDelegate;
};

function contentItemDelegate() {
  return (prisma as PrismaWithContentItem).contentItem ?? null;
}

function dateText(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function dateOrNull(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapRuntimeContentItem(item: RuntimeContentItem): OperationsContentItem {
  return {
    id: item.id,
    title: item.title || "Untitled content",
    type: item.format || "DESIGN",
    status: item.status || "IDEA",
    channel: item.theme || "General",
    due: dateText(item.dueAt ?? item.publishAt ?? item.updatedAt),
  };
}

export async function readRuntimeContentItems(): Promise<OperationsContentItem[] | null> {
  const delegate = contentItemDelegate();
  if (!delegate) return null;

  const rows = await delegate.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  return rows.map(mapRuntimeContentItem);
}

export async function createRuntimeContentItem(input: RuntimeContentItemInput): Promise<OperationsContentItem | null> {
  const delegate = contentItemDelegate();
  if (!delegate?.create) return null;

  const row = await delegate.create({
    data: {
      title: input.title.trim(),
      format: input.format || input.type || "DESIGN",
      status: input.status || "IDEA",
      theme: input.channel || null,
      dueAt: dateOrNull(input.due),
      sourceType: input.sourceType || "MANUAL",
      sourceAssetId: input.sourceAssetId || null,
      sourceProjectId: input.sourceProjectId || null,
      driveUrl: input.driveUrl || null,
      finalAssetUrl: input.previewUrl || null,
      proposedCopy: input.notes || null,
      progress: 0,
    },
  });

  return mapRuntimeContentItem(row);
}

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

type PrismaWithContentItem = typeof prisma & {
  contentItem?: {
    findMany: (args: Record<string, unknown>) => Promise<RuntimeContentItem[]>;
  };
};

function dateText(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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
  const delegate = (prisma as PrismaWithContentItem).contentItem;
  if (!delegate) return null;

  const rows = await delegate.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  return rows.map(mapRuntimeContentItem);
}

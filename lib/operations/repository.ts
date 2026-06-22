import { archiveAssets } from "./archive/archive-data";
import type { ArchiveAsset } from "./archive/archive-types";
import { readAuditBackedContentItems } from "./content-item-repository";
import { createFallbackOperationsOverview } from "./mock-data";
import { productionItems } from "./production/production-data";
import type { ProductionItem } from "./production/production-types";
import { scheduledContentItems } from "./scheduler/scheduler-data";
import type { ScheduledContentItem } from "./scheduler/scheduler-types";
import { listOperationTasksFromRepository } from "./tasks/task-repository";
import type { OperationsTask } from "./tasks/task-types";
import type { OperationsPersistenceInfo, OperationsRepositoryResult } from "./persistence-types";
import type { OperationsContentItem, OperationsContentTask, OperationsOverview } from "./types";

function foundationPersistence(
  model: string,
  nextModel: string,
  options: { storage?: OperationsPersistenceInfo["storage"]; readyForDb?: boolean; note?: string } = {},
): OperationsPersistenceInfo {
  return {
    mode: "foundation",
    storage: options.storage ?? "module-data",
    readOnly: true,
    model,
    nextModel,
    readyForDb: options.readyForDb ?? true,
    externalSideEffects: false,
    note: options.note ?? "Foundation data is served through a repository contract and can be replaced by Prisma without changing page contracts.",
  };
}

function fromFoundation<T>(
  items: T[],
  model: string,
  nextModel: string,
  options?: { storage?: OperationsPersistenceInfo["storage"]; readyForDb?: boolean; note?: string },
): OperationsRepositoryResult<T> {
  return {
    items: [...items],
    persistence: foundationPersistence(model, nextModel, options),
  };
}

function auditBackedContentPersistence(count: number): OperationsPersistenceInfo {
  return {
    mode: "prisma",
    storage: "prisma",
    readOnly: false,
    model: "OperationsContentItemAuditLog",
    nextModel: "ContentItem",
    readyForDb: true,
    externalSideEffects: false,
    note: `${count} content item(s) are persisted through DB-backed AuditLog records until the dedicated ContentItem runtime model is appended. No publishing, sending, or AI approval is automatic.`,
  };
}

export async function listScheduledContentItems(): Promise<OperationsRepositoryResult<ScheduledContentItem>> {
  return fromFoundation(scheduledContentItems, "ScheduledContentItem", "ContentSchedule");
}

export async function listProductionItems(): Promise<OperationsRepositoryResult<ProductionItem>> {
  return fromFoundation(productionItems, "ProductionItem", "OperationProductionItem");
}

export async function listArchiveAssets(): Promise<OperationsRepositoryResult<ArchiveAsset>> {
  return fromFoundation(archiveAssets, "ArchiveAsset", "OperationArchiveAsset");
}

export async function listContentItems(): Promise<OperationsRepositoryResult<OperationsContentItem>> {
  const overview = createFallbackOperationsOverview();
  const auditItems = await readAuditBackedContentItems();
  const items = auditItems.length > 0 ? [...auditItems, ...overview.items] : overview.items;

  if (auditItems.length > 0) {
    return {
      items,
      persistence: auditBackedContentPersistence(auditItems.length),
    };
  }

  return fromFoundation(overview.items, "OperationsContentItem", "ContentItem");
}

export async function listContentWorkflowTasks(): Promise<OperationsRepositoryResult<OperationsContentTask>> {
  const overview = createFallbackOperationsOverview();
  return fromFoundation(overview.tasks, "OperationsContentTask", "OperationContentTask");
}

export async function listOperationTasks(): Promise<OperationsRepositoryResult<OperationsTask>> {
  return listOperationTasksFromRepository();
}

export async function getContentOperationsOverview(): Promise<OperationsOverview> {
  const [contentItems, contentTasks] = await Promise.all([
    listContentItems(),
    listContentWorkflowTasks(),
  ]);
  const overview = createFallbackOperationsOverview();

  return {
    ...overview,
    source: contentItems.persistence.mode === "prisma" ? "content-operations-audit-backed" : "content-operations-repository",
    version: contentItems.persistence.mode === "prisma" ? "operations-overview-audit-backed" : "operations-overview-foundation",
    kpis: {
      ...overview.kpis,
      contentItems: contentItems.items.length,
      openProductionTasks: contentTasks.items.length,
      readyForMarketing: contentItems.items.filter((item) => item.status === "APPROVED").length,
    },
    items: contentItems.items,
    tasks: contentTasks.items,
    persistence: contentItems.persistence.mode === "prisma"
      ? contentItems.persistence
      : foundationPersistence("OperationsOverview", "OperationContentWorkspace", {
          note: "Content workspace data is grouped behind a repository contract while seasons and plans remain foundation records.",
        }),
  };
}

export async function getOperationsPersistenceSnapshot() {
  const [scheduler, production, archive, content, tasks] = await Promise.all([
    listScheduledContentItems(),
    listProductionItems(),
    listArchiveAssets(),
    listContentItems(),
    listOperationTasks(),
  ]);
  const datasets = [
    {
      key: "scheduler",
      label: "Content Scheduler",
      total: scheduler.items.length,
      persistence: scheduler.persistence,
    },
    {
      key: "production",
      label: "Production Board",
      total: production.items.length,
      persistence: production.persistence,
    },
    {
      key: "archive",
      label: "Archive Center",
      total: archive.items.length,
      persistence: archive.persistence,
    },
    {
      key: "content",
      label: "Content Items",
      total: content.items.length,
      persistence: content.persistence,
    },
    {
      key: "tasks",
      label: "Operations Tasks",
      total: tasks.items.length,
      persistence: tasks.persistence,
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    datasets,
    summary: {
      totalRecords: datasets.reduce((sum, dataset) => sum + dataset.total, 0),
      foundationDatasets: datasets.filter((dataset) => dataset.persistence.mode === "foundation").length,
      dbReadyDatasets: datasets.filter((dataset) => dataset.persistence.readyForDb).length,
      generatedDatasets: datasets.filter((dataset) => dataset.persistence.storage === "computed-engine").length,
    },
  };
}

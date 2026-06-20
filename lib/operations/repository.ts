import { archiveAssets } from "./archive/archive-data";
import type { ArchiveAsset } from "./archive/archive-types";
import { productionItems } from "./production/production-data";
import type { ProductionItem } from "./production/production-types";
import { scheduledContentItems } from "./scheduler/scheduler-data";
import type { ScheduledContentItem } from "./scheduler/scheduler-types";
import type { OperationsPersistenceInfo, OperationsRepositoryResult } from "./persistence-types";

function staticPersistence(model: string, nextModel: string): OperationsPersistenceInfo {
  return {
    mode: "STATIC_FOUNDATION",
    storage: "module-data",
    readOnly: true,
    model,
    nextModel,
    externalSideEffects: false,
    note: "Foundation data is served through a repository contract and can be replaced by Prisma without changing page contracts.",
  };
}

function fromStatic<T>(items: T[], model: string, nextModel: string): OperationsRepositoryResult<T> {
  return {
    items: [...items],
    persistence: staticPersistence(model, nextModel),
  };
}

export async function listScheduledContentItems(): Promise<OperationsRepositoryResult<ScheduledContentItem>> {
  return fromStatic(scheduledContentItems, "ScheduledContentItem", "ContentSchedule");
}

export async function listProductionItems(): Promise<OperationsRepositoryResult<ProductionItem>> {
  return fromStatic(productionItems, "ProductionItem", "OperationProductionItem");
}

export async function listArchiveAssets(): Promise<OperationsRepositoryResult<ArchiveAsset>> {
  return fromStatic(archiveAssets, "ArchiveAsset", "OperationArchiveAsset");
}

export async function getOperationsPersistenceSnapshot() {
  const [scheduler, production, archive] = await Promise.all([
    listScheduledContentItems(),
    listProductionItems(),
    listArchiveAssets(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    datasets: [
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
    ],
    summary: {
      totalRecords: scheduler.items.length + production.items.length + archive.items.length,
      staticDatasets: [scheduler, production, archive].filter((dataset) => dataset.persistence.mode === "STATIC_FOUNDATION").length,
      prismaReadyDatasets: [scheduler, production, archive].filter((dataset) => dataset.persistence.mode === "PRISMA_READY").length,
    },
  };
}

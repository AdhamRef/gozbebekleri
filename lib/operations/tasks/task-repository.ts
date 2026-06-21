import { prisma } from "@/lib/prisma";
import type { PlanningActionPriority, PlanningActionType } from "../planning/planning-types";
import type { OperationsRepositoryResult } from "../persistence-types";
import { generateTasks } from "./task-engine";
import type { OperationsTask, OperationsTaskStatus } from "./task-types";

const actionTypes: PlanningActionType[] = ["WRITING", "DESIGN", "VIDEO", "CAROUSEL", "MESSAGING"];
const priorities: PlanningActionPriority[] = ["HIGH", "MEDIUM", "LOW"];
const statuses: OperationsTaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "NEEDS_REVIEW",
  "DONE",
  "MISSED",
  "DELAYED",
  "CANCELLED",
  "BLOCKED",
];

type OperationTaskRow = {
  id: string;
  title: string;
  description: string | null;
  taskType: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  planId: string | null;
  seasonId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  dueAt: Date | null;
  resultNotes: string | null;
};

function foundationTasks(reason: string): OperationsRepositoryResult<OperationsTask> {
  return {
    items: generateTasks(),
    persistence: {
      mode: "foundation",
      storage: "computed-engine",
      readOnly: true,
      model: "OperationsTask",
      nextModel: "OperationTask",
      readyForDb: false,
      externalSideEffects: false,
      note: reason,
    },
  };
}

function asActionType(value: string | null | undefined): PlanningActionType {
  return actionTypes.includes(value as PlanningActionType) ? (value as PlanningActionType) : "WRITING";
}

function asPriority(value: string | null | undefined): PlanningActionPriority {
  return priorities.includes(value as PlanningActionPriority) ? (value as PlanningActionPriority) : "MEDIUM";
}

function asStatus(value: string | null | undefined): OperationsTaskStatus {
  return statuses.includes(value as OperationsTaskStatus) ? (value as OperationsTaskStatus) : "PENDING";
}

function progressFor(status: OperationsTaskStatus) {
  if (status === "DONE") return 100;
  if (status === "NEEDS_REVIEW") return 80;
  if (status === "IN_PROGRESS") return 50;
  if (status === "BLOCKED" || status === "DELAYED") return 25;
  return 0;
}

function dueLabelFor(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "غير محدد";
}

function mapTask(row: OperationTaskRow): OperationsTask {
  const status = asStatus(row.status);

  return {
    id: row.id,
    planningActionId: row.sourceId ?? row.planId ?? row.id,
    seasonId: row.seasonId ?? "operation-season-db",
    seasonTitle: row.sourceType ?? "Operations",
    type: asActionType(row.taskType),
    title: row.title,
    priority: asPriority(row.priority),
    status,
    assignee: row.assignedTo ?? "غير معين",
    dueLabel: dueLabelFor(row.dueAt),
    progress: progressFor(status),
    sourceReason: row.description ?? row.resultNotes ?? "OperationTask from Prisma repository.",
  };
}

export async function listOperationTasksFromRepository(): Promise<OperationsRepositoryResult<OperationsTask>> {
  if (!process.env.DATABASE_URL) {
    return foundationTasks("DATABASE_URL is not configured; tasks are generated from the Planning Engine through the repository contract.");
  }

  try {
    const rows = await prisma.operationTask.findMany({
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    if (rows.length === 0) {
      return foundationTasks("OperationTask collection is empty; using generated foundation tasks until real task rows are created.");
    }

    return {
      items: rows.map(mapTask),
      persistence: {
        mode: "prisma",
        storage: "prisma",
        readOnly: true,
        model: "OperationTask",
        nextModel: "OperationTaskWriteActions",
        readyForDb: true,
        externalSideEffects: false,
        note: "OperationTask is read through Prisma with a foundation fallback. Scheduler, donor reactivation, sending, and publishing remain manual-first.",
      },
    };
  } catch (error) {
    console.error("OperationTask repository DB read failed", error);
    return foundationTasks("OperationTask repository DB read failed; using generated foundation tasks.");
  }
}

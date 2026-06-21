import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { getTaskOverview } from "@/lib/operations/tasks/task-service";
import {
  createOperationTaskInRepository,
  updateOperationTaskInRepository,
} from "@/lib/operations/tasks/task-repository";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const dynamic = "force-dynamic";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Expected a Mongo ObjectId.");
const taskTypeSchema = z.enum(["WRITING", "DESIGN", "VIDEO", "CAROUSEL", "MESSAGING"]);
const prioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
const statusSchema = z.enum(["PENDING", "IN_PROGRESS", "NEEDS_REVIEW", "DONE", "MISSED", "DELAYED", "CANCELLED", "BLOCKED"]);

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const emptyToNull = (value: unknown) => (value === "" ? null : value);

const optionalText = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
const nullableText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());
const nullableObjectId = z.preprocess(emptyToNull, z.union([objectIdSchema, z.null()]).optional());
const nullableIsoDate = z.preprocess(emptyToNull, z.union([z.string().datetime(), z.null()]).optional());

const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: nullableText(2000),
  taskType: taskTypeSchema.default("WRITING"),
  status: statusSchema.default("PENDING"),
  priority: prioritySchema.default("MEDIUM"),
  assignedTo: nullableObjectId,
  contentItemId: nullableObjectId,
  planId: nullableObjectId,
  seasonId: nullableObjectId,
  sourceType: optionalText(80),
  sourceId: nullableObjectId,
  dueAt: nullableIsoDate,
  blockedReason: nullableText(1000),
  resultNotes: nullableText(2000),
  qualityRating: z.number().int().min(1).max(5).nullable().optional(),
  workloadScore: z.number().int().min(0).max(100).nullable().optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  id: objectIdSchema,
}).refine((value) => Object.entries(value).some(([key, item]) => key !== "id" && item !== undefined), {
  message: "At least one task field must be provided.",
});

type ParsedTaskInput = z.infer<typeof createTaskSchema> | z.infer<typeof updateTaskSchema>;

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : value ?? undefined;
}

function toMutationInput(value: ParsedTaskInput) {
  return {
    title: value.title,
    description: value.description,
    taskType: value.taskType,
    status: value.status,
    priority: value.priority,
    assignedTo: value.assignedTo,
    contentItemId: value.contentItemId,
    planId: value.planId,
    seasonId: value.seasonId,
    sourceType: value.sourceType,
    sourceId: value.sourceId,
    dueAt: toDate(value.dueAt),
    blockedReason: value.blockedReason,
    resultNotes: value.resultNotes,
    qualityRating: value.qualityRating,
    workloadScore: value.workloadScore,
  };
}

function validationResponse(error: z.ZodError) {
  return NextResponse.json({ ok: false, error: "Invalid task payload", issues: error.issues }, { status: 400, headers: operationsNoStoreHeaders });
}

async function requireActor() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return auditActorFromDashboardSession(session);
}

export async function GET() {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const overview = await getTaskOverview();
  return NextResponse.json({
    source: overview.source,
    count: overview.tasks.length,
    persistence: overview.persistence,
    summary: overview.summary,
    tasks: overview.tasks,
  }, { headers: operationsNoStoreHeaders });
}

export async function POST(request: NextRequest) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return validationResponse(parsed.error);

  const actor = await requireActor();
  if (!actor) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: operationsNoStoreHeaders });

  const mutationInput = toMutationInput(parsed.data);
  if (!mutationInput.title) {
    return NextResponse.json({ ok: false, error: "Task title is required" }, { status: 400, headers: operationsNoStoreHeaders });
  }

  const result = await createOperationTaskInRepository({ ...mutationInput, title: mutationInput.title }, actor.actorId);

  if (result.ok && result.task) {
    await writeAuditLog({
      ...actor,
      action: "operations.task.create",
      messageAr: "تم إنشاء مهمة تشغيل",
      messageEn: "Operation task created",
      entityType: "OperationTask",
      entityId: result.task.id,
      metadata: {
        title: result.task.title,
        status: result.task.status,
        priority: result.task.priority,
        source: "dashboard.operations.tasks",
      },
      stream: "TEAM",
    });
  }

  return NextResponse.json(result, { status: result.ok ? 201 : 503, headers: operationsNoStoreHeaders });
}

export async function PATCH(request: NextRequest) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return validationResponse(parsed.error);

  const actor = await requireActor();
  if (!actor) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: operationsNoStoreHeaders });

  const changedFields = Object.entries(parsed.data)
    .filter(([key, value]) => key !== "id" && value !== undefined)
    .map(([key]) => key);
  const result = await updateOperationTaskInRepository(parsed.data.id, toMutationInput(parsed.data), actor.actorId);

  if (result.ok && result.task) {
    await writeAuditLog({
      ...actor,
      action: "operations.task.update",
      messageAr: "تم تحديث مهمة تشغيل",
      messageEn: "Operation task updated",
      entityType: "OperationTask",
      entityId: result.task.id,
      metadata: {
        changedFields,
        status: result.task.status,
        priority: result.task.priority,
        source: "dashboard.operations.tasks",
      },
      stream: "TEAM",
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: operationsNoStoreHeaders });
}

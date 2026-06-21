import { NextResponse } from "next/server";
import { getTaskOverview } from "@/lib/operations/tasks/task-service";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const dynamic = "force-dynamic";

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

import { NextResponse } from "next/server";
import { getTaskOverview } from "@/lib/operations/tasks/task-service";

export async function GET() {
  const overview = await getTaskOverview();
  return NextResponse.json({
    source: overview.source,
    count: overview.tasks.length,
    persistence: overview.persistence,
    summary: overview.summary,
    tasks: overview.tasks,
  });
}

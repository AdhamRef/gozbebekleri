import { NextResponse } from "next/server";
import * as operationsData from "@/lib/operations/mock-data";

export async function GET() {
  return NextResponse.json({
    source: "mock",
    version: "operations-overview-v1",
    generatedAt: new Date().toISOString(),
    kpis: operationsData.getOperationsKpis(),
    seasons: operationsData.operationSeasons,
    weeklyThemes: operationsData.operationWeeklyThemes,
    plans: operationsData.operationPlans,
    items: operationsData.operationItems,
    tasks: operationsData.operationTasks,
  });
}

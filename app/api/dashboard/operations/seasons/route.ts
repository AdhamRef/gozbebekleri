import { NextResponse } from "next/server";
import { getOperationsOverview } from "@/lib/operations/service";

export async function GET() {
  const overview = await getOperationsOverview();
  return NextResponse.json({
    source: overview.source,
    count: overview.seasons.length,
    persistence: overview.persistence,
    seasons: overview.seasons,
  });
}

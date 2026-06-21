import { NextResponse } from "next/server";
import { getOperationsOverview } from "@/lib/operations/service";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const overview = await getOperationsOverview();
  return NextResponse.json({
    source: overview.source,
    count: overview.plans.length,
    persistence: overview.persistence,
    plans: overview.plans,
  }, { headers: operationsNoStoreHeaders });
}

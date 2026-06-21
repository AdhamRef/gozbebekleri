import { NextResponse } from "next/server";
import { listContentItems } from "@/lib/operations/repository";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const dataset = await listContentItems();
  return NextResponse.json({
    source: "operations-repository",
    count: dataset.items.length,
    persistence: dataset.persistence,
    items: dataset.items,
  }, { headers: operationsNoStoreHeaders });
}

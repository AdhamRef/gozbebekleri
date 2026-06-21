import { NextResponse } from "next/server";
import { getOperationsPersistenceSnapshot } from "@/lib/operations/repository";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const snapshot = await getOperationsPersistenceSnapshot();
  return NextResponse.json(snapshot, { headers: operationsNoStoreHeaders });
}

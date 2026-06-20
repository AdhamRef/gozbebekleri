import { NextResponse } from "next/server";
import { getOperationsPersistenceSnapshot } from "@/lib/operations/repository";

export async function GET() {
  const snapshot = await getOperationsPersistenceSnapshot();
  return NextResponse.json(snapshot);
}

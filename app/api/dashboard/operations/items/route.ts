import { NextResponse } from "next/server";
import { listContentItems } from "@/lib/operations/repository";

export async function GET() {
  const dataset = await listContentItems();
  return NextResponse.json({
    source: "operations-repository",
    count: dataset.items.length,
    persistence: dataset.persistence,
    items: dataset.items,
  });
}

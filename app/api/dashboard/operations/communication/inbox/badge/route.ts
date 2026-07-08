import { NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../_auth";
import { getInboxBadgeCount } from "@/lib/communication/inbox-notification-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight badge count for the sidebar / overview — conversations that need a reply. */
export async function GET() {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const count = await getInboxBadgeCount().catch(() => 0);
  return NextResponse.json({ count }, { headers: operationsNoStoreHeaders });
}

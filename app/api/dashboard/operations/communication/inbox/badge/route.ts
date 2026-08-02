import { NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../_auth";
import { safeCountValue } from "@/lib/dashboard/safe-count";
import { getInboxBadgeCount } from "@/lib/communication/inbox-notification-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight badge count for the sidebar / overview — conversations that need a reply. */
export async function GET() {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const count = await safeCountValue("inbox.badge", () => getInboxBadgeCount());
  return NextResponse.json({ count }, { headers: operationsNoStoreHeaders });
}

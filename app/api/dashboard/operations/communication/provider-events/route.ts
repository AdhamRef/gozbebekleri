import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { listProviderEvents } from "@/lib/communication/delivery-log-service";
import { isCommunicationChannel } from "@/lib/communication/communication-runtime-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const channel = sp.get("channel");
  const events = await listProviderEvents({
    provider: sp.get("provider") || undefined,
    channel: channel && isCommunicationChannel(channel) ? channel : undefined,
    eventType: sp.get("eventType") || undefined,
    status: sp.get("status") || undefined,
  });
  // payloadSanitized is the only payload persisted (sanitized at write time); no secrets returned.
  return NextResponse.json({ events }, { headers: operationsNoStoreHeaders });
}

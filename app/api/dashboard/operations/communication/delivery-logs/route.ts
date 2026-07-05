import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { listDeliveries } from "@/lib/communication/delivery-log-service";
import { isCommunicationChannel, isDeliveryStatus } from "@/lib/communication/communication-runtime-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const channel = sp.get("channel");
  const status = sp.get("status");
  const from = sp.get("from");
  const to = sp.get("to");
  const deliveries = await listDeliveries({
    channel: channel && isCommunicationChannel(channel) ? channel : undefined,
    provider: sp.get("provider") || undefined,
    status: status && isDeliveryStatus(status) ? status : undefined,
    campaignId: sp.get("campaignId") || undefined,
    senderId: sp.get("senderId") || undefined,
    locale: sp.get("locale") || undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });
  return NextResponse.json({ deliveries }, { headers: operationsNoStoreHeaders });
}

import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { listConversations, getConversation } from "@/lib/communication/conversation-service";
import { isMetaConfigured } from "@/lib/communication/providers/meta-whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const phone = req.nextUrl.searchParams.get("phone");
  const providerConfigured = isMetaConfigured();

  if (phone) {
    const conversation = await getConversation(phone);
    return NextResponse.json({ conversation, providerConfigured }, { headers: operationsNoStoreHeaders });
  }
  const conversations = await listConversations();
  return NextResponse.json({ conversations, providerConfigured }, { headers: operationsNoStoreHeaders });
}

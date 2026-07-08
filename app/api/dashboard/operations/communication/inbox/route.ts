import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { listConversations, getConversation, markConversationHandled, logConversationAction, listInboxSenders } from "@/lib/communication/conversation-service";
import { isMetaConfigured } from "@/lib/communication/providers/meta-whatsapp/client";
import { auditActorFromDashboardSession } from "@/lib/audit-log";

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
  const senderId = req.nextUrl.searchParams.get("senderId");
  const [conversations, senders] = await Promise.all([listConversations({ senderId }), listInboxSenders()]);
  return NextResponse.json({ conversations, senders, providerConfigured }, { headers: operationsNoStoreHeaders });
}

/** Conversation actions (audit-backed, no send, no fake DB attach): handled / followup / link. */
export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const phone = typeof body.phone === "string" ? body.phone : "";
  const action = body.action;
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400, headers: operationsNoStoreHeaders });
  const actor = auditActorFromDashboardSession(session!);

  if (action === "handled") {
    await markConversationHandled(phone, actor);
    return NextResponse.json({ ok: true }, { headers: operationsNoStoreHeaders });
  }
  if (action === "followup" || action === "link") {
    await logConversationAction(phone, action, actor);
    return NextResponse.json({ ok: true }, { headers: operationsNoStoreHeaders });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400, headers: operationsNoStoreHeaders });
}

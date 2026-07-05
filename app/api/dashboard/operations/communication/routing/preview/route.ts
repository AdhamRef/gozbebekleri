import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../_auth";
import { listSenders, toSenderConfig } from "@/lib/communication/sender-service";
import { listRoutingRules, toRoutingRuleConfig } from "@/lib/communication/routing-rule-service";
import { resolveSender } from "@/lib/communication/sender-router";
import { isCommunicationChannel } from "@/lib/communication/communication-runtime-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Configuration-only routing preview: given a channel + recipient locale/country + purpose,
 * shows which configured sender would be selected (or the skip reason). No message is sent.
 */
export async function POST(req: NextRequest) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const channel = String(body.channel ?? "").toUpperCase();
  if (!isCommunicationChannel(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400, headers: operationsNoStoreHeaders });
  }
  const purpose = body.purpose === "TRANSACTIONAL" ? "TRANSACTIONAL" : "MARKETING";

  const [senders, rules] = await Promise.all([listSenders(), listRoutingRules(channel)]);
  const result = resolveSender(
    {
      channel,
      locale: typeof body.locale === "string" ? body.locale : null,
      country: typeof body.country === "string" ? body.country : null,
      purpose,
    },
    senders.map(toSenderConfig),
    rules.map(toRoutingRuleConfig)
  );

  if ("skipped" in result) {
    return NextResponse.json(
      { selected: null, skipped: true, reason: result.reason, note: "التوجيه إعداد فقط — لا يوجد إرسال حتى تفعيل المزود." },
      { headers: operationsNoStoreHeaders }
    );
  }
  return NextResponse.json(
    {
      selected: { id: result.sender.id, name: result.sender.name, provider: result.sender.provider, matchedBy: result.matchedBy },
      skipped: false,
      note: "التوجيه إعداد فقط — لا يوجد إرسال حتى تفعيل المزود.",
    },
    { headers: operationsNoStoreHeaders }
  );
}

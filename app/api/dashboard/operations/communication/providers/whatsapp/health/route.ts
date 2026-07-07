import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { getSender } from "@/lib/communication/sender-service";
import { healthCheck } from "@/lib/communication/providers/meta-whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WhatsApp sender health check. Server-side; never returns any token. Resolves the sender's
 * phoneNumberId (or an explicit phoneNumberId) and asks Meta for verified_name / quality_rating /
 * display_phone_number. Safe reason on failure.
 */
export async function POST(req: NextRequest) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  let phoneNumberId = typeof body.phoneNumberId === "string" ? body.phoneNumberId : null;
  if (!phoneNumberId && typeof body.senderId === "string") {
    const sender = await getSender(body.senderId);
    phoneNumberId = sender?.phoneNumberId ?? null;
  }

  const result = await healthCheck(phoneNumberId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { headers: operationsNoStoreHeaders });
  }
  return NextResponse.json(
    { ok: true, displayPhoneNumber: result.displayPhoneNumber ?? null, qualityRating: result.qualityRating ?? null, verifiedName: result.verifiedName ?? null },
    { headers: operationsNoStoreHeaders }
  );
}

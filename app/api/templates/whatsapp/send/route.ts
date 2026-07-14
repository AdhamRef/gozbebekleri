import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * LEGACY ROUTE — DISABLED.
 *
 * This route previously sent WhatsApp through the legacy Twilio path (`lib/whatsapp.ts`) and wrote
 * only `SentMessage`. WhatsApp sending has moved to the Communication Center (Meta WhatsApp Cloud API
 * via ProviderRouter + CommunicationDelivery). This endpoint no longer imports `sendBulkWhatsapp`,
 * never touches Twilio, and cannot send anything — it returns 410 Gone so nothing sends by accident.
 *
 * Migrate manual WhatsApp sends to: /dashboard/operations/communication (campaigns + template tests).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "WHATSAPP_LEGACY_ROUTE_DISABLED",
      messageAr: "تم نقل إرسال واتساب إلى مركز التواصل.",
      redirectTo: "/dashboard/operations/communication",
    },
    { status: 410 }
  );
}

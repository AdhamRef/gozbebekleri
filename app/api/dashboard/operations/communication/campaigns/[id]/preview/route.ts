import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getCampaign } from "@/lib/communication/campaign-service";
import { previewCampaignLocale, createTestDelivery } from "@/lib/communication/campaign-render-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { action: "preview" | "test", locale, recipientEmail?, recipientPhone? }
 * - preview: render the template for a locale (no record).
 * - test: create a TEST CommunicationDelivery. With no provider configured it is recorded SKIPPED
 *   with the not-configured reason — never SENT.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "not found" }, { status: 404, headers: operationsNoStoreHeaders });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const locale = typeof body.locale === "string" ? body.locale : "ar";
  const action = body.action === "test" ? "test" : "preview";

  if (action === "preview") {
    const rendered = await previewCampaignLocale(campaign, locale);
    if (!rendered) return NextResponse.json({ error: "تعذّر المعاينة — تأكد من اختيار قالب ولغة صحيحة." }, { status: 400, headers: operationsNoStoreHeaders });
    return NextResponse.json({ rendered }, { headers: operationsNoStoreHeaders });
  }

  const result = await createTestDelivery(campaign, {
    locale,
    recipientEmail: typeof body.recipientEmail === "string" ? body.recipientEmail : null,
    recipientPhone: typeof body.recipientPhone === "string" ? body.recipientPhone : null,
    createdBy: auditActorFromDashboardSession(session!).actorId,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ deliveryId: result.deliveryId, status: result.status, reason: result.reason }, { headers: operationsNoStoreHeaders });
}

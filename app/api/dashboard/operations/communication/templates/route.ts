import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getTemplateCenter } from "@/lib/communication/template-center-service";
import { createTemplateGroup, type TemplateChannel } from "@/lib/communication/template-mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List template groups (Template Center) — operations/admin only. */
export async function GET() {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const data = await getTemplateCenter();
  return NextResponse.json(data, { headers: operationsNoStoreHeaders });
}

/** Create a template group + its first language variant. */
export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const channel = String(body.channel ?? "").toUpperCase() as TemplateChannel;
  if (!["WHATSAPP", "EMAIL", "SMS"].includes(channel)) return NextResponse.json({ error: "channel غير صحيح" }, { status: 400, headers: operationsNoStoreHeaders });

  const result = await createTemplateGroup(
    {
      channel,
      kind: body.kind === "SYSTEM" ? "SYSTEM" : "CAMPAIGN",
      name: typeof body.name === "string" ? body.name : "",
      language: typeof body.language === "string" ? body.language : "ar",
      purpose: typeof body.purpose === "string" ? body.purpose : null,
      body: typeof body.body === "string" ? body.body : undefined,
      footerText: typeof body.footerText === "string" ? body.footerText : null,
      subject: typeof body.subject === "string" ? body.subject : undefined,
      preheader: typeof body.preheader === "string" ? body.preheader : null,
      layoutId: typeof body.layoutId === "string" ? body.layoutId : null,
      title: typeof body.title === "string" ? body.title : undefined,
      ctaText: typeof body.ctaText === "string" ? body.ctaText : null,
      ctaUrl: typeof body.ctaUrl === "string" ? body.ctaUrl : null,
      footerNote: typeof body.footerNote === "string" ? body.footerNote : null,
    },
    auditActorFromDashboardSession(session!)
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ id: result.data.id }, { headers: operationsNoStoreHeaders });
}

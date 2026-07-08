import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { updateTemplateGroup } from "@/lib/communication/template-mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Update a template group (name / status / content). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await updateTemplateGroup(
    id,
    {
      name: typeof body.name === "string" ? body.name : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      purpose: typeof body.purpose === "string" ? body.purpose : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
      subject: typeof body.subject === "string" ? body.subject : undefined,
      preheader: typeof body.preheader === "string" ? body.preheader : undefined,
      footerText: typeof body.footerText === "string" ? body.footerText : undefined,
    },
    auditActorFromDashboardSession(session!)
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ id: result.data.id }, { headers: operationsNoStoreHeaders });
}

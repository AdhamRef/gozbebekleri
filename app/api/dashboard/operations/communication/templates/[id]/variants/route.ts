import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { upsertVariant } from "@/lib/communication/template-mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Add a language variant, or duplicate an existing variant into another language.
 * When `duplicateFrom` is set, content is COPIED (no automatic translation) and the group returns to
 * DRAFT so a human can translate/review it.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const language = typeof body.language === "string" ? body.language : "";
  if (!language) return NextResponse.json({ error: "language مطلوب" }, { status: 400, headers: operationsNoStoreHeaders });

  const result = await upsertVariant(
    id,
    {
      language,
      body: typeof body.body === "string" ? body.body : undefined,
      subject: typeof body.subject === "string" ? body.subject : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      ctaText: typeof body.ctaText === "string" ? body.ctaText : undefined,
      ctaUrl: typeof body.ctaUrl === "string" ? body.ctaUrl : undefined,
      footerNote: typeof body.footerNote === "string" ? body.footerNote : undefined,
      duplicateFrom: typeof body.duplicateFrom === "string" ? body.duplicateFrom : undefined,
    },
    auditActorFromDashboardSession(session!)
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ id: result.data.id }, { headers: operationsNoStoreHeaders });
}

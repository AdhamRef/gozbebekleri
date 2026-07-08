import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createEmailLayout } from "@/lib/communication/template-mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List email layouts. */
export async function GET() {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const rows = process.env.DATABASE_URL
    ? await prisma.emailLayout.findMany({ orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }], take: 100, select: { id: true, name: true, description: true, status: true, isDefault: true, unsubscribePlaceholder: true, updatedAt: true } }).catch(() => [])
    : [];
  return NextResponse.json({ layouts: rows }, { headers: operationsNoStoreHeaders });
}

/** Create a reusable email layout (fixed shell with a content slot). */
export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await createEmailLayout(
    {
      name: typeof body.name === "string" ? body.name : "",
      description: typeof body.description === "string" ? body.description : null,
      htmlShell: typeof body.htmlShell === "string" ? body.htmlShell : "",
      contentSlot: typeof body.contentSlot === "string" ? body.contentSlot : undefined,
      headerHtml: typeof body.headerHtml === "string" ? body.headerHtml : null,
      footerHtml: typeof body.footerHtml === "string" ? body.footerHtml : null,
      ctaSection: typeof body.ctaSection === "string" ? body.ctaSection : null,
      unsubscribePlaceholder: body.unsubscribePlaceholder === true,
      isDefault: body.isDefault === true,
    },
    auditActorFromDashboardSession(session!)
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ id: result.data.id }, { headers: operationsNoStoreHeaders });
}

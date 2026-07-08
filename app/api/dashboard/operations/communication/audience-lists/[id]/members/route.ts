import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { addDonorMembers, addTestContact, removeMember } from "@/lib/communication/audience-list-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Add members: `{ userIds: [] }` (donors) or `{ testContact: { name?, email?, phone?, locale? } }`. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = auditActorFromDashboardSession(session!);

  if (body.testContact && typeof body.testContact === "object") {
    const c = body.testContact as Record<string, unknown>;
    const result = await addTestContact(
      id,
      { name: typeof c.name === "string" ? c.name : null, email: typeof c.email === "string" ? c.email : null, phone: typeof c.phone === "string" ? c.phone : null, locale: typeof c.locale === "string" ? c.locale : null },
      actor
    );
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
    return NextResponse.json({ id: result.data.id }, { headers: operationsNoStoreHeaders });
  }

  const userIds = Array.isArray(body.userIds) ? (body.userIds as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const result = await addDonorMembers(id, userIds, actor);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ added: result.data.added }, { headers: operationsNoStoreHeaders });
}

/** Remove a member: `{ memberId }`. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) return NextResponse.json({ error: "memberId مطلوب" }, { status: 400, headers: operationsNoStoreHeaders });
  const result = await removeMember(id, memberId, auditActorFromDashboardSession(session!));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ id: result.data.id }, { headers: operationsNoStoreHeaders });
}

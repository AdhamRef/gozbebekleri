import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getAudienceList, updateAudienceList } from "@/lib/communication/audience-list-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const data = await getAudienceList(id);
  if (!data) return NextResponse.json({ error: "القائمة غير موجودة" }, { status: 404, headers: operationsNoStoreHeaders });
  return NextResponse.json(data, { headers: operationsNoStoreHeaders });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await updateAudienceList(
    id,
    {
      name: typeof body.name === "string" ? body.name : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      channels: Array.isArray(body.channels) ? (body.channels as unknown[]).filter((c): c is string => typeof c === "string") : undefined,
      locale: typeof body.locale === "string" ? body.locale : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
    },
    auditActorFromDashboardSession(session!)
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ id: result.data.id }, { headers: operationsNoStoreHeaders });
}

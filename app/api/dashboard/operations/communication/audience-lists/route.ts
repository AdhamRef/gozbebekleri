import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { listAudienceLists, createAudienceList, type AudienceListType } from "@/lib/communication/audience-list-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const lists = await listAudienceLists();
  return NextResponse.json({ lists }, { headers: operationsNoStoreHeaders });
}

export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await createAudienceList(
    {
      name: typeof body.name === "string" ? body.name : "",
      description: typeof body.description === "string" ? body.description : null,
      type: (body.type === "TEST" ? "TEST" : "CUSTOM") as AudienceListType,
      locale: typeof body.locale === "string" ? body.locale : null,
      channels: Array.isArray(body.channels) ? (body.channels as unknown[]).filter((c): c is string => typeof c === "string") : [],
    },
    auditActorFromDashboardSession(session!)
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ id: result.data.id }, { headers: operationsNoStoreHeaders });
}

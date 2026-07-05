import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { listCampaigns, createCampaign } from "@/lib/communication/campaign-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safety = { externalSideEffects: false, autoSend: false, secretsExposed: false } as const;

export async function GET() {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  return NextResponse.json({ campaigns: await listCampaigns(), safety }, { headers: operationsNoStoreHeaders });
}

export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const result = await createCampaign(body, auditActorFromDashboardSession(session!));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ campaign: result.data }, { headers: operationsNoStoreHeaders });
}

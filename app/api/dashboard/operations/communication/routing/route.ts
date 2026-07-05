import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { listRoutingRules, createRoutingRule, updateRoutingRule } from "@/lib/communication/routing-rule-service";
import { listSenders } from "@/lib/communication/sender-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safety = { externalSideEffects: false, autoSend: false, secretsExposed: false } as const;

export async function GET() {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const [rules, senders] = await Promise.all([listRoutingRules(), listSenders()]);
  // Senders are returned so the UI can populate primary/fallback pickers (no secrets on senders).
  return NextResponse.json({ rules, senders, safety }, { headers: operationsNoStoreHeaders });
}

export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const result = await createRoutingRule(body, auditActorFromDashboardSession(session!));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ rule: result.data }, { headers: operationsNoStoreHeaders });
}

export async function PATCH(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400, headers: operationsNoStoreHeaders });
  const { id: _omit, ...patch } = body;
  void _omit;
  const result = await updateRoutingRule(id, patch, auditActorFromDashboardSession(session!));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ rule: result.data }, { headers: operationsNoStoreHeaders });
}

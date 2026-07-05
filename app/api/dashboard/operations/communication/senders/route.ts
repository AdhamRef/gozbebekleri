import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { listSenders, createSender, updateSender, setDefaultSender } from "@/lib/communication/sender-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safety = { externalSideEffects: false, autoSend: false, secretsExposed: false } as const;

export async function GET() {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  return NextResponse.json({ senders: await listSenders(), safety }, { headers: operationsNoStoreHeaders });
}

export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const result = await createSender(body, auditActorFromDashboardSession(session!));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ sender: result.data }, { headers: operationsNoStoreHeaders });
}

export async function PATCH(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400, headers: operationsNoStoreHeaders });
  const actor = auditActorFromDashboardSession(session!);
  // Setting the default is a dedicated action so the channel's other senders are cleared.
  if (body.makeDefault === true) {
    const result = await setDefaultSender(id, actor);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
    return NextResponse.json({ sender: result.data }, { headers: operationsNoStoreHeaders });
  }
  const { id: _omit, makeDefault: _omit2, ...patch } = body;
  void _omit;
  void _omit2;
  const result = await updateSender(id, patch, actor);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ sender: result.data }, { headers: operationsNoStoreHeaders });
}

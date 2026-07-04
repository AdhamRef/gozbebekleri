import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getTransactionalFlowsOverview, normalizeTransactionalFlow, removeTransactionalFlow, saveTransactionalFlow } from "@/lib/communication/transactional-flows-repository";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const flowSchema = z.object({
  operation: z.enum(["SAVE", "REMOVE"]).optional(),
  item: z.record(z.unknown()).and(z.object({ id: z.string().trim().min(1).max(160).optional() })),
});

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function dashboardActor() {
  const session = await getServerSession(authOptions);
  return session ? auditActorFromDashboardSession(session) : null;
}

export async function GET() {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;
  return NextResponse.json(await getTransactionalFlowsOverview(), { headers: operationsNoStoreHeaders });
}

export async function PATCH(request: Request) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const parsed = flowSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid transactional flow payload", details: parsed.error.flatten() }, { status: 400, headers: operationsNoStoreHeaders });
  }

  const item = normalizeTransactionalFlow(parsed.data.item);
  const actor = await dashboardActor();
  const result = parsed.data.operation === "REMOVE"
    ? await removeTransactionalFlow(item, actor)
    : await saveTransactionalFlow(item, actor);

  return NextResponse.json(result, { status: result.status, headers: operationsNoStoreHeaders });
}

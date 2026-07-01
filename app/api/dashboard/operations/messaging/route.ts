import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getMessagingOverview, normalizeCampaign, normalizeTemplate, removeMessagingItem, saveMessagingItem } from "@/lib/operations/messaging/messaging-repository";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messagingSchema = z.object({
  kind: z.enum(["template", "campaign"]),
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
  const overview = await getMessagingOverview();
  return NextResponse.json(overview, { headers: operationsNoStoreHeaders });
}

export async function PATCH(request: Request) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const parsed = messagingSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid messaging payload", details: parsed.error.flatten() }, { status: 400, headers: operationsNoStoreHeaders });
  }

  const item = parsed.data.kind === "template" ? normalizeTemplate(parsed.data.item) : normalizeCampaign(parsed.data.item);
  const actor = await dashboardActor();
  const result = parsed.data.operation === "REMOVE"
    ? await removeMessagingItem(parsed.data.kind, item, actor)
    : await saveMessagingItem(parsed.data.kind, item, actor);

  return NextResponse.json(result, { status: result.status, headers: operationsNoStoreHeaders });
}

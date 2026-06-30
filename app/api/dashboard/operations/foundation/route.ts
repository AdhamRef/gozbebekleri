import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { foundationCollections, removeFoundationRecordOverride, saveFoundationRecordOverride } from "@/lib/operations/foundation-override-repository";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const foundationItemSchema = z.object({
  collection: z.enum(foundationCollections),
  operation: z.enum(["SAVE", "REMOVE"]).optional(),
  item: z.record(z.unknown()).and(z.object({ id: z.string().trim().min(1).max(120) })),
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

export async function PATCH(request: Request) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const parsed = foundationItemSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid operations item update", details: parsed.error.flatten() }, { status: 400, headers: operationsNoStoreHeaders });
  }

  const actor = await dashboardActor();
  const result = parsed.data.operation === "REMOVE"
    ? await removeFoundationRecordOverride({ collection: parsed.data.collection, item: parsed.data.item, actor })
    : await saveFoundationRecordOverride({ collection: parsed.data.collection, item: parsed.data.item, actor });

  return NextResponse.json(result, { status: result.status, headers: operationsNoStoreHeaders });
}

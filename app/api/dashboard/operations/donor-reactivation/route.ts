import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import {
  getDonorReactivationOverview,
  runDonorReactivationAction,
} from "@/lib/operations/donor-reactivation/donor-reactivation-service";
import { requireOperationsApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.object({
  donorId: z.string().trim().min(1).max(120),
  action: z.enum(["MARK_MANUALLY_SENT", "SKIP_THIS_MONTH", "DISMISS", "ASSIGN_FOLLOW_UP_TASK"]),
  note: z.string().trim().max(500).optional().nullable(),
});

function jsonNoStore(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET() {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const overview = await getDonorReactivationOverview();
  return jsonNoStore({ ok: true, ...overview });
}

export async function POST(request: NextRequest) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonNoStore({ ok: false, error: "Invalid donor reactivation action", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await runDonorReactivationAction(parsed.data.donorId, parsed.data.action, parsed.data.note, session);
  return jsonNoStore(result, { status: result.status });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { transitionCampaign } from "@/lib/communication/campaign-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["SUBMIT_REVIEW", "APPROVE", "SCHEDULE", "CANCEL"]),
  scheduledAt: z.string().datetime().nullable().optional(),
});

/**
 * Status transitions only — never sending.
 *
 * The legality of each move lives in `campaign-service`'s TRANSITIONS table, not here; this route
 * exists so the UI can request one. Keeping approval separate from the send route is what makes
 * "approved by a human" a real gate rather than a checkbox the send call could set for itself.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "messages");
  if (denied) return denied;
  const { id } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await transitionCampaign(id, parsed.data.action, {
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    actor: auditActorFromDashboardSession(session!),
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, campaign: result.data });
}

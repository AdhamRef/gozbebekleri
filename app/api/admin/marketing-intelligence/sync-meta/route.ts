import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { runSyncJob } from "@/lib/marketing/sync";

export const dynamic = "force-dynamic";

function day(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);

  const outcome = await runSyncJob({ platform: "meta", dateFrom: from, dateTo: to });
  return NextResponse.json({ ok: outcome.ok, status: outcome.status, range: { from: day(from), to: day(to) }, results: outcome.results });
}

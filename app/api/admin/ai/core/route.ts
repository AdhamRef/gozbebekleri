import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { createAiDraftResponse, getAiCoreOverview } from "@/lib/ai/core/ai-core-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const draftSchema = z.object({
  context: z.enum(["marketing", "content", "archive", "brand"]),
  prompt: z.string().trim().max(2000).default(""),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  return NextResponse.json(getAiCoreOverview(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json(createAiDraftResponse(parsed.data.context, parsed.data.prompt), {
    headers: { "Cache-Control": "no-store" },
  });
}

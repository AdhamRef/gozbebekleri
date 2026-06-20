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

function jsonNoStore(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  return jsonNoStore(getAiCoreOverview());
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return jsonNoStore({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  return jsonNoStore(createAiDraftResponse(parsed.data.context, parsed.data.prompt));
}

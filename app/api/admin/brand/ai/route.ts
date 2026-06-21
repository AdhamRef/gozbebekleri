import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { runGrowthSuiteAiAction } from "@/lib/ai/growth-suite-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  action: z.enum([
    "reviewCopyAgainstBrandVoice",
    "suggestMessageFramework",
    "translateWithBrandVoice",
    "campaignCopyGuard",
  ]),
  context: z.enum(["marketing", "operations", "archive", "brand"]).default("brand"),
  profileId: z.string().trim().max(120).optional().nullable(),
  copy: z.string().trim().max(4000).optional(),
  sourceCopy: z.string().trim().max(4000).optional(),
  targetLocale: z.string().trim().max(12).optional(),
  locale: z.string().trim().max(12).optional(),
  contentType: z.string().trim().max(80).optional(),
  purpose: z.string().trim().max(240).optional(),
  audience: z.string().trim().max(240).optional(),
});

function jsonNoStore(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "brand");
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonNoStore({ ok: false, error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const user = session?.user?.email || session?.user?.name || "dashboard-user";
  const result = await runGrowthSuiteAiAction({ ...parsed.data, user });
  return jsonNoStore({ ok: true, result });
}

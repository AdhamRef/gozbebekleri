import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createAuditBackedContentPublication, readAuditBackedContentPublications } from "@/lib/operations/content-publication-repository";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicationSchema = z.object({
  contentItemId: z.string().trim().min(1).max(120),
  platform: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["SCHEDULED", "READY_FOR_MANUAL_SEND", "PUBLISHED", "MANUALLY_SENT", "CANCELLED", "FAILED"]).default("PUBLISHED"),
  publishedUrl: z.string().trim().url().optional(),
  scheduledAt: z.string().trim().max(80).optional(),
  publishedAt: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
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

  const publications = await readAuditBackedContentPublications();
  return NextResponse.json({ ok: true, count: publications.length, items: publications }, { headers: operationsNoStoreHeaders });
}

export async function POST(request: Request) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const parsed = publicationSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid publication payload", details: parsed.error.flatten() }, { status: 400, headers: operationsNoStoreHeaders });
  }

  const result = await createAuditBackedContentPublication(parsed.data, await dashboardActor());
  return NextResponse.json(result, { status: result.status, headers: operationsNoStoreHeaders });
}

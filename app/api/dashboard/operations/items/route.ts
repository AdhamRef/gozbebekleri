import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createAuditBackedContentItem, updateAuditBackedContentItem } from "@/lib/operations/content-item-repository";
import { createAuditBackedContentPublication } from "@/lib/operations/content-publication-repository";
import { listContentItems } from "@/lib/operations/repository";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentItemCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.string().trim().max(40).optional(),
  format: z.string().trim().max(40).optional(),
  status: z.string().trim().max(40).optional(),
  channel: z.string().trim().max(80).optional(),
  due: z.string().trim().max(40).optional(),
  sourceType: z.string().trim().max(60).optional(),
  sourceAssetId: z.string().trim().max(120).optional(),
  sourceProjectId: z.string().trim().max(120).optional(),
  driveUrl: z.string().trim().url().optional(),
  previewUrl: z.string().trim().url().optional(),
  notes: z.string().trim().max(500).optional(),
});

const contentItemUpdateSchema = contentItemCreateSchema.partial().extend({
  id: z.string().trim().min(1).max(120),
  publishedUrl: z.string().trim().url().optional(),
  publicationPlatform: z.string().trim().max(80).optional(),
  publicationNotes: z.string().trim().max(500).optional(),
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

  const dataset = await listContentItems();
  return NextResponse.json({
    source: "operations-repository",
    count: dataset.items.length,
    persistence: dataset.persistence,
    items: dataset.items,
  }, { headers: operationsNoStoreHeaders });
}

export async function POST(request: Request) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const parsed = contentItemCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid content item payload", details: parsed.error.flatten() }, { status: 400, headers: operationsNoStoreHeaders });
  }

  const result = await createAuditBackedContentItem(parsed.data, await dashboardActor());
  return NextResponse.json(result, { status: result.status, headers: operationsNoStoreHeaders });
}

export async function PATCH(request: Request) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const parsed = contentItemUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid content item update", details: parsed.error.flatten() }, { status: 400, headers: operationsNoStoreHeaders });
  }

  const actor = await dashboardActor();
  const result = await updateAuditBackedContentItem(parsed.data, actor);
  const shouldRecordPublication = parsed.data.status?.toUpperCase() === "PUBLISHED" && result.ok && result.data;

  if (!shouldRecordPublication) {
    return NextResponse.json(result, { status: result.status, headers: operationsNoStoreHeaders });
  }

  const publication = await createAuditBackedContentPublication(
    {
      contentItemId: result.data?.id,
      platform: parsed.data.publicationPlatform || result.data?.channel,
      status: "PUBLISHED",
      publishedUrl: parsed.data.publishedUrl,
      notes: parsed.data.publicationNotes || "Manual publish status update from Operations content board.",
    },
    actor,
    result.data,
  );

  return NextResponse.json({ ...result, publication }, { status: result.status, headers: operationsNoStoreHeaders });
}

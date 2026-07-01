import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createAuditBackedContentItem, deleteAuditBackedContentItem as removeAuditBackedContentItem, updateAuditBackedContentItem } from "@/lib/operations/content-item-repository";
import { createRuntimeContentItem } from "@/lib/operations/content-item-runtime-repository";
import { createAuditBackedContentPublication } from "@/lib/operations/content-publication-repository";
import { listContentItems } from "@/lib/operations/repository";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalUrl = z.string().trim().url().optional();

const contentItemCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.string().trim().max(40).optional(),
  format: z.string().trim().max(40).optional(),
  status: z.string().trim().max(40).optional(),
  channel: z.string().trim().max(80).optional(),
  due: z.string().trim().max(40).optional(),
  owner: z.string().trim().max(80).optional(),
  language: z.string().trim().max(40).optional(),
  theme: z.string().trim().max(120).optional(),
  hook: z.string().trim().max(240).optional(),
  cta: z.string().trim().max(160).optional(),
  copy: z.string().trim().max(2000).optional(),
  figmaUrl: optionalUrl,
  driveUrl: optionalUrl,
  videoUrl: optionalUrl,
  finalAssetUrl: optionalUrl,
  campaignLinkId: z.string().trim().max(120).optional(),
  adId: z.string().trim().max(120).optional(),
  sourceType: z.string().trim().max(60).optional(),
  sourceAssetId: z.string().trim().max(120).optional(),
  sourceProjectId: z.string().trim().max(120).optional(),
  previewUrl: optionalUrl,
  notes: z.string().trim().max(500).optional(),
});

const contentItemUpdateSchema = contentItemCreateSchema.partial().extend({
  id: z.string().trim().min(1).max(120),
  operation: z.literal("REMOVE").optional(),
  publishedUrl: optionalUrl,
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

  const runtimeItem = await createRuntimeContentItem(parsed.data);
  if (runtimeItem) {
    return NextResponse.json({ ok: true, status: 201, data: runtimeItem, persistence: "ContentItem" }, { status: 201, headers: operationsNoStoreHeaders });
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
  if (parsed.data.operation === "REMOVE") {
    const result = await removeAuditBackedContentItem(parsed.data, actor);
    return NextResponse.json(result, { status: result.status, headers: operationsNoStoreHeaders });
  }

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
      notes: parsed.data.publicationNotes || "تم تسجيل النشر اليدوي من لوحة المحتوى.",
    },
    actor,
    result.data,
  );

  return NextResponse.json({ ...result, publication }, { status: result.status, headers: operationsNoStoreHeaders });
}

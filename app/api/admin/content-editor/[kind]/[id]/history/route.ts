import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { CONFIG, fieldsFor, parseKind } from "@/lib/content-editor/contracts";
import { contentStore } from "@/lib/content-editor/store";
import { readContent } from "@/lib/content-editor/service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind: raw, id } = await ctx.params, kind = parseKind(raw);
  if (!kind || !/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ error: "محتوى غير صالح" }, { status: 404 });
  const session = await getServerSession(authOptions), denied = requireAdminOrDashboardPermission(session, CONFIG[kind].permission); if (denied) return denied;
  try {
    const historyId = request.nextUrl.searchParams.get("revisionId");
    if (historyId) {
      if (!/^[a-f0-9]{24}$/i.test(historyId)) return NextResponse.json({ error: "نسخة غير صالحة" }, { status: 400 });
      const entry = await contentStore.model("contentEditorRevision").findFirst({ where: { id: historyId, kind, entityId: id } });
      if (!entry) return NextResponse.json({ error: "النسخة غير موجودة" }, { status: 404 });
      const row = await readContent(contentStore, kind, id), allowed = new Set(fieldsFor(kind, row).filter(f => !f.locked && !["ogImage", "seoNoIndex", "image", "videoUrl"].includes(f.key)).map(f => f.key));
      const values = Object.fromEntries(Object.entries(entry.values as Record<string, Record<string, string>>).map(([locale, fields]) => [locale, Object.fromEntries(Object.entries(fields).filter(([key, value]) => allowed.has(key) && typeof value === "string"))]));
      return NextResponse.json({ values, createdAt: entry.createdAt }, { headers: { "Cache-Control": "no-store" } });
    }
    const items = await contentStore.model("contentEditorRevision").findMany({ where: { kind, entityId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, createdAt: true, revision: true } });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "تعذر تحميل سجل النسخ" }, { status: 500 }); }
}

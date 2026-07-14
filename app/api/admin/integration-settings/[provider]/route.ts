import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireIntegrationSettingsAdmin, requireIntegrationSettingsManage, requireIntegrationSettingsView } from "@/lib/integration-settings/auth";
import { integrationActorFromSession, integrationProviderFromParam, integrationSettingsErrorResponse } from "@/lib/integration-settings/http";
import { integrationSettingsService } from "@/lib/integration-settings/prisma-service";

const updateSchema = z.object({ settings: z.array(z.object({ key: z.string().min(1).max(80), value: z.string().max(10_000) })).min(1).max(20) });
const deleteSchema = z.object({ key: z.string().min(1).max(80), confirm: z.literal(true) });
const providerActionSchema = z.object({ action: z.enum(["ENABLE", "DISABLE"]) });
type RouteContext = { params: Promise<{ provider: string }> };
async function resolveProvider(context: RouteContext) { return integrationProviderFromParam((await context.params).provider); }

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = requireIntegrationSettingsView(session); if (denied) return denied;
  const provider = await resolveProvider(context); if (!provider) return NextResponse.json({ error: "مزود غير معروف." }, { status: 404 });
  try { return NextResponse.json({ provider: await integrationSettingsService.getProviderSnapshot(provider, integrationActorFromSession(session!)) }); }
  catch (error) { return integrationSettingsErrorResponse(error); }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = requireIntegrationSettingsManage(session); if (denied) return denied;
  const provider = await resolveProvider(context); if (!provider) return NextResponse.json({ error: "مزود غير معروف." }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات الإعدادات غير صالحة." }, { status: 400 });
  try { return NextResponse.json({ ok: true, ...(await integrationSettingsService.saveProviderSettings(provider, parsed.data.settings, integrationActorFromSession(session!))) }); }
  catch (error) { return integrationSettingsErrorResponse(error); }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = requireIntegrationSettingsAdmin(session); if (denied) return denied;
  const provider = await resolveProvider(context); if (!provider) return NextResponse.json({ error: "مزود غير معروف." }, { status: 404 });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "حذف الإعداد يحتاج تأكيدًا صريحًا." }, { status: 400 });
  try { return NextResponse.json({ ok: true, provider: await integrationSettingsService.deleteSetting(provider, parsed.data.key, integrationActorFromSession(session!)) }); }
  catch (error) { return integrationSettingsErrorResponse(error); }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = requireIntegrationSettingsAdmin(session); if (denied) return denied;
  const provider = await resolveProvider(context); if (!provider) return NextResponse.json({ error: "مزود غير معروف." }, { status: 404 });
  const parsed = providerActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "إجراء المزود غير صالح." }, { status: 400 });
  try { return NextResponse.json({ ok: true, provider: await integrationSettingsService.setProviderEnabled(provider, parsed.data.action === "ENABLE", integrationActorFromSession(session!)) }); }
  catch (error) { return integrationSettingsErrorResponse(error); }
}

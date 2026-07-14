import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { pendingSettingDiscardSchema } from "@/lib/integration-settings/api-contracts";
import { requireIntegrationSettingsManage } from "@/lib/integration-settings/auth";
import { getFieldDefinition } from "@/lib/integration-settings/catalog";
import { integrationActorFromSession, integrationProviderFromParam, integrationSettingsErrorResponse } from "@/lib/integration-settings/http";
import { integrationSettingsService } from "@/lib/integration-settings/prisma-service";

type RouteContext = { params: Promise<{ provider: string; key: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = requireIntegrationSettingsManage(session);
  if (denied) return denied;

  const { provider: providerParam, key } = await context.params;
  const provider = integrationProviderFromParam(providerParam);
  if (!provider) return NextResponse.json({ error: "مزود غير معروف." }, { status: 404 });
  const field = getFieldDefinition(provider, key);
  if (!field) return NextResponse.json({ error: "حقل الإعداد غير معروف." }, { status: 400 });
  if (!field.secret) return NextResponse.json({ error: "هذا الحقل لا يملك قيمة سرية معلقة." }, { status: 400 });

  const parsed = pendingSettingDiscardSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات رفض القيمة المعلقة غير صالحة." }, { status: 400 });

  try {
    const snapshot = await integrationSettingsService.discardPendingSetting(
      provider,
      key,
      parsed.data.pendingVersion,
      integrationActorFromSession(session!),
      parsed.data.failureReason
    );
    return NextResponse.json({ ok: true, provider: snapshot });
  } catch (error) {
    return integrationSettingsErrorResponse(error);
  }
}

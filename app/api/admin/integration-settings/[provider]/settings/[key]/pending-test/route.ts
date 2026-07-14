import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireIntegrationSettingsTest } from "@/lib/integration-settings/auth";
import { getFieldDefinition } from "@/lib/integration-settings/catalog";
import { integrationActorFromSession, integrationProviderFromParam, integrationSettingsErrorResponse } from "@/lib/integration-settings/http";
import { integrationSettingsService } from "@/lib/integration-settings/prisma-service";

const bodySchema = z.object({
  pendingVersion: z.number().int().positive(),
  result: z.enum(["SUCCESS", "FAILED"]),
  failureReason: z.string().max(96).optional().nullable(),
});

type RouteContext = { params: Promise<{ provider: string; key: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = requireIntegrationSettingsTest(session);
  if (denied) return denied;

  const { provider: providerParam, key } = await context.params;
  const provider = integrationProviderFromParam(providerParam);
  if (!provider) return NextResponse.json({ error: "مزود غير معروف." }, { status: 404 });
  if (!getFieldDefinition(provider, key)) return NextResponse.json({ error: "حقل الإعداد غير معروف." }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "نتيجة اختبار القيمة الجديدة غير صالحة." }, { status: 400 });

  try {
    const snapshot = await integrationSettingsService.recordPendingSettingTest(
      provider,
      key,
      parsed.data.pendingVersion,
      parsed.data.result,
      integrationActorFromSession(session!),
      parsed.data.failureReason
    );
    return NextResponse.json({ ok: true, provider: snapshot });
  } catch (error) {
    return integrationSettingsErrorResponse(error);
  }
}

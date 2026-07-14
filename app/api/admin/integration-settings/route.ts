import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { INTEGRATION_PROVIDERS } from "@/lib/integration-settings/catalog";
import { requireIntegrationSettingsView } from "@/lib/integration-settings/auth";
import { integrationSettingsService } from "@/lib/integration-settings/prisma-service";
import { integrationActorFromSession } from "@/lib/integration-settings/http";

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireIntegrationSettingsView(session);
  if (denied) return denied;
  const actor = integrationActorFromSession(session!);
  const providers = await Promise.all(INTEGRATION_PROVIDERS.map((provider) => integrationSettingsService.getProviderSnapshot(provider, actor)));
  return NextResponse.json({ providers });
}

import { NextResponse } from "next/server";
import { getProviderConnectionsReadiness } from "@/lib/communication/provider-connections";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    providers: await getProviderConnectionsReadiness(),
    safety: {
      externalSideEffects: false,
      autoSend: false,
      secretsExposed: false,
      note: "Provider readiness is calculated from active database settings with environment fallback. No secrets are returned.",
    },
  }, { headers: operationsNoStoreHeaders });
}

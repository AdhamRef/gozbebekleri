import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { listProfiles, setProfileConsent } from "@/lib/communication/donor-communication-profile-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safety = { externalSideEffects: false, autoSend: false, secretsExposed: false } as const;

export async function GET(req: NextRequest) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const locale = req.nextUrl.searchParams.get("locale") ?? undefined;
  const profiles = await listProfiles({ locale: locale || undefined });
  return NextResponse.json({ profiles, safety }, { headers: operationsNoStoreHeaders });
}

export async function PATCH(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400, headers: operationsNoStoreHeaders });
  const result = await setProfileConsent(
    userId,
    {
      whatsappOptIn: typeof body.whatsappOptIn === "boolean" ? body.whatsappOptIn : undefined,
      emailOptIn: typeof body.emailOptIn === "boolean" ? body.emailOptIn : undefined,
      smsOptIn: typeof body.smsOptIn === "boolean" ? body.smsOptIn : undefined,
      doNotContact: typeof body.doNotContact === "boolean" ? body.doNotContact : undefined,
    },
    auditActorFromDashboardSession(session!)
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ profile: result.data }, { headers: operationsNoStoreHeaders });
}

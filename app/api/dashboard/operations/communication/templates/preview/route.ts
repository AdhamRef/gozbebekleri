import { NextResponse } from "next/server";
import { z } from "zod";
import { renderTemplatePreview } from "@/lib/communication/template-renderer";
import { operationsNoStoreHeaders, requireOperationsApiAccess } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const previewSchema = z.object({
  body: z.string().max(5000),
  values: z.record(z.string()).optional(),
});

async function readJson(request: Request) {
  try { return await request.json(); } catch { return null; }
}

export async function POST(request: Request) {
  const denied = await requireOperationsApiAccess();
  if (denied) return denied;

  const parsed = previewSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid template preview payload", details: parsed.error.flatten() }, { status: 400, headers: operationsNoStoreHeaders });
  }

  return NextResponse.json({
    ok: true,
    preview: renderTemplatePreview(parsed.data.body, parsed.data.values),
    safety: {
      externalSideEffects: false,
      autoSend: false,
      providerCall: false,
    },
  }, { headers: operationsNoStoreHeaders });
}

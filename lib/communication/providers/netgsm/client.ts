import { getNetgsmSmsConfig } from "../../provider-env";
import { NETGSM_REASONS, mapNetgsmCode, scrubNetgsm } from "./errors";
import { isTurkishNumber, type NetgsmSmsInput, type NetgsmSendResult } from "./types";

/**
 * Netgsm SMS adapter — Turkish numbers ONLY. Server-only: NETGSM_USERCODE / NETGSM_PASSWORD read
 * here, never surfaced. Never falls back to Twilio or Brevo. Response parsing is conservative:
 * success is code "00" (with a jobid). If the account returns a different format, the send is treated
 * as an INVALID_RESPONSE (never a fake sent) — see docs/integrations/netgsm-sms.md for live QA.
 */

const DEFAULT_ENDPOINT = "https://api.netgsm.com.tr/sms/rest/v2/send";

export function isNetgsmConfigured(): boolean {
  return getNetgsmSmsConfig().configured;
}

export { isTurkishNumber };

export async function sendNetgsmSms(input: NetgsmSmsInput, countryCode?: string | null): Promise<NetgsmSendResult> {
  const cfg = getNetgsmSmsConfig();
  if (!cfg.configured) return { ok: false, reason: NETGSM_REASONS.NOT_CONFIGURED };
  if (!isTurkishNumber(input.to, countryCode)) return { ok: false, reason: NETGSM_REASONS.NOT_TURKISH };

  const usercode = process.env.NETGSM_USERCODE!.trim();
  const password = process.env.NETGSM_PASSWORD!.trim();
  const header = process.env.NETGSM_HEADER!.trim();
  const endpoint = process.env.NETGSM_SMS_ENDPOINT?.trim() || DEFAULT_ENDPOINT;
  const auth = Buffer.from(`${usercode}:${password}`).toString("base64");

  const payload = {
    msgheader: header,
    encoding: "TR", // Netgsm Turkish encoding (preserves Turkish characters)
    messages: [{ msg: input.content, no: input.to.replace(/\D/g, "") }],
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, reason: NETGSM_REASONS.REQUEST_FAILED, detail: scrubNetgsm(`${res.status}: ${text}`) };

    // Prefer JSON { code, jobid }. Fall back to the classic "00 <jobid>" plain-text shape.
    let code: string | null = null;
    let jobid: string | null = null;
    try {
      const j = JSON.parse(text) as { code?: unknown; jobid?: unknown };
      if (typeof j.code === "string") code = j.code;
      else if (typeof j.code === "number") code = String(j.code);
      if (typeof j.jobid === "string") jobid = j.jobid;
      else if (typeof j.jobid === "number") jobid = String(j.jobid);
    } catch {
      const m = text.trim().match(/^(\d{2})(?:[\s,]+(\d+))?/);
      if (m) { code = m[1]; jobid = m[2] ?? null; }
    }

    if (!code) return { ok: false, reason: NETGSM_REASONS.INVALID_RESPONSE, detail: scrubNetgsm(text) };
    const mapped = mapNetgsmCode(code);
    if (!mapped.ok) return { ok: false, reason: mapped.reason, detail: scrubNetgsm(`code=${code}`) };
    // Accepted. jobid is the provider message id when present; otherwise a genuine accept marker.
    return { ok: true, providerMessageId: jobid, internalAccepted: jobid == null };
  } catch (error) {
    console.error("sendNetgsmSms failed", scrubNetgsm(String(error)));
    return { ok: false, reason: NETGSM_REASONS.REQUEST_FAILED };
  }
}

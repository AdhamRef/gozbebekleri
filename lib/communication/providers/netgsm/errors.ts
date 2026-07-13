/** Safe error codes for the Netgsm SMS adapter. Never leak usercode/password in messages/logs. */

export const NETGSM_REASONS = {
  NOT_CONFIGURED: "NETGSM_NOT_CONFIGURED",
  NOT_TURKISH: "NETGSM_RECIPIENT_NOT_TURKISH",
  REQUEST_FAILED: "NETGSM_REQUEST_FAILED",
  INVALID_RESPONSE: "NETGSM_INVALID_RESPONSE",
  REJECTED: "NETGSM_REJECTED",
} as const;

export function scrubNetgsm(input: string): string {
  return input
    .replace(/(usercode|password)["'=:\s]+[^&\s"']+/gi, "$1=***")
    .replace(/Basic\s+[A-Za-z0-9+/=]+/g, "Basic ***")
    .slice(0, 300);
}

/**
 * Netgsm success is code "00" (and returns a jobid). Other codes are errors. Response format is
 * documented but needs live QA to confirm across account types — see docs/integrations/netgsm-sms.md.
 */
export function mapNetgsmCode(code: string): { ok: boolean; reason: string } {
  if (code === "00") return { ok: true, reason: "" };
  // 20/30/40/50/51/70/80/85 etc. are various rejection/auth/quota errors — treated as rejected.
  return { ok: false, reason: NETGSM_REASONS.REJECTED };
}

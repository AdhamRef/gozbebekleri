/**
 * Session replay must never inspect donor/admin account and payment flows.
 * This file is deliberately dependency-free for fail-closed verification.
 * A consent management platform must provide an explicit visitor signal.
 */
export function isSensitiveClarityPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  if (/^\/(dashboard|api|auth)(\/|$)/.test(path)) return true;
  return /(^|\/)(dashboard|account|my-account|profile|login|signin|signup|register|checkout|cart|payment|donation-failed|success|receipt|certificate|subscriptions|subscription|donor|settings)(\/|$)/i.test(path);
}

export function mayInitializeClarity(pathname: string, consent: string | null): boolean {
  return consent === "granted" && !isSensitiveClarityPath(pathname);
}

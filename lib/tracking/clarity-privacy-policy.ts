/**
 * Session replay must never inspect donor/admin account and payment flows.
 * This file is deliberately dependency-free for fail-closed verification.
 * A consent management platform must provide an explicit visitor signal.
 */
export function isSensitiveClarityPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  if (/^\/(dashboard|api|auth)(\/|$)/.test(path)) return true;
  return /(^|\/)(dashboard|account|my-account|profile|login|signin|signup|register|checkout|cart|payment|donation|donations|donation-failed|success|receipt|certificate|subscriptions|subscription|donor|settings)(\/|$)/i.test(path);
}

/** The recording script can capture the full URL, including query parameters.
 * Never initialize (or keep running) when personal or payment data appears
 * in the URL, even on otherwise public marketing routes.
 */
export function isSensitiveClarityQuery(search: string): boolean {
  if (!search) return false;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  for (const [name, value] of params) {
    // Unknown query fields can contain donor identifiers even when their key
    // is not obviously named "token". Fail closed; allow only standard UTM.
    if (!/^utm_(source|medium|campaign|content|term)$/i.test(name)) return true;
    const normalizedName = name.replace(/([a-z])([A-Z])/g, "$1_$2");
    if (/(?:^|[_-])(email|phone|mobile|token|secret|password|session|auth|receipt|donation|payment|customer|client)(?:$|[_-])/i.test(normalizedName)) return true;
    if (/@|(?:^|[^a-z])(?:pi_|cs_|sk_|pk_)/i.test(value)) return true;
  }
  return false;
}
export function mayInitializeClarity(pathname: string, consent: string | null, search = ""): boolean {
  return consent === "granted" && !isSensitiveClarityPath(pathname) && !isSensitiveClarityQuery(search);
}

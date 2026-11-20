import crypto from "crypto";

export type PayForCurrencyCode = "949" | "840" | "978";

export function payForCurrencyCode(currency: string): PayForCurrencyCode {
  const c = String(currency || "").toUpperCase();
  if (c === "TRY" || c === "TL") return "949";
  if (c === "EUR") return "978";
  return "840"; // default USD
}

export function payForLang(locale?: string): "TR" | "EN" {
  const l = String(locale || "").toLowerCase();
  return l === "tr" ? "TR" : "EN";
}

export function formatPayForPurchAmount(amount: number): string {
  // PayFor expects a dot-decimal string (e.g. "10.00").
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "0.00";
  return n.toFixed(2);
}

/**
 * Ziraat Katılım PayFor 3DPay hash.
 * Formula: hex(SHA1(MbrId + OrderId + PurchAmount + OkUrl + FailUrl + TxnType + InstallmentCount + Rnd + MerchantPass))
 * NOTE: MerchantID and UserCode are NOT part of the hash for this bank.
 *       Output is base64 (standard for Turkish bank PayFor MPI implementations).
 */
export function payForHash(params: {
  mbrId: string;
  orderId: string;
  purchAmount: string;
  okUrl: string;
  failUrl: string;
  txnType: string;
  installmentCount: string;
  rnd: string;
  merchantPass: string;
}): string {
  const raw =
    params.mbrId +
    params.orderId +
    params.purchAmount +
    params.okUrl +
    params.failUrl +
    params.txnType +
    params.installmentCount +
    params.rnd +
    params.merchantPass;

  return crypto.createHash("sha1").update(raw, "utf8").digest("base64");
}



/* ------------------------------------------------------------------------- *
 * Callback authenticity — ported from minberiaksa lib/payfor.ts (e9fef484).  *
 * ------------------------------------------------------------------------- */

const PAYFOR_SENSITIVE_KEY = /pan|card *(no|number)|cvv|cvc|expiry|expdate|pass|secret|hash|mac/i;

/** Strip anything card- or secret-shaped from a bank response before logging it. */
export function redactPayForResponse(raw: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!PAYFOR_SENSITIVE_KEY.test(key)) {
      safe[key] = value;
      continue;
    }
    const text = String(value ?? "");
    safe[key] = text.length > 4 ? `***${text.slice(-4)}` : "***";
  }
  return safe;
}

/**
 * The bank's signature on a 3DPay callback:
 * base64(SHA1(MerchantID + MerchantPass + OrderId + AuthCode + ProcReturnCode + ResponseRnd)).
 */
export function payForResponseHash(response: Record<string, unknown>, merchantPass: string): string {
  const field = (key: string) => String(response[key] ?? "");
  const raw =
    field("MerchantID") + merchantPass + field("OrderId") + field("AuthCode") + field("ProcReturnCode") + field("ResponseRnd");
  return crypto.createHash("sha1").update(raw, "utf8").digest("base64");
}

/** Written to providerErrorMessage when an approval callback's ResponseHash does not verify. */
export const PAYFOR_UNVERIFIED_APPROVAL = "ResponseHash mismatch on approval callback";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** True only when the callback carries a ResponseHash matching our own computation (proof of payment). */
export function verifyPayForResponseHash(response: Record<string, unknown>, merchantPass: string | undefined): boolean {
  const provided = String(response.ResponseHash ?? "");
  if (!provided || !merchantPass) return false;
  return safeEqual(provided, payForResponseHash(response, merchantPass));
}

/**
 * Our own request signature as the bank echoes it back (`Hash`). Every callback carries it,
 * including 3D-stage failures. Proves the callback is about an order we started — NOT proof of payment.
 */
export function verifyPayForRequestEcho(response: Record<string, unknown>, merchantPass: string | undefined): boolean {
  const provided = String(response.Hash ?? "");
  if (!provided || !merchantPass) return false;
  const field = (key: string) => String(response[key] ?? "");
  const expected = payForHash({
    mbrId: field("MbrId"), orderId: field("OrderId"), purchAmount: field("PurchAmount"), okUrl: field("OkUrl"),
    failUrl: field("FailUrl"), txnType: field("TxnType"), installmentCount: field("InstallmentCount"), rnd: field("Rnd"), merchantPass,
  });
  return safeEqual(provided, expected);
}

/** Genuine = about this donation's order AND signed by the bank or carrying our own request signature. */
export function isGenuinePayForCallback(
  raw: Record<string, unknown>,
  donation: { id: string; providerOrderId: string | null },
  merchantPass: string | undefined
): boolean {
  const orderId = String(raw.OrderId ?? raw.orderId ?? "");
  const aboutThisDonation = !!orderId && (orderId === donation.id || (!!donation.providerOrderId && orderId === donation.providerOrderId));
  return aboutThisDonation && (verifyPayForResponseHash(raw, merchantPass) || verifyPayForRequestEcho(raw, merchantPass));
}

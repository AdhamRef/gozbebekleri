import { SUPPORTED_CURRENCY_CODES } from "../supported-currencies";

/**
 * The supported donation selector has 14 ISO currencies, all with either
 * 2 or 3 decimal minor units. This is an explicit Stripe allowlist.
 * Do not silently charge unknown codes as if they were cents.
 */
const supported = new Set(SUPPORTED_CURRENCY_CODES);
const threeDecimals = new Set(["BHD", "JOD", "KWD", "OMR"]);
export const STRIPE_MINOR_AMOUNT_MAX = 99_999_999; // conservative cross-method 8-digit bound

export function stripeMinorDigits(currency: string): 2 | 3 | null {
  if (typeof currency !== "string") return null;
  const upper = currency.trim().toUpperCase();
  if (!supported.has(upper)) return null;
  return threeDecimals.has(upper) ? 3 : 2;
}

/** Fail closed rather than rounding a donation upward/downward without consent. */
export function stripeAmountInMinorUnits(amount: number, currency: string): number {
  const digits = stripeMinorDigits(currency);
  if (digits === null) throw new Error("STRIPE_UNSUPPORTED_CURRENCY");
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("STRIPE_INVALID_AMOUNT");
  }
  const factor = 10 ** digits;
  const raw = amount * factor;
  const minor = Math.round(raw);
  // Ignore only floating-point representation noise, not actual fractional
  // minor units. For 3-decimal currencies require 2-decimal donation amounts
  // so the final minor digit is zero (conservative Stripe compatibility).
  if (!Number.isSafeInteger(minor) || minor < 1 ||
      minor > STRIPE_MINOR_AMOUNT_MAX || Math.abs(raw - minor) > 1e-6 ||
      (digits === 3 && minor % 10 !== 0)) {
    throw new Error("STRIPE_AMOUNT_PRECISION_OR_LIMIT");
  }
  return minor;
}

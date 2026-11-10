import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

// Independent from NEXTAUTH_SECRET / AUTH_SECRET. The FIRST key signs new grants;
// the other keys verify old grants only during rotation. Protected env only.
// GOZ_GUEST_PAYMENT_KEYS=kid:base64url(32+ bytes),previous:base64url(32+ bytes)
export const GUEST_PAYMENT_TTL_SECONDS = 60 * 60;
const COOKIE_PREFIX = "goz_guest_charge_";
const DONATION_ID = /^[a-f\d]{24}$/i;
const KEY_ID = /^[a-zA-Z0-9_-]{1,24}$/;

type SigningKey = { id: string; secret: Buffer };
function paymentKeys(): SigningKey[] {
  const raw = process.env.GOZ_GUEST_PAYMENT_KEYS || "";
  if (!raw) return [];
  const entries = raw.split(",");
  if (entries.length > 4) return [];
  const result: SigningKey[] = [];
  for (const entry of entries) {
    const pair = entry.trim().split(":");
    if (pair.length !== 2 || !KEY_ID.test(pair[0]) ||
        !/^[a-zA-Z0-9_-]{43,}$/.test(pair[1]) ||
        result.some(k => k.id === pair[0])) return [];
    const secret = Buffer.from(pair[1], "base64url");
    if (secret.length < 32) return [];
    result.push({ id: pair[0], secret });
  }
  return result;
}
export function canIssueGuestPaymentGrant(): boolean {
  return paymentKeys().length > 0;
}
function signature(donationId: string, expiresAt: number, secret: Buffer): Buffer {
  return createHmac("sha256", secret)
    .update("gozbebekleri:one-time-charge:v2:" + donationId + ":" + expiresAt)
    .digest();
}
export function guestPaymentCookieName(donationId: string): string {
  return COOKIE_PREFIX + donationId;
}
/**
 * Separately scoped receipt capability. An ObjectId is not a secret.
 * Do not use the charge cookie as proof of receipt access: browsers must
 * not send a payment-initiation credential to unrelated API routes.
 */
const RECEIPT_COOKIE_PREFIX = "goz_guest_receipt_";
const RECEIPT_TTL_SECONDS = 24 * 60 * 60;
export function guestReceiptCookieName(donationId: string): string {
  return RECEIPT_COOKIE_PREFIX + donationId;
}
function receiptSignature(donationId: string, expiresAt: number, secret: Buffer): Buffer {
  return createHmac("sha256", secret)
    .update("gozbebekleri:receipt-access:v1:" + donationId + ":" + expiresAt)
    .digest();
}
export function issueGuestReceiptGrant(response: NextResponse, donationId: string): void {
  const key = paymentKeys()[0];
  if (!key || !DONATION_ID.test(donationId)) throw new Error("Guest receipt signing key unavailable");
  const expiresAt = Math.floor(Date.now() / 1000) + RECEIPT_TTL_SECONDS;
  response.cookies.set({
    name: guestReceiptCookieName(donationId),
    value: key.id + "." + expiresAt + "." + receiptSignature(donationId, expiresAt, key.secret).toString("hex"),
    maxAge: RECEIPT_TTL_SECONDS,
    // Covers owner-scoped donation summary and its receipt, never payment or guest claiming.
    path: "/api/donations/" + donationId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
export function hasGuestReceiptGrant(request: NextRequest, donationId: string): boolean {
  if (!DONATION_ID.test(donationId)) return false;
  const token = request.cookies.get(guestReceiptCookieName(donationId))?.value;
  const match = token && /^([a-zA-Z0-9_-]{1,24})\.(\d{10})\.([0-9a-f]{64})$/.exec(token);
  if (!match) return false;
  const expiresAt = Number(match[2]);
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now || expiresAt > now + RECEIPT_TTL_SECONDS) return false;
  const key = paymentKeys().find(k => k.id === match[1]);
  return Boolean(key && timingSafeEqual(
    Buffer.from(match[3], "hex"), receiptSignature(donationId, expiresAt, key.secret),
  ));
}

export function issueGuestPaymentGrant(response: NextResponse, donationId: string): void {
  const active = paymentKeys()[0];
  if (!active || !DONATION_ID.test(donationId)) {
    throw new Error("Guest payment grant signing key unavailable");
  }
  const expiresAt = Math.floor(Date.now() / 1000) + GUEST_PAYMENT_TTL_SECONDS;
  response.cookies.set({
    name: guestPaymentCookieName(donationId),
    value: active.id + "." + expiresAt + "." +
      signature(donationId, expiresAt, active.secret).toString("hex"),
    maxAge: GUEST_PAYMENT_TTL_SECONDS,
    path: "/api/stripe/charge",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
export function hasGuestPaymentGrant(request: NextRequest, donationId: string): boolean {
  if (!DONATION_ID.test(donationId)) return false;
  const value = request.cookies.get(guestPaymentCookieName(donationId))?.value;
  if (!value) return false;
  const match = /^([a-zA-Z0-9_-]{1,24})\.(\d{10})\.([0-9a-f]{64})$/.exec(value);
  if (!match) return false;
  const expiresAt = Number(match[2]), now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now || expiresAt > now + GUEST_PAYMENT_TTL_SECONDS) return false;
  const key = paymentKeys().find(k => k.id === match[1]);
  if (!key) return false;
  return timingSafeEqual(
    Buffer.from(match[3], "hex"),
    signature(donationId, expiresAt, key.secret),
  );
}


/** Ownership handoff proof is separate from both charge and receipt grants.
 * This HttpOnly token is issued only to the browser that created a guest
 * donation and is sent exclusively to /api/users/link-guest. Sign-in alone
 * plus a guessed donation ID is NEVER sufficient to claim a guest account.
 */
const CLAIM_COOKIE_PREFIX = "goz_guest_claim_";
const CLAIM_TTL_SECONDS = 24 * 60 * 60;
export function guestClaimCookieName(donationId: string): string {
  return CLAIM_COOKIE_PREFIX + donationId;
}
function claimSignature(donationId: string, expiresAt: number, secret: Buffer) {
  return createHmac("sha256", secret)
    .update("gozbebekleri:guest-link:v1:" + donationId + ":" + expiresAt)
    .digest();
}
export function issueGuestClaimGrant(response: NextResponse, donationId: string): void {
  const key = paymentKeys()[0];
  if (!key || !DONATION_ID.test(donationId)) throw new Error("Guest ownership signing key unavailable");
  const expiresAt = Math.floor(Date.now() / 1000) + CLAIM_TTL_SECONDS;
  response.cookies.set({
    name: guestClaimCookieName(donationId),
    value: key.id + "." + expiresAt + "." + claimSignature(donationId, expiresAt, key.secret).toString("hex"),
    maxAge: CLAIM_TTL_SECONDS,
    path: "/api/users/link-guest",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
export function hasGuestClaimGrant(request: NextRequest, donationId: string): boolean {
  if (!DONATION_ID.test(donationId)) return false;
  const token = request.cookies.get(guestClaimCookieName(donationId))?.value;
  const match = token && /^([a-zA-Z0-9_-]{1,24})\.(\d{10})\.([0-9a-f]{64})$/.exec(token);
  if (!match) return false;
  const expiresAt = Number(match[2]), now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now || expiresAt > now + CLAIM_TTL_SECONDS) return false;
  const key = paymentKeys().find(k => k.id === match[1]);
  return Boolean(key && timingSafeEqual(
    Buffer.from(match[3], "hex"), claimSignature(donationId, expiresAt, key.secret),
  ));
}

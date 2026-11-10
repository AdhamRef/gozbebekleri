import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

// The short-lived, HttpOnly payment grant is scoped to a donation created by
// this browser. The donation ID is public and is NEVER authorization.
export const GUEST_PAYMENT_TTL_SECONDS = 60 * 60;
const COOKIE_PREFIX = "goz_guest_charge_";
const DONATION_ID = /^[a-f\d]{24}$/i;

function signingSecret(): string | null {
  const key = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  return key && key.length >= 16 ? key : null;
}

export function canIssueGuestPaymentGrant(): boolean {
  return signingSecret() !== null;
}

function signature(donationId: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`gozbebekleri:one-time-charge:v1:${donationId}:${expiresAt}`)
    .digest("hex");
}

export function guestPaymentCookieName(donationId: string): string {
  return COOKIE_PREFIX + donationId;
}

/**
 * Called only after a guest has created a new donation through the website.
 * Nothing is exposed in URLs, response JSON, or JavaScript-readable storage.
 */
export function issueGuestPaymentGrant(response: NextResponse, donationId: string): void {
  const secret = signingSecret();
  if (!secret || !DONATION_ID.test(donationId)) {
    throw new Error("Guest payment grant cannot be issued");
  }
  const expiresAt = Math.floor(Date.now() / 1000) + GUEST_PAYMENT_TTL_SECONDS;
  response.cookies.set({
    name: guestPaymentCookieName(donationId),
    value: `${expiresAt}.${signature(donationId, expiresAt, secret)}`,
    maxAge: GUEST_PAYMENT_TTL_SECONDS,
    path: "/api/stripe/charge",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function hasGuestPaymentGrant(request: NextRequest, donationId: string): boolean {
  const secret = signingSecret();
  if (!secret || !DONATION_ID.test(donationId)) return false;
  const value = request.cookies.get(guestPaymentCookieName(donationId))?.value;
  if (!value) return false;
  const match = /^(\d{10})\.([0-9a-f]{64})$/.exec(value);
  if (!match) return false;
  const expiresAt = Number(match[1]), now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now || expiresAt > now + GUEST_PAYMENT_TTL_SECONDS) return false;
  const expected = Buffer.from(signature(donationId, expiresAt, secret), "hex");
  const supplied = Buffer.from(match[2], "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

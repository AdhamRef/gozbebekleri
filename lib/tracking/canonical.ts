/**
 * Canonical Tracking System
 *
 * All tracking events are built as a CanonicalEvent first, then mapped
 * to each platform. This guarantees consistent event_id for deduplication
 * between browser (Meta Pixel / TikTok Pixel) and server (CAPI / Events API).
 *
 * Donation conversion events (Donate / DonateFailed) are SERVER-ONLY — see
 * `donation-conversion-server.ts`. The browser pixel deliberately does NOT
 * map `donation_complete` or `payment_failed` to a Meta event name, so fbq
 * never fires for them. This was a deliberate change after we caught Meta
 * receiving phantom DonateFailed events (random event_id, no matching
 * donation row) from browser-side fires that had no donationId.
 */

export function generateEventId(prefix = "evt"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Build the canonical event_id used for server-side donation conversion fires.
 * Server-only — keep in sync with `sendDonationServerConversions` /
 * `sendDonationFailedConversions` in `donation-conversion-server.ts`.
 */
export function metaDonationEventId(
  donationId: string,
  kind: "success" | "failed"
): string {
  return kind === "failed" ? `${donationId}_failed` : donationId;
}

// ─── Canonical event names ────────────────────────────────────────────────────
export type CanonicalEventName =
  | "page_view"
  | "view_content"
  | "view_donation_page"
  | "customize_product"   // select donation type / amount
  | "add_to_cart"
  | "begin_checkout"
  | "add_payment_info"
  | "payment_submit"
  | "payment_failed"
  | "donation_complete"
  | "sign_up"
  | "scroll_depth"
  | "user_engagement"
  | "_missing_event";     // catch-all for unmapped custom events

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export interface CanonicalPage {
  url?: string;
  referrer?: string;
  title?: string;
  language?: string;
}

export interface CanonicalSession {
  session_id?: string;
  client_id?: string;   // GA4 client ID
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  fbclid?: string;
  ttclid?: string;
  gclid?: string;
}

export interface CanonicalUser {
  external_id?: string;    // user DB id (will be hashed before server send)
  email?: string;          // will be hashed
  phone?: string;          // will be hashed
  first_name?: string;     // will be hashed
  last_name?: string;      // will be hashed
  city?: string;           // will be hashed
  state?: string;          // will be hashed
  zip?: string;            // will be hashed
  country_code?: string;   // will be hashed
  gender?: string;         // "male" | "female" | "preferNotToSay" — normalised to "m"/"f" before hashing
  date_of_birth?: string;  // YYYY-MM-DD — normalised to YYYYMMDD before hashing
  subscription_id?: string; // send as-is (not hashed)
  fbp?: string;            // send as-is
  fbc?: string;            // send as-is
  user_agent?: string;     // send as-is
  ip?: string;             // send as-is
}

export interface CanonicalDonation {
  donation_type?: "ONE_TIME" | "MONTHLY";
  amount?: number;
  amount_usd?: number;
  currency?: string;
  cause_id?: string;            // campaign or category ID
  cause_name?: string;
  content_category?: string;    // e.g. "donation", "zakat", "sadaqah"
  content_name?: string;        // human-readable campaign/cause name for ads
  delivery_category?: string;   // Meta: "in_store" | "home_delivery" | "curbside"
  description?: string;
  status?: string;              // e.g. "completed", "pending"
  payment_info_available?: 0 | 1; // 1 if card info was provided
  predicted_ltv?: number;
  donor_type?: "new" | "returning";
  recurring?: boolean;
}

export interface CanonicalPayment {
  method?: string;
  gateway?: "stripe" | "payfor" | "paypal";
  is_3ds?: boolean;
  payment_status?: "pending" | "success" | "failed";
  transaction_id?: string;
  failure_reason?: string;
  attempt_number?: number;
}

export interface CanonicalItem {
  item_id: string;
  item_name?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
}

// ─── Main canonical event ─────────────────────────────────────────────────────

export interface CanonicalEvent {
  event: CanonicalEventName;
  event_id: string;
  event_time: number;  // unix seconds
  page?: CanonicalPage;
  session?: CanonicalSession;
  user?: CanonicalUser;
  donation?: CanonicalDonation;
  payment?: CanonicalPayment;
  items?: CanonicalItem[];
  // arbitrary custom data (e.g. scroll_depth percent, engagement_time_msec)
  custom?: Record<string, unknown>;
}

// ─── Platform mapping tables ──────────────────────────────────────────────────

/**
 * Browser-side fbq + server-side /api/track only fire Meta events for keys that
 * appear here. `donation_complete` and `payment_failed` are INTENTIONALLY
 * omitted — Donate and DonateFailed are server-only (webhook-owned).
 *
 * Adding either of those back here will silently re-introduce double-counting
 * and (in the case of payment_failed with no donationId) phantom events. Don't.
 */
export const META_EVENT_MAP: Partial<Record<CanonicalEventName, string>> = {
  page_view:          "PageView",
  view_content:       "ViewContent",
  view_donation_page: "ViewContent",
  customize_product:  "CustomizeProduct",
  add_to_cart:        "AddToCart",
  begin_checkout:     "InitiateCheckout",
  add_payment_info:   "AddPaymentInfo",
  sign_up:            "CompleteRegistration",
};

/**
 * Canonical events that the server CAPI mirror in /api/track must SKIP because
 * the donation-conversion-server pipeline (fired from payment-provider
 * webhooks) is the sole authoritative source. Belt-and-suspenders: even if a
 * caller somehow synthesises one of these on the browser, the server refuses
 * to forward it to Meta.
 */
export const META_CAPI_WEBHOOK_OWNED: ReadonlySet<CanonicalEventName> = new Set([
  "donation_complete",
  "payment_failed",
]);

export const TIKTOK_EVENT_MAP: Partial<Record<CanonicalEventName, string>> = {
  page_view:          "PageView",
  view_content:       "ViewContent",
  view_donation_page: "ViewContent",
  add_to_cart:        "AddToCart",
  begin_checkout:     "InitiateCheckout",
  add_payment_info:   "AddPaymentInfo",
  sign_up:            "CompleteRegistration",
  // donation_complete is server-only via donation-conversion-server.ts (no
  // TikTok mirror yet — see project_meta_capi.md trade-off note).
};

export const GA4_EVENT_MAP: Partial<Record<CanonicalEventName, string>> = {
  page_view:          "page_view",
  view_content:       "view_item",
  view_donation_page: "view_item",
  customize_product:  "select_item",
  add_to_cart:        "add_to_cart",
  begin_checkout:     "begin_checkout",
  add_payment_info:   "add_payment_info",
  payment_failed:     "exception",
  // donation_complete: GA4 MP purchase fired server-side from the webhook —
  // not from the browser. Keeping it absent here prevents accidental duplicate
  // browser sends.
  sign_up:            "sign_up",
  scroll_depth:       "scroll",
  user_engagement:    "user_engagement",
};

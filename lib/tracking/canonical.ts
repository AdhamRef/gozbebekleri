/**
 * Canonical Tracking System
 *
 * All tracking events are built as a CanonicalEvent first, then mapped
 * to each platform. This guarantees consistent event_id for deduplication
 * between browser (Meta Pixel / TikTok Pixel) and server (CAPI / Events API).
 *
 * Donation conversion ownership (READ BEFORE EDITING):
 *
 *   • Donate (success):  triggered from the /success page only.
 *     - Browser fbq fires with eventID = donation.id (see TrackingPixels.tsx
 *       `trackDonate`).
 *     - Server-side CAPI fires from POST /api/donations/:id/track-conversion
 *       with event_id = donation.id, gated by an atomic claim on
 *       `conversionEventsSentAt`.
 *     - Meta dedups the browser↔server pair by event_id, so reach-through
 *       refreshes, multi-tab opens, and cross-browser link-shares all collapse
 *       into exactly one counted conversion. The localStorage gate in the
 *       success page is an optimization that avoids needless API calls on
 *       refresh; the server claim is the authoritative dedup.
 *
 *   • DonateFailed (custom):  still server-only, fired from the payment
 *     provider webhooks via `sendDonationFailedConversions` because failed
 *     donors typically never reach a success-style landing page. There is NO
 *     browser-side fbq fire for DonateFailed — that path used to mint phantom
 *     events with random event_ids and had to be killed.
 */

export function generateEventId(prefix = "evt"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Build the canonical event_id used for Meta Donate / DonateFailed.
 *
 * The SAME id MUST be used by the browser fbq fire and the server CAPI fire
 * for Meta to dedupe the pair into a single conversion. Used by:
 *   • Browser:  TrackingPixels.tsx `trackDonate`  → fbq(..., { eventID })
 *   • Server:   `sendDonationServerConversions`   → custom_data.event_id
 *   • Server:   `sendDonationFailedConversions`   → custom_data.event_id
 *
 * Format: `donate_<donationId>` / `donate_<donationId>_failed`. The `donate_`
 * prefix makes the id self-describing in Meta's Events Manager debugger and
 * lines up with the `donate_{transaction_id}` convention.
 */
export function metaDonationEventId(
  donationId: string,
  kind: "success" | "failed"
): string {
  return kind === "failed"
    ? `donate_${donationId}_failed`
    : `donate_${donationId}`;
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
 * Map of canonical event → Meta standard event name.
 *
 * `donation_complete` IS mapped to "Donate" so the browser Pixel fires on the
 * /success page (via `trackDonate` in TrackingPixels.tsx). `payment_failed` is
 * still absent — DonateFailed is server-only (no donation row → no event_id →
 * phantoms in Meta), see the header comment.
 *
 * Note: this map is consulted both by the browser fbq path AND by the
 * /api/track CAPI mirror. To prevent /api/track from re-firing a server-side
 * Donate (which would duplicate the dedicated `track-conversion` endpoint),
 * `donation_complete` is also listed in `META_CAPI_OFF_CHANNEL` below — the
 * mirror refuses it even though the browser map permits it.
 */
export const META_EVENT_MAP: Partial<Record<CanonicalEventName, string>> = {
  page_view:          "PageView",
  view_content:       "ViewContent",
  view_donation_page: "ViewContent",
  customize_product:  "CustomizeProduct",
  add_to_cart:        "AddToCart",
  begin_checkout:     "InitiateCheckout",
  add_payment_info:   "AddPaymentInfo",
  donation_complete:  "Donate",
  sign_up:            "CompleteRegistration",
};

/**
 * Canonical events that the generic /api/track CAPI mirror must SKIP because
 * a dedicated server-side path owns the server leg:
 *   • donation_complete → POST /api/donations/:id/track-conversion (atomic
 *     claim on `conversionEventsSentAt`).
 *   • payment_failed    → `sendDonationFailedConversions` from payment
 *     provider webhooks (atomic claim on `conversionFailedEventsSentAt`).
 *
 * Belt-and-suspenders: even if a caller synthesises one of these from the
 * browser, /api/track refuses to forward it to Meta. The browser Pixel still
 * fires for `donation_complete` (it's in META_EVENT_MAP) because Meta will
 * dedup the browser event against the dedicated endpoint's CAPI event by
 * shared event_id (= donation.id).
 */
export const META_CAPI_OFF_CHANNEL: ReadonlySet<CanonicalEventName> = new Set([
  "donation_complete",
  "payment_failed",
]);

/** @deprecated Renamed to META_CAPI_OFF_CHANNEL. Kept as an alias to avoid
 *  breaking any import while the rename rolls through. Remove on next pass. */
export const META_CAPI_WEBHOOK_OWNED = META_CAPI_OFF_CHANNEL;

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

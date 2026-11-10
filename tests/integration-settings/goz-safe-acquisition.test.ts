import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  safeAttributionUrl,
  safeAcquisitionLandingPage,
  isPaymentReturnPage,
  sanitizeDonationAttribution,
} from "../../lib/attribution/sanitize";

const origin = "https://www.gozbebekleri.org";
const campaign = origin + "/ar/?utm_source=instagram&utm_medium=paid_social&utm_campaign=winter";
const receipt = origin + "/ar/success/example?t=guest-private-token&access_token=private-token";

test("URL redaction retains campaign parameters but not guest receipt tokens", () => {
  assert.equal(safeAttributionUrl(receipt), origin + "/ar/success/example");
  assert.equal(safeAttributionUrl(campaign), campaign);
  assert.equal(safeAttributionUrl("javascript:alert(1)"), null);
  assert.equal(safeAttributionUrl("/ar/success?t=private"), null);
  assert.equal(isPaymentReturnPage(receipt), true);
});

test("payment success cannot replace original acquisition landing", () => {
  assert.equal(safeAcquisitionLandingPage({ landing_page: receipt, first_landing_page: campaign }), campaign);
  assert.equal(safeAcquisitionLandingPage({ landing_page: receipt }), null);
  assert.equal(safeAcquisitionLandingPage({ landing_page: "https://bank.example/checkout" }), null);
  assert.equal(safeAcquisitionLandingPage({ landing_page: campaign }), campaign);
});

test("sanitizer removes leaked receipt tokens from persisted attribution", () => {
  const data = sanitizeDonationAttribution({
    landing_page: receipt,
    first_landing_page: campaign,
    conversion_page: receipt,
    referrer: "https://l.instagram.com/?token=private",
  }) as Record<string, string>;
  assert.equal(data.landing_page, campaign);
  assert.equal(data.first_landing_page, campaign);
  assert.equal(data.conversion_page, origin + "/ar/success/example");
  assert.doesNotMatch(JSON.stringify(data), /guest-private-token|access_token|private-token/);
});

test("Meta events and the admin details card must not use raw receipt URL", () => {
  const meta = readFileSync("lib/tracking/donation-conversion-server.ts", "utf8");
  assert.match(meta, /safeAcquisitionLandingPage\(attribution \?\? null\)/);
  assert.doesNotMatch(meta, /eventSourceUrl = getStr\(attribution, "landing_page"\)/);
  const dialog = readFileSync("components/dashboard/DonationDetailsDialog.tsx", "utf8");
  assert.match(dialog, /safeAttributionUrl\(String\(raw\)\)/);
  assert.match(dialog, /safeAcquisitionLandingPage\(attr\)/);
  const capture = readFileSync("lib/attribution/client-payload.ts", "utf8");
  assert.match(capture, /isPaymentReturnPage\(window\.location\.href\)/);
});

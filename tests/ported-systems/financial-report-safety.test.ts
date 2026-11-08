import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reportDonationPeriodWhere } from "../../lib/dashboard/report-donation-filter";
import { activeConfirmedSubscriptionCount, isSettledProfileDonation, settledProfileUsdValue } from "../../lib/minbar/profile-donation-stats";

const from = new Date("2026-11-01T00:00:00Z");
const to = new Date("2026-11-30T23:59:59Z");
const month = { gte: from, lte: to };

test("settled donations use paidAt, failed and pending use createdAt, including unset paidAt", () => {
  assert.deepEqual(reportDonationPeriodWhere({}), null);
  assert.deepEqual(reportDonationPeriodWhere(month), {
    OR: [
      { status: "PAID", paidAt: month },
      { status: "PAID", createdAt: month, OR: [{ paidAt: null }, { paidAt: { isSet: false } }] },
      { status: { not: "PAID" }, createdAt: month },
    ],
  });
});

test("one-time, daily, Friday and monthly plans all require PAID plus paidAt", () => {
  for (const subscriptionId of [null, "daily", "friday", "monthly"]) {
    const base = { subscriptionId, paymentStatus: "PAID", status: "ACTIVE", createdAt: from };
    assert.equal(isSettledProfileDonation({ ...base, paidAt: from }), true);
    assert.equal(isSettledProfileDonation({ ...base, paidAt: null }), false);
    assert.equal(isSettledProfileDonation({ ...base, paymentStatus: "FAILED", paidAt: from }), false);
    assert.equal(isSettledProfileDonation({ ...base, paymentStatus: "REFUNDED", paidAt: from }), false);
  }
});

test("retries never inflate active plan count; failed initial, cancelled and paused plans excluded", () => {
  const charged = { subscriptionId: "daily", status: "ACTIVE", paymentStatus: "PAID", paidAt: from };
  const records = [
    charged, { ...charged, paidAt: to },
    { ...charged, paymentStatus: "FAILED", paidAt: null },
    { ...charged, subscriptionId: "friday" },
    { ...charged, subscriptionId: "monthly", status: "PAUSED" },
    { ...charged, subscriptionId: "cancelled", status: "CANCELLED" },
    { ...charged, subscriptionId: "initial-failed", paymentStatus: "FAILED", paidAt: null },
  ];
  assert.equal(activeConfirmedSubscriptionCount(records), 2);
});

test("unconverted TRY/EUR must never be counted as USD; USD legacy fallback is explicit", () => {
  const paid = { paymentStatus: "PAID", paidAt: from, totalAmount: 110 };
  assert.equal(settledProfileUsdValue({ ...paid, currency: "EUR", amountUSD: null }), 0);
  assert.equal(settledProfileUsdValue({ ...paid, currency: "TRY" }), 0);
  assert.equal(settledProfileUsdValue({ ...paid, currency: "USD", amountUSD: null }), 110);
  assert.equal(settledProfileUsdValue({ ...paid, currency: "TRY", amountUSD: 3 }), 3);
  assert.equal(settledProfileUsdValue({ ...paid, currency: "USD", paymentStatus: "FAILED", amountUSD: 110 }), 0);
});

test("API, dashboard list, Excel and CSV exports use the same settlement-date scope", () => {
  for (const path of [
    "app/api/donations/route.ts",
    "app/api/admin/donations/export/route.ts",
    "app/api/admin/monthly/export/route.ts",
  ]) {
    const code = readFileSync(path, "utf8");
    assert.match(code, /reportDonationPeriodWhere\(dateFilter\)/, path);
    assert.doesNotMatch(code, /createdAt: dateFilter/, path);
  }
  const profile = readFileSync("app/api/users/[id]/route.ts", "utf8");
  assert.match(profile, /paidAt: \{ not: null \}/);
  assert.doesNotMatch(profile, /\{ subscriptionId: \{ not: null \} \}/);
  assert.match(profile, /donations: \{ some: \{ status: 'PAID', paidAt: \{ not: null \} \} \}/);
  assert.match(profile, /providerRaw: true, cardDetails: true, accessToken: true/);
});

test("public money-moving features remain locked until separately certified", () => {
  const quick = readFileSync("app/api/quick-donation/resolve/route.ts","utf8");
  const requests = readFileSync("lib/donations/subscription-request-gate.ts","utf8");
  assert.match(quick, /checkoutIntegrationReleased: boolean = false/);
  assert.match(requests, /SUBSCRIPTION_REQUESTS_RELEASED: boolean = false/);
});

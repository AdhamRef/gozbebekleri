import test from "node:test";
import assert from "node:assert/strict";
import {
  isSettledProfileDonation,
  profileDonationMatchesPeriod,
  profileDonationDate,
  successfulRecurringMonthCount,
  activeConfirmedSubscriptionCount,
} from "../../lib/minbar/profile-donation-stats";

const zone = "Europe/Istanbul";
const gift = { subscriptionId: "plan-A", status: "ACTIVE", paymentStatus: "PAID",
  paidAt: "2026-11-02T09:00:00Z", createdAt: "2026-11-01T08:00:00Z" };

test("failed or pending donations on ACTIVE plans do not count as payments", () => {
  for (const paymentStatus of ["FAILED", "PENDING", "CANCELLED", "REFUNDED", "ACTIVE", null]) {
    const attempt = { ...gift, paymentStatus };
    assert.equal(isSettledProfileDonation(attempt), false);
    assert.equal(successfulRecurringMonthCount([attempt], zone), 0);
  }
  for (const paidAt of [null, "", "invalid"]) assert.equal(isSettledProfileDonation({ ...gift, paidAt }), false);
  assert.equal(isSettledProfileDonation({ ...gift, subscriptionId: null }), true);
});
test("period filters use payment settlement and timezone; failures remain in history", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  const donation = { ...gift, createdAt: "2026-10-31T18:00:00Z", paidAt: "2026-10-31T21:30:00Z" };
  assert.equal(profileDonationMatchesPeriod(donation, "month", now, zone), true);
  assert.equal(profileDonationMatchesPeriod(donation, "month", now, "UTC"), false);
  assert.equal(profileDonationDate(donation)?.toISOString(), "2026-10-31T21:30:00.000Z");
  const failed = { ...donation, paymentStatus: "FAILED", paidAt: null };
  assert.equal(profileDonationMatchesPeriod(failed, "month", now, zone), false);
  assert.equal(profileDonationDate(failed)?.toISOString(), "2026-10-31T18:00:00.000Z");
});
test("active subscription count is distinct by plan and requires a settled payment", () => {
  const rows = [gift, { ...gift, paidAt: "2026-11-03T09:00:00Z" },
    { ...gift, paymentStatus: "FAILED", paidAt: null },
    { ...gift, subscriptionId: "unpaid", paymentStatus: "FAILED", paidAt: null },
    { ...gift, subscriptionId: "cancelled", status: "CANCELLED" },
    { ...gift, subscriptionId: null }];
  assert.equal(activeConfirmedSubscriptionCount(rows), 1);
  assert.equal(activeConfirmedSubscriptionCount([{ ...gift, paymentStatus: "FAILED", paidAt: null }]), 0);
  assert.equal(activeConfirmedSubscriptionCount([{ ...gift, status: "CANCELLED" }]), 0);
});
test("monthly giving counts unique settlement months, excluding QA cycles", () => {
  const rows=[gift,gift,{...gift,paidAt:"2026-10-01T09:00:00Z"},
    {...gift,billingReason:"subscription_test_cycle",paidAt:"2026-08-01T09:00:00Z"}];
  assert.equal(successfulRecurringMonthCount(rows,zone),2);
});

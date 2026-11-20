import test from "node:test";
import assert from "node:assert/strict";
import { isGenuinePayForCallback, payForHash, payForResponseHash, redactPayForResponse, verifyPayForResponseHash } from "../lib/payfor";

const PASS = "merchant-pass";
const donation = { id: "6650f1a2b3c4d5e6f7a8b9c0", providerOrderId: "6650f1a2b3c4d5e6f7a8b9c0" };
const req = { MbrId: "5", OrderId: donation.id, PurchAmount: "100.00", OkUrl: "https://x/ok", FailUrl: "https://x/fail", TxnType: "Auth", InstallmentCount: "0", Rnd: "123" };
const echo = payForHash({ mbrId: req.MbrId, orderId: req.OrderId, purchAmount: req.PurchAmount, okUrl: req.OkUrl, failUrl: req.FailUrl, txnType: req.TxnType, installmentCount: req.InstallmentCount, rnd: req.Rnd, merchantPass: PASS });
const approval: Record<string, unknown> = { ...req, Hash: echo, MerchantID: "M1", AuthCode: "A1", ProcReturnCode: "00", ResponseRnd: "R1" };
approval.ResponseHash = payForResponseHash(approval, PASS);

test("a forged approval without signatures is rejected", () => {
  const forged = { OrderId: donation.id, ProcReturnCode: "00", TxnResult: "Success" };
  assert.equal(isGenuinePayForCallback(forged, donation, PASS), false);
  assert.equal(isGenuinePayForCallback({ ProcReturnCode: "00" }, donation, PASS), false);
});

test("a signed approval for this donation is genuine and verified", () => {
  assert.equal(isGenuinePayForCallback(approval, donation, PASS), true);
  assert.equal(verifyPayForResponseHash(approval, PASS), true);
});

test("a signed callback for another order is rejected", () => {
  assert.equal(isGenuinePayForCallback(approval, { id: "other", providerOrderId: "other" }, PASS), false);
});

test("a tampered approval code fails the bank signature", () => {
  assert.equal(verifyPayForResponseHash({ ...approval, ProcReturnCode: "05" }, PASS), false);
  assert.equal(verifyPayForResponseHash(approval, undefined), false);
});

test("logs never carry card numbers or hashes", () => {
  const safe = redactPayForResponse({ Pan: "4111111111111111", Hash: "abcdef", OrderId: "x" });
  assert.equal(safe.Pan, "***1111");
  assert.equal(safe.OrderId, "x");
});

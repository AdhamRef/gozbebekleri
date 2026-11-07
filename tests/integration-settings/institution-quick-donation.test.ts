import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_INSTITUTION_QUICK_DONATION,
  resolveInstitutionQuickDonationTarget,
  validateInstitutionQuickDonation,
} from "../../lib/quick-donation/institution-config";

const approved = {
  ...EMPTY_INSTITUTION_QUICK_DONATION,
  enabled: true,
  destinations: [
    { id: "zakat", type: "intention", label: "زكاة المال", enabled: true, projectId: "goz-test-zakat" },
    { id: "relief", type: "project", label: "الإغاثة", enabled: false, projectId: "goz-test-relief" },
  ],
  defaultDestinationId: "zakat",
};
test("starts disabled and does not inherit a Minber payment target", () => {
  assert.equal(EMPTY_INSTITUTION_QUICK_DONATION.enabled, false);
  assert.deepEqual(EMPTY_INSTITUTION_QUICK_DONATION.destinations, []);
  assert.equal(resolveInstitutionQuickDonationTarget(EMPTY_INSTITUTION_QUICK_DONATION, "zakat"), null);
});
test("validates institution-owned intent and prevents disabled/unmapped selection", () => {
  const config = validateInstitutionQuickDonation(approved);
  assert.equal(resolveInstitutionQuickDonationTarget(config, "zakat"), "goz-test-zakat");
  assert.equal(resolveInstitutionQuickDonationTarget(config, "relief"), null);
  assert.equal(resolveInstitutionQuickDonationTarget(config, "unknown"), null);
});
test("refuses enabled widget without approved target, duplicate ids, and bad money", () => {
  for (const bad of [
    { ...approved, destinations: [] },
    { ...approved, destinations: approved.destinations.map(d => ({ ...d, enabled: false })) },
    { ...approved, destinations: [approved.destinations[0], approved.destinations[0]] },
    { ...approved, defaultDestinationId: "relief" },
    { ...approved, amounts: [10, -1] },
    { ...approved, currency: "XX" },
    { ...approved, cadences: ["once", "once"] },
  ]) assert.throws(() => validateInstitutionQuickDonation(bad));
});

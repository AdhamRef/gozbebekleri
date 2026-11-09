import test from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_LOCALES as GozLocales, DEFAULT_LOCALE as GozDefault } from "../../lib/locales";
import {
  SUPPORTED_LOCALES as PortedLocales, LOCALE_OPTIONS, ALL_LOCALE_OPTIONS,
  DEFAULT_LOCALE as PortedDefault, isValidLocale,
} from "../../lib/ported-systems/locales";

// Frozen from Gözbebekleri main before any Round 2 changes.
// Must not adopt the Minber source institution language set.
const originalGozEnabled = ["ar","en","fr","tr","id","pt","es","de"];

test("public and ported dashboard language choices preserve Goz languages and ordering exactly", () => {
  assert.deepEqual([...GozLocales], originalGozEnabled);
  assert.deepEqual([...PortedLocales], originalGozEnabled);
  assert.deepEqual(LOCALE_OPTIONS.map(item => item.code), originalGozEnabled);
  assert.deepEqual(ALL_LOCALE_OPTIONS.map(item => item.code), originalGozEnabled);
  assert.equal(GozDefault, "ar");
  assert.equal(PortedDefault, GozDefault);
});

test("Minber-only registered languages are not enabled for templates, audience or APIs", () => {
  for (const code of ["ur","sq","it","nl","sv","no","da","ms","ja","zh","hi"]) {
    assert.equal(isValidLocale(code), false, code);
    assert.equal(LOCALE_OPTIONS.some(item=>item.code===code), false, code);
    assert.equal(ALL_LOCALE_OPTIONS.some(item=>item.code===code), false, code);
  }
  for (const code of originalGozEnabled) {
    assert.equal(isValidLocale(code), true, code);
  }
});

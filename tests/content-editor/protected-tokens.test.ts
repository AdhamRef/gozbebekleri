import { test } from "node:test";
import assert from "node:assert/strict";
import { missingProtectedTokens } from "../../lib/content-localization/protected-tokens";

test("decimal amounts cannot turn into a larger integer by losing a decimal separator", () => {
  for (const [source, translated] of [["دعم 100.0 USD", "Support 1,000 USD"], ["تبرع 10.50 USD", "Donate 1,050 USD"], ["تكلفة 0.25 USD", "Cost 25 USD"]]) {
    assert.ok(missingProtectedTokens(source, translated).length, `${source} -> ${translated}`);
  }
});
test("locale-aware grouping and decimal formatting preserve numeric value", () => {
  for (const [locale, translated] of [["en","Support 1,000.50 USD"],["de","Unterstützung 1.000,50 USD"],["pt","Apoio 1.000,50 USD"],["fr","Soutien 1 000,50 USD"],["tr","Destek 1.000,50 USD"]]) {
    assert.deepEqual(missingProtectedTokens("دعم ١٬٠٠٠٫٥٠ USD", translated, {targetLocale:locale}),[]);
  }
  assert.deepEqual(missingProtectedTokens("دعم 100.0 USD", "Support 100 USD"),[]);
  assert.deepEqual(missingProtectedTokens("دعم 100.0 USD", "Unterstützung 100.0 USD",{targetLocale:"de"}),[]);
  assert.ok(missingProtectedTokens("دعم 1.234 USD", "Support 1,234 USD").length);
  assert.deepEqual(missingProtectedTokens("دعم 1.234 USD", "Apoio 1,234 USD",{targetLocale:"pt"}),[]);
});
test("currency symbols, every enabled currency code and percentage signs stay protected", () => {
  for (const symbol of ["$","€","£","₺","﷼","₪","%","‰"]) assert.ok(missingProtectedTokens(`تبرع 50 ${symbol}`,"Donate 50").length);
  assert.ok(missingProtectedTokens("تبرع 100 $", "Donate 100 €").length);
  for (const code of ["CAD","AUD","BHD","OMR","MAD"]) assert.ok(missingProtectedTokens(`دعم 50 ${code}`,"Support 50 USD").length);
  assert.deepEqual(missingProtectedTokens("نسبة ٥٠٪", "Rate 50%"),[]);
  assert.deepEqual(missingProtectedTokens("نسبة 50%", "Oran %50",{targetLocale:"tr"}),[]);
});
test("numeric matching consumes each occurrence only once", () => {
  assert.ok(missingProtectedTokens("100.0 و100", "100").length);
  assert.deepEqual(missingProtectedTokens("100.0 و100", "100 and 100.0"),[]);
  assert.ok(missingProtectedTokens("تبرع 100 $ و100 $", "Donate 100 $ and 100").length);
});
test("URLs, variables and Quran text remain protected alongside localized amounts", () => {
  const source="{{name}} ادعم ١٠٫٥٠ EUR عبر https://example.org/donate. ﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾";
  const target="{{name}} Apoie 10,50 EUR em https://example.org/donate ﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾";
  assert.deepEqual(missingProtectedTokens(source,target,{targetLocale:"pt"}),[]);
  assert.ok(missingProtectedTokens(source,target.replace("{{name}}","name"),{targetLocale:"pt"}).length);
  assert.ok(missingProtectedTokens(source,target.replace("example.org","example.net"),{targetLocale:"pt"}).length);
  assert.ok(missingProtectedTokens(source,target.replace("إِنَّ مَعَ الْعُسْرِ يُسْرًا","translated verse"),{targetLocale:"pt"}).length);
});
test("normalizing digits cannot disguise changes inside URLs, variables or protected verses", () => {
  assert.ok(missingProtectedTokens("https://example.org/١٢", "https://example.org/12").length);
  assert.ok(missingProtectedTokens("{{item١}}", "{{item1}}").length);
  assert.ok(missingProtectedTokens("﴿ نص ١ ﴾", "﴿ نص 1 ﴾").length);
});

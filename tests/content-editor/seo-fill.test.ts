import { test } from "node:test";
import assert from "node:assert/strict";
import { missingSeoChanges, seoPlainText } from "../../lib/content-editor/seo-fill";
import { validateChanges, fieldsFor } from "../../lib/content-editor/contracts";
import { currencyForCountry } from "../../lib/geo/country-to-currency";
import { PUBLIC_CURRENCY_OPTIONS, SUPPORTED_CURRENCY_CODES } from "../../lib/supported-currencies";
import { ALLOWED_URL_CURRENCIES, URL_CURRENCY_CODES_ORDERED, normalizeCurrencyParamToCookie } from "../../lib/currency-link";
import { decodeRouteKey, whereByIdOrAnyLocaleSlug } from "../../lib/slug";
test("Arabic route keys resolve to the same record and canonical segment as decoded slugs", () => {
  for (const slug of ["مشروع-اطعام-الطعام", "gıda-desteği", "café", "project", "111111111111111111111111"]) {
    const encoded = encodeURIComponent(slug), decoded = decodeRouteKey(encoded);
    assert.equal(decoded, slug);
    assert.deepEqual(whereByIdOrAnyLocaleSlug(decoded), whereByIdOrAnyLocaleSlug(slug));
    assert.equal(encodeURIComponent(decoded), encoded);
  }
  assert.equal(decodeRouteKey("invalid%slug"), "invalid%slug");
});
test("SEO fills only missing fields from the same locale and preserves explicit indexing, FAQ and custom copy", () => {
  const row = {title:"مشروع المياه", description:'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"توفير المياه للأسر المحتاجة"}]}]}', seoTitle:"عنوان محرر يدويًا", ogDescription:"وصف يدوي", seoNoIndex:"true", faqContent:"[]", translations:[{locale:"en",title:"Water project",description:"Clean water for families",seoDescription:"Custom description"},{locale:"fr",title:"مشروع المياه"}]};
  const changes = missingSeoChanges("campaigns", row);
  assert.equal(changes.ar.seoTitle, undefined);
  assert.equal(changes.ar.ogDescription, undefined);
  assert.equal(changes.ar.seoDescription,"توفير المياه للأسر المحتاجة");
  assert.equal(changes.en.seoDescription, undefined);
  assert.equal(changes.en.ogDescription,"Clean water for families");
  assert.equal(changes.fr, undefined);
  assert.equal(changes.pt, undefined);
  for (const values of Object.values(changes)) {
    assert.equal(values.seoNoIndex, undefined); assert.equal(values.faqContent, undefined);
    validateChanges(fieldsFor("campaigns", row), values);
  }
});
test("SEO extracts text and is idempotent, bounded and does not invent a description for empty content", () => {
  assert.equal(seoPlainText('<p>Clean &amp; safe</p><script>bad()</script>'),"Clean & safe");
  const row = {title:"A project",description:"",translations:[]};
  const changes = missingSeoChanges("blog",row);
  assert.equal(changes.ar.metaDescription,"A project");
  assert.deepEqual(missingSeoChanges("blog",{...row,...changes.ar}),{});
  const long = missingSeoChanges("categories",{name:"title ".repeat(60), description:"description ".repeat(100)});
  assert.ok(long.ar.metaTitle.length <= 70); assert.ok(long.ar.metaDescription.length <= 170);
  const banner = missingSeoChanges("urgent-banners",{title:"Banner",description:"Details"});
  assert.deepEqual(banner.ar,{imageAlt:"Banner"});
  const copied = missingSeoChanges("campaigns", {title:"مشروع",description:"وصف عربي",translations:[{locale:"en",title:"Project",description:"وصف عربي"}]});
  assert.equal(copied.en.seoDescription,"Project");
});
test("Morocco defaults to USD while old MAD amounts, links and payment currency validation remain supported", () => {
  assert.equal(currencyForCountry("MA"),"USD");
  assert.equal(currencyForCountry(" ma "),"USD");
  assert.equal(currencyForCountry("TR"),"TRY");
  assert.equal(currencyForCountry("FR"),"EUR");
  assert.equal(currencyForCountry(null),null);
  assert.equal(PUBLIC_CURRENCY_OPTIONS.some(o => String(o.code) === "MAD"),false);
  assert.equal((URL_CURRENCY_CODES_ORDERED as readonly string[]).includes("MAD"),false);
  assert.equal(SUPPORTED_CURRENCY_CODES.includes("MAD"),true);
  assert.equal(ALLOWED_URL_CURRENCIES.has("MAD"),true);
  assert.equal(normalizeCurrencyParamToCookie("mad"),"MAD");
});

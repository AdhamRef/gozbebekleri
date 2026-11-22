import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { donationSourceWhere } from "../../lib/dashboard/donation-source-filter";
// Gözbebekleri: no provider filter and no location-scope module; its APIs use lib/dashboard/donation-campaign-filter.
import {
  donationCampaignWhere,
  donationCategoryOr,
  donationCountryFilterWhere,
  donationLocaleFilterWhere,
} from "../../lib/dashboard/donation-campaign-filter";

test("one value gives exactly the condition it gave before", () => {
  assert.deepEqual(donationLocaleFilterWhere("ar"), { locale: "ar" });
  assert.deepEqual(donationLocaleFilterWhere("__unset"), { OR: [{ locale: null }, { locale: "" }] });
  assert.deepEqual(donationCountryFilterWhere("tr"), { donorCountryCode: "TR" });
  assert.deepEqual(donationCountryFilterWhere("__unset"), { OR: [{ donorCountryCode: null }, { donorCountryCode: "" }] });
  assert.deepEqual(donationSourceWhere("facebook"), { sourceChannel: "facebook" });
  assert.deepEqual(donationCampaignWhere("c1"), { items: { some: { campaignId: "c1" } } });
  assert.deepEqual(donationCategoryOr("k1"), [
    { items: { some: { campaign: { categoryIds: { has: "k1" } } } } },
    { categoryItems: { some: { categoryId: "k1" } } },
  ]);
  for (const fn of [donationLocaleFilterWhere, donationCountryFilterWhere, donationSourceWhere, donationCampaignWhere, donationCategoryOr]) {
    assert.equal(fn("all"), null); assert.equal(fn(""), null); assert.equal(fn(null), null);
  }
});

test("several values mean any of them", () => {
  assert.deepEqual(donationCountryFilterWhere("TR,AZ"), { OR: [{ donorCountryCode: "TR" }, { donorCountryCode: "AZ" }] });
  assert.deepEqual(donationLocaleFilterWhere("ar,tr"), { OR: [{ locale: "ar" }, { locale: "tr" }] });
  assert.deepEqual(donationSourceWhere("facebook,instagram"), { OR: [{ sourceChannel: "facebook" }, { sourceChannel: "instagram" }] });
  assert.deepEqual(donationSourceWhere("facebook,bogus"), { sourceChannel: "facebook" }, "unknown values are ignored, as before");
  assert.deepEqual(donationCountryFilterWhere("TR,tr"), { donorCountryCode: "TR" }, "duplicates collapse");
  assert.deepEqual(donationCampaignWhere("c1,c2"), { items: { some: { campaignId: { in: ["c1", "c2"] } } } });
  assert.deepEqual(donationCategoryOr("k1,k2"), [
    { items: { some: { campaign: { categoryIds: { hasSome: ["k1", "k2"] } } } } },
    { categoryItems: { some: { categoryId: { in: ["k1", "k2"] } } } },
  ]);
});

test("stats, chart, list and export all use the shared multi-value filters", () => {
  for (const f of ["app/api/admin/stats/route.ts", "app/api/admin/donations/chart/route.ts", "app/api/donations/route.ts", "app/api/admin/donations/export/route.ts"]) {
    const s = fs.readFileSync(f, "utf8");
    assert.match(s, /donationCategoryOr\(categoryId\)/, f);
    assert.match(s, /donationLocaleFilterWhere\(/, f);
    assert.match(s, /donationCountryFilterWhere\(/, f);
    assert.doesNotMatch(s, /categoryIds: \{ has: categoryId \}/, `${f} still builds a single-category condition inline`);
  }
  const page = fs.readFileSync("app/(dashboard)/dashboard/page.tsx", "utf8");
  for (const label of ["الفئة", "المشروع", "مصدر التبرع", "لغة الموقع \\(التبرع\\)", "الدولة"]) assert.match(page, new RegExp(`<MultiPick label="${label}"`));
});

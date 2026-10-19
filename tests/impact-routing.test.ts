import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_IMPACT_CONFIG } from "../lib/impact/config";
import { impactCampaignPath, impactCampaignSlug, IMPACT_CAMPAIGN_SLUGS, resolveImpactCampaignSlug, impactRegionPath, impactRegionSlug, impactSlugMatches, resolveImpactRegion } from "../lib/impact/routing";
import { SUPPORTED_LOCALES } from "../lib/locales";

const regions = DEFAULT_IMPACT_CONFIG.regions;

test("every region deep link resolves in all eight languages, including encoded Unicode", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const slugs = regions.map((region) => impactRegionSlug(region, locale));
    assert.equal(new Set(slugs).size, regions.length);
    for (const region of regions) {
      const path = impactRegionPath(locale, "make-an-impact", region);
      assert.equal(resolveImpactRegion(regions, path.split("/")[4])?.key, region.key);
      assert.equal(resolveImpactRegion(regions, impactRegionSlug(region, locale))?.key, region.key);
    }
  }
});

test("switching language preserves region identity and translates the final segment", () => {
  const region = resolveImpactRegion(regions, "السودان")!;
  assert.equal(impactRegionPath("en", "make-an-impact", region), "/en/impact/make-an-impact/sudan");
  assert.equal(impactRegionPath("fr", "make-an-impact", region), "/fr/impact/faites-la-diff%C3%A9rence/soudan");
  assert.equal(decodeURIComponent(impactRegionPath("ar", "make-an-impact", region)), "/ar/impact/اصنع-أثرا/السودان");
  assert.equal(impactRegionSlug(regions.find((r) => r.key === "syria")!, "tr"), "suriye");
});

test("legacy keys resolve, while disabled, unknown and malformed regions do not", () => {
  assert.equal(resolveImpactRegion(regions, "quds")?.key, "quds");
  const disabled = regions.map((region) => ({ ...region, active: region.key !== "sudan" }));
  for (const slug of ["sudan", "السودان", "soudan"]) assert.equal(resolveImpactRegion(disabled, slug), undefined);
  for (const slug of ["", "unknown", "%E0%A4%A", "../sudan"]) assert.equal(resolveImpactRegion(regions, slug), undefined);
});

test("custom regions use their localized names and safely encode campaign slugs", () => {
  const custom = { ...regions[0], key: "custom", name: { ar: "منطقة جديدة", fr: "Nouvelle région" } };
  assert.equal(impactRegionSlug(custom, "ar"), "منطقة-جديدة");
  assert.equal(resolveImpactRegion([custom], "nouvelle-région")?.key, "custom");
  assert.equal(impactRegionPath("fr", "a/b", custom), "/fr/impact/a%2Fb/nouvelle-r%C3%A9gion");
});


test("translated campaign slugs round-trip to the same database campaign in all languages", () => {
  assert.equal(new Set(Object.values(IMPACT_CAMPAIGN_SLUGS)).size, SUPPORTED_LOCALES.length);
  for (const locale of SUPPORTED_LOCALES) {
    const slug = impactCampaignSlug("make-an-impact", locale);
    assert.equal(slug, IMPACT_CAMPAIGN_SLUGS[locale]);
    assert.equal(resolveImpactCampaignSlug(slug), "make-an-impact");
    assert.equal(resolveImpactCampaignSlug(encodeURIComponent(slug)), "make-an-impact");
    assert.equal(decodeURIComponent(impactCampaignPath(locale, "make-an-impact")), `/${locale}/impact/${slug}`);
    for (const previous of Object.values(IMPACT_CAMPAIGN_SLUGS)) {
      assert.equal(impactCampaignSlug(previous, locale), slug);
    }
  }
});

test("custom campaign slugs remain unchanged", () => {
  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(impactCampaignSlug("custom-builder", locale), "custom-builder");
    assert.equal(resolveImpactCampaignSlug("custom-builder"), "custom-builder");
    assert.equal(resolveImpactCampaignSlug("Custom-Builder"), "Custom-Builder");
  }
});

test("canonical Unicode route params never redirect to themselves, escaped or decoded", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const campaign = impactCampaignSlug("make-an-impact", locale);
    for (const actual of [campaign, encodeURIComponent(campaign), campaign.normalize("NFD")]) {
      assert.equal(impactSlugMatches(actual, campaign), true);
    }
    for (const region of regions) {
      const slug = impactRegionSlug(region, locale);
      assert.equal(impactSlugMatches(encodeURIComponent(slug), slug), true);
      assert.equal(impactSlugMatches(slug, slug), true);
    }
  }
  assert.equal(impactSlugMatches("make-an-impact", "اصنع-أثرا"), false);
  assert.equal(impactSlugMatches("%E0%A4%A", "اصنع-أثرا"), false);
});

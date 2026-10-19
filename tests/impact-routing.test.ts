import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_IMPACT_CONFIG } from "../lib/impact/config";
import { impactRegionPath, impactRegionSlug, resolveImpactRegion } from "../lib/impact/routing";
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
  assert.equal(impactRegionPath("fr", "make-an-impact", region), "/fr/impact/make-an-impact/soudan");
  assert.equal(decodeURIComponent(impactRegionPath("ar", "make-an-impact", region)), "/ar/impact/make-an-impact/السودان");
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

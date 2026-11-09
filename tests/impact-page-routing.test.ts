import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { DEFAULT_IMPACT_CONFIG } from "../lib/impact/config";
import * as config from "../lib/impact/config";
import * as routing from "../lib/impact/routing";
import { SUPPORTED_LOCALES } from "../lib/locales";

// Exercise the real page's redirect decision with both forms of route params.
// Only database/framework boundaries are mocked; no live data is modified.
const row = {
  id: "impact-test", campaignId: "campaign-test", slug: "make-an-impact",
  title: { en: "Impact" }, intro: {}, allowMonthly: true, ...DEFAULT_IMPACT_CONFIG,
};
const requireModule = createRequire(`${process.cwd()}/package.json`);
const redirects = {
  redirect(path: string): never { throw Object.assign(new Error("redirect"), { path }); },
  notFound(): never { throw new Error("not-found"); },
};
const mocks: Record<string, unknown> = {
  "next/navigation": redirects,
  "@/lib/seo": { SITE_URL: "https://www.gozbebekleri.org", LOCALES: SUPPORTED_LOCALES },
  "@/lib/impact/config": config,
  "@/lib/impact/routing": routing,
  "@/lib/impact/load": { loadImpactCampaign: async () => row },
  "./ImpactBuilder": () => null,
};
const moduleStub = { exports: {} as { renderImpactPage: (props: unknown, legacyPath?: boolean) => Promise<unknown> } };
const source = readFileSync("app/[locale]/impact/_components/ImpactCampaignPage.tsx", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
runInNewContext(compiled, {
  module: moduleStub, exports: moduleStub.exports, URLSearchParams,
  require: (name: string) => name in mocks ? mocks[name] : requireModule(name),
});
const page = moduleStub.exports.renderImpactPage;

test("canonical page and region routes render instead of self-redirecting in all languages", async () => {
  for (const locale of SUPPORTED_LOCALES) {
    const slug = routing.impactCampaignSlug(row.slug, locale);
    for (const encode of [(value: string) => value, encodeURIComponent]) {
      for (const region of [undefined, ...DEFAULT_IMPACT_CONFIG.regions]) {
        const params = {
          locale, slug: encode(slug),
          ...(region ? { region: encode(routing.impactRegionSlug(region, locale)) } : {}),
        };
        assert.ok(await page({ params: Promise.resolve(params), searchParams: Promise.resolve({}) }));
      }
    }
  }
});

test("old English entry point redirects once, preserving repeated query parameters", async () => {
  await assert.rejects(page({
    params: Promise.resolve({ locale: "ar", slug: "make-an-impact", region: "sudan" }),
    searchParams: Promise.resolve({ currency: "USD", utm_source: ["one", "two"] }),
  }), (error: unknown) => {
    assert.equal((error as { path: string }).path,
      routing.impactRegionPath("ar", row.slug, DEFAULT_IMPACT_CONFIG.regions[2])
      + "?currency=USD&utm_source=one&utm_source=two");
    return true;
  });
});


test("legacy English and translated paths redirect to the clean canonical path once", async () => {
  for (const locale of SUPPORTED_LOCALES) {
    const slug = routing.impactCampaignSlug(row.slug, locale);
    for (const actual of ["make-an-impact", encodeURIComponent(slug)]) {
      await assert.rejects(page({
        params: Promise.resolve({ locale, slug: actual }),
        searchParams: Promise.resolve({ currency: "USD" }),
      }, true), (error: unknown) => {
        assert.equal((error as { path: string }).path, routing.impactCampaignPath(locale, row.slug) + "?currency=USD");
        return true;
      });
    }
  }
});

function loadRoute(path: string, extraMocks: Record<string, unknown>) {
  const fixture = { exports: {} as Record<string, (props: any) => Promise<any>> };
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const dependencies = { ...mocks, ...extraMocks };
  runInNewContext(code, {
    module: fixture, exports: fixture.exports, URL, URLSearchParams,
    require: (name: string) => name in dependencies ? dependencies[name] : requireModule(name),
  });
  return fixture.exports;
}

test("clean route accepts featured aliases and rejects unrelated page paths", async () => {
  const route = loadRoute("app/[locale]/[impactSlug]/page.tsx", {
    "../impact/_components/ImpactCampaignPage": moduleStub.exports,
  });
  assert.ok(await route.default({
    params: Promise.resolve({ locale: "en", impactSlug: "make-an-impact", region: "sudan" }),
    searchParams: Promise.resolve({}),
  }));
  await assert.rejects(route.default({
    params: Promise.resolve({ locale: "en", impactSlug: "unrelated-page" }),
    searchParams: Promise.resolve({}),
  }), /not-found/);
});

test("language API translates both clean and legacy region paths", async () => {
  const route = loadRoute("app/api/i18n/resolve-localized-path/route.ts", {
    "next/server": { NextResponse: { json: (value: unknown) => value } },
    "@/lib/prisma": { prisma: {} }, "@/lib/slug": {},
  });
  for (const sourceLocale of SUPPORTED_LOCALES) {
    const region = DEFAULT_IMPACT_CONFIG.regions[2];
    const clean = routing.impactRegionPath(sourceLocale, row.slug, region);
    const legacy = `/${sourceLocale}/impact/${encodeURIComponent(routing.impactCampaignSlug(row.slug, sourceLocale))}/${encodeURIComponent(routing.impactRegionSlug(region, sourceLocale))}`;
    for (const targetLocale of SUPPORTED_LOCALES) {
      for (const pathname of [clean, legacy]) {
        const query = new URLSearchParams({ pathname, targetLocale });
        const result = await route.GET({ url: `https://example.org/api/i18n/resolve-localized-path?${query}` });
        assert.equal(result.path, routing.impactRegionPath(targetLocale, row.slug, region));
      }
    }
  }
});

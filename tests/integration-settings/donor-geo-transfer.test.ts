import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { isIP } from "node:net";
import { execFileSync } from "node:child_process";
import * as ts from "typescript";

// Execute the real source with isolated provider/Next mocks: never call an external
// geolocation service, write donor data, or depend on the test runner's IP.
function loadSource(path: string, dependencies: Record<string, unknown> = {}, globals: Record<string, unknown> = {}) {
  const exports: Record<string, any> = {};
  const output = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: path,
  }).outputText;
  runInNewContext(output, {
    exports,
    require(id: string) {
      if (id === "server-only") return {};
      if (Object.prototype.hasOwnProperty.call(dependencies, id)) return dependencies[id];
      throw new Error("Unexpected dependency: " + id);
    },
    process: { env: {} },
    AbortSignal,
    console: { warn() {}, error() {} },
    ...globals,
  });
  return exports;
}

function geoLookup(fetch: typeof globalThis.fetch) {
  return loadSource("lib/geo/ip-lookup.ts", {}, { fetch });
}
function countries(lookup: (ip: string) => Promise<unknown>) {
  return loadSource("lib/geo/country-from-request.ts", {
    "node:net": { isIP },
    "@/lib/geo/intl-country-name": { countryNameFromIsoCode: (code: string) => "Country " + code },
    "@/lib/geo/ip-lookup": { lookupIpGeo: lookup },
  });
}
function request(headers: Record<string, string>) { return { headers: new Headers(headers) }; }
function answer(provider: string, countryCode: string, city: string | null = null) {
  return { provider, countryCode, city, region: null };
}

test("geo consensus uses the majority country even when the first provider disagrees", () => {
  const mod = geoLookup((async () => { throw new Error("must not fetch"); }) as typeof fetch);
  const result = mod.pickConsensus([answer("ipinfo", "YE", "Sanaa"), answer("ipapi", "PS", "Gaza"), answer("country.is", "PS")]);
  assert.equal(result.countryCode, "PS");
  assert.equal(result.city, "Gaza");
});

test("geo ties keep the preferred provider country and never borrow a city from another country", () => {
  const mod = geoLookup((async () => { throw new Error("must not fetch"); }) as typeof fetch);
  const result = mod.pickConsensus([answer("ipapi", "YE", "Sanaa"), answer("ipinfo", "PS")]);
  assert.equal(result.countryCode, "PS");
  assert.equal(result.city, null);
  assert.equal(mod.pickConsensus([]), null);
});

test("geo provider lookups are bounded, tolerate partial failure, and cache by IP", async () => {
  let calls = 0;
  const mod = geoLookup((async (input: string | URL | Request, options?: RequestInit) => {
    calls++;
    assert.ok(options?.signal);
    assert.equal(options?.cache, "no-store");
    const url = String(input);
    if (url.includes("ipinfo.io")) throw new Error("provider unavailable");
    if (url.includes("ipapi.co")) return { ok: true, json: async () => ({ country_code: url.includes("8.8.8.8") ? "US" : "AU", city: "City" }) };
    return { ok: true, json: async () => ({ country: url.includes("8.8.8.8") ? "US" : "AU" }) };
  }) as typeof fetch);
  assert.equal((await mod.lookupIpGeo("8.8.8.8")).countryCode, "US");
  assert.equal(calls, 3);
  assert.equal((await mod.lookupIpGeo("8.8.8.8")).countryCode, "US");
  assert.equal(calls, 3);
  assert.equal((await mod.lookupIpGeo("1.1.1.1")).countryCode, "AU");
  assert.equal(calls, 6);
});

test("geo all-provider failure returns unknown instead of inventing a country", async () => {
  const mod = geoLookup((async () => { throw new Error("timeout"); }) as typeof fetch);
  assert.equal(await mod.lookupIpGeo("8.8.4.4"), null);
});

test("geo excludes provider error payloads and non-country placeholders", async () => {
  const mod = geoLookup((async (input: string | URL | Request) => {
    const url = String(input);
    return { ok: true, json: async () =>
      url.includes("ipinfo.io") ? { country: "XX" } :
      url.includes("ipapi.co") ? { error: true, country_code: "TR" } :
      { country: "EU" } };
  }) as typeof fetch);
  assert.equal(await mod.lookupIpGeo("8.8.4.4"), null);
});

test("geo prefers edge country headers and never queries third parties when present", async () => {
  let calls = 0;
  const mod = countries(async () => { calls++; throw new Error("must not lookup"); });
  const vercel = await mod.resolveGeoFromRequest(request({
    "x-vercel-ip-country": "tr", "cf-ipcountry": "US", "x-real-ip": "8.8.8.8",
  }));
  assert.equal(vercel.countryCode, "TR");
  const cf = await mod.resolveGeoFromRequest(request({ "cf-ipcountry": "PS", "x-real-ip": "8.8.8.8" }));
  assert.equal(cf.countryCode, "PS");
  assert.equal(calls, 0);
});

test("geo client IP uses proxy headers and rejects a spoofed left forwarded hop", () => {
  const mod = countries(async () => null);
  assert.equal(mod.getClientIp(request({
    "cf-connecting-ip": "1.1.1.1", "x-real-ip": "8.8.8.8", "x-forwarded-for": "9.9.9.9",
  })), "1.1.1.1");
  assert.equal(mod.getClientIp(request({
    "x-real-ip": "::ffff:8.8.8.8", "x-forwarded-for": "9.9.9.9",
  })), "8.8.8.8");
  assert.equal(mod.getClientIp(request({
    "x-forwarded-for": "9.9.9.9, 8.8.8.8, 10.0.0.1",
  })), "8.8.8.8");
});

test("geo private, loopback, link-local, carrier NAT and malformed addresses never trigger lookup", async () => {
  let calls = 0;
  const mod = countries(async () => { calls++; return null; });
  for (const ip of ["10.0.0.1", "192.168.1.1", "172.16.1.1", "127.0.0.2", "::", "::1", "fd00::1", "fe80::1", "169.254.1.1", "100.64.0.1", "not-an-ip"]) {
    assert.equal(await mod.resolveGeoFromRequest(request({ "x-forwarded-for": ip })), null, ip);
  }
  assert.equal(calls, 0);
});

test("geo falls back to the IP resolver without changing the existing response contract", async () => {
  const seen: string[] = [];
  const mod = countries(async (ip) => { seen.push(ip); return { countryCode: "PS", city: "Gaza", region: "Gaza" }; });
  const result = await mod.resolveGeoFromRequest(request({ "x-real-ip": "8.8.8.8" }));
  assert.equal(result.countryCode, "PS");
  assert.equal(result.countryName, "Country PS");
  assert.equal(result.city, "Gaza");
  assert.deepEqual(seen, ["8.8.8.8"]);
  assert.equal(await mod.resolveCountryCodeFromRequest(request({ "x-real-ip": "8.8.8.8" })), "PS");
});

function clientRoute(resolveGeoFromRequest: (req: unknown) => Promise<unknown>) {
  return loadSource("app/api/geo/client/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, options: { headers: Record<string, string> }) => ({ body, headers: new Headers(options.headers) }) } },
    "@/lib/geo/country-from-request": { resolveGeoFromRequest },
  });
}

test("geo endpoint prevents shared caching of both successful and failed lookups", async () => {
  for (const geo of [null, { countryCode: "TR", countryName: "Türkiye", region: null, city: null }]) {
    const mod = clientRoute(async () => geo);
    const response = await mod.GET(request({}));
    const cache = response.headers.get("Cache-Control");
    assert.match(cache, /private/);
    assert.doesNotMatch(cache, /s-maxage|public/);
    assert.equal(response.body.ok, geo !== null);
    if (geo) assert.equal(response.body.country_code, "TR");
  }
});

test("geo endpoint resolves successive visitors separately instead of sharing the first country", async () => {
  const mod = clientRoute(async (req: any) => ({ countryCode: req.headers.get("x-vercel-ip-country"), countryName: "Country", region: null, city: null }));
  assert.equal((await mod.GET(request({ "x-vercel-ip-country": "YE" }))).body.country_code, "YE");
  assert.equal((await mod.GET(request({ "x-vercel-ip-country": "PS" }))).body.country_code, "PS");
});

test("geo imported request and provider modules pass strict TypeScript validation", () => {
  execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.geo.json"], { stdio: "pipe" });
});

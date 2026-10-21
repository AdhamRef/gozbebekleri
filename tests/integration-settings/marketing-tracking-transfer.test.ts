import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import * as ts from "typescript";
import type { Session } from "next-auth";
import { sessionHasDashboardPermission, type DashboardPermissionKey } from "../../lib/dashboard/permissions";
import { providerState } from "../../lib/platform-connections/health-state";
import { donationUsdAmount } from "../../lib/templates/money";

class Reply {
  status: number;
  headers: Headers;
  constructor(readonly body: any, init: { status?: number; headers?: HeadersInit } = {}) {
    this.status = init.status ?? 200;
    this.headers = new Headers(init.headers);
  }
  static json(body: unknown, init = {}) { return new Reply(body, init); }
}
function session(permissions: string[], role = "STAFF"): Session {
  return { expires: "2099-01-01", user: { id: "fixture-operator", role, dashboardPermissions: permissions, name: "Fixture" } } as Session;
}
function load(path: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const exports: Record<string, any> = {};
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: path,
  }).outputText;
  runInNewContext(code, {
    exports, Headers, URL, URLSearchParams, Date, process: { env: {} },
    console: { error() {}, warn() {} },
    fetch: async () => { throw new Error("Unexpected external request"); },
    require(id: string) {
      if (Object.prototype.hasOwnProperty.call(dependencies, id)) return dependencies[id];
      throw new Error("Unmocked module: " + id);
    },
    ...globals,
  });
  return exports;
}
function guard(actor: Session | null, permission: DashboardPermissionKey) {
  if (!actor?.user) return Reply.json({ error: "Unauthorized" }, { status: 401 });
  if (!sessionHasDashboardPermission(actor, permission)) return Reply.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
function harness(actor: Session | null, options: Record<string, any> = {}) {
  let reads = 0, bodies = 0, sends = 0;
  const commands: any[] = [], audits: any[] = [];
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: Reply },
    "next-auth": { getServerSession: async () => actor },
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/dashboard/api-auth": { requireAdminOrDashboardPermission: guard },
    "@/lib/prisma-raw-command": { rawCommand: (v: unknown) => v },
    "@/lib/prisma": { prisma: {
      $runCommandRaw: async (command: any) => { reads++; commands.push(command); if (command.update === "TrackingSettings") { const u = command.updates[0].u; options.settings = { ...options.settings, ...u.$set }; for (const key of Object.keys(u.$unset ?? {})) delete options.settings[key]; } return { cursor: { firstBatch: options.events ?? [] } }; },
      auditLog: { findMany: async () => { reads++; return []; } },
    } },
    "@/lib/tracking/tracking-settings": {
      TRACKING_SETTINGS_COLLECTION: "TrackingSettings",
      getRawTrackingSettings: async () => { reads++; return options.settings ?? null; },
      trackingString: (row: any, key: string) => typeof row?.[key] === "string" && row[key].trim() ? row[key].trim() : null,
      trackingBoolean: (row: any, key: string) => row?.[key] === true,
    },
    "@/lib/tracking/conversion-event-indexes": { ensureConversionEventIndexes: async () => { reads++; } },
    "@/lib/tracking/donation-conversion-server": { syncDonationConversion: async () => { sends++; return { ok: true }; } },
    "@/lib/tracking/meta-capi": { sendMetaCapiEvent: async () => { sends++; return { ok: true }; } },
    "@/lib/audit-log": { auditActorFromDashboardSession: () => ({ actorId: "fixture-operator" }), writeAuditLog: async (v: any) => { audits.push(v); } },
    "@/lib/marketing/campaign-links/campaign-link-registry-service": {
      listCampaignLinks: async () => { reads++; return options.links ?? []; },
      parseCampaignLinkStatusFilter: (v: unknown) => v ?? "ACTIVE",
      readString: (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null,
    },
  };
  return {
    module: (path: string) => load(path, dependencies, options.globals),
    request: (body: unknown = {}, query = "") => ({ nextUrl: new URL("https://charity.example/api?" + query), json: async () => { bodies++; return body; } }),
    counts: () => ({ reads, bodies, sends }), commands, audits,
  };
}
const tracking = "app/api/admin/tracking/";
const conversion = "app/api/admin/conversion-events/";
const exportRoute = "app/api/admin/marketing-intelligence/campaign-links/export/route.ts";

test("marketing APIs reject unauthenticated and donor requests before data, body or provider access", async () => {
  for (const actor of [null, session([], "DONOR")]) {
    for (const [path, method] of [
      [tracking + "route.ts", "GET"], [tracking + "route.ts", "PUT"],
      [tracking + "test/route.ts", "POST"], [tracking + "diagnostics/route.ts", "GET"],
      [conversion + "route.ts", "GET"], [conversion + "retry/route.ts", "POST"],
      [exportRoute, "GET"],
    ]) {
      const h = harness(actor);
      const result = await h.module(path)[method](h.request());
      assert.equal(result.status, actor ? 403 : 401, path);
      assert.deepEqual(h.counts(), { reads: 0, bodies: 0, sends: 0 });
    }
  }
});

test("pixels view permission cannot mutate tracking credentials, send tests or retry conversions", async () => {
  for (const [path, method] of [
    [tracking + "route.ts", "PUT"], [tracking + "test/route.ts", "POST"],
    [conversion + "retry/route.ts", "POST"],
  ]) {
    const h = harness(session(["pixels"]));
    assert.equal((await h.module(path)[method](h.request())).status, 403);
    assert.deepEqual(h.counts(), { reads: 0, bodies: 0, sends: 0 });
  }
});

test("tracking view returns presence flags and masks without exposing secrets", async () => {
  const secret = "fixture-private-token-9999";
  const h = harness(session(["platformConnections"]), { settings: { facebookPixelId: "fixture-pixel", facebookAccessToken: secret } });
  const response = await h.module(tracking + "route.ts").GET();
  assert.equal(response.body.facebookAccessTokenPresent, true);
  assert.equal(response.body.facebookAccessToken, undefined);
  assert.ok(!JSON.stringify(response.body).includes(secret));
  assert.equal(h.counts().sends, 0);
});

test("tracking updates preserve blank and masked secrets, ignore unknown fields, and keep audit values safe", async () => {
  const secret = "fixture-private-token-9999";
  const h = harness(session(["platformConnectionsManage"]), {
    settings: { _id: { $oid: "000000000000000000000001" }, facebookPixelId: "old-pixel", facebookAccessToken: secret, gaApiSecret: "fixture-ga-secret" },
  });
  const response = await h.module(tracking + "route.ts").PUT(h.request({
    facebookPixelId: "new-pixel", facebookAccessToken: "", gaApiSecret: "••••••••cret", unexpected: "ignored",
  }));
  assert.equal(response.status, 200);
  const update = h.commands[0].updates[0].u;
  assert.equal(update.$set.facebookPixelId, "new-pixel");
  assert.equal(update.$set.facebookAccessToken, undefined);
  assert.equal(update.$set.gaApiSecret, undefined);
  assert.equal(update.$set.unexpected, undefined);
  assert.ok(!JSON.stringify(h.audits).includes(secret));
  assert.ok(!JSON.stringify(h.audits).includes("fixture-ga-secret"));
  assert.equal(h.audits[0].metadata.plainChanges.facebookPixelId.before, "old-pixel");
  assert.equal(h.audits[0].metadata.plainChanges.facebookPixelId.after, "new-pixel");
});

test("secret removal requires the explicit clear flag", async () => {
  const h = harness(session(["platformConnectionsManage"]), { settings: { _id: "000000000000000000000001", facebookAccessToken: "fixture-only" } });
  await h.module(tracking + "route.ts").PUT(h.request({ clearFacebookAccessToken: true }));
  assert.equal(h.commands[0].updates[0].u.$unset.facebookAccessToken, "");
});

test("unsupported tracking provider tests never report success or send an event", async () => {
  const h = harness(session(["platformConnectionsTest"]), { settings: { googleAdsConversionId: "AW-fixture", googleAdsConversionLabel: "fixture" } });
  const response = await h.module(tracking + "test/route.ts").POST(h.request({ platform: "google_ads" }));
  assert.equal(response.status, 501);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.status, "not_implemented");
  assert.equal(h.counts().sends, 0);
});

test("missing Meta configuration never calls a provider", async () => {
  const h = harness(session(["platformConnectionsTest"]), { settings: { facebookAccessToken: "fixture" } });
  const response = await h.module(tracking + "test/route.ts").POST(h.request({ platform: "meta" }));
  assert.equal(response.body.status, "missing_config");
  assert.ok(response.body.missingFields.includes("facebookPixelId"));
  assert.equal(h.counts().sends, 0);
});

test("GA4 debug validation errors are failures even when the HTTP status is 200", async () => {
  const h = harness(session(["platformConnectionsTest"]), { settings: { gaMeasurementId: "G-FIXTURE", gaApiSecret: "fixture", gaDebugMode: true },
    globals: { fetch: async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ validationMessages: [{ description: "invalid fixture" }] }) }) },
  });
  const response = await h.module(tracking + "test/route.ts").POST(h.request({ platform: "ga4" }));
  assert.equal(response.body.ok, false);
  assert.equal(response.body.status, "failed");
});

test("conversion totals precede display limits and duplicated attempts keep delivery success", async () => {
  const h = harness(session(["pixels"]), { events: [
    { eventId: "one", platform: "META", channel: "server", status: "SENT", updatedAt: "2026-01-01" },
    { eventId: "one", platform: "META", channel: "server", status: "FAILED", updatedAt: "2026-01-02" },
    { eventId: "two", platform: "GA4", channel: "server", status: "SENT", updatedAt: "2026-01-01" },
  ] });
  const response = await h.module(conversion + "route.ts").GET(h.request({}, "limit=1"));
  assert.equal(response.body.total, 2);
  assert.equal(response.body.events.length, 1);
  assert.equal(response.body.events[0].status, "SENT");
  assert.equal(response.body.events[0].attempts, 2);
  assert.equal(response.body.totalIsExact, true);
  assert.equal(response.body.hasMore, true);
});

test("conversion responses mark a saturated read window as a lower-bound result", async () => {
  const h = harness(session(["pixels"]), { events: Array.from({ length: 5 }, (_, i) => ({ eventId: String(i), platform: "META", status: "SENT" })) });
  const response = await h.module(conversion + "route.ts").GET(h.request({}, "limit=1"));
  assert.equal(response.body.totalIsExact, false);
  assert.equal(response.body.scannedLimit, 5);
});

test("campaign export needs both section access and export permission", async () => {
  for (const permissions of [["reportsExport"], ["referrals"]]) {
    const h = harness(session(permissions));
    assert.equal((await h.module(exportRoute).GET(h.request())).status, 403);
    assert.equal(h.counts().reads, 0);
  }
  const h = harness(session(["referrals", "reportsExport"]));
  assert.equal((await h.module(exportRoute).GET(h.request())).status, 200);
  assert.equal(h.counts().reads, 1);
});

test("diagnostics respect disabled server toggles and require a Meta pixel plus token", async () => {
  const h = harness(session(["platformConnections"]), { settings: {
    facebookAccessToken: "fixture", tiktokPixelId: "fixture", tiktokAccessToken: "fixture", tiktokEventsApiEnabled: false,
    xConversionEventId: "fixture", xAccessToken: "fixture", xAdAccountId: "fixture", xConversionsApiEnabled: false,
  } });
  const response = await h.module(tracking + "diagnostics/route.ts").GET();
  assert.equal(response.body.diagnostics.tiktok.server.state, "disabled");
  assert.equal(response.body.diagnostics.x.server.state, "disabled");
  assert.ok(response.body.diagnostics.meta.server.missingFields.includes("facebookPixelId"));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(h.counts().sends, 0);
});

test("connection health distinguishes configured, verified, stale, failed and disabled states", () => {
  const state = (status: string, result: string | null, enabled = true) => providerState({ enabled, status, activeTest: { lastTestResult: result } });
  assert.equal(state("READY", null), "CONFIGURED");
  assert.equal(state("READY", "SUCCESS"), "VERIFIED");
  assert.equal(state("NEEDS_SETUP", "SUCCESS"), "NEEDS_SETUP");
  assert.equal(state("READY", "FAILED"), "FAILED");
  assert.equal(state("READY", "SUCCESS", false), "DISABLED");
});

test("link performance combines settlement and paid-date window while preserving fractional and unknown currencies", async () => {
  const queries: any[] = [];
  const mod = load("lib/marketing/campaign-links/campaign-link-performance-service.ts", {
    "@/lib/templates/money": { donationUsdAmount },
    "@/lib/dashboard/donation-usd-revenue": { PAID_DONATION_FILTER: { status: "PAID", paidAt: { not: null } } },
    "@/lib/prisma": { prisma: {
      donation: { findMany: async (query: any) => { queries.push(query); return [
        { id: "a", amount: 10, amountUSD: 2.35, currency: "TRY", createdAt: new Date(), paidAt: new Date(), conversionEventsSentAt: null, attribution: { utm_campaign: "fixture" } },
        { id: "b", amount: 999, amountUSD: null, currency: "TRY", createdAt: new Date(), paidAt: new Date(), conversionEventsSentAt: null, attribution: { utm_campaign: "fixture" } },
        { id: "c", amount: 1.5, amountUSD: null, currency: "USD", createdAt: new Date(), paidAt: new Date(), conversionEventsSentAt: null, attribution: { utm_campaign: "fixture" } },
      ]; } },
      $runCommandRaw: async () => ({ cursor: { firstBatch: [] } }),
    } },
    "./campaign-link-registry-service": { listCampaignLinks: async () => [{ id: "link-fixture", name: "Fixture", status: "ACTIVE", utmCampaign: "fixture" }], readString: (v: unknown) => typeof v === "string" ? v : null },
  });
  const report = await mod.buildCampaignLinkPerformanceReport({ days: 7, limit: 100, status: "ACTIVE" });
  assert.equal(queries[0].where.AND[0].paidAt.not, null);
  assert.ok(queries[0].where.AND[1].paidAt.gte instanceof Date);
  assert.ok(queries[0].where.AND[1].paidAt.lte instanceof Date);
  assert.equal(queries[0].orderBy.paidAt, "desc");
  assert.equal(report.range.dateBasis, "paidAt");
  assert.equal(report.links[0].performance.donations, 3);
  assert.equal(report.links[0].performance.revenue, 3.85);
  assert.equal(report.links[0].performance.missingCurrencyConversions, 1);
  assert.equal(report.links[0].performance.revenueComplete, false);
  assert.equal(report.links[0].performance.averageDonation, 1.925);
  assert.equal(report.summary.donationReadLimit, 5000);
});

test("canonical pages replace legacy implementations while keeping the old destinations reachable", () => {
  for (const [legacy, target] of [
    ["pixels", "/dashboard/platform-connections/tracking"],
    ["conversion-events", "/dashboard/marketing/tracking"],
    ["link-generator", "/dashboard/marketing/attribution#builder"],
  ]) {
    const source = readFileSync("app/(dashboard)/dashboard/" + legacy + "/page.tsx", "utf8");
    assert.ok(source.includes('redirect("' + target + '")'));
    assert.ok(!source.includes('"use client"'));
  }
  const ui = readFileSync("app/(dashboard)/dashboard/platform-connections/tracking/_components/TrackingSettingsManager.tsx", "utf8");
  assert.match(ui, /if \(loadError\) return/);
  assert.match(ui, /if \(!canManage \|\| loading \|\| loadError\) return/);
});

test("marketing tracking source and interfaces pass the strict TypeScript gate", () => {
  execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.marketing-tracking.json"], { stdio: "inherit" });
});

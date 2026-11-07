import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  EMPTY_INSTITUTION_QUICK_DONATION,
  resolveInstitutionQuickDonationTarget,
  validateInstitutionQuickDonation,
} from "../../lib/quick-donation/institution-config";

type ResponseValue = { status: number; data: Record<string, unknown> };
const activeConfig = {
  ...EMPTY_INSTITUTION_QUICK_DONATION,
  enabled: true,
  destinations: [
    { id: "zakat", type: "intention", label: "زكاة المال", enabled: true, projectId: "507f1f77bcf86cd799439011" },
  ],
  defaultDestinationId: "zakat",
};
function harness(page: "settings" | "resolve", options: {
  authenticated?: boolean;
  authorized?: boolean;
  approved?: boolean;
  validCount?: number;
  stored?: unknown;
} = {}) {
  const queries: unknown[] = [];
  const writes: unknown[] = [];
  const audit: unknown[] = [];
  const stored = options.stored === undefined ? activeConfig : options.stored;
  const session = options.authenticated === false ? null : { user: { id: "synthetic-admin", role: "ADMIN" } };
  const prisma = {
    globalSettings: {
      findFirst: async (query: unknown) => {
        queries.push(["settings", query]);
        return stored === null ? null : { id: "synthetic-settings", quickDonation: stored };
      },
      update: async (query: unknown) => {
        writes.push(["update", query]);
        return { quickDonation: activeConfig };
      },
      create: async (query: unknown) => {
        writes.push(["create", query]);
        return { quickDonation: activeConfig };
      },
    },
    campaign: {
      findFirst: async (query: unknown) => {
        queries.push(["project", query]);
        return options.approved === false ? null : { id: "507f1f77bcf86cd799439011" };
      },
      count: async (query: unknown) => {
        queries.push(["count", query]);
        return options.validCount ?? 1;
      },
    },
  };
  const mocks: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (data: Record<string, unknown>, init?: {status?: number}) => ({
      status: init?.status ?? 200, data,
    }) } },
    "next-auth": { getServerSession: async () => session },
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/prisma": { prisma },
    "@/lib/dashboard/api-auth": { requireAdminOrDashboardPermission: (s: unknown, key: string) => {
      assert.equal(key, "siteContent");
      if (!s) return { status: 401, data: { error: "Unauthorized" } };
      return options.authorized === false ? { status: 403, data: { error: "Forbidden" } } : null;
    } },
    "@/lib/audit-log": { queueAuditLog: (entry: unknown) => audit.push(entry),
      auditActorFromDashboardSession: () => ({ actorId: "synthetic-admin", actorName: "Test", actorRole: "ADMIN" }) },
    "@/lib/campaign/soft-delete-filter": { NOT_SOFT_DELETED: { OR: [{ isDeleted: false }] },
      NOT_IMPACT_BACKING: { impactCampaign: { is: null } } },
    "@/lib/quick-donation/institution-config": {
      EMPTY_INSTITUTION_QUICK_DONATION, resolveInstitutionQuickDonationTarget, validateInstitutionQuickDonation,
    },
  };
  const source = "app/api/quick-donation/" + (page === "settings" ? "route.ts" : "resolve/route.ts");
  const compiled = ts.transpileModule(fs.readFileSync(source, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, (req?: unknown) => Promise<ResponseValue>> = {};
  new vm.Script(compiled, { filename: source }).runInNewContext({
    module: { exports }, exports, require: (name: string) => {
      if (!(name in mocks)) throw new Error("Unexpected dependency: " + name);
      return mocks[name];
    },
  });
  return {
    actions: exports,
    queries,
    writes,
    audit,
    request: (body: unknown) => ({ json: async () => body }),
  };
}

test("settings GET has disabled fallback and does not write on a missing row", async () => {
  const h = harness("settings", { stored: null });
  const result = await h.actions.GET();
  assert.equal(result.status, 200);
  assert.equal((result.data.config as {enabled: boolean}).enabled, false);
  assert.equal(h.writes.length, 0);
});
test("settings PUT denies anonymous and unauthorized staff before touching data", async () => {
  for (const option of [{ authenticated: false }, { authorized: false }]) {
    const h = harness("settings", option);
    const result = await h.actions.PUT(h.request({ config: activeConfig }));
    assert.equal(result.status, option.authenticated === false ? 401 : 403);
    assert.equal(h.queries.length, 0);
    assert.equal(h.writes.length, 0);
  }
});
test("settings PUT refuses deleted/unavailable targets without writes", async () => {
  const h = harness("settings", { validCount: 0 });
  const result = await h.actions.PUT(h.request({ config: activeConfig }));
  assert.equal(result.status, 400);
  assert.equal(h.writes.length, 0);
  const counts = h.queries.find(q => Array.isArray(q) && q[0] === "count") as unknown[];
  assert.ok(counts);
  const where = (counts[1] as {where: {AND: unknown[]}}).where;
  assert.equal(where.AND.length, 2);
});
test("settings PUT saves approved config and audits once without charging", async () => {
  const h = harness("settings");
  const result = await h.actions.PUT(h.request({ config: activeConfig }));
  assert.equal(result.status, 200);
  assert.equal(h.writes.length, 1);
  assert.equal(h.audit.length, 1);
});
test("resolve only returns currently approved active project and never writes", async () => {
  const h = harness("resolve");
  assert.equal((await h.actions.POST(h.request({ destination: "zakat" }))).status, 200);
  assert.equal((await h.actions.POST(h.request({ destination: "invalid" }))).status, 422);
  assert.equal(h.writes.length, 0);
  const closed = harness("resolve", { approved: false });
  assert.equal((await closed.actions.POST(closed.request({ destination: "zakat" }))).status, 422);
  const missing = harness("resolve", { stored: null });
  assert.equal((await missing.actions.POST(missing.request({ destination: "zakat" }))).status, 422);
});

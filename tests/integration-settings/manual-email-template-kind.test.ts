import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const cjsRequire = createRequire(`${process.cwd()}/package.json`);

function load(path: string, dependencies: Record<string, unknown>): any {
  const module = { exports: {} as Record<string, unknown> };
  const js = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(js, {
    module,
    exports: module.exports,
    console,
    process,
    require: (name: string) => {
      if (name in dependencies) return dependencies[name];
      if (!name.startsWith("@/") && !name.startsWith(".")) return cjsRequire(name);
      throw new Error(`Unexpected import ${name} in ${path}`);
    },
  });
  return module.exports;
}

async function invokeSend(template: Record<string, unknown>, linkedToEvent: boolean) {
  let recipientsResolved = 0;
  let providerCalls = 0;
  const prisma = {
    emailTemplate: { findUnique: async () => template },
    messageTrigger: {
      findMany: async () => linkedToEvent ? [{ templateId: template.id }] : [],
    },
  };
  const kind = load("lib/communication/template-kind.ts", {});
  const classifier = load("lib/communication/template-event-classification.ts", {
    "@/lib/prisma": { prisma },
    "./template-kind": kind,
  });
  const route = load("app/api/templates/email/send/route.ts", {
    "next/server": {
      NextResponse: {
        json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }),
      },
    },
    "next-auth": { getServerSession: async () => ({ user: { role: "ADMIN" } }) },
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/dashboard/api-auth": { requireAdminOrDashboardPermission: () => null },
    "@/lib/prisma": { prisma },
    "@/lib/audit-log": { auditActorFromDashboardSession: () => ({}), writeAuditLog: async () => {} },
    "@/lib/users/donor-filter": { resolveDonorIds: async () => { recipientsResolved++; return []; } },
    "@/lib/templates/variables": { loadContextsForUserIds: async () => new Map() },
    "@/lib/templates/sample-context": { SAMPLE_TEMPLATE_CONTEXT: { update: {} } },
    "@/lib/templates/render": { renderEmailHtml: async () => "", renderEmailSubject: () => "" },
    "@/lib/templates/locale-resolver": { pickLocale: () => "ar", resolveEmailVariant: () => ({}) },
    "@/lib/messaging/log-sent": { logSentMessage: async () => {} },
    "@/lib/communication/runtime-config": { getActiveElasticEmailRuntimeConfig: async () => ({}) },
    "@/lib/communication/system-email": { sendArchivedEmail: async () => { providerCalls++; return { ok: true }; } },
    "@/lib/communication/template-event-classification": classifier,
  });

  const response = await route.POST({
    json: async () => ({
      templateId: String(template.id),
      target: { kind: "filtered", filters: {} },
    }),
  });
  return { response, recipientsResolved, providerCalls };
}

test("manual email sender rejects automatic and event-linked templates before resolving recipients", async () => {
  const automatic = await invokeSend({ id: "system", kind: "SYSTEM", purpose: "TRANSACTIONAL" }, false);
  assert.equal(automatic.response.status, 409);
  assert.equal((await automatic.response.json()).error, "TEMPLATE_KIND_MISMATCH");
  assert.equal(automatic.recipientsResolved, 0);
  assert.equal(automatic.providerCalls, 0);

  const legacyAutomatic = await invokeSend({ id: "legacy", kind: "CAMPAIGN", purpose: "MARKETING" }, true);
  assert.equal(legacyAutomatic.response.status, 409);
  assert.equal(legacyAutomatic.recipientsResolved, 0);
  assert.equal(legacyAutomatic.providerCalls, 0);
});

test("manual email sender accepts only an unbound marketing campaign template", async () => {
  const marketing = await invokeSend({ id: "campaign", kind: "CAMPAIGN", purpose: "MARKETING" }, false);
  assert.equal(marketing.response.status, 200);
  const body = await marketing.response.json();
  assert.equal(body.sent, 0);
  assert.equal(body.skipped, 0);
  assert.equal(body.total, 0);
  assert.equal(body.failed.length, 0);
  assert.equal(marketing.recipientsResolved, 1);
  assert.equal(marketing.providerCalls, 0);
});

import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { COMMUNICATION_CHANNELS, ACTIVE_COMMUNICATION_PROVIDERS, isCommunicationChannel, isActiveSenderProvider, isCommunicationProvider } from "../../lib/communication/communication-runtime-types";
import { INTEGRATION_PROVIDERS, isIntegrationProvider } from "../../lib/integration-settings/catalog";
import { sendSmsMessage, isSmsConfigured } from "../../lib/communication/providers/sms/client";
import { sendBrevoSms, isBrevoSmsConfigured } from "../../lib/communication/providers/brevo/sms-client";
import { sendNetgsmSms, isNetgsmConfigured } from "../../lib/communication/providers/netgsm/client";
import { BrevoConnectionTester, NetgsmConnectionTester } from "../../lib/integration-settings/provider-testing";

test("SMS cannot be selected as an active channel or provider; email and WhatsApp remain", () => {
  assert.deepEqual(COMMUNICATION_CHANNELS, ["WHATSAPP", "EMAIL"]);
  assert.deepEqual(ACTIVE_COMMUNICATION_PROVIDERS, ["META_WHATSAPP", "ELASTIC_EMAIL"]);
  assert.deepEqual(INTEGRATION_PROVIDERS, ["META_WHATSAPP", "ELASTIC_EMAIL", "SYSTEM"]);
  assert.equal(isCommunicationChannel("SMS"), false);
  for (const p of ["BREVO_SMS", "NETGSM_SMS"]) {
    assert.equal(isActiveSenderProvider("SMS", p), false);
    assert.equal(isCommunicationProvider(p), true); // historical delivery rows remain readable
  }
  for (const p of ["BREVO", "NETGSM"]) assert.equal(isIntegrationProvider(p), false);
  assert.equal(isActiveSenderProvider("EMAIL", "ELASTIC_EMAIL"), true);
  assert.equal(isActiveSenderProvider("WHATSAPP", "META_WHATSAPP"), true);
});

test("all legacy transports refuse SMS even with configured runtime and make zero requests", async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("network must never be used"); };
  const ready = { configured: true, enabled: true, values: { apiKey: "fixture", sender: "fixture", usercode: "fixture", password: "fixture", header: "fixture" }, sources: {}, databaseAvailable: true, reason: null } as const;
  try {
    for (const to of ["+905551112233", "+201001112233"]) {
      const results = await Promise.all([
        sendSmsMessage({ to, content: "fixture" }, { brevoSms: ready, netgsm: ready } as never),
        sendBrevoSms({ to, content: "fixture" }, ready),
        sendNetgsmSms({ to, content: "fixture" }, "TR", ready),
      ]);
      for (const result of results) { assert.equal(result.ok, false); if (!result.ok) assert.equal(result.reason, "CHANNEL_REMOVED"); }
    }
    assert.equal(await isSmsConfigured(), false);
    assert.equal(await isBrevoSmsConfigured(ready), false);
    assert.equal(await isNetgsmConfigured(ready), false);
    for (const [provider, tester] of [["BREVO", new BrevoConnectionTester()], ["NETGSM", new NetgsmConnectionTester()]] as const) {
      const result = await tester.test({ provider, candidateVersion: null, values: {} });
      assert.equal(result.success, false); assert.equal(result.failureCode, "CHANNEL_REMOVED");
    }
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test("SMS routes and navigation are removed, old campaigns and triggers are blocked", () => {
  for (const path of ["app/api/dashboard/communication/sms/route.ts", "app/api/templates/sms/route.ts", "app/api/webhooks/brevo/transactional/route.ts", "app/(dashboard)/dashboard/communication/sms/page.tsx"]) assert.equal(existsSync(path), false, path);
  assert.equal(readFileSync("lib/dashboard/nav-config.ts", "utf8").includes("/dashboard/communication/sms"), false);
  assert.match(readFileSync("lib/communication/campaign-send-executor.ts", "utf8"), /campaign.channel === "SMS".*CHANNEL_REMOVED/);
  assert.match(readFileSync("lib/communication/provider-router.ts", "utf8"), /input.channel === "SMS".*CHANNEL_REMOVED/);
  assert.equal(readFileSync("lib/events/dispatch.ts", "utf8").includes("sendAutomaticSmsMessage"), false);
  const executor = readFileSync("lib/communication/campaign-send-executor.ts", "utf8");
  assert.equal((executor.match(/where: \{ channel: \{ in: \["EMAIL", "WHATSAPP"\] \}, status: "S(?:CHEDULED|ENDING)"/g) ?? []).length, 2);
});

// Execute the real router with all runtime resolution forbidden: retired sends must exit first.
test("central router refuses legacy SMS before credentials or database access", async () => {
  let runtimeReads = 0;
  const loaded = { exports: {} as Record<string, (...args: any[]) => any> };
  const source = readFileSync("lib/communication/provider-router.ts", "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new vm.Script(output).runInNewContext({ module: loaded, exports: loaded.exports, require(id: string) {
    if (id === "./runtime-config") return { getActiveCommunicationRuntimeBundle() { runtimeReads++; throw new Error("must not resolve credentials"); } };
    if (id.endsWith("/errors")) return { META_REASONS: { NOT_CONFIGURED: "META_NOT_CONFIGURED" } };
    if (id.endsWith("/email/client")) return { EMAIL_REASONS: {}, EMAIL_PROVIDER_ID: "ELASTIC_EMAIL" };
    throw new Error(`Unexpected dependency: ${id}`);
  }});
  assert.equal((await loaded.exports.sendPreparedDelivery({ channel: "SMS", to: "+905551112233", html: "fixture" })).reason, "CHANNEL_REMOVED");
  assert.equal((await loaded.exports.resolveProviderForSend("SMS")).reason, "CHANNEL_REMOVED");
  assert.equal(await loaded.exports.isSendEnabled("SMS"), false);
  assert.equal(runtimeReads, 0);
  const runtime = { elasticEmail: { configured: true, values: { senderEmail: "fixture@example.org" } }, meta: { configured: true, values: { defaultPhoneNumberId: "fixture" } } };
  assert.equal(loaded.exports.resolveProviderForSendWithRuntime(runtime, "EMAIL").providerId, "ELASTIC_EMAIL");
  assert.equal(loaded.exports.resolveProviderForSendWithRuntime(runtime, "WHATSAPP").providerId, "META_WHATSAPP");
});

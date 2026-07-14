import test from "node:test";
import assert from "node:assert/strict";
import {
  BrevoConnectionTester,
  MetaWhatsAppConnectionTester,
  NetgsmConnectionTester,
  SystemCronConnectionTester,
} from "../../lib/integration-settings/provider-testing";
import type { ProviderFetch } from "../../lib/integration-settings/provider-testing/http";

function response(status: number, body: unknown): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": typeof body === "string" ? "text/plain" : "application/json" },
  });
}

test("Meta tester validates WABA and phone relationship without sending a message", async () => {
  const calls: string[] = [];
  const fakeFetch: ProviderFetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/123/phone_numbers")) return response(200, { data: [{ id: "456" }] });
    if (url.includes("/456?")) return response(200, { id: "456", verified_name: "Gozbebekleri" });
    return response(200, { id: "123", name: "Gozbebekleri" });
  };
  const result = await new MetaWhatsAppConnectionTester(fakeFetch).test({
    provider: "META_WHATSAPP",
    candidateVersion: "candidate",
    values: { ACCESS_TOKEN: "token", GRAPH_API_VERSION: "v23.0", BUSINESS_ACCOUNT_ID: "123", DEFAULT_PHONE_NUMBER_ID: "456" },
  });
  assert.equal(result.success, true);
  assert.equal(calls.length, 3);
  assert.equal(calls.some((url) => url.endsWith("/messages")), false);
});

test("Meta tester rejects a phone number outside the configured business account", async () => {
  const fakeFetch: ProviderFetch = async (input) => String(input).includes("phone_numbers")
    ? response(200, { data: [{ id: "999" }] })
    : response(200, { id: "123" });
  const result = await new MetaWhatsAppConnectionTester(fakeFetch).test({
    provider: "META_WHATSAPP",
    candidateVersion: null,
    values: { ACCESS_TOKEN: "token", GRAPH_API_VERSION: "v23.0", BUSINESS_ACCOUNT_ID: "123", DEFAULT_PHONE_NUMBER_ID: "456" },
  });
  assert.equal(result.success, false);
  assert.equal(result.failureCode, "META_PHONE_NUMBER_MISMATCH");
});

test("Brevo tester validates account and verified email sender without sending", async () => {
  const calls: string[] = [];
  const fakeFetch: ProviderFetch = async (input) => {
    const url = String(input);
    calls.push(url);
    return url.endsWith("/senders")
      ? response(200, { senders: [{ email: "verified@example.org", active: true }] })
      : response(200, { email: "account@example.org" });
  };
  const result = await new BrevoConnectionTester(fakeFetch).test({
    provider: "BREVO",
    candidateVersion: null,
    values: { API_KEY: "key", EMAIL_SENDER_EMAIL: "verified@example.org", SMS_SENDER: "GOZBEBEK" },
  });
  assert.equal(result.success, true);
  assert.deepEqual(calls, ["https://api.brevo.com/v3/account", "https://api.brevo.com/v3/senders"]);
});

test("Brevo tester records provider authentication failure safely", async () => {
  const fakeFetch: ProviderFetch = async () => response(401, { code: "unauthorized" });
  const result = await new BrevoConnectionTester(fakeFetch).test({
    provider: "BREVO",
    candidateVersion: null,
    values: { API_KEY: "secret-api-key", EMAIL_SENDER_EMAIL: "verified@example.org", SMS_SENDER: "GOZBEBEK" },
  });
  assert.equal(result.success, false);
  assert.equal(result.failureCode, "BREVO_UNAUTHORIZED");
  assert.equal(JSON.stringify(result).includes("secret-api-key"), false);
});

test("Netgsm tester checks account and header without sending SMS", async () => {
  const calls: string[] = [];
  const fakeFetch: ProviderFetch = async (input) => {
    const url = String(input);
    calls.push(url);
    return url.includes("/header") ? response(200, { headers: ["GOZBEBEK"] }) : response(200, "100.00");
  };
  const result = await new NetgsmConnectionTester(fakeFetch).test({
    provider: "NETGSM",
    candidateVersion: null,
    values: { USERCODE: "user", PASSWORD: "password", HEADER: "GOZBEBEK" },
  });
  assert.equal(result.success, true);
  assert.equal(calls.some((url) => url.includes("/send")), false);
});

test("System Cron tester validates the decrypted candidate locally", async () => {
  const tester = new SystemCronConnectionTester();
  const success = await tester.test({ provider: "SYSTEM", candidateVersion: null, values: { CRON_SECRET: "secure-cron-secret-that-is-at-least-thirty-two-characters" } });
  const failed = await tester.test({ provider: "SYSTEM", candidateVersion: null, values: { CRON_SECRET: "weak" } });
  assert.equal(success.success, true);
  assert.equal(failed.success, false);
  assert.equal(JSON.stringify(success).includes("secure-cron-secret"), false);
});

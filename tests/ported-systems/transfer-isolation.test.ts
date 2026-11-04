// Offline fixtures only: identifiers and credentials are synthetic; provider transports are stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { publicDonationUrl } from "../../lib/communication/campaign-public-url";
import { SYSTEM_ORIGIN, SYSTEM_BRAND_NAME } from "../../lib/ported-systems/brand";
import { accessDecision, isSecurityExemptPath } from "../../lib/site-security/policy";
import { userHasDashboardPermission } from "../../lib/dashboard/permissions";
import { resolveDonationSourceSignals } from "../../lib/attribution/source-signals";
import { isMeasurementHost } from "../../lib/tracking/engagement-policy";
import { clarityProjectId, clarityUserRecordingsUrl } from "../../lib/tracking/clarity-config";
import { resolveReceiptOrg } from "../../lib/certificates/copy-defaults";
import { SYSTEM_ORG } from "../../lib/ported-systems/brand";

test("recording links require this institution's configured tracking project", () => {
  assert.equal(clarityProjectId(""), "");
  assert.equal(clarityUserRecordingsUrl("fixture-user", ""), "/dashboard/platform-connections/tracking");
  assert.ok(clarityUserRecordingsUrl("fixture-user", "fixtureproject").includes("/fixtureproject/"));
});

test("measurement and referral exclusion use the destination institution's host", () => {
  const host = new URL(SYSTEM_ORIGIN).hostname;
  assert.equal(isMeasurementHost(host, "production", host), true);
  assert.equal(isMeasurementHost("source-institution.example", "production", host), false);
  assert.equal(resolveDonationSourceSignals({ referrer: SYSTEM_ORIGIN + "/ar/campaign/example" }).referrer, null);
  assert.equal(resolveDonationSourceSignals({ referrer: "https://outside.example/path" }).referrer, "outside.example");
});

test("campaign links stay on this institution's domain and exclude credential-bearing links", () => {
  const local = new URL("/ar/campaign/example", SYSTEM_ORIGIN);
  assert.equal(publicDonationUrl(local.href)?.hostname, local.hostname);
  assert.equal(publicDonationUrl("https://source-institution.example/ar/campaign/example"), null);
  assert.equal(publicDonationUrl("https://unrelated.example/ar/campaign/example"), null);
  for (const path of ["/api/receipts/example?t=secret", "/ar/receipt/example", "/ar/campaign/example?token=secret", "/dashboard"]) {
    assert.equal(publicDonationUrl(new URL(path,SYSTEM_ORIGIN).href), null);
  }
  assert.ok(SYSTEM_BRAND_NAME.length > 0);
});

test("access exceptions protect operator recovery and authenticated provider callbacks", () => {
  for(const path of ["/dashboard/security","/api/auth/session","/api/webhooks/meta/whatsapp","/api/cron/communication-run-due"]) {
    assert.equal(isSecurityExemptPath(path),true,path);
  }
  assert.equal(isSecurityExemptPath("/ar/campaign/example"),false);
  const rules = [
    {id:"country",kind:"COUNTRY" as const,value:"TR",action:"BLOCK" as const,enabled:true,reason:"fixture",updatedAt:""},
    {id:"exception",kind:"IP" as const,value:"203.0.113.25",action:"ALLOW" as const,enabled:true,reason:"fixture",updatedAt:""},
  ];
  assert.equal(accessDecision(rules,"203.0.113.25","TR").blocked,false);
  assert.equal(accessDecision(rules,"203.0.113.26","TR").blocked,true);
});

test("communication grants do not implicitly grant team or integration administration", () => {
  const staff = {role:"STAFF",dashboardPermissions:["messages"]};
  assert.equal(userHasDashboardPermission(staff,"messages"),true);
  assert.equal(userHasDashboardPermission(staff,"team"),false);
  assert.equal(userHasDashboardPermission(staff,"platformConnectionsAdmin"),false);
  assert.equal(userHasDashboardPermission({role:"DONOR",dashboardPermissions:["team"]},"team"),false);
});

test("receipt defaults carry no source-institution registration or signature", () => {
  assert.deepEqual(resolveReceiptOrg(), SYSTEM_ORG);
  for(const file of ["ThanksCertificate.tsx","ThanksCertificatePortrait.tsx","ReceiptSheet.tsx","WaqfCertificateSheet.tsx"]) {
    const component=fs.readFileSync("components/minbar/certificates/"+file,"utf8");
    assert.equal(component.includes('asset("waqf-director-stamp.png")'),false);
    assert.equal(component.includes('asset("cert-seal-alpha.png")'),false);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("automatic email keeps Elastic Email, suppression, unsubscribe and provider-truth delivery semantics", () => {
  const dispatcher = read("lib/communication/automatic-message-dispatcher.ts");
  const email = read("lib/communication/providers/email/client.ts");
  const delivery = read("lib/communication/delivery-log-service.ts");
  const sync = read("app/api/cron/communication-sync-email-events/route.ts");

  assert.match(dispatcher, /EMAIL_PROVIDER_ID/);
  assert.match(dispatcher, /createDeliveryRecord/);
  assert.match(dispatcher, /sendPreparedDelivery/);
  assert.match(dispatcher, /automaticConsentBlock/);
  assert.match(dispatcher, /DO_NOT_CONTACT/);
  assert.match(dispatcher, /EMAIL_MARKETING_OPT_IN_REQUIRED/);
  assert.match(email, /emailSuppressionDecision/);
  assert.match(email, /appendMarketingUnsubscribeFooter/);
  assert.match(email, /List-Unsubscribe/);
  assert.match(delivery, /Cannot mark \$\{status\} without provider acceptance/);
  assert.match(sync, /syncElasticEmailEvents/);
});

test("email campaigns retain context, deduplication and resumability", () => {
  const executor = read("lib/communication/campaign-send-executor.ts");
  for (const pattern of [/loadContextsForUserIds/, /DUPLICATE_RECIPIENT_CONTACT/, /sendPreparedDelivery/, /sendProgress/, /sendLease/]) assert.match(executor, pattern);
  assert.match(read("lib/communication/template-compat.ts"), /renderEmailHtml/);
});

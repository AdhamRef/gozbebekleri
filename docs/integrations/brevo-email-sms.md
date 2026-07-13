# Brevo — Email + SMS Integration

Brevo is the **primary email** provider and the **international (non-Turkish) SMS** provider.
Server-only: `BREVO_API_KEY` is read inside the adapters and is never returned to the frontend.

## Required env vars
| Var | Purpose | Required |
|---|---|---|
| `BREVO_API_KEY` | Brevo API key (email + SMS) | ✅ |
| `BREVO_EMAIL_SENDER_EMAIL` | verified sender email | ✅ (email) |
| `BREVO_EMAIL_SENDER_NAME` | sender display name | optional |
| `BREVO_SMS_SENDER` | SMS sender name/number | ✅ (SMS) |
| `BREVO_SMS_DEFAULT_TYPE` | `transactional` \| `marketing` | optional (default transactional) |
| `BREVO_SMS_WEBHOOK_SECRET` | shared `?token=` secret for the webhook | optional |

Readiness: `getBrevoEmailConfig()` / `getBrevoSmsConfig()` in `lib/communication/provider-env.ts`.

## Send email flow
`lib/communication/providers/brevo/email-client.ts` → `sendBrevoEmail()`
- `POST https://api.brevo.com/v3/smtp/email`, header `api-key`.
- Body: `sender {name,email}`, `to [{email,name}]`, `subject`, `htmlContent`, `textContent`,
  optional `templateId`, `params`.
- Success (2xx): returns Brevo `messageId` → stored as `CommunicationDelivery.providerMessageId`.
  A 2xx with no id → `internalAccepted` (real acceptance, no fake id).

## Send SMS flow
`lib/communication/providers/brevo/sms-client.ts` → `sendBrevoSms()`
- `POST https://api.brevo.com/v3/transactionalSMS/sms`, header `api-key`.
- Body: `sender`, `recipient`, `content`, `type`, `unicodeEnabled:true` (Arabic/Turkish), `tag`, `webUrl?`.
- Success: `messageId`/`reference` → `providerMessageId`. Only non-Turkish numbers route here.

## Response → status mapping
- Email reasons: `BREVO_EMAIL_NOT_CONFIGURED`, `BREVO_EMAIL_SENDER_NOT_CONFIGURED`,
  `BREVO_EMAIL_REQUEST_FAILED`, `BREVO_EMAIL_UNAUTHORIZED`.
- SMS reasons: `BREVO_SMS_NOT_CONFIGURED`, `BREVO_SMS_REQUEST_FAILED`, `BREVO_SMS_UNAUTHORIZED`.
- Errors are scrubbed (`scrubBrevo`) — the API key never appears in logs.

## Webhook plan
`/api/webhooks/brevo/transactional` (implemented, conservative):
- Brevo does not sign transactional webhooks → optional `?token=` = `BREVO_SMS_WEBHOOK_SECRET`.
- Matches an already-accepted delivery by `message-id` and **advances** it:
  email `delivered/opened/click/hardBounce/…` → DELIVERED/OPENED/CLICKED/FAILED;
  SMS `delivered/sent/rejected/…` → DELIVERED/SENT/FAILED.
- Always returns 200 (no retry storms); never creates or fakes a SENT.

## Live QA checklist (needs real key)
- [ ] Email test (Settings → اختبار إيميل) returns SENT with a Brevo messageId.
- [ ] SMS test to a **non-Turkish** number selects Brevo, returns SENT with a messageId.
- [ ] Arabic content arrives intact (unicodeEnabled).
- [ ] Missing `BREVO_API_KEY` → SKIPPED `BREVO_*_NOT_CONFIGURED` (never SENT).
- [ ] Webhook (if enabled) advances a delivery to DELIVERED/OPENED.

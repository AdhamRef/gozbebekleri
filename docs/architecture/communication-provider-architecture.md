# Communication Provider Architecture (Final)

Status: **finalized backend routing.** Live provider sends require real credentials (see live-QA notes).

## Final provider matrix

| Channel | Scope | Active provider | Legacy / disabled |
|---|---|---|---|
| WhatsApp | all | **Meta WhatsApp Cloud API** (`META_WHATSAPP`) | Twilio (never used) |
| Email | all | **Brevo Email** (`BREVO_EMAIL`) | SendGrid (`SENDGRID`) — legacy, flag-gated fallback only |
| SMS | international (non-TR) | **Brevo SMS** (`BREVO_SMS`) | Twilio (never used) |
| SMS | Turkey (+90 / `TR`) | **Netgsm SMS** (`NETGSM_SMS`) | Twilio (never used) |

Twilio = **LEGACY_DISABLED** — not used by any active send path, no silent fallback.
SendGrid = **LEGACY_DISABLED as primary** — only runs if `EMAIL_LEGACY_SENDGRID_FALLBACK=true` **and**
Brevo is not configured.

## Single source of truth
- `lib/communication/provider-registry.ts` → `PROVIDER_REGISTRY`, `activeProviders()`, `legacyProviders()`,
  `providerByKey()`, `isProviderActive()`, `OFFICIAL_PROVIDER_MATRIX`.
- `lib/communication/provider-env.ts` → per-provider `{ configured, missing[], safeLabel }` (no secrets).
- `lib/communication/provider-router.ts` → `resolveProviderForSend()`, `sendPreparedDelivery()`,
  `isSendEnabled()` implement the routing above.

## Routing rules (ProviderRouter)
- **WhatsApp**: `META_WHATSAPP` only. Missing config → `META_WHATSAPP_NOT_CONFIGURED`; missing sender
  number → `META_WHATSAPP_SENDER_MISSING_PHONE_NUMBER_ID`. Success → `providerMessageId` = wamid.
- **Email**: `BREVO_EMAIL`. Missing config → `BREVO_EMAIL_NOT_CONFIGURED`; missing sender →
  `BREVO_EMAIL_SENDER_NOT_CONFIGURED`; API failure → `BREVO_EMAIL_REQUEST_FAILED`. Success →
  `providerMessageId` = Brevo messageId (or `internalAccepted` on a 2xx with no id).
- **SMS**: normalize recipient; `+90`/`0090`/`90…`(12 digits)/`countryCode=TR` → **Netgsm**, else **Brevo**.
  - Netgsm: `NETGSM_NOT_CONFIGURED` / `NETGSM_REQUEST_FAILED` / `NETGSM_REJECTED`. Success → jobid or accept.
  - Brevo SMS: `BREVO_SMS_NOT_CONFIGURED` / `BREVO_SMS_REQUEST_FAILED`. Success → messageId.
- **No fallback**: if the routed provider fails, we fail safely with the reason — never Twilio, never a
  silent cross-provider retry.

## Safety invariants (unchanged)
- Delivery record created **before** any provider call.
- A delivery becomes a provider-success status (SENT/…) only with a real `providerMessageId` **or**
  `internalAccepted` (genuine provider acceptance) — never a fake SENT.
- Missing config → SKIPPED with the exact reason; provider error → FAILED.
- Campaigns still require approval; test/bulk require `confirm:true`. Payments/tracking untouched.

## Return shape
`sendPreparedDelivery` → `{ ok, provider, providerMessageId?, internalAccepted?, reason?, detail? }`.

/**
 * RELEASE GATE: These request APIs are not active until institution-owned
 * dashboard, donor profile, notification and provider workflows pass QA.
 * This constant intentionally cannot be toggled by a production env variable
 * or by editing a database row. No recurring payment status is changed here.
 */
export const SUBSCRIPTION_REQUESTS_RELEASED: boolean = false;
export const SUBSCRIPTION_REQUEST_KINDS = ["AMOUNT_CHANGE", "PAUSE", "CANCEL"] as const;
export function subscriptionRequestsOpen(): boolean {
  return SUBSCRIPTION_REQUESTS_RELEASED;
}

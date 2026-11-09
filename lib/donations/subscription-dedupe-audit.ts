/**
 * Evidence-only categorization for repeated subscription records.
 * NEVER delete rows or subtract campaign revenue based on a heuristic.
 * Stripe invoice/payment ID is the final money authority.
 */
export type SubscriptionAuditRow = {
  id: string;
  subscriptionId: string | null;
  providerOrderId: string | null;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  billingReason?: string | null;
};

export type DuplicateFinding = {
  category: "SAME_STRIPE_INVOICE" | "POSSIBLE_SIGNUP_SHADOW";
  subscriptionId: string;
  rowIds: string[];
  evidence: string;
};

export function auditSubscriptionDuplicates(rows: readonly SubscriptionAuditRow[]): DuplicateFinding[] {
  const findings: DuplicateFinding[] = [];
  const byInvoice = new Map<string, SubscriptionAuditRow[]>();
  const bySub = new Map<string, SubscriptionAuditRow[]>();

  for (const row of rows) {
    if (!row.subscriptionId) continue;
    const group = bySub.get(row.subscriptionId) ?? [];
    group.push(row);
    bySub.set(row.subscriptionId, group);

    // Only a real invoice ID is a comparable settled-charge identity.
    // cs_, sub_ and pi_ references are not interchangeable with in_.
    if (!row.providerOrderId?.startsWith("in_")) continue;
    const key = row.subscriptionId + "|" + row.providerOrderId;
    const invoiceGroup = byInvoice.get(key) ?? [];
    invoiceGroup.push(row);
    byInvoice.set(key, invoiceGroup);
  }

  for (const [key, group] of byInvoice) {
    if (group.length < 2) continue;
    findings.push({
      category: "SAME_STRIPE_INVOICE",
      subscriptionId: group[0].subscriptionId!,
      rowIds: group.map((r) => r.id),
      evidence: "Multiple local rows reference one Stripe invoice: " + key.split("|")[1],
    });
  }

  for (const [subscriptionId, group] of bySub) {
    const firstSettlements = group.filter(
      (r) => r.status === "PAID" && r.paidAt && r.billingReason === "subscription_create",
    );
    const pending = group.filter((r) => r.status === "PAID" && !r.paidAt);
    for (const settled of firstSettlements) {
      for (const shadow of pending) {
        // A shadow near a first invoice may indicate duplicate checkout writes,
        // but it is NOT proof. Do not delete or hide without reconciliation.
        const delta = Math.abs(settled.paidAt!.getTime() - shadow.createdAt.getTime());
        if (delta > 48 * 60 * 60 * 1000) continue;
        findings.push({
          category: "POSSIBLE_SIGNUP_SHADOW",
          subscriptionId,
          rowIds: [settled.id, shadow.id],
          evidence: "A settled signup invoice and an unsettled checkout row are within 48h; verify both against Stripe metadata",
        });
      }
    }
  }
  return findings;
}

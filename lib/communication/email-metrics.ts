/** Missing delivery timestamps remain unknown; opens/clicks never fabricate delivery events. */
export function emailMetrics(rows: { status: string; sentAt?: Date | string | null }[], delivered: number, opened: number, clicked: number) {
  const acceptedStatuses = new Set(["SENT", "SENT_TO_PROVIDER", "DELIVERED", "OPENED", "CLICKED", "BOUNCED", "UNSUBSCRIBED"]);
  let accepted = 0, attempted = 0, failed = 0;
  for (const row of rows) {
    const wasAccepted = Boolean(row.sentAt) || acceptedStatuses.has(row.status);
    const didFail = row.status === "FAILED" || row.status === "BOUNCED";
    if (wasAccepted) accepted++;
    if (didFail) failed++;
    if (wasAccepted || didFail) attempted++;
  }
  const rate = (count: number) => accepted > 0 ? Math.round(count / accepted * 1000) / 10 : 0;
  return {
    accepted, attempted, deliveryTrackingAvailable: delivered > 0,
    deliveredRate: delivered > 0 ? rate(delivered) : null,
    openRate: rate(opened), clickRate: rate(clicked),
    failedRate: attempted > 0 ? Math.round(failed / attempted * 1000) / 10 : 0,
  };
}

/** A recovered event must not replay a channel whose attempt is already archived. */
export function archivedTriggerAttempt(
  rows: ReadonlyArray<{ status: string | null; providerMessageId: string | null; variables: unknown }>,
  event: string,
  donationId: string,
): "ALREADY_ATTEMPTED" | null {
  return rows.some((row) => {
    const trigger = (row.variables as { trigger?: { event?: string; donationId?: string } } | null)?.trigger;
    return trigger?.event === event && trigger.donationId === donationId;
  }) ? "ALREADY_ATTEMPTED" : null;
}

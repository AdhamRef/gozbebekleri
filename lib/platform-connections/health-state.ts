export type HealthState = "VERIFIED" | "CONFIGURED" | "NEEDS_SETUP" | "FAILED" | "DISABLED";

/** Saved configuration and provider test evidence are distinct facts. */
export function providerState(snapshot: {
  enabled: boolean;
  status: string;
  activeTest: { lastTestResult?: string | null };
}): HealthState {
  if (!snapshot.enabled) return "DISABLED";
  if (snapshot.activeTest.lastTestResult === "FAILED") return "FAILED";
  if (snapshot.status !== "READY") return "NEEDS_SETUP";
  if (snapshot.activeTest.lastTestResult === "SUCCESS") return "VERIFIED";
  return "CONFIGURED";
}

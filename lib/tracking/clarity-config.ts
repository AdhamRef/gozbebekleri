/** Tracking belongs to the destination institution and is disabled until configured. */
export const DEFAULT_CLARITY_PROJECT_ID = "";

export function clarityProjectId(configured = process.env.NEXT_PUBLIC_CLARITY_ID): string {
  const id = configured?.trim() || "";
  return /^[a-z0-9]+$/i.test(id) ? id : "";
}

export function clarityUserRecordingsUrl(userId: string, configured = process.env.NEXT_PUBLIC_CLARITY_ID): string {
  const project = clarityProjectId(configured);
  if (!project) return "/dashboard/platform-connections/tracking";
  return `https://clarity.microsoft.com/projects/view/${encodeURIComponent(project)}/impressions?CustomFilter=User-id%3DIs%3D${encodeURIComponent(userId)}`;
}

/* Ported from Minber (#301/#302 era): operator-entered Clarity IDs. Gozbebekleri keeps no default project ID:
   tracking belongs to the charity and stays off until its own ID is configured. */

/** Operator-supplied IDs are data, never code or remote script URLs. */
export function normalizeClarityProjectId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toLowerCase();
  return /^[a-z0-9]{6,32}$/.test(id) ? id : null;
}

export type ClarityConnection = {
  clarityProjectId: string | null;
  clarityEnabled: boolean;
  claritySource: "saved" | "legacy" | "disabled";
};

/** A saved ID wins; otherwise NEXT_PUBLIC_CLARITY_ID; explicit false always disables. */
export function resolveClarityConnection(
  stored: Record<string, unknown> | null,
  legacy = process.env.NEXT_PUBLIC_CLARITY_ID,
): ClarityConnection {
  const saved = normalizeClarityProjectId(stored?.clarityProjectId);
  const fallback = normalizeClarityProjectId(legacy) || normalizeClarityProjectId(DEFAULT_CLARITY_PROJECT_ID);
  const id = saved || fallback || null;
  const enabled = stored?.clarityEnabled !== false;
  return { clarityProjectId: id, clarityEnabled: enabled, claritySource: !enabled ? "disabled" : saved ? "saved" : "legacy" };
}

export function clarityProjectDashboardUrl(value: unknown): string | null {
  const id = normalizeClarityProjectId(value);
  return id ? `https://clarity.microsoft.com/projects/view/${encodeURIComponent(id)}/impressions` : null;
}

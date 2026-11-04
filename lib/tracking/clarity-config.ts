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

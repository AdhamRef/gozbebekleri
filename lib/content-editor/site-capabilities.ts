// This integration exists only on Qurrat Al-Ayoun; its settlement rows are not ordinary campaigns.
export const HAS_IMPACT_BACKING_CAMPAIGNS = true;
export const HAS_CATEGORY_PAGE_LIBRARY = false;
export function campaignWorkspaceWhere(): Record<string, unknown> {
  return {
    AND: [
      {
        OR: [
          { isDeleted: false },
          { isDeleted: null },
          { isDeleted: { isSet: false } },
        ],
      },
      ...(HAS_IMPACT_BACKING_CAMPAIGNS
        ? [{ impactCampaign: { is: null } }]
        : []),
    ],
  };
}

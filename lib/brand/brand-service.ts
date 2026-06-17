import { brandOrganizations } from "./brand-data";
import type { BrandCenterOverview } from "./brand-types";

export function getBrandCenterOverview(): BrandCenterOverview {
  return {
    source: "brand-center-foundation",
    generatedAt: new Date().toISOString(),
    summary: {
      organizations: brandOrganizations.length,
      colors: brandOrganizations.reduce((total, organization) => total + organization.colors.length, 0),
      rules: brandOrganizations.reduce((total, organization) => total + organization.usageRules.length, 0),
    },
    organizations: brandOrganizations,
  };
}

export type BrandOrganizationKey = "minber_aksa" | "gozbebekleri" | "burak";

export type BrandOrganizationProfile = {
  key: BrandOrganizationKey;
  name: string;
  displayName: string;
  primaryLanguage: string;
  website: string;
  tone: string;
  colors: {
    name: string;
    value: string;
  }[];
  usageRules: string[];
  contactLines: string[];
};

export type BrandCenterOverview = {
  source: string;
  generatedAt: string;
  summary: {
    organizations: number;
    colors: number;
    rules: number;
  };
  organizations: BrandOrganizationProfile[];
};

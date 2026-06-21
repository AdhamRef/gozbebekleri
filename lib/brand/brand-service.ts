import {
  brandAssets,
  brandColors,
  brandFonts,
  brandGuidelines,
  brandMessageFrameworks,
  brandProfiles,
} from "./brand-data";
import type {
  BrandAiSourcePack,
  BrandCenterSnapshot,
  BrandCenterTab,
  BrandDownloadItem,
  BrandProfile,
  BrandReadinessAlert,
} from "./brand-types";

export const BRAND_CENTER_TABS: BrandCenterTab[] = [
  { key: "overview", title: "Overview", href: "/dashboard/brand" },
  { key: "organizations", title: "Organizations", href: "/dashboard/brand/organizations" },
  { key: "assets", title: "Logos & Assets", href: "/dashboard/brand/assets" },
  { key: "colors", title: "Colors", href: "/dashboard/brand/colors" },
  { key: "typography", title: "Typography", href: "/dashboard/brand/typography" },
  { key: "voice", title: "Voice & Copy Rules", href: "/dashboard/brand/voice" },
  { key: "frameworks", title: "Message Frameworks", href: "/dashboard/brand/frameworks" },
  { key: "downloads", title: "Downloads", href: "/dashboard/brand/downloads" },
];

const nextModels = [
  "BrandProfile",
  "BrandAsset",
  "BrandColor",
  "BrandFont",
  "BrandGuideline",
  "BrandMessageFramework",
];

function activeProfile(profileId?: string | null): BrandProfile {
  return brandProfiles.find((profile) => profile.id === profileId) ?? brandProfiles.find((profile) => profile.isActive) ?? brandProfiles[0];
}

function scoped<T extends { profileId: string }>(items: T[], profileId: string) {
  return items.filter((item) => item.profileId === profileId);
}

function buildDownloads(profile: BrandProfile): BrandDownloadItem[] {
  const profileAssets = scoped(brandAssets, profile.id);
  return [
    {
      id: `${profile.id}_profile_download`,
      title: `${profile.name} brand profile`,
      type: "PROFILE",
      url: null,
      note: "Foundation summary is ready; export/download file is to be generated after DB-backed BrandProfile.",
      ready: false,
    },
    ...profileAssets.map((asset) => ({
      id: asset.id,
      title: asset.title,
      type: asset.type,
      url: asset.fileUrl,
      note: asset.notes,
      ready: Boolean(asset.fileUrl && asset.downloadable),
    })),
  ];
}

function buildAlerts(profile: BrandProfile): BrandReadinessAlert[] {
  const profileAssets = scoped(brandAssets, profile.id);
  const profileColors = scoped(brandColors, profile.id);
  const profileFrameworks = scoped(brandMessageFrameworks, profile.id);
  const alerts: BrandReadinessAlert[] = [];

  if (!profileAssets.some((asset) => asset.type === "LOGO" && asset.fileUrl)) {
    alerts.push({
      id: `${profile.id}_missing_logo`,
      severity: "warning",
      title: "Primary logo needs verification",
      detail: "Upload or connect the approved production logo before public downloads are enabled.",
    });
  }

  if (!profileColors.some((color) => color.usage === "CTA")) {
    alerts.push({
      id: `${profile.id}_missing_cta_color`,
      severity: "warning",
      title: "CTA color not finalized",
      detail: "A clear donation CTA color should be approved for donor-facing pages.",
    });
  }

  if (!profileFrameworks.some((framework) => framework.type === "ZAKAT")) {
    alerts.push({
      id: `${profile.id}_missing_zakat_framework`,
      severity: "info",
      title: "Zakat framework missing",
      detail: "Add a zakat message framework before AI writes or reviews zakat copy for this profile.",
    });
  }

  if (!profileFrameworks.some((framework) => framework.locale === "tr")) {
    alerts.push({
      id: `${profile.id}_missing_tr_rules`,
      severity: "info",
      title: "Turkish writing rules need expansion",
      detail: "Add Turkish-specific voice examples before translating or sending donor reactivation drafts.",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: `${profile.id}_ready`,
      severity: "success",
      title: "Brand foundation is ready",
      detail: "Core profile, colors, assets, and message frameworks are available for review workflows.",
    });
  }

  return alerts;
}

export function getBrandCenterSnapshot(profileId?: string | null): BrandCenterSnapshot {
  const profile = activeProfile(profileId);
  const assets = scoped(brandAssets, profile.id);
  const colors = scoped(brandColors, profile.id).sort((a, b) => a.order - b.order);
  const fonts = scoped(brandFonts, profile.id);
  const guidelines = scoped(brandGuidelines, profile.id).sort((a, b) => a.order - b.order);
  const messageFrameworks = scoped(brandMessageFrameworks, profile.id);
  const downloads = buildDownloads(profile);
  const alerts = buildAlerts(profile);
  const toVerify = [...brandProfiles, ...brandAssets].filter((item) => item.status === "TO_VERIFY").length;

  return {
    source: "brand-center-foundation",
    persistence: {
      mode: "foundation",
      nextModels,
    },
    generatedAt: new Date().toISOString(),
    activeProfile: profile,
    profiles: brandProfiles,
    assets,
    colors,
    fonts,
    guidelines,
    messageFrameworks,
    downloads,
    alerts,
    tabs: BRAND_CENTER_TABS,
    summary: {
      profiles: brandProfiles.length,
      activeProfileName: profile.name,
      assets: assets.length,
      downloadableAssets: downloads.filter((item) => item.ready).length,
      colors: colors.length,
      guidelines: guidelines.length,
      frameworks: messageFrameworks.length,
      toVerify,
    },
    qa: {
      brandAssetSeparatedFromArchiveAsset: true,
      aiOutputsAreDraftOnly: true,
      noAutoPublish: true,
      noFrontendSecrets: true,
    },
  };
}

export function getBrandCenterOverview() {
  return getBrandCenterSnapshot();
}

export function getBrandAiSourcePack(profileId?: string | null): BrandAiSourcePack {
  const snapshot = getBrandCenterSnapshot(profileId);
  return {
    profile: snapshot.activeProfile,
    colors: snapshot.colors,
    guidelines: snapshot.guidelines,
    frameworks: snapshot.messageFrameworks,
  };
}

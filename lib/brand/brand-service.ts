import {
  brandAssets,
  brandColors,
  brandFonts,
  brandGuidelines,
  brandMessageFrameworks,
  brandProfiles,
} from "./brand-data";
import { getBrandRepositorySnapshot, type BrandRepositorySnapshot } from "./brand-repository";
import type {
  BrandAiSourcePack,
  BrandAsset,
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

function activeProfile(profiles: BrandProfile[], profileId?: string | null): BrandProfile {
  return profiles.find((profile) => profile.id === profileId) ?? profiles.find((profile) => profile.isActive) ?? profiles[0];
}

function scoped<T extends { profileId: string }>(items: T[], profileId: string) {
  return items.filter((item) => item.profileId === profileId);
}

function buildDownloads(profile: BrandProfile, assets: BrandAsset[]): BrandDownloadItem[] {
  const profileAssets = scoped(assets, profile.id);
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

function buildAlerts(repository: BrandRepositorySnapshot, profile: BrandProfile): BrandReadinessAlert[] {
  const profileAssets = scoped(repository.assets, profile.id);
  const profileColors = scoped(repository.colors, profile.id);
  const profileFrameworks = scoped(repository.messageFrameworks, profile.id);
  const alerts: BrandReadinessAlert[] = [];

  if (repository.mode === "db-backed") {
    alerts.push({
      id: `${profile.id}_db_backed`,
      severity: "success",
      title: "Brand core is DB-backed",
      detail: repository.reason,
    });
  } else {
    alerts.push({
      id: `${profile.id}_foundation_fallback`,
      severity: "info",
      title: "Brand core is using foundation fallback",
      detail: repository.reason,
    });
  }

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

  return alerts;
}

function activeModels(repository: BrandRepositorySnapshot): string[] {
  if (repository.mode !== "db-backed") return [];
  return [
    "BrandProfile",
    ...(repository.dbCounts.assets > 0 ? ["BrandAsset"] : []),
    "BrandColor",
    ...(repository.dbCounts.fonts > 0 ? ["BrandFont"] : []),
    "BrandGuideline",
    ...(repository.dbCounts.messageFrameworks > 0 ? ["BrandMessageFramework"] : []),
  ];
}

function buildBrandCenterSnapshot(repository: BrandRepositorySnapshot, profileId?: string | null): BrandCenterSnapshot {
  const profile = activeProfile(repository.profiles, profileId);
  const assets = scoped(repository.assets, profile.id);
  const colors = scoped(repository.colors, profile.id).sort((a, b) => a.order - b.order);
  const fonts = scoped(repository.fonts, profile.id);
  const guidelines = scoped(repository.guidelines, profile.id).sort((a, b) => a.order - b.order);
  const messageFrameworks = scoped(repository.messageFrameworks, profile.id);
  const downloads = buildDownloads(profile, repository.assets);
  const alerts = buildAlerts(repository, profile);
  const toVerify = [...repository.profiles, ...repository.assets].filter((item) => item.status === "TO_VERIFY").length;

  return {
    source: repository.mode === "db-backed" ? "brand-center-db-backed" : "brand-center-foundation",
    persistence: {
      mode: repository.mode,
      nextModels,
      activeModels: activeModels(repository),
      reason: repository.reason,
      dbCounts: repository.dbCounts,
    },
    generatedAt: new Date().toISOString(),
    activeProfile: profile,
    profiles: repository.profiles,
    assets,
    colors,
    fonts,
    guidelines,
    messageFrameworks,
    downloads,
    alerts,
    tabs: BRAND_CENTER_TABS,
    summary: {
      profiles: repository.profiles.length,
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

function getFoundationRepositorySnapshot(): BrandRepositorySnapshot {
  return {
    mode: "foundation-fallback",
    source: "foundation",
    reason: "Using foundation brand data for synchronous compatibility.",
    profiles: brandProfiles,
    assets: brandAssets,
    colors: brandColors,
    fonts: brandFonts,
    guidelines: brandGuidelines,
    messageFrameworks: brandMessageFrameworks,
    dbCounts: {
      profiles: 0,
      assets: 0,
      colors: 0,
      fonts: 0,
      guidelines: 0,
      messageFrameworks: 0,
    },
  };
}

export async function getBrandCenterSnapshot(profileId?: string | null): Promise<BrandCenterSnapshot> {
  return buildBrandCenterSnapshot(await getBrandRepositorySnapshot(), profileId);
}

export function getBrandCenterOverview() {
  return getBrandCenterFoundationSnapshot();
}

export async function getBrandCenterOverviewDbBacked() {
  return getBrandCenterSnapshot();
}

export function getBrandCenterFoundationSnapshot(profileId?: string | null): BrandCenterSnapshot {
  return buildBrandCenterSnapshot(getFoundationRepositorySnapshot(), profileId);
}

export function getBrandAiSourcePack(profileId?: string | null): BrandAiSourcePack {
  const snapshot = getBrandCenterFoundationSnapshot(profileId);
  return {
    profile: snapshot.activeProfile,
    colors: snapshot.colors,
    guidelines: snapshot.guidelines,
    frameworks: snapshot.messageFrameworks,
  };
}

export async function getBrandAiSourcePackDbBacked(profileId?: string | null): Promise<BrandAiSourcePack> {
  const snapshot = await getBrandCenterSnapshot(profileId);
  return {
    profile: snapshot.activeProfile,
    colors: snapshot.colors,
    guidelines: snapshot.guidelines,
    frameworks: snapshot.messageFrameworks,
  };
}

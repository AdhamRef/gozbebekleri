import { prisma } from "@/lib/prisma";
import { brandAssets, brandColors, brandGuidelines, brandProfiles } from "./brand-data";
import type { BrandAsset, BrandColor, BrandGuideline, BrandLocale, BrandOrganizationKey, BrandProfile, BrandProfileStatus } from "./brand-types";

const organizationKeys: BrandOrganizationKey[] = ["gozbebekleri", "minber_aksa", "burak"];
const locales: BrandLocale[] = ["ar", "tr", "en", "fr", "id", "pt", "es", "de"];
const profileStatuses: BrandProfileStatus[] = ["ACTIVE", "FOUNDATION", "TO_VERIFY"];
const assetTypes: BrandAsset["type"][] = ["LOGO", "ICON", "TEMPLATE", "CERTIFICATE", "WATERMARK", "VIDEO_INTRO", "VIDEO_OUTRO", "BRAND_GUIDE"];
const assetFormats: BrandAsset["format"][] = ["SVG", "PNG", "JPG", "PDF", "FIGMA", "VIDEO", "DOC", "URL"];
const colorUsages: BrandColor["usage"][] = ["PRIMARY", "CTA", "BACKGROUND", "ACCENT", "TEXT", "STATUS"];
const guidelineSections: BrandGuideline["section"][] = ["voice", "copy", "proof", "donor-dignity", "cta", "localization"];

type BrandAssetRow = {
  id: string;
  profileId: string;
  title: string;
  type: string;
  format: string;
  fileUrl: string | null;
  previewUrl: string | null;
  usage: string;
  locale: string;
  notes: string | null;
  downloadable: boolean;
  status: string;
  createdBy: string | null;
};

type BrandAssetDelegate = {
  findMany(args: { orderBy: Array<Record<string, "asc" | "desc">> }): Promise<BrandAssetRow[]>;
};

export type BrandRepositoryPersistenceMode = "db-backed" | "foundation-fallback";

export type BrandRepositorySnapshot = {
  mode: BrandRepositoryPersistenceMode;
  source: "prisma" | "foundation";
  reason: string;
  profiles: BrandProfile[];
  assets: BrandAsset[];
  colors: BrandColor[];
  guidelines: BrandGuideline[];
  dbCounts: {
    profiles: number;
    assets: number;
    colors: number;
    guidelines: number;
  };
};

function isKnownOrganizationKey(value: string | null | undefined): value is BrandOrganizationKey {
  return Boolean(value && organizationKeys.includes(value as BrandOrganizationKey));
}

function asLocale(value: string | null | undefined): BrandLocale {
  return locales.includes(value as BrandLocale) ? (value as BrandLocale) : "tr";
}

function asAssetLocale(value: string | null | undefined): BrandAsset["locale"] {
  return value === "all" ? "all" : asLocale(value);
}

function asLocales(values: string[] | null | undefined): BrandLocale[] {
  const safe = (values ?? []).filter((value): value is BrandLocale => locales.includes(value as BrandLocale));
  return safe.length > 0 ? safe : ["tr"];
}

function asProfileStatus(value: string | null | undefined): BrandProfileStatus {
  return profileStatuses.includes(value as BrandProfileStatus) ? (value as BrandProfileStatus) : "FOUNDATION";
}

function asAssetType(value: string | null | undefined): BrandAsset["type"] {
  return assetTypes.includes(value as BrandAsset["type"]) ? (value as BrandAsset["type"]) : "TEMPLATE";
}

function asAssetFormat(value: string | null | undefined): BrandAsset["format"] {
  return assetFormats.includes(value as BrandAsset["format"]) ? (value as BrandAsset["format"]) : "URL";
}

function asColorUsage(value: string | null | undefined): BrandColor["usage"] {
  return colorUsages.includes(value as BrandColor["usage"]) ? (value as BrandColor["usage"]) : "ACCENT";
}

function asGuidelineSection(value: string | null | undefined): BrandGuideline["section"] {
  return guidelineSections.includes(value as BrandGuideline["section"]) ? (value as BrandGuideline["section"]) : "copy";
}

function stableProfileId(key: string, dbId: string) {
  return isKnownOrganizationKey(key) ? `brand_${key}` : dbId;
}

function getBrandAssetDelegate(): BrandAssetDelegate | null {
  const prismaWithBrandAsset = prisma as unknown as { brandAsset?: BrandAssetDelegate };
  return prismaWithBrandAsset.brandAsset ?? null;
}

function fallback(reason: string): BrandRepositorySnapshot {
  return {
    mode: "foundation-fallback",
    source: "foundation",
    reason,
    profiles: brandProfiles,
    assets: brandAssets,
    colors: brandColors,
    guidelines: brandGuidelines,
    dbCounts: {
      profiles: 0,
      assets: 0,
      colors: 0,
      guidelines: 0,
    },
  };
}

export async function getBrandRepositorySnapshot(): Promise<BrandRepositorySnapshot> {
  if (!process.env.DATABASE_URL) {
    return fallback("DATABASE_URL is not configured; using foundation brand data.");
  }

  try {
    const brandAssetDelegate = getBrandAssetDelegate();
    const [profileRows, assetRows, colorRows, guidelineRows] = await Promise.all([
      prisma.brandProfile.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
      brandAssetDelegate ? brandAssetDelegate.findMany({ orderBy: [{ title: "asc" }] }) : Promise.resolve([]),
      prisma.brandColor.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
      prisma.brandGuideline.findMany({ orderBy: [{ order: "asc" }, { title: "asc" }] }),
    ]);

    if (profileRows.length === 0) {
      return fallback("BrandProfile collection is empty; using foundation brand data.");
    }

    const profileIdByDbId = new Map<string, string>();
    const profiles = profileRows.map((profile): BrandProfile => {
      const uiId = stableProfileId(profile.key, profile.id);
      profileIdByDbId.set(profile.id, uiId);

      return {
        id: uiId,
        key: isKnownOrganizationKey(profile.key) ? profile.key : "gozbebekleri",
        name: profile.name,
        description: profile.description ?? "to be verified",
        mission: profile.mission ?? "to be verified",
        vision: profile.vision ?? "to be verified",
        contentVoice: profile.contentVoice ?? "to be verified",
        messagePhilosophy: profile.messagePhilosophy ?? "to be verified",
        primaryLocale: asLocale(profile.primaryLocale),
        supportedLocales: asLocales(profile.supportedLocales),
        website: profile.website ?? "to be verified",
        isActive: profile.isActive,
        status: asProfileStatus(profile.status),
        verificationNote: profile.verificationNote ?? "to be verified",
      };
    });

    const assets = assetRows
      .map((asset): BrandAsset | null => {
        const profileId = profileIdByDbId.get(asset.profileId);
        if (!profileId) return null;
        return {
          id: asset.id,
          profileId,
          title: asset.title,
          type: asAssetType(asset.type),
          format: asAssetFormat(asset.format),
          fileUrl: asset.fileUrl,
          previewUrl: asset.previewUrl,
          usage: asset.usage,
          locale: asAssetLocale(asset.locale),
          notes: asset.notes ?? "to be verified",
          downloadable: asset.downloadable,
          createdBy: asset.createdBy ?? "brand-db",
          status: asProfileStatus(asset.status),
        };
      })
      .filter((asset): asset is BrandAsset => Boolean(asset));

    const colors = colorRows
      .map((color): BrandColor | null => {
        const profileId = profileIdByDbId.get(color.profileId);
        if (!profileId) return null;
        return {
          id: color.id,
          profileId,
          name: color.name,
          hex: color.hex,
          rgb: color.rgb ?? "to be verified",
          usage: asColorUsage(color.usage),
          description: color.description ?? "to be verified",
          order: color.order,
        };
      })
      .filter((color): color is BrandColor => Boolean(color));

    const guidelines = guidelineRows
      .map((guideline): BrandGuideline | null => {
        const profileId = profileIdByDbId.get(guideline.profileId);
        if (!profileId) return null;
        return {
          id: guideline.id,
          profileId,
          section: asGuidelineSection(guideline.section),
          title: guideline.title,
          body: guideline.body,
          examples: guideline.examples,
          order: guideline.order,
        };
      })
      .filter((guideline): guideline is BrandGuideline => Boolean(guideline));

    const reason = brandAssetDelegate
      ? "BrandProfile, BrandAsset, BrandColor, and BrandGuideline are read through the repository layer with foundation fallback when collections are empty."
      : "BrandProfile, BrandColor, and BrandGuideline are read from Prisma; BrandAsset uses foundation fallback until the generated Prisma Client exposes the BrandAsset delegate.";

    return {
      mode: "db-backed",
      source: "prisma",
      reason,
      profiles,
      assets: assets.length > 0 ? assets : brandAssets.filter((asset) => profiles.some((profile) => profile.id === asset.profileId)),
      colors: colors.length > 0 ? colors : brandColors.filter((color) => profiles.some((profile) => profile.id === color.profileId)),
      guidelines: guidelines.length > 0 ? guidelines : brandGuidelines.filter((guideline) => profiles.some((profile) => profile.id === guideline.profileId)),
      dbCounts: {
        profiles: profileRows.length,
        assets: assetRows.length,
        colors: colorRows.length,
        guidelines: guidelineRows.length,
      },
    };
  } catch (error) {
    console.error("Brand repository DB read failed", error);
    return fallback("Brand repository DB read failed; using foundation brand data.");
  }
}
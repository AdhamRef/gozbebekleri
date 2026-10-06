import {
  ImpactConfigError,
  parseImpactConfig,
  parseLocalizedTitle,
  type ImpactConfig,
  type LocalizedText,
} from "@/lib/impact/config";

export const IMPACT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ImpactCampaignWrite = {
  slug: string;
  title: LocalizedText;
  intro: LocalizedText;
  isActive: boolean;
  allowMonthly: boolean;
} & ImpactConfig;

/** Parses a full dashboard create/update body. Throws ImpactConfigError (Arabic message). */
export function parseImpactCampaignBody(body: unknown): ImpactCampaignWrite {
  const b = (body ?? {}) as Record<string, unknown>;
  const slug = String(b.slug ?? "").trim().toLowerCase();
  if (!IMPACT_SLUG_RE.test(slug) || slug.length > 80) {
    throw new ImpactConfigError("الرابط (slug) غير صالح — حروف إنجليزية صغيرة وأرقام وشرطات فقط");
  }
  const title = parseLocalizedTitle(b.title);
  if (!title.ar) throw new ImpactConfigError("العنوان بالعربية مطلوب");
  const intro = parseLocalizedTitle(b.intro);
  const config = parseImpactConfig({ regions: b.regions, needs: b.needs });
  if (!config.regions.some((r) => r.active)) throw new ImpactConfigError("يجب تفعيل منطقة واحدة على الأقل");
  if (!config.needs.some((n) => n.active)) throw new ImpactConfigError("يجب تفعيل احتياج واحد على الأقل");
  return {
    slug,
    title,
    intro,
    isActive: b.isActive !== false,
    allowMonthly: b.allowMonthly !== false,
    ...config,
  };
}

export { ImpactConfigError };

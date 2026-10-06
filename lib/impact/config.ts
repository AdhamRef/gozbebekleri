/**
 * "Make an impact for a child" (ImpactCampaign) — shared config types, defaults,
 * parsing and pricing. Client-safe: no prisma / server imports here.
 *
 * Ported from the standalone design export (export/src/data.js). Only the parts
 * the live page renders are kept: character state images per region, and
 * "prop" needs drawn as icons in fixed stage slots.
 */

export const IMPACT_FUNDRAISING_MODE = "IMPACT";

export type LocalizedText = Record<string, string>;

/** Character pictures, most complete first; the first whose needs are all picked wins. */
export const IMPACT_STATES = [
  { key: "carrying", requires: ["clothing", "education", "food"], covers: ["food"] },
  { key: "schooled", requires: ["clothing", "education"], covers: [] },
  { key: "bagged_fed", requires: ["education", "food"], covers: ["food"] },
  { key: "dressed_fed", requires: ["clothing", "food"], covers: ["food"] },
  { key: "dressed", requires: ["clothing"], covers: [] },
  { key: "bagged", requires: ["education"], covers: [] },
  { key: "fed", requires: ["food"], covers: ["food"] },
] as const;

export type ImpactStateKey = (typeof IMPACT_STATES)[number]["key"];
export const IMPACT_STATE_KEYS: ImpactStateKey[] = IMPACT_STATES.map((s) => s.key);

/** Needs whose keys drive the character picture (see IMPACT_STATES). */
export const IMPACT_STATE_NEED_KEYS = ["clothing", "education", "food"] as const;

/** Fixed stage slots for "prop" needs: k = width ratio, px/py = position %. */
export const IMPACT_STAGE_SLOTS = {
  BACKGROUND: { k: 0.95, px: 50, py: 96, z: 5 },
  GROUND_LEFT: { k: 0.26, px: 30, py: 99, z: 112 },
  GROUND_RIGHT: { k: 0.26, px: 70, py: 99, z: 111 },
  GROUND_FAR_L: { k: 0.22, px: 8, py: 97, z: 110 },
  GROUND_FAR_R: { k: 0.22, px: 92, py: 97, z: 109 },
} as const;
export const IMPACT_GROUND_ORDER = ["GROUND_RIGHT", "GROUND_LEFT", "GROUND_FAR_R", "GROUND_FAR_L"] as const;

export type ImpactRegion = {
  key: string;
  name: LocalizedText;
  active: boolean;
  /** base is required; state images are optional and fall back to base. */
  images: { base: string } & Partial<Record<ImpactStateKey, string>>;
};

export type ImpactNeed = {
  key: string;
  name: LocalizedText;
  /** state = changes the character picture only; prop = drawn as its icon on the stage */
  kind: "state" | "prop";
  /** prop placement: background (behind the child) or ground (next to the child) */
  placement?: "background" | "ground";
  priceUSD: number;
  icon: string;
  /** Lower draws first when ground slots run out. */
  priority: number;
  maxQuantity: number;
  active: boolean;
};

export type ImpactConfig = {
  regions: ImpactRegion[];
  needs: ImpactNeed[];
};

export type ImpactSelectionLine = { regionKey: string; needKey: string; quantity: number };

const ASSET_ROOT = "/impact";

function defaultRegion(key: string, ar: string, tr: string, en: string): ImpactRegion {
  const dir = `${ASSET_ROOT}/characters/${key}/`;
  const images: ImpactRegion["images"] = { base: `${dir}base.webp` };
  for (const s of IMPACT_STATE_KEYS) images[s] = `${dir}${s}.webp`;
  return { key, name: { ar, tr, en }, active: true, images };
}

function defaultNeed(n: Omit<ImpactNeed, "icon" | "maxQuantity" | "active"> & { iconKey?: string }): ImpactNeed {
  const { iconKey, ...rest } = n;
  return { ...rest, icon: `${ASSET_ROOT}/items/item-${iconKey ?? n.key}.png`, maxQuantity: 10, active: true };
}

export const DEFAULT_IMPACT_TITLE: LocalizedText = {
  ar: "اصنع أثرًا لطفل",
  tr: "Bir çocuk için iz bırak",
  en: "Make an impact for a child",
};

export const DEFAULT_IMPACT_INTRO: LocalizedText = {
  ar: "اختر الاحتياجات التي تريد تغطيتها، وسيتكوّن أثرك أمام عينيك.",
  tr: "Karşılamak istediğin ihtiyaçları seç; etkin gözünün önünde oluşsun.",
  en: "Choose the needs you want to cover and watch your impact take shape.",
};

export const DEFAULT_IMPACT_CONFIG: ImpactConfig = {
  regions: [
    defaultRegion("gaza", "غزة", "Gazze", "Gaza"),
    defaultRegion("quds", "القدس", "Kudüs", "Al-Quds"),
    defaultRegion("sudan", "السودان", "Sudan", "Sudan"),
    defaultRegion("yemen", "اليمن", "Yemen", "Yemen"),
    defaultRegion("syria", "سوريا", "Suriye", "Syria"),
  ],
  needs: [
    defaultNeed({ key: "clothing", kind: "state", name: { ar: "ملابس وحذاء", tr: "Giysi ve ayakkabı", en: "Clothing & shoes" }, priority: 1, priceUSD: 15, iconKey: "clothes" }),
    defaultNeed({ key: "food", kind: "prop", placement: "ground", name: { ar: "غذاء", tr: "Gıda", en: "Food" }, priority: 3, priceUSD: 6 }),
    defaultNeed({ key: "water", kind: "prop", placement: "ground", name: { ar: "ماء نظيف", tr: "Temiz su", en: "Clean water" }, priority: 2, priceUSD: 4 }),
    defaultNeed({ key: "milk", kind: "prop", placement: "ground", name: { ar: "حليب أطفال", tr: "Bebek maması", en: "Baby milk" }, priority: 4, priceUSD: 8 }),
    defaultNeed({ key: "shelter", kind: "prop", placement: "background", name: { ar: "مأوى ودفء", tr: "Barınma", en: "Shelter" }, priority: 1, priceUSD: 100 }),
    defaultNeed({ key: "education", kind: "state", name: { ar: "تعليم", tr: "Eğitim", en: "Education" }, priority: 1, priceUSD: 10, iconKey: "stationery" }),
    defaultNeed({ key: "medicine", kind: "prop", placement: "ground", name: { ar: "علاج", tr: "Tedavi", en: "Medicine" }, priority: 4, priceUSD: 15 }),
    defaultNeed({ key: "psych", kind: "prop", placement: "ground", name: { ar: "دعم نفسي ولعب", tr: "Psikososyal destek", en: "Play & support" }, priority: 2, priceUSD: 5, iconKey: "toy" }),
  ],
};

export function pickText(text: unknown, locale: string): string {
  if (!text || typeof text !== "object") return typeof text === "string" ? text : "";
  const t = text as LocalizedText;
  return t[locale] || t.en || t.ar || Object.values(t).find(Boolean) || "";
}

const KEY_RE = /^[a-z0-9_-]{1,40}$/;

function parseText(v: unknown): LocalizedText {
  const out: LocalizedText = {};
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, s] of Object.entries(v as Record<string, unknown>)) {
      if (typeof s === "string" && s.trim()) out[k] = s.trim();
    }
  }
  return out;
}

export class ImpactConfigError extends Error {}

/** Strict parse used on dashboard writes. Throws ImpactConfigError with an Arabic message. */
export function parseImpactConfig(input: { regions: unknown; needs: unknown }): ImpactConfig {
  if (!Array.isArray(input.regions) || input.regions.length === 0) {
    throw new ImpactConfigError("يجب إضافة منطقة واحدة على الأقل");
  }
  if (!Array.isArray(input.needs) || input.needs.length === 0) {
    throw new ImpactConfigError("يجب إضافة احتياج واحد على الأقل");
  }
  const regionKeys = new Set<string>();
  const regions: ImpactRegion[] = input.regions.map((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const key = String(r.key ?? "").trim();
    if (!KEY_RE.test(key)) throw new ImpactConfigError(`مفتاح المنطقة رقم ${i + 1} غير صالح (حروف إنجليزية صغيرة وأرقام فقط)`);
    if (regionKeys.has(key)) throw new ImpactConfigError(`مفتاح المنطقة "${key}" مكرر`);
    regionKeys.add(key);
    const name = parseText(r.name);
    if (!name.ar) throw new ImpactConfigError(`اسم المنطقة "${key}" بالعربية مطلوب`);
    const imgs = (r.images ?? {}) as Record<string, unknown>;
    const base = typeof imgs.base === "string" ? imgs.base.trim() : "";
    if (!base) throw new ImpactConfigError(`صورة الأساس للمنطقة "${key}" مطلوبة`);
    const images: ImpactRegion["images"] = { base };
    for (const s of IMPACT_STATE_KEYS) {
      const u = imgs[s];
      if (typeof u === "string" && u.trim()) images[s] = u.trim();
    }
    return { key, name, active: r.active !== false, images };
  });

  const needKeys = new Set<string>();
  const needs: ImpactNeed[] = input.needs.map((raw, i) => {
    const n = (raw ?? {}) as Record<string, unknown>;
    const key = String(n.key ?? "").trim();
    if (!KEY_RE.test(key)) throw new ImpactConfigError(`مفتاح الاحتياج رقم ${i + 1} غير صالح (حروف إنجليزية صغيرة وأرقام فقط)`);
    if (needKeys.has(key)) throw new ImpactConfigError(`مفتاح الاحتياج "${key}" مكرر`);
    needKeys.add(key);
    const name = parseText(n.name);
    if (!name.ar) throw new ImpactConfigError(`اسم الاحتياج "${key}" بالعربية مطلوب`);
    const priceUSD = Number(n.priceUSD);
    if (!Number.isFinite(priceUSD) || priceUSD <= 0) throw new ImpactConfigError(`سعر الاحتياج "${key}" يجب أن يكون أكبر من صفر`);
    const maxQuantity = Math.floor(Number(n.maxQuantity ?? 10));
    if (!Number.isFinite(maxQuantity) || maxQuantity < 1 || maxQuantity > 1000) {
      throw new ImpactConfigError(`الحد الأقصى للكمية في "${key}" يجب أن يكون بين 1 و1000`);
    }
    const icon = typeof n.icon === "string" ? n.icon.trim() : "";
    if (!icon) throw new ImpactConfigError(`أيقونة الاحتياج "${key}" مطلوبة`);
    const kind = n.kind === "prop" ? "prop" : "state";
    const priority = Math.floor(Number(n.priority ?? 5));
    return {
      key,
      name,
      kind,
      ...(kind === "prop" ? { placement: n.placement === "background" ? "background" : "ground" } : {}),
      priceUSD: Math.round(priceUSD * 100) / 100,
      icon,
      priority: Number.isFinite(priority) ? priority : 5,
      maxQuantity,
      active: n.active !== false,
    } as ImpactNeed;
  });

  return { regions, needs };
}

/** Lenient read of stored JSON (never throws) — used on public reads. */
export function readImpactConfig(stored: { regions: unknown; needs: unknown }): ImpactConfig {
  try {
    return parseImpactConfig(stored);
  } catch {
    return {
      regions: Array.isArray(stored.regions) ? (stored.regions as ImpactRegion[]) : [],
      needs: Array.isArray(stored.needs) ? (stored.needs as ImpactNeed[]) : [],
    };
  }
}

export function parseLocalizedTitle(v: unknown): LocalizedText {
  return parseText(v);
}

export function impactLineUSD(unitPriceUSD: number, quantity: number): number {
  return Math.round(unitPriceUSD * quantity * 100) / 100;
}

/** Character picture for the current picks; falls back to base when the state image is missing. */
export function resolveImpactState(pickedNeedKeys: Set<string>) {
  return IMPACT_STATES.find((s) => s.requires.every((k) => pickedNeedKeys.has(k))) ?? null;
}

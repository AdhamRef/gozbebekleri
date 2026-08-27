import React from "react";
import ReactCountryFlag from "react-country-flag";
import {
  Heart, Users, BookOpen, Home, Droplets, Stethoscope,
  Baby, Globe, Building2, Star, Leaf, GraduationCap,
  Shirt, Zap, Handshake, Wheat, HandHeart, Church,
  Ambulance, TreePine, Lightbulb, ShieldCheck, Gift,
  Tent, Caravan, Construction, HardHat, Hammer, Package,
  Truck, Soup, Utensils, School, Store, Sprout, Briefcase,
  Wallet, Scissors, BookMarked, Accessibility, ShowerHead,
  Recycle, Sun, Moon, Waves, PawPrint, HeartHandshake, Wrench,
} from "lucide-react";
import { CHARITY_ICONS } from "@/components/icons/charity-icons";
import { normalizeCountryCode } from "@/lib/geo/country-codes";

/** Anything that renders as an icon: a Lucide glyph or one of ours. */
export type CategoryIconComponent = React.ComponentType<{ className?: string }>;

/**
 * Every icon a category may store, keyed by the exact string saved in
 * `category.icon`. Lucide covers the generic ones; `CHARITY_ICONS` fills the
 * gaps Lucide has no glyph for (mosque, qurbani, wells, mushaf…).
 */
const ICON_MAP = {
  // General
  Heart, HandHeart, HeartHandshake, Handshake, Users, Globe, Star, Gift,
  ShieldCheck, Lightbulb, Zap, Moon,

  // Relief — قطاع الإغاثة
  FoodBasket: CHARITY_ICONS.FoodBasket,
  IftarMeal: CHARITY_ICONS.IftarMeal,
  Qurbani: CHARITY_ICONS.Qurbani,
  CharityBox: CHARITY_ICONS.CharityBox,
  Package, Soup, Utensils, Truck, Shirt, Ambulance, Stethoscope, Droplets,

  // Shelter & reconstruction — قطاع الإيواء والإعمار
  Mosque: CHARITY_ICONS.Mosque,
  Tent, Caravan, Home, Building2, Construction, HardHat, Hammer, Wrench, Church,

  // Community development — قطاع التنمية المجتمعية
  WaterWell: CHARITY_ICONS.WaterWell,
  WaterTap: CHARITY_ICONS.WaterTap,
  Quran: CHARITY_ICONS.Quran,
  PrayerRug: CHARITY_ICONS.PrayerRug,
  OrphanCare: CHARITY_ICONS.OrphanCare,
  School, GraduationCap, BookOpen, BookMarked, Store, Briefcase, Wallet,
  Scissors, Sprout, Wheat, Leaf, TreePine, Baby, Accessibility, ShowerHead,
  Recycle, Sun, Waves, PawPrint,
};

/** Literal union of every valid icon name — typos in the lists below won't compile. */
export type CategoryIconName = keyof typeof ICON_MAP;

export const CATEGORY_ICONS: Record<string, CategoryIconComponent> = ICON_MAP;

export const CATEGORY_ICON_NAMES = Object.keys(ICON_MAP) as CategoryIconName[];

/**
 * Picker layout. Arabic labels match how the organisation talks about its work,
 * so an editor looking for "الأضاحي" finds it without scanning every glyph.
 */
export const CATEGORY_ICON_GROUPS: { label: string; names: CategoryIconName[] }[] = [
  {
    label: "قطاع الإغاثة",
    names: [
      "FoodBasket", "IftarMeal", "Qurbani", "Soup", "Utensils", "Package",
      "Truck", "Shirt", "Droplets", "Ambulance", "Stethoscope", "CharityBox",
    ],
  },
  {
    label: "قطاع الإيواء والإعمار",
    names: [
      "Mosque", "Tent", "Caravan", "Home", "Building2", "Construction",
      "HardHat", "Hammer", "Wrench", "Church",
    ],
  },
  {
    label: "قطاع التنمية المجتمعية",
    names: [
      "WaterWell", "WaterTap", "Quran", "PrayerRug", "OrphanCare", "School",
      "GraduationCap", "BookOpen", "BookMarked", "Store", "Briefcase", "Wallet",
      "Scissors", "Sprout", "Wheat", "Leaf", "TreePine", "Baby", "Accessibility",
      "ShowerHead", "Recycle", "Sun", "Waves", "PawPrint",
    ],
  },
  {
    label: "عام",
    names: [
      "Heart", "HandHeart", "HeartHandshake", "Handshake", "Users", "Globe",
      "Star", "Gift", "ShieldCheck", "Lightbulb", "Zap", "Moon",
    ],
  },
];

/** Arabic search terms per icon, so the picker's search box is usable. */
export const CATEGORY_ICON_KEYWORDS: Record<CategoryIconName, string> = {
  Mosque: "مسجد جامع مساجد مصلى",
  Qurbani: "أضاحي أضحية عقيقة ذبيحة خروف ماشية لحوم",
  WaterWell: "بئر آبار مياه حفر",
  WaterTap: "حنفية صنبور مضخة مياه شبكة",
  Quran: "مصحف قرآن تحفيظ ختمة",
  PrayerRug: "سجادة صلاة مصلى",
  FoodBasket: "سلة غذائية طرد غذائي مواد تموينية",
  IftarMeal: "إفطار صائم وجبة إطعام رمضان",
  OrphanCare: "يتيم أيتام كفالة",
  CharityBox: "صدقة زكاة تبرع صندوق",
  Tent: "خيمة خيام إيواء مخيم",
  Caravan: "كرفان بيت متنقل إيواء",
  Home: "سكن منزل بيت إسكان",
  Building2: "مبنى إعمار منشأة",
  Construction: "إعمار بناء ترميم",
  HardHat: "بناء عمال إعمار",
  Hammer: "ترميم صيانة إعمار",
  Wrench: "صيانة إصلاح",
  Church: "دار عبادة",
  School: "مدرسة تعليم مدارس",
  GraduationCap: "تعليم دراسة منح",
  BookOpen: "كتاب تعليم دورة",
  BookMarked: "كتب مكتبة تعليم",
  Store: "مشروع مدر للدخل متجر تمكين",
  Briefcase: "تمكين عمل وظيفة مهنة",
  Wallet: "دخل مال تمكين اقتصادي",
  Scissors: "خياطة حرفة تدريب مهني",
  Sprout: "زراعة شتلات تنمية",
  Wheat: "زراعة محاصيل غذاء",
  Leaf: "بيئة زراعة",
  TreePine: "تشجير بيئة أشجار",
  Baby: "طفل أطفال رضع حضانة",
  Accessibility: "ذوي الهمم إعاقة كراسي متحركة",
  ShowerHead: "نظافة إصحاح بيئي حمامات",
  Recycle: "بيئة تدوير نظافة",
  Sun: "طاقة شمسية كهرباء",
  Waves: "مياه بحر",
  PawPrint: "حيوانات ماشية رفق",
  Package: "طرد إغاثي مساعدات سلة",
  Soup: "إطعام وجبات مطبخ",
  Utensils: "إطعام وجبات",
  Truck: "نقل قوافل إغاثة",
  Shirt: "كسوة ملابس",
  Droplets: "مياه سقيا ماء",
  Ambulance: "إسعاف طوارئ إغاثة طبية",
  Stethoscope: "صحة علاج طبي مستشفى",
  Heart: "خير عطاء",
  HandHeart: "تبرع عطاء صدقة",
  HeartHandshake: "شراكة تعاون دعم",
  Handshake: "شراكة تعاون",
  Users: "مجتمع أسر مستفيدون",
  Globe: "عالمي دولي",
  Star: "مميز رئيسي",
  Gift: "هدية عيد كسوة",
  ShieldCheck: "حماية أمان",
  Lightbulb: "كهرباء إنارة فكرة",
  Zap: "كهرباء طاقة",
  Moon: "رمضان هلال عيد",
};

/** Canonical stored form for a country flag, e.g. `flag:SA`. */
export const CATEGORY_FLAG_PREFIX = "flag:";

/** Build the value to store in `category.icon` for a country flag. */
export function toFlagIconValue(countryCode: string): string {
  return `${CATEGORY_FLAG_PREFIX}${countryCode.trim().toUpperCase()}`;
}

export type CategoryIconValue =
  | { kind: "icon"; name: string }
  | { kind: "flag"; countryCode: string };

/** Icon names matched loosely, so "book-open" and "bookopen" resolve too. */
const ICON_BY_LOOSE_KEY = new Map(
  CATEGORY_ICON_NAMES.map((name) => [name.toLowerCase().replace(/[^a-z0-9]/g, ""), name]),
);

const FLAG_PREFIX_PATTERN = /^(?:flag|country|locale)\s*[:\-_/]?\s*([A-Za-z]{2})$/;

/** Decode a 🇸🇦-style emoji into "SA". */
function decodeFlagEmoji(value: string): string | null {
  const points = Array.from(value).map((char) => char.codePointAt(0) ?? 0);
  if (points.length !== 2) return null;
  if (points.some((point) => point < 0x1f1e6 || point > 0x1f1ff)) return null;
  return points.map((point) => String.fromCharCode(point - 0x1f1e6 + 65)).join("");
}

/**
 * Read whatever is stored in `category.icon`. Deliberately liberal: a value may
 * be an icon name in any casing/separator style, a `flag:SA` / `country-sa`
 * marker, a bare alpha-2 code, or a flag emoji. Returns null when unrecognised.
 */
export function parseCategoryIcon(value?: string | null): CategoryIconValue | null {
  const raw = value?.trim();
  if (!raw) return null;

  const prefixed = FLAG_PREFIX_PATTERN.exec(raw);
  if (prefixed) {
    const countryCode = normalizeCountryCode(prefixed[1]);
    if (countryCode) return { kind: "flag", countryCode };
  }

  const emojiCode = normalizeCountryCode(decodeFlagEmoji(raw));
  if (emojiCode) return { kind: "flag", countryCode: emojiCode };

  if (CATEGORY_ICONS[raw]) return { kind: "icon", name: raw };

  // A bare two-letter value can only be a country — no icon name is that short.
  if (/^[A-Za-z]{2}$/.test(raw)) {
    const bareCode = normalizeCountryCode(raw);
    if (bareCode) return { kind: "flag", countryCode: bareCode };
  }

  const loose = ICON_BY_LOOSE_KEY.get(raw.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return loose ? { kind: "icon", name: loose } : null;
}

interface CategoryIconProps {
  name?: string | null;
  className?: string;
}

/**
 * Renders whatever `category.icon` holds — a Lucide glyph, one of our charity
 * icons, or a country flag. Falls back to Heart.
 */
const CategoryIcon = ({ name, className = "w-4 h-4" }: CategoryIconProps) => {
  const parsed = parseCategoryIcon(name);

  if (parsed?.kind === "flag") {
    return (
      <ReactCountryFlag
        svg
        countryCode={parsed.countryCode}
        className={`${className} object-contain rounded-[2px]`}
        title={parsed.countryCode}
        alt=""
      />
    );
  }

  const Icon = parsed ? CATEGORY_ICONS[parsed.name] : Heart;
  return <Icon className={className} />;
};

export default CategoryIcon;

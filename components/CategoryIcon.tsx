import React from "react";
import ReactCountryFlag from "react-country-flag";
import {
  Heart, Users, BookOpen, Home, Droplets, Stethoscope,
  Baby, Globe, Building2, Star, Leaf, GraduationCap,
  Shirt, Zap, Handshake, Wheat, HandHeart, Church,
  Ambulance, TreePine, Lightbulb, ShieldCheck, Gift,
  LucideIcon,
} from "lucide-react";
import { normalizeCountryCode } from "@/lib/geo/country-codes";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Heart,
  Users,
  BookOpen,
  Home,
  Droplets,
  Stethoscope,
  Baby,
  Globe,
  Building2,
  Star,
  Leaf,
  GraduationCap,
  Shirt,
  Zap,
  Handshake,
  Wheat,
  HandHeart,
  Church,
  Ambulance,
  TreePine,
  Lightbulb,
  ShieldCheck,
  Gift,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as (keyof typeof CATEGORY_ICONS)[];

/** Canonical stored form for a country flag, e.g. `flag:SA`. */
export const CATEGORY_FLAG_PREFIX = "flag:";

/** Build the value to store in `category.icon` for a country flag. */
export function toFlagIconValue(countryCode: string): string {
  return `${CATEGORY_FLAG_PREFIX}${countryCode.trim().toUpperCase()}`;
}

export type CategoryIconValue =
  | { kind: "lucide"; name: string }
  | { kind: "flag"; countryCode: string };

/** Lucide names matched loosely, so "book-open" and "bookopen" resolve too. */
const LUCIDE_BY_LOOSE_KEY = new Map(
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
 * be a Lucide name in any casing/separator style, a `flag:SA` / `country-sa`
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

  const exact = CATEGORY_ICONS[raw];
  if (exact) return { kind: "lucide", name: raw };

  // A bare two-letter value can only be a country — no Lucide icon is that short.
  if (/^[A-Za-z]{2}$/.test(raw)) {
    const bareCode = normalizeCountryCode(raw);
    if (bareCode) return { kind: "flag", countryCode: bareCode };
  }

  const loose = LUCIDE_BY_LOOSE_KEY.get(raw.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return loose ? { kind: "lucide", name: loose } : null;
}

interface CategoryIconProps {
  name?: string | null;
  className?: string;
}

/**
 * Renders whatever `category.icon` holds — a Lucide icon by name, or a country
 * flag. Falls back to Heart.
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

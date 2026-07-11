"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROOT_ID = "dashboard-project-locale-slug-editor";
const TARGET_SECTION_ID = "dashboard-project-locale-links";

const LANGUAGE_LABELS: Record<string, string> = {
  ar: "العربية",
  en: "English",
  fr: "Français",
  tr: "Türkçe",
  id: "Indonesia",
  pt: "Português",
  es: "Español",
  de: "Deutsch",
};

type LocaleLink = {
  locale: string;
  slug?: string | null;
  url?: string | null;
};

type LocaleLinksResponse = {
  links?: LocaleLink[];
};

function getProjectIdFromPath(pathname: string) {
  const match = pathname.match(/\/dashboard\/campaigns\/edit\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeDraftSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-
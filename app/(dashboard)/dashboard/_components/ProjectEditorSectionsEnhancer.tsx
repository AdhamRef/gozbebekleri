"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SEO_PORTAL_ID = "dashboard-project-seo-workbench";
const LOCALE_LINKS_ID = "dashboard-project-locale-links";
const HEADER_CLASS = "dashboard-project-section-toggle";

type LocaleLink = {
  locale: string;
  slug?: string | null;
  path?: string | null;
  url?: string | null;
  hasCustomSlug?: boolean;
};

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

function getProjectForm() {
  const h1 = document.querySelector("main h
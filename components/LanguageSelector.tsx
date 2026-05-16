"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { track } from "@vercel/analytics";

import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/locales";

type Locale = (typeof SUPPORTED_LOCALES)[number];

const COUNTRY_CODES: Record<Locale, string> = {
  ar: "SA", en: "US", fr: "FR", tr: "TR", id: "ID", pt: "PT", es: "ES", de: "DE",
};

const languages: { code: Locale; name: string; countryCode: string }[] =
  SUPPORTED_LOCALES.map((code) => ({
    code,
    name: LOCALE_LABELS[code],
    countryCode: COUNTRY_CODES[code],
  }));

// Slug-bearing localized routes whose second path segment is an entity slug
// that differs per translation. When the user switches language on one of
// these routes, we swap the slug for the target locale's slug too — otherwise
// the URL keeps the previous locale's slug and the server has to redirect.
const SLUG_ROUTES: Record<string, "campaign" | "category" | "post"> = {
  campaign: "campaign",
  category: "category",
  blog: "post",
};

type SlugMapResponse = { id: string; slugs: Record<string, string | null> };

export default function LanguageSwitcher({ onDark = true }: { onDark?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [slugMap, setSlugMap] = useState<Record<string, string | null> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const currentLocale = pathname.split("/")[1] as Locale;
  const currentLang =
    languages.find((l) => l.code === currentLocale) ?? languages[0];

  // Detect when we're on a slug-bearing route and parse the entity slug.
  // Shape: /<locale>/<route>/<slug> (anything deeper isn't treated as the entity).
  const segments = pathname.split("/").filter(Boolean);
  const routeName = segments[1];
  const entityKey = segments[2];
  const slugRouteType =
    segments.length === 3 && routeName && SLUG_ROUTES[routeName] && entityKey
      ? SLUG_ROUTES[routeName]
      : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset the cached slug map whenever the route or entity changes.
  useEffect(() => {
    setSlugMap(null);
  }, [slugRouteType, entityKey]);

  // Prefetch the per-locale slug map the first time the dropdown opens on a
  // slug-bearing route. Fire-and-forget — if it fails we fall back to keeping
  // the existing slug and let the server-side redirect canonicalize.
  useEffect(() => {
    if (!open || !slugRouteType || !entityKey || slugMap) return;
    let cancelled = false;
    const url = `/api/i18n/slug-map?type=${slugRouteType}&key=${encodeURIComponent(entityKey)}`;
    fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<SlugMapResponse>) : null))
      .then((data) => {
        if (!cancelled && data?.slugs) setSlugMap(data.slugs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, slugRouteType, entityKey, slugMap]);

  const handleLanguageChange = (newLocale: Locale): void => {
    if (newLocale === currentLocale) {
      setOpen(false);
      return;
    }
    try { track("language_change", { from: currentLocale ?? null, to: newLocale }); } catch {}
    // Persist the explicit choice for logged-in users (best-effort, non-blocking).
    if (session?.user?.id) {
      fetch("/api/users/me/preferred-lang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
        keepalive: true,
      }).catch(() => {});
    }
    const pathSegments = pathname.split("/").filter(Boolean);
    const localeInPath = SUPPORTED_LOCALES.includes(pathSegments[0] as Locale);
    const rest = localeInPath ? pathSegments.slice(1) : pathSegments;
    // On slug-bearing routes, swap the entity slug with the target locale's
    // slug when we have it cached. Otherwise keep the existing slug — the
    // page's server-side redirect will canonicalize.
    if (slugRouteType && slugMap && rest.length === 2) {
      const targetSlug = slugMap[newLocale];
      if (targetSlug) rest[1] = encodeURIComponent(targetSlug);
    }
    const pathWithoutLocale = rest.join("/");
    const newPath = pathWithoutLocale ? `/${newLocale}/${pathWithoutLocale}` : `/${newLocale}`;
    setOpen(false);
    window.location.assign(newPath);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm font-medium ${
          onDark
            ? "text-white/90 hover:text-white hover:bg-white/10"
            : "text-gray-700 hover:text-[#025EB8] hover:bg-gray-100"
        }`}
      >
        <ReactCountryFlag
          svg
          alt={currentLang.name}
          countryCode={currentLang.countryCode}
          style={{ width: "1.1em", height: "1.1em" }}
        />
        <span>{currentLang.code.toUpperCase()}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors
                ${
                  lang.code === currentLocale
                    ? "bg-blue-50 text-[#025EB8] font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
            >
              <ReactCountryFlag
                svg
                countryCode={lang.countryCode}
                style={{ width: "1.1em", height: "1.1em" }}
              />
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

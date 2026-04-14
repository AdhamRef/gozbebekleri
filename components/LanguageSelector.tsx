"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import ReactCountryFlag from "react-country-flag";

import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/locales";

type Locale = (typeof SUPPORTED_LOCALES)[number];

const COUNTRY_CODES: Record<Locale, string> = {
  ar: "SA", en: "US", fr: "FR", tr: "TR", id: "ID", pt: "PT", es: "ES",
};

const languages: { code: Locale; name: string; countryCode: string }[] =
  SUPPORTED_LOCALES.map((code) => ({
    code,
    name: LOCALE_LABELS[code],
    countryCode: COUNTRY_CODES[code],
  }));

export default function LanguageSwitcher({ onDark = true }: { onDark?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLocale = pathname.split("/")[1] as Locale;
  const currentLang =
    languages.find((l) => l.code === currentLocale) ?? languages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (newLocale: Locale): void => {
    if (newLocale === currentLocale) {
      setOpen(false);
      return;
    }
    const segments = pathname.split("/").filter(Boolean);
    const localeInPath = SUPPORTED_LOCALES.includes(segments[0] as Locale);
    const pathWithoutLocale = localeInPath ? segments.slice(1).join("/") : segments.join("/");
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

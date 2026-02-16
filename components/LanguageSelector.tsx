"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Globe, ChevronDown } from "lucide-react";
import ReactCountryFlag from "react-country-flag";

type Locale = "en" | "ar" | "fr";

type Language = {
  code: Locale;
  name: string;
  countryCode: "US" | "EG" | "FR";
};

const languages: Language[] = [
  { code: "en", name: "English", countryCode: "US" },
  { code: "ar", name: "العربية", countryCode: "EG" },
  { code: "fr", name: "Français", countryCode: "FR" },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);

  /**
   * Extract current locale from URL
   * /en/blog/123 → en
   */
  const currentLocale = pathname.split("/")[1] as Locale;

  const currentLang =
    languages.find((l) => l.code === currentLocale) ?? languages[0];

  const handleLanguageChange = (newLocale: Locale): void => {
    if (newLocale === currentLocale) {
      setOpen(false);
      return;
    }

    /**
     * Replace only the locale segment
     * /en/blog/123 → /ar/blog/123
     */
    const segments = pathname.split("/");
    segments[1] = newLocale;

    router.replace(segments.join("/"));
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-3 py-2
                   text-sm font-medium
                   hover:bg-gray-50
                   transition"
      >
        <ReactCountryFlag
          svg
          countryCode={currentLang.countryCode}
          style={{ width: "1.25em", height: "1.25em" }}
        />

        <span>{currentLang.code.toUpperCase()}</span>

        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-48 rounded-lg border
                     bg-white p-2 shadow-md"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className="flex w-full items-center gap-3 rounded-lg p-2
                         text-sm text-left
                         hover:bg-emerald-50 transition
                         cursor-pointer"
            >
              <ReactCountryFlag
                svg
                countryCode={lang.countryCode}
                style={{ width: "1.25em", height: "1.25em" }}
              />
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

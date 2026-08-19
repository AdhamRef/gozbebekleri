"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoryIcon, {
  CATEGORY_ICON_NAMES,
  parseCategoryIcon,
  toFlagIconValue,
} from "@/components/CategoryIcon";
import { buildCountryList } from "@/lib/geo/country-codes";

interface CategoryIconPickerProps {
  value?: string | null;
  onChange: (value: string) => void;
}

/**
 * Picks what `category.icon` stores: either a Lucide icon name or a country
 * flag (saved as `flag:XX`).
 */
export function CategoryIconPicker({ value, onChange }: CategoryIconPickerProps) {
  const parsed = parseCategoryIcon(value);
  const [tab, setTab] = useState<"icon" | "flag">(parsed?.kind === "flag" ? "flag" : "icon");
  const [query, setQuery] = useState("");

  const countries = useMemo(() => buildCountryList("ar"), []);
  const filteredCountries = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return countries;
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(search) ||
        country.code.toLowerCase().includes(search),
    );
  }, [countries, query]);

  const selectedCountry = parsed?.kind === "flag"
    ? countries.find((country) => country.code === parsed.countryCode)
    : undefined;

  return (
    <div className="space-y-3">
      {parsed && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
            <CategoryIcon name={value} className="w-5 h-5 text-brand" />
          </div>
          <span className="font-medium">
            {parsed.kind === "flag"
              ? `${selectedCountry?.name || parsed.countryCode} (${parsed.countryCode})`
              : parsed.name}
          </span>
        </div>
      )}

      <Tabs value={tab} onValueChange={(next) => setTab(next as "icon" | "flag")}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="icon">أيقونة</TabsTrigger>
          <TabsTrigger value="flag">علم دولة</TabsTrigger>
        </TabsList>

        <TabsContent value="icon" className="mt-3">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {CATEGORY_ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => onChange(name)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  parsed?.kind === "lucide" && parsed.name === name
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-gray-200 text-gray-500 hover:border-brand/50 hover:text-brand"
                }`}
              >
                <CategoryIcon name={name} className="w-5 h-5" />
                <span className="text-[9px] leading-tight text-center truncate w-full">{name}</span>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flag" className="mt-3 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن دولة..."
              className="pr-9"
            />
          </div>

          {filteredCountries.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">لا توجد دولة مطابقة.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-100 p-2">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    title={country.name}
                    onClick={() => onChange(toFlagIconValue(country.code))}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-right ${
                      parsed?.kind === "flag" && parsed.countryCode === country.code
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-gray-200 text-gray-600 hover:border-brand/50 hover:text-brand"
                    }`}
                  >
                    <CategoryIcon name={toFlagIconValue(country.code)} className="w-5 h-5 shrink-0" />
                    <span className="text-[11px] leading-tight truncate">{country.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CategoryIconPicker;

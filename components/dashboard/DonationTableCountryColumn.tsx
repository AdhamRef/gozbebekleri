"use client";

import DonationCountryFlag from "@/components/DonationCountryFlag";
import { getCountryDisplayNameFromCode } from "@/lib/dashboard/country-display-name";
import { useLocale } from "next-intl";

export function DonationTableCountryColumn({
  countryCode,
  countryName,
}: {
  countryCode: string | null | undefined;
  /** When set (e.g. from user profile), shown instead of Intl name from code */
  countryName?: string | null;
}) {
  const locale = useLocale() as string;
  const intlName = getCountryDisplayNameFromCode(countryCode, locale || "ar");
  const label =
    (countryName && countryName.trim()) ||
    (intlName !== "—" ? intlName : "—");

  return (
    <div className="inline-flex items-center gap-2 min-w-0 max-w-[220px]">
      <span className="shrink-0" title={label !== "—" ? label : undefined}>
        <DonationCountryFlag countryCode={countryCode} />
      </span>
      <span className="text-sm text-slate-800 truncate" title={label !== "—" ? label : undefined}>
        {label}
      </span>
    </div>
  );
}

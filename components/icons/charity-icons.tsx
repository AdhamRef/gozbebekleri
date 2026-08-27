import React from "react";

/**
 * Icons Lucide doesn't ship that our project types need — mosque, qurbani,
 * wells, mushaf and so on. Drawn on Lucide's grid (24×24, 2px round strokes,
 * `currentColor`) so they sit next to real Lucide icons without looking pasted in.
 */

export interface CharityIconProps {
  className?: string;
}

function Glyph({
  className = "w-4 h-4",
  children,
}: CharityIconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** مسجد — dome, two minarets, arched door. */
export const Mosque = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <path d="M8 11a4 4 0 0 1 8 0" />
    <path d="M12 7V5" />
    <path d="M8 11v10" />
    <path d="M16 11v10" />
    <path d="M11 21v-3a1 1 0 0 1 2 0v3" />
    <path d="M5 21V10" />
    <path d="M19 21V10" />
    <path d="M4 10h2" />
    <path d="M18 10h2" />
    <path d="M3 21h18" />
  </Glyph>
);

/** أضاحي — a sheep, for qurbani and livestock projects. */
export const Qurbani = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <path d="M4 13a3 3 0 0 1 3-3h5a3 3 0 0 1 0 6H7a3 3 0 0 1-3-3Z" />
    <circle cx="17" cy="10" r="2.5" />
    <path d="M19.2 8.2 21 7" />
    <path d="M7 16v3" />
    <path d="M11 16v3" />
  </Glyph>
);

/** بئر — a well with a roof, rope and bucket. */
export const WaterWell = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <path d="m3 9 9-5 9 5" />
    <path d="M7 9v3" />
    <path d="M17 9v3" />
    <path d="M5 12h14" />
    <path d="M6 12v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8" />
    <path d="M12 9v5" />
    <path d="M10 14h4v3h-4z" />
  </Glyph>
);

/** حنفية / مضخة — a tap with a falling drop, for water access projects. */
export const WaterTap = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <path d="M4 5h6" />
    <path d="M7 5v6" />
    <path d="M4 11h9a3 3 0 0 1 3 3v1" />
    <path d="M18 22a2.5 2.5 0 0 1-2.5-2.5c0-1.5 2.5-4 2.5-4s2.5 2.5 2.5 4A2.5 2.5 0 0 1 18 22Z" />
  </Glyph>
);

/** مصحف — an open mushaf on its rest. */
export const Quran = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <path d="M12 7v10" />
    <path d="M12 7c-1.5-1.6-3.6-2.2-6-2v10c2.4-.2 4.5.4 6 2" />
    <path d="M12 7c1.5-1.6 3.6-2.2 6-2v10c-2.4-.2-4.5.4-6 2" />
    <path d="m4 19 8 3 8-3" />
  </Glyph>
);

/** سجادة صلاة — prayer rug with a mihrab arch. */
export const PrayerRug = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <rect x="6" y="3" width="12" height="18" rx="2" />
    <path d="M10 17v-4a2 2 0 0 1 4 0v4" />
    <path d="M9 6h6" />
  </Glyph>
);

/** سلة غذائية — a food parcel basket. */
export const FoodBasket = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <path d="M3 10h18" />
    <path d="m5 10 1.6 9a2 2 0 0 0 2 1.7h6.8a2 2 0 0 0 2-1.7L19 10" />
    <path d="m8 10 2-6" />
    <path d="m16 10-2-6" />
    <path d="M10 14v3" />
    <path d="M14 14v3" />
  </Glyph>
);

/** إفطار صائم — a covered plate under a crescent. */
export const IftarMeal = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <path d="M3 18h18" />
    <path d="M5 18a7 7 0 0 1 14 0" />
    <path d="M18.5 3.5a3.2 3.2 0 1 0 2 4.2 3.7 3.7 0 0 1-2-4.2Z" />
  </Glyph>
);

/** كفالة يتيم — a sheltering hand over a child. */
export const OrphanCare = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <path d="M3 9a9 9 0 0 1 18 0" />
    <circle cx="12" cy="14" r="2.5" />
    <path d="M8 21a4 4 0 0 1 8 0" />
  </Glyph>
);

/** صندوق صدقة — a donation box with a coin slot. */
export const CharityBox = ({ className }: CharityIconProps) => (
  <Glyph className={className}>
    <rect x="3" y="8" width="18" height="13" rx="2" />
    <path d="M9 12h6" />
    <path d="M12 3v3" />
    <path d="m9.5 4.5 2.5 1.5 2.5-1.5" />
  </Glyph>
);

export const CHARITY_ICONS = {
  Mosque,
  Qurbani,
  WaterWell,
  WaterTap,
  Quran,
  PrayerRug,
  FoodBasket,
  IftarMeal,
  OrphanCare,
  CharityBox,
};

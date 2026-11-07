/**
 * Institution-owned quick donation configuration foundation.
 *
 * Contains no Minber project IDs, defaults, payment routing, data or credentials.
 * Callers MUST load approved destinations from the institution's own database
 * and re-check them server-side immediately before cart creation.
 * This is intentionally not wired into checkout until the existing
 * destination/checkout integration is audited.
 */
export type QuickCadence = "once" | "daily" | "friday" | "monthly";
export type QuickDestinationType = "project" | "category" | "intention";
export interface QuickDestination {
  id: string;
  type: QuickDestinationType;
  label: string;
  enabled: boolean;
  projectId: string | null;
}
export interface InstitutionQuickDonation {
  enabled: boolean;
  display: { desktop: boolean; mobile: boolean; sticky: boolean };
  currency: string;
  amounts: number[];
  customAmount: boolean;
  cadences: QuickCadence[];
  defaultCadence: QuickCadence;
  destinations: QuickDestination[];
  defaultDestinationId: string | null;
  titles: Record<string, string>;
}
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const MONEY = /^[A-Z]{3}$/;
const CADENCES: readonly QuickCadence[] = ["once", "daily", "friday", "monthly"];
const TYPES: readonly QuickDestinationType[] = ["project", "category", "intention"];

export const EMPTY_INSTITUTION_QUICK_DONATION: InstitutionQuickDonation = {
  enabled: false,
  display: { desktop: true, mobile: true, sticky: false },
  currency: "USD",
  amounts: [10, 25, 50, 100],
  customAmount: true,
  cadences: ["once"],
  defaultCadence: "once",
  destinations: [],
  defaultDestinationId: null,
  titles: {},
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_QUICK_DONATION");
  return value as Record<string, unknown>;
}
function id(value: unknown): value is string { return typeof value === "string" && ID.test(value); }

/** Strict admin-side validation. Never repair a broken payable target silently. */
export function validateInstitutionQuickDonation(value: unknown): InstitutionQuickDonation {
  const v = record(value);
  if (typeof v.enabled !== "boolean" || typeof v.customAmount !== "boolean") throw new Error("INVALID_QUICK_DONATION_SWITCH");
  const display = record(v.display);
  for (const key of ["desktop", "mobile", "sticky"]) if (typeof display[key] !== "boolean") {
    throw new Error("INVALID_QUICK_DONATION_DISPLAY");
  }
  if (typeof v.currency !== "string" || !MONEY.test(v.currency)) throw new Error("INVALID_QUICK_DONATION_CURRENCY");
  if (!Array.isArray(v.amounts) || v.amounts.length < 2 || v.amounts.length > 6 ||
      v.amounts.some(a => typeof a !== "number" || !Number.isFinite(a) || a <= 0 || Math.abs(Math.round(a * 100) - a * 100) > 1e-7) ||
      new Set(v.amounts).size !== v.amounts.length) throw new Error("INVALID_QUICK_DONATION_AMOUNTS");
  if (!Array.isArray(v.cadences) || !v.cadences.length ||
      v.cadences.some(c => !CADENCES.includes(c as QuickCadence)) ||
      new Set(v.cadences).size !== v.cadences.length ||
      !v.cadences.includes(v.defaultCadence)) throw new Error("INVALID_QUICK_DONATION_CADENCE");
  if (!Array.isArray(v.destinations) || v.destinations.length > 200) throw new Error("INVALID_QUICK_DONATION_DESTINATIONS");
  const destinations = v.destinations.map(raw => {
    const d = record(raw);
    if (!id(d.id) || !TYPES.includes(d.type as QuickDestinationType) ||
        typeof d.label !== "string" || !d.label.trim() || d.label.length > 100 ||
        typeof d.enabled !== "boolean" ||
        (d.projectId !== null && !id(d.projectId))) throw new Error("INVALID_QUICK_DONATION_DESTINATION");
    return { id: d.id, type: d.type as QuickDestinationType, label: d.label.trim(), enabled: d.enabled, projectId: d.projectId as string | null };
  });
  if (new Set(destinations.map(d => d.id)).size !== destinations.length) throw new Error("DUPLICATE_QUICK_DONATION_DESTINATION");
  if (v.enabled && !destinations.some(d => d.enabled && d.projectId)) throw new Error("QUICK_DONATION_REQUIRES_APPROVED_TARGET");
  if (v.defaultDestinationId !== null && !id(v.defaultDestinationId)) throw new Error("INVALID_QUICK_DONATION_DEFAULT");
  if (v.defaultDestinationId && !destinations.some(d => d.id === v.defaultDestinationId && d.enabled && d.projectId)) {
    throw new Error("UNAVAILABLE_QUICK_DONATION_DEFAULT");
  }
  const titles = record(v.titles);
  if (Object.keys(titles).length > 16 || Object.entries(titles).some(([language, title]) =>
    !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language) || typeof title !== "string" || title.length > 100)) {
    throw new Error("INVALID_QUICK_DONATION_TITLES");
  }
  return {
    enabled: v.enabled, display: { desktop: display.desktop as boolean, mobile: display.mobile as boolean, sticky: display.sticky as boolean },
    currency: v.currency, amounts: [...v.amounts] as number[], customAmount: v.customAmount,
    cadences: [...v.cadences] as QuickCadence[], defaultCadence: v.defaultCadence as QuickCadence,
    destinations, defaultDestinationId: v.defaultDestinationId as string | null,
    titles: { ...titles } as Record<string, string>,
  };
}

/**
 * Returns a candidate only, not cart authorization. The server MUST confirm
 * that this project's own Campaign exists, is published/active and not deleted
 * at the point of donation.
 */
export function resolveInstitutionQuickDonationTarget(
  config: InstitutionQuickDonation,
  destinationId: string,
): string | null {
  if (!config.enabled) return null;
  return config.destinations.find(d => d.id === destinationId && d.enabled && d.projectId)?.projectId ?? null;
}

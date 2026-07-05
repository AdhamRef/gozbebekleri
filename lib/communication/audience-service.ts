import { prisma } from "@/lib/prisma";
import { SUPPORTED_LOCALES, LOCALES, type SupportedLocale } from "@/lib/locales";
import type { CommunicationChannel } from "./communication-types";

/**
 * Dynamic audiences — computed live from the donor base (`User`), never a manual
 * per-channel list. Language comes from `User.preferredLang`; channel eligibility is
 * derived from existing fields with lawful-safe defaults:
 *   - EMAIL  : has email AND emailNotifications !== false
 *   - SMS    : has phone AND smsNotifications !== false
 *   - WHATSAPP: has phone → NEEDS_REVIEW (no WhatsApp marketing-consent field exists,
 *               so donors are never silently bulk-eligible; a human must confirm consent)
 *
 * Read-only: no writes, no sends, no provider calls.
 */

export type ChannelEligibility = "ELIGIBLE" | "NEEDS_REVIEW" | "UNAVAILABLE";

export type LanguageAudienceSummary = {
  id: string;
  locale: SupportedLocale;
  label: string;
  nativeLabel: string;
  /** Total donors whose preferredLang is this locale. */
  total: number;
  withEmail: number;
  withPhone: number;
  /** Marketing eligibility counts per channel. */
  emailEligible: number;
  smsEligible: number;
  /** WhatsApp has no consent field → all phone-havers require human review. */
  whatsappNeedsReview: number;
};

export type AudienceOverview = {
  generatedAt: string;
  totals: {
    donors: number;
    withLanguage: number;
    unspecifiedLanguage: number;
    emailEligible: number;
    smsEligible: number;
    whatsappNeedsReview: number;
  };
  languages: LanguageAudienceSummary[];
  consentNote: string;
};

const DONOR_BASE = { role: "DONOR" as const };

/** Count donors for a locale + optional channel-eligibility predicate. */
async function localeCounts(locale: SupportedLocale) {
  const base = { ...DONOR_BASE, preferredLang: locale };
  const [total, withEmail, withPhone, emailEligible, smsEligible] = await Promise.all([
    prisma.user.count({ where: base }),
    prisma.user.count({ where: { ...base, email: { not: null } } }),
    prisma.user.count({ where: { ...base, phone: { not: null } } }),
    prisma.user.count({ where: { ...base, email: { not: null }, emailNotifications: true } }),
    prisma.user.count({ where: { ...base, phone: { not: null }, smsNotifications: true } }),
  ]);
  // No WhatsApp consent field exists — every phone-haver is NEEDS_REVIEW, never auto-eligible.
  return { total, withEmail, withPhone, emailEligible, smsEligible, whatsappNeedsReview: withPhone };
}

export async function getAudienceOverview(): Promise<AudienceOverview> {
  const perLocale = await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => ({ locale, counts: await localeCounts(locale) }))
  );

  const [donors, withLanguage] = await Promise.all([
    prisma.user.count({ where: DONOR_BASE }),
    prisma.user.count({ where: { ...DONOR_BASE, preferredLang: { in: [...SUPPORTED_LOCALES] } } }),
  ]);

  const languages: LanguageAudienceSummary[] = perLocale.map(({ locale, counts }) => ({
    id: `lang-${locale}`,
    locale,
    label: LOCALES[locale].label,
    nativeLabel: LOCALES[locale].nativeLabel,
    ...counts,
  }));

  const totals = {
    donors,
    withLanguage,
    unspecifiedLanguage: Math.max(0, donors - withLanguage),
    emailEligible: languages.reduce((sum, l) => sum + l.emailEligible, 0),
    smsEligible: languages.reduce((sum, l) => sum + l.smsEligible, 0),
    whatsappNeedsReview: languages.reduce((sum, l) => sum + l.whatsappNeedsReview, 0),
  };

  return {
    generatedAt: new Date().toISOString(),
    totals,
    languages,
    consentNote:
      "أهلية القنوات تُشتق من تفضيلات الإشعارات المسجّلة. لا توجد موافقة تسويقية صريحة لواتساب بعد، لذلك يظهر المتبرعون كـ«يحتاج مراجعة» ولا يُرسل لهم جماعيًا دون موافقة.",
  };
}

/** Whether a donor row is eligible on a channel for marketing (safe defaults). */
export function donorChannelEligibility(
  donor: { email?: string | null; phone?: string | null; emailNotifications?: boolean; smsNotifications?: boolean },
  channel: CommunicationChannel
): ChannelEligibility {
  if (channel === "EMAIL") {
    if (!donor.email) return "UNAVAILABLE";
    return donor.emailNotifications === false ? "UNAVAILABLE" : "ELIGIBLE";
  }
  if (channel === "SMS") {
    if (!donor.phone) return "UNAVAILABLE";
    return donor.smsNotifications === false ? "UNAVAILABLE" : "ELIGIBLE";
  }
  // WHATSAPP — no consent field, never silently eligible.
  return donor.phone ? "NEEDS_REVIEW" : "UNAVAILABLE";
}

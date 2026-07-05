import { prisma } from "@/lib/prisma";
import { SUPPORTED_LOCALES, LOCALES, isValidLocale, type SupportedLocale } from "@/lib/locales";
import type { CommunicationChannelId } from "./communication-runtime-types";

/**
 * Recipient counts + eligibility breakdown for a campaign, per locale, for one channel.
 * Read-only. Prefers the DonorCommunicationProfile for WhatsApp opt-in and do-not-contact,
 * and falls back to the legacy User notification flags for email/SMS.
 */

export type LocaleRecipientBreakdown = {
  locale: SupportedLocale;
  label: string;
  total: number;
  eligible: number;
  needsReview: number;
  missingContact: number;
  optedOut: number;
  doNotContact: number;
};

export type CampaignRecipientBreakdown = {
  channel: CommunicationChannelId;
  locales: LocaleRecipientBreakdown[];
  totals: Omit<LocaleRecipientBreakdown, "locale" | "label">;
  recipientLocaleCounts: Record<string, number>; // eligible-per-locale, for language coverage
};

const DONOR = { role: "DONOR" as const };

async function localeBreakdown(channel: CommunicationChannelId, locale: SupportedLocale): Promise<LocaleRecipientBreakdown> {
  const base = { ...DONOR, preferredLang: locale };
  const [total, withEmail, withPhone, dnc] = await Promise.all([
    prisma.user.count({ where: base }),
    prisma.user.count({ where: { ...base, email: { not: null } } }),
    prisma.user.count({ where: { ...base, phone: { not: null } } }),
    prisma.donorCommunicationProfile.count({ where: { preferredLocale: locale, doNotContact: true } }).catch(() => 0),
  ]);

  if (channel === "EMAIL") {
    const [eligible, optedOut] = await Promise.all([
      prisma.user.count({ where: { ...base, email: { not: null }, emailNotifications: true } }),
      prisma.user.count({ where: { ...base, email: { not: null }, emailNotifications: false } }),
    ]);
    return { locale, label: LOCALES[locale].label, total, eligible: Math.max(0, eligible - dnc), needsReview: 0, missingContact: Math.max(0, total - withEmail), optedOut, doNotContact: dnc };
  }
  if (channel === "SMS") {
    const [eligible, optedOut] = await Promise.all([
      prisma.user.count({ where: { ...base, phone: { not: null }, smsNotifications: true } }),
      prisma.user.count({ where: { ...base, phone: { not: null }, smsNotifications: false } }),
    ]);
    return { locale, label: LOCALES[locale].label, total, eligible: Math.max(0, eligible - dnc), needsReview: 0, missingContact: Math.max(0, total - withPhone), optedOut, doNotContact: dnc };
  }
  // WHATSAPP — eligible only with explicit opt-in; other phone contacts need review.
  const eligible = await prisma.donorCommunicationProfile
    .count({ where: { preferredLocale: locale, whatsappOptIn: true, doNotContact: false } })
    .catch(() => 0);
  const needsReview = Math.max(0, withPhone - eligible);
  return { locale, label: LOCALES[locale].label, total, eligible, needsReview, missingContact: Math.max(0, total - withPhone), optedOut: 0, doNotContact: dnc };
}

export async function getRecipientBreakdown(
  channel: CommunicationChannelId,
  opts: { locale?: string | null } = {}
): Promise<CampaignRecipientBreakdown> {
  const targetLocales: SupportedLocale[] =
    opts.locale && isValidLocale(opts.locale) ? [opts.locale] : [...SUPPORTED_LOCALES];

  const locales = await Promise.all(targetLocales.map((l) => localeBreakdown(channel, l)));

  const totals = locales.reduce(
    (acc, l) => ({
      total: acc.total + l.total,
      eligible: acc.eligible + l.eligible,
      needsReview: acc.needsReview + l.needsReview,
      missingContact: acc.missingContact + l.missingContact,
      optedOut: acc.optedOut + l.optedOut,
      doNotContact: acc.doNotContact + l.doNotContact,
    }),
    { total: 0, eligible: 0, needsReview: 0, missingContact: 0, optedOut: 0, doNotContact: 0 }
  );

  const recipientLocaleCounts: Record<string, number> = {};
  for (const l of locales) recipientLocaleCounts[l.locale] = l.eligible;

  return { channel, locales, totals, recipientLocaleCounts };
}

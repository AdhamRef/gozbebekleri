import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE, isValidLocale, type SupportedLocale } from "@/lib/locales";
import { resolveEmailVariant, resolveWhatsappBody } from "@/lib/templates/locale-resolver";
import { renderTemplatePreview } from "./template-renderer";
import type { CommunicationChannelId } from "./communication-runtime-types";

/**
 * Compatibility layer over the existing WhatsappTemplate / EmailTemplate models so campaigns can
 * list templates, compute language coverage against `translations`, and render per-locale previews
 * — without a dedicated CommunicationTemplateGroup model (not overbuilt). SMS reuses the WhatsApp
 * text templates (short text bodies); Email uses subject/body.
 */

export type ChannelTemplateSummary = {
  id: string;
  name: string;
  availableLocales: SupportedLocale[];
};

function localesFromTranslations(base: SupportedLocale, translations: unknown): SupportedLocale[] {
  const set = new Set<SupportedLocale>([base]);
  if (translations && typeof translations === "object") {
    for (const key of Object.keys(translations as Record<string, unknown>)) {
      if (isValidLocale(key)) set.add(key);
    }
  }
  return [...set];
}

/** Whether the channel's text templates come from the WhatsApp store (WHATSAPP + SMS) or Email. */
function usesWhatsappStore(channel: CommunicationChannelId): boolean {
  return channel === "WHATSAPP" || channel === "SMS";
}

export async function listChannelTemplates(channel: CommunicationChannelId): Promise<ChannelTemplateSummary[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    if (usesWhatsappStore(channel)) {
      const rows = await prisma.whatsappTemplate.findMany({
        select: { id: true, name: true, translations: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((t) => ({ id: t.id, name: t.name, availableLocales: localesFromTranslations(DEFAULT_LOCALE, t.translations) }));
    }
    const rows = await prisma.emailTemplate.findMany({
      select: { id: true, name: true, translations: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((t) => ({ id: t.id, name: t.name, availableLocales: localesFromTranslations(DEFAULT_LOCALE, t.translations) }));
  } catch (error) {
    console.error("listChannelTemplates failed", error);
    return [];
  }
}

export async function getTemplateAvailableLocales(channel: CommunicationChannelId, templateId: string): Promise<SupportedLocale[]> {
  const list = await listChannelTemplates(channel);
  return list.find((t) => t.id === templateId)?.availableLocales ?? [];
}

export type RenderedTemplate = {
  channel: CommunicationChannelId;
  locale: SupportedLocale;
  resolvedLocale: SupportedLocale;
  usedFallback: boolean;
  subject: string | null;
  body: string;
  variables: string[];
  templateName: string;
};

/** Render a per-locale preview using sample variable values (no PII, no send). */
export async function renderChannelTemplate(
  channel: CommunicationChannelId,
  templateId: string,
  locale: SupportedLocale
): Promise<RenderedTemplate | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    if (usesWhatsappStore(channel)) {
      const tpl = await prisma.whatsappTemplate.findUnique({ where: { id: templateId }, select: { name: true, body: true, translations: true } });
      if (!tpl) return null;
      const variant = resolveWhatsappBody(tpl, locale);
      const preview = renderTemplatePreview(variant.body);
      return {
        channel,
        locale,
        resolvedLocale: variant.resolvedLocale,
        usedFallback: variant.resolvedLocale !== locale,
        subject: null,
        body: preview.rendered,
        variables: preview.variables,
        templateName: tpl.name,
      };
    }
    const tpl = await prisma.emailTemplate.findUnique({ where: { id: templateId }, select: { name: true, subject: true, document: true, translations: true } });
    if (!tpl) return null;
    const variant = resolveEmailVariant(tpl, locale);
    const subjectPreview = renderTemplatePreview(variant.subject);
    return {
      channel,
      locale,
      resolvedLocale: variant.resolvedLocale,
      usedFallback: variant.resolvedLocale !== locale,
      subject: subjectPreview.rendered,
      body: "معاينة النص الكامل للإيميل تظهر عند تجهيز الإرسال.",
      variables: subjectPreview.variables,
      templateName: tpl.name,
    };
  } catch (error) {
    console.error("renderChannelTemplate failed", error);
    return null;
  }
}

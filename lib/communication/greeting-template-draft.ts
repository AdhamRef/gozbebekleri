import { createHash } from "node:crypto";
import { SUPPORTED_LOCALES, type AnyLocale as SupportedLocale } from "@/lib/ported-systems/locales";
import { RECEIPT_BRANDS } from "../templates/receipt-localization";
import { whatsappUnsubscribeCopy } from "./whatsapp-template-unsubscribe";

// An unsolicited greeting is submitted as MARKETING, never disguised as a
// transactional receipt. Every language has its own body, brand and stop control.
const GREETINGS: Record<SupportedLocale, string> = {
  ar: "السلام عليكم {{user.name}}،\n\nكيف يمكننا مساعدتك اليوم؟ رد على هذه الرسالة وسيتابع معك فريقنا.",
  tr: "Merhaba {{user.name}},\n\nBugün size nasıl yardımcı olabiliriz? Bu mesajı yanıtlayın; ekibimiz sizinle ilgilenecektir.",
  en: "Hello {{user.name}},\n\nHow can we help you today? Reply to this message and our team will assist you.",
  fr: "Bonjour {{user.name}},\n\nComment pouvons-nous vous aider aujourd’hui ? Répondez à ce message et notre équipe vous accompagnera.",
  de: "Guten Tag {{user.name}},\n\nWie können wir Ihnen heute helfen? Antworten Sie auf diese Nachricht, und unser Team kümmert sich um Ihr Anliegen.",
  es: "Hola {{user.name}}:\n\n¿Cómo podemos ayudarte hoy? Responde a este mensaje y nuestro equipo te atenderá.",
  id: "Halo {{user.name}},\n\nApa yang dapat kami bantu hari ini? Balas pesan ini dan tim kami akan membantu Anda.",
  pt: "Olá {{user.name}},\n\nComo podemos ajudar hoje? Responda a esta mensagem e a nossa equipa irá prestar-lhe apoio.",
  ur: "السلام علیکم {{user.name}}،\n\nآج ہم آپ کی کیا مدد کر سکتے ہیں؟ اس پیغام کا جواب دیں، ہماری ٹیم آپ کی رہنمائی کرے گی۔",
  sq: "Përshëndetje {{user.name}},\n\nSi mund t’ju ndihmojmë sot? Përgjigjuni këtij mesazhi dhe ekipi ynë do t’ju ndihmojë.",
  it: "Buongiorno {{user.name}},\n\nCome possiamo aiutarla oggi? Risponda a questo messaggio e il nostro team la assisterà.",
  nl: "Hallo {{user.name}},\n\nHoe kunnen we u vandaag helpen? Beantwoord dit bericht en ons team helpt u verder.",
  sv: "Hej {{user.name}},\n\nHur kan vi hjälpa dig idag? Svara på det här meddelandet så hjälper vårt team dig vidare.",
  no: "Hei {{user.name}},\n\nHvordan kan vi hjelpe deg i dag? Svar på denne meldingen, så hjelper teamet vårt deg videre.",
  da: "Hej {{user.name}},\n\nHvordan kan vi hjælpe dig i dag? Svar på denne besked, så hjælper vores team dig videre.",
  ms: "Salam {{user.name}},\n\nBagaimanakah kami boleh membantu anda hari ini? Balas mesej ini dan pasukan kami akan membantu anda.",
  ja: "{{user.name}}様、こんにちは。\n\n本日はどのようなご用件でしょうか。このメッセージにご返信いただければ、担当チームがご案内いたします。",
  zh: "{{user.name}}，您好！\n\n今天有什么可以帮助您的吗？请回复此消息，我们的团队会为您提供协助。",
  hi: "नमस्ते {{user.name}},\n\nआज हम आपकी क्या मदद कर सकते हैं? इस संदेश का जवाब दें, हमारी टीम आपका मार्गदर्शन करेगी।",
};

export function greetingTemplateDraft(legacy = false) {
  const translations = Object.fromEntries(SUPPORTED_LOCALES.map(locale => {
    const copy = whatsappUnsubscribeCopy(locale);
    const body = !legacy && locale === "ja" ? GREETINGS.ja.replace("{{user.name}}様、こんにちは。", "こんにちは、{{user.name}}様。")
      : !legacy && locale === "zh" ? GREETINGS.zh.replace("{{user.name}}，您好！", "您好，{{user.name}}！") : GREETINGS[locale];
    return [locale, { body: `${body}\n\n${RECEIPT_BRANDS[locale]}`, footerText: copy.footer, buttons: [{ type: "QUICK_REPLY", text: copy.button }] }];
  })) as Record<SupportedLocale, { body: string; footerText: string; buttons: { type: string; text: string }[] }>;
  // Keep the existing provider family: its other 17 languages are already approved.
  // Setup may correct these two locales only while neither has entered Meta's lifecycle.
  const hash = createHash("sha256").update(JSON.stringify(translations)).digest("hex").slice(0, 12);
  return { name: `mia_greeting_${hash}`, ...translations.ar, translations };
}

export function greetingTemplateMatches(existing: { body: string; footerText?: string | null; buttons?: unknown; translations: unknown }) {
  const draft = greetingTemplateDraft();
  const translations = existing.translations && typeof existing.translations === "object" ? existing.translations as Record<string, unknown> : {};
  const rootButtons = existing.buttons as Array<{ type?: string; text?: string }> | null;
  return existing.body === draft.body && existing.footerText === draft.footerText && Array.isArray(rootButtons) && rootButtons.length === 1 && rootButtons[0].type === draft.buttons[0].type && rootButtons[0].text === draft.buttons[0].text && SUPPORTED_LOCALES.every(locale => {
    const value = translations[locale] as { body?: string; footerText?: string; buttons?: Array<{ type?: string; text?: string }> } | undefined;
    const expected = draft.translations[locale];
    return value?.body === expected.body && value.footerText === expected.footerText && value.buttons?.length === 1 && value.buttons[0].type === expected.buttons[0].type && value.buttons[0].text === expected.buttons[0].text;
  });
}

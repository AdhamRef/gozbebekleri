import type { IntegrationProvider } from "@/lib/integration-settings/catalog";
import type { SafeIntegrationProviderSnapshotWithTests } from "@/lib/integration-settings/safe-snapshot";

export type IntegrationUiSnapshot = SafeIntegrationProviderSnapshotWithTests;
export const PROVIDER_ORDER: IntegrationProvider[] = ["META_WHATSAPP", "ELASTIC_EMAIL", "BREVO", "NETGSM", "SYSTEM"];

export const WEBHOOKS: Partial<Record<IntegrationProvider, { label: string; path: string }>> = {
  META_WHATSAPP: { label: "رابط Meta Webhook", path: "/api/webhooks/meta/whatsapp" },
  ELASTIC_EMAIL: { label: "رابط أحداث Elastic Email", path: "/api/webhooks/elastic-email" },
  BREVO: { label: "رابط أحداث Brevo SMS", path: "/api/webhooks/brevo/transactional" },
  SYSTEM: { label: "رابط Cron", path: "/api/cron/communication-run-due" },
};

/**
 * Providers whose webhook secret is minted server-side and revealed exactly once. The panel makes
 * the WEBHOOK_SECRET field read-only for these and offers a rotate action instead.
 */
export const ROTATABLE_WEBHOOK_PROVIDERS: Partial<Record<IntegrationProvider, { title: string; actionLabel: string; revealHint: string }>> = {
  ELASTIC_EMAIL: {
    title: "Elastic Email Webhook",
    actionLabel: "إنشاء أو تدوير رابط Elastic Email Webhook",
    revealHint: "انسخ الرابط الآن وأضفه داخل Elastic Email ضمن Settings → Notifications. لن يظهر رمز الحماية كاملًا مرة أخرى.",
  },
  BREVO: {
    title: "Brevo Webhook",
    actionLabel: "إنشاء أو تدوير رابط Brevo Webhook",
    revealHint: "انسخ الرابط الآن وأضفه داخل Brevo. لن يظهر رمز الحماية كاملًا مرة أخرى.",
  },
};

export const ADVANCED_LINKS: Partial<Record<IntegrationProvider, { href: string; label: string }[]>> = {
  META_WHATSAPP: [{ href: "/dashboard/operations/communication/senders", label: "إدارة أرقام واتساب والمُرسلين" }],
  ELASTIC_EMAIL: [{ href: "/dashboard/operations/communication/senders", label: "إدارة مُرسلي البريد" }],
  BREVO: [{ href: "/dashboard/operations/communication/senders", label: "إدارة مُرسلي الرسائل القصيرة" }],
  NETGSM: [{ href: "/dashboard/operations/communication/delivery-logs", label: "فتح سجل الرسائل" }],
  SYSTEM: [{ href: "/dashboard/operations/communication/settings", label: "تفاصيل الجدولة والتشغيل" }],
};

export type IntegrationUiPermissions = {
  canView: boolean;
  canTest: boolean;
  canManage: boolean;
  canAdmin: boolean;
};

export type SchedulerUiStatus = {
  configured: boolean;
  scheduledCount: number;
  dueCount: number;
  lastRunAt: string | null;
  lastSuccessfulRunAt: string | null;
};

export function sourceLabel(source: string): string {
  return source === "DATABASE" ? "محفوظ داخل النظام" : source === "ENVIRONMENT" ? "مستخدم من إعدادات السيرفر" : "غير مضبوط";
}

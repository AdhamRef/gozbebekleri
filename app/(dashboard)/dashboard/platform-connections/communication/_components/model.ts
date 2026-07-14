import type { IntegrationProvider } from "@/lib/integration-settings/catalog";

export const PROVIDER_ORDER: IntegrationProvider[] = ["META_WHATSAPP", "BREVO", "NETGSM", "SYSTEM"];

export const WEBHOOKS: Partial<Record<IntegrationProvider, { label: string; path: string }>> = {
  META_WHATSAPP: { label: "رابط Meta Webhook", path: "/api/webhooks/meta/whatsapp" },
  BREVO: { label: "رابط Brevo Webhook", path: "/api/webhooks/brevo/transactional" },
  SYSTEM: { label: "رابط Cron", path: "/api/cron/communication-run-due" },
};

export const ADVANCED_LINKS: Partial<Record<IntegrationProvider, { href: string; label: string }[]>> = {
  META_WHATSAPP: [{ href: "/dashboard/operations/communication/senders", label: "إدارة أرقام واتساب والمُرسلين" }],
  BREVO: [{ href: "/dashboard/operations/communication/senders", label: "إدارة مُرسلي البريد والرسائل" }],
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
};

export function sourceLabel(source: string): string {
  return source === "DATABASE" ? "محفوظ داخل النظام" : source === "ENVIRONMENT" ? "مستخدم من إعدادات السيرفر" : "غير مضبوط";
}

import { communicationProviderRegistry } from "./provider-registry";
import type { CommunicationProviderKey, ProviderConnection, ProviderConnectionStatus } from "./communication-types";

export type ProviderRequirement = {
  id: string;
  label: string;
  configured: boolean;
  required: boolean;
};

export type ProviderConnectionReadiness = ProviderConnection & {
  requirements: ProviderRequirement[];
  configuredRequiredCount: number;
  requiredCount: number;
  readinessPercent: number;
  actionLabel: string;
};

const providerRequirements: Record<CommunicationProviderKey, ProviderRequirement[]> = {
  META_WHATSAPP: [
    { id: "business_account", label: "حساب WhatsApp Business", configured: false, required: true },
    { id: "phone_number", label: "رقم واتساب للإرسال", configured: false, required: true },
    { id: "access_token", label: "صلاحية وصول آمنة", configured: false, required: true },
    { id: "webhook_verify", label: "Webhook للتحقق واستقبال الحالات", configured: false, required: true },
  ],
  BREVO_EMAIL: [
    { id: "sender", label: "مرسل الإيميل المعتمد", configured: false, required: true },
    { id: "api_key", label: "صلاحية API آمنة", configured: false, required: true },
    { id: "domain", label: "نطاق الإيميل موثق", configured: false, required: true },
    { id: "webhook", label: "Webhook لحالات الإرسال", configured: false, required: false },
  ],
  BREVO_SMS: [
    { id: "sender", label: "اسم أو رقم مرسل SMS", configured: false, required: true },
    { id: "api_key", label: "صلاحية API آمنة", configured: false, required: true },
    { id: "country_rules", label: "مراجعة قواعد الدول المستهدفة", configured: false, required: true },
  ],
  SMS_FALLBACK: [
    { id: "provider", label: "اختيار مزود احتياطي", configured: false, required: true },
    { id: "routing", label: "قواعد التحويل حسب الدولة", configured: false, required: true },
  ],
};

function envPresent(name: string) {
  return Boolean(process.env[name]?.trim());
}

function requirementsForProvider(key: CommunicationProviderKey): ProviderRequirement[] {
  const base = providerRequirements[key] ?? [];
  if (key === "META_WHATSAPP") {
    return base.map((item) => ({
      ...item,
      configured:
        item.id === "business_account" ? envPresent("META_WHATSAPP_BUSINESS_ACCOUNT_ID") :
        item.id === "phone_number" ? envPresent("META_WHATSAPP_PHONE_NUMBER_ID") :
        item.id === "access_token" ? envPresent("META_WHATSAPP_ACCESS_TOKEN") :
        item.id === "webhook_verify" ? envPresent("META_WHATSAPP_WEBHOOK_VERIFY_TOKEN") : false,
    }));
  }
  if (key === "BREVO_EMAIL") {
    return base.map((item) => ({
      ...item,
      configured:
        item.id === "sender" ? envPresent("BREVO_EMAIL_SENDER") :
        item.id === "api_key" ? envPresent("BREVO_API_KEY") :
        item.id === "domain" ? envPresent("BREVO_EMAIL_DOMAIN") :
        item.id === "webhook" ? envPresent("BREVO_WEBHOOK_SECRET") : false,
    }));
  }
  if (key === "BREVO_SMS") {
    return base.map((item) => ({
      ...item,
      configured:
        item.id === "sender" ? envPresent("BREVO_SMS_SENDER") :
        item.id === "api_key" ? envPresent("BREVO_API_KEY") :
        item.id === "country_rules" ? envPresent("BREVO_SMS_COUNTRY_RULES_REVIEWED") : false,
    }));
  }
  return base.map((item) => ({
    ...item,
    configured:
      item.id === "provider" ? envPresent("SMS_FALLBACK_PROVIDER") :
      item.id === "routing" ? envPresent("SMS_FALLBACK_ROUTING_RULES") : false,
  }));
}

function statusFromRequirements(provider: ProviderConnection, requirements: ProviderRequirement[]): ProviderConnectionStatus {
  if (provider.status === "DISABLED") return "DISABLED";
  const required = requirements.filter((item) => item.required);
  const configured = required.filter((item) => item.configured);
  if (required.length > 0 && configured.length === required.length) return "CONFIGURED";
  if (configured.length > 0) return "NEEDS_ATTENTION";
  return "NOT_CONFIGURED";
}

export function getProviderConnectionsReadiness(): ProviderConnectionReadiness[] {
  return communicationProviderRegistry.map((provider) => {
    const requirements = requirementsForProvider(provider.key);
    const required = requirements.filter((item) => item.required);
    const configuredRequiredCount = required.filter((item) => item.configured).length;
    const status = statusFromRequirements(provider, requirements);
    return {
      ...provider,
      status,
      requirements,
      configuredRequiredCount,
      requiredCount: required.length,
      readinessPercent: required.length ? Math.round((configuredRequiredCount / required.length) * 100) : 0,
      actionLabel: status === "CONFIGURED" ? "جاهز للاختبار الآمن" : status === "NEEDS_ATTENTION" ? "أكمل الإعداد" : status === "DISABLED" ? "مؤجل" : "لم يبدأ الربط",
    };
  });
}

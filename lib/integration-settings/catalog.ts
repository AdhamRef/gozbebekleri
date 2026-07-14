export const INTEGRATION_PROVIDERS = [
  "META_WHATSAPP",
  "BREVO",
  "NETGSM",
  "SYSTEM",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const INTEGRATION_VALUE_SOURCES = [
  "DATABASE",
  "ENVIRONMENT",
  "NONE",
] as const;

export type IntegrationValueSource = (typeof INTEGRATION_VALUE_SOURCES)[number];

export const INTEGRATION_TEST_RESULTS = ["SUCCESS", "FAILED"] as const;
export type IntegrationTestResult = (typeof INTEGRATION_TEST_RESULTS)[number];

export type IntegrationFieldDefinition = {
  key: string;
  labelAr: string;
  envKey: string;
  secret: boolean;
  required: boolean;
};

export type IntegrationProviderDefinition = {
  provider: IntegrationProvider;
  labelAr: string;
  fields: readonly IntegrationFieldDefinition[];
};

export const INTEGRATION_PROVIDER_DEFINITIONS: Record<
  IntegrationProvider,
  IntegrationProviderDefinition
> = {
  META_WHATSAPP: {
    provider: "META_WHATSAPP",
    labelAr: "Meta WhatsApp",
    fields: [
      {
        key: "ACCESS_TOKEN",
        labelAr: "رمز الوصول",
        envKey: "META_WHATSAPP_ACCESS_TOKEN",
        secret: true,
        required: true,
      },
      {
        key: "APP_SECRET",
        labelAr: "مفتاح التطبيق",
        envKey: "META_WHATSAPP_APP_SECRET",
        secret: true,
        required: true,
      },
      {
        key: "WEBHOOK_VERIFY_TOKEN",
        labelAr: "رمز التحقق من Webhook",
        envKey: "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN",
        secret: true,
        required: true,
      },
      {
        key: "BUSINESS_ACCOUNT_ID",
        labelAr: "معرّف حساب الأعمال",
        envKey: "META_WHATSAPP_BUSINESS_ACCOUNT_ID",
        secret: false,
        required: true,
      },
      {
        key: "DEFAULT_PHONE_NUMBER_ID",
        labelAr: "معرّف رقم الهاتف الافتراضي",
        envKey: "META_WHATSAPP_PHONE_NUMBER_ID",
        secret: false,
        required: true,
      },
      {
        key: "GRAPH_API_VERSION",
        labelAr: "إصدار Graph API",
        envKey: "META_GRAPH_VERSION",
        secret: false,
        required: true,
      },
    ],
  },
  BREVO: {
    provider: "BREVO",
    labelAr: "Brevo",
    fields: [
      {
        key: "API_KEY",
        labelAr: "مفتاح API",
        envKey: "BREVO_API_KEY",
        secret: true,
        required: true,
      },
      {
        key: "EMAIL_SENDER_NAME",
        labelAr: "اسم مرسل البريد",
        envKey: "BREVO_EMAIL_SENDER_NAME",
        secret: false,
        required: false,
      },
      {
        key: "EMAIL_SENDER_EMAIL",
        labelAr: "بريد المرسل",
        envKey: "BREVO_EMAIL_SENDER_EMAIL",
        secret: false,
        required: true,
      },
      {
        key: "SMS_SENDER",
        labelAr: "اسم مرسل الرسائل القصيرة",
        envKey: "BREVO_SMS_SENDER",
        secret: false,
        required: true,
      },
      {
        key: "WEBHOOK_SECRET",
        labelAr: "مفتاح Webhook",
        envKey: "BREVO_SMS_WEBHOOK_SECRET",
        secret: true,
        required: false,
      },
    ],
  },
  NETGSM: {
    provider: "NETGSM",
    labelAr: "Netgsm",
    fields: [
      {
        key: "USERCODE",
        labelAr: "رمز المستخدم",
        envKey: "NETGSM_USERCODE",
        secret: false,
        required: true,
      },
      {
        key: "PASSWORD",
        labelAr: "كلمة المرور",
        envKey: "NETGSM_PASSWORD",
        secret: true,
        required: true,
      },
      {
        key: "HEADER",
        labelAr: "اسم المرسل",
        envKey: "NETGSM_HEADER",
        secret: false,
        required: true,
      },
    ],
  },
  SYSTEM: {
    provider: "SYSTEM",
    labelAr: "إعدادات النظام",
    fields: [
      {
        key: "CRON_SECRET",
        labelAr: "مفتاح الجدولة",
        envKey: "CRON_SECRET",
        secret: true,
        required: true,
      },
    ],
  },
};

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

export function getProviderDefinition(
  provider: IntegrationProvider
): IntegrationProviderDefinition {
  return INTEGRATION_PROVIDER_DEFINITIONS[provider];
}

export function getFieldDefinition(
  provider: IntegrationProvider,
  key: string
): IntegrationFieldDefinition | null {
  return (
    INTEGRATION_PROVIDER_DEFINITIONS[provider].fields.find(
      (field) => field.key === key
    ) ?? null
  );
}

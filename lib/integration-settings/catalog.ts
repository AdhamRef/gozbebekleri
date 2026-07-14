export const INTEGRATION_PROVIDERS = ["META_WHATSAPP", "BREVO", "NETGSM", "SYSTEM"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const INTEGRATION_VALUE_SOURCES = ["DATABASE", "ENVIRONMENT", "NONE"] as const;
export type IntegrationValueSource = (typeof INTEGRATION_VALUE_SOURCES)[number];

export const INTEGRATION_TEST_RESULTS = ["SUCCESS", "FAILED"] as const;
export type IntegrationTest
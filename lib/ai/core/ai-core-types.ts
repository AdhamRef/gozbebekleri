export type AiAssistantContextKey = "marketing" | "content" | "archive" | "brand";

export type AiAssistantCapability =
  | "ANALYZE_RESULTS"
  | "WRITE_COPY"
  | "PLAN_CONTENT"
  | "SEARCH_ARCHIVE"
  | "BRAND_GUARDRAILS"
  | "SUMMARIZE_EXECUTIVE";

export type AiAssistantContextDefinition = {
  key: AiAssistantContextKey;
  title: string;
  description: string;
  systemRole: string;
  capabilities: AiAssistantCapability[];
  allowedSources: string[];
  blockedActions: string[];
  entryHref: string;
};

export type AiCoreOverview = {
  source: string;
  generatedAt: string;
  summary: {
    contexts: number;
    capabilities: number;
    protectedActions: number;
  };
  contexts: AiAssistantContextDefinition[];
};

export type AiDraftResponse = {
  context: AiAssistantContextKey;
  mode: "SKELETON";
  title: string;
  answer: string;
  suggestedNextActions: string[];
};

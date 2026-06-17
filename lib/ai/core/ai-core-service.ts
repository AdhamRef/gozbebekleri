import type { AiAssistantContextDefinition, AiAssistantContextKey, AiCoreOverview, AiDraftResponse } from "./ai-core-types";

// Shared AI contexts for dashboard assistants.
// This is intentionally provider-agnostic: real OpenAI calls should be added behind this contract later.
export const aiAssistantContexts: AiAssistantContextDefinition[] = [
  {
    key: "marketing",
    title: "Marketing AI Assistant",
    description: "يساعد فريق التسويق في تحليل النتائج، ROAS، جودة التتبع، وأفكار تحسين الحملات.",
    systemRole: "Marketing performance analyst for donation growth.",
    capabilities: ["ANALYZE_RESULTS", "SUMMARIZE_EXECUTIVE", "WRITE_COPY"],
    allowedSources: ["marketing-results", "provider-health", "recommendations", "conversion-events"],
    blockedActions: ["No budget changes", "No external API calls", "No campaign publishing"],
    entryHref: "/dashboard/marketing/ai-assistant",
  },
  {
    key: "content",
    title: "Content AI Assistant",
    description: "يساعد فريق المحتوى في بناء خطط المواسم، النصوص، الكاروسيل، وجدولة المواد.",
    systemRole: "Content planning assistant for Islamic charity campaigns.",
    capabilities: ["PLAN_CONTENT", "WRITE_COPY", "SUMMARIZE_EXECUTIVE"],
    allowedSources: ["operations-overview", "content-calendar", "production-board", "scheduler"],
    blockedActions: ["No auto publishing", "No message sending", "No external API calls"],
    entryHref: "/dashboard/operations/ai-assistant",
  },
  {
    key: "archive",
    title: "Archive AI Assistant",
    description: "يساعد في البحث داخل الأرشيف، اقتراح مواد قابلة لإعادة الاستخدام، وتصنيف الأصول.",
    systemRole: "Archive retrieval and asset reuse assistant.",
    capabilities: ["SEARCH_ARCHIVE", "PLAN_CONTENT", "BRAND_GUARDRAILS"],
    allowedSources: ["archive-assets", "production-board", "brand-guidelines"],
    blockedActions: ["No file deletion", "No public publishing", "No external API calls"],
    entryHref: "/dashboard/operations/archive/ai-assistant",
  },
  {
    key: "brand",
    title: "Brand AI Assistant",
    description: "يحافظ على نبرة الهوية، الألوان، أسماء الجمعيات، وقواعد الكتابة لكل مؤسسة.",
    systemRole: "Brand governance assistant for multi-organization charity communications.",
    capabilities: ["BRAND_GUARDRAILS", "WRITE_COPY", "SUMMARIZE_EXECUTIVE"],
    allowedSources: ["brand-guidelines", "brand-assets", "organization-profiles"],
    blockedActions: ["No logo file changes", "No public publishing", "No legal claims"],
    entryHref: "/dashboard/brand",
  },
];

export function getAiCoreOverview(): AiCoreOverview {
  return {
    source: "shared-ai-core-skeleton",
    generatedAt: new Date().toISOString(),
    summary: {
      contexts: aiAssistantContexts.length,
      capabilities: new Set(aiAssistantContexts.flatMap((context) => context.capabilities)).size,
      protectedActions: aiAssistantContexts.flatMap((context) => context.blockedActions).length,
    },
    contexts: aiAssistantContexts,
  };
}

export function getAiContext(key: AiAssistantContextKey) {
  return aiAssistantContexts.find((context) => context.key === key) ?? null;
}

export function createAiDraftResponse(contextKey: AiAssistantContextKey, prompt: string): AiDraftResponse {
  const context = getAiContext(contextKey);
  return {
    context: contextKey,
    mode: "SKELETON",
    title: context ? `${context.title} جاهز للربط` : "AI Core جاهز للربط",
    answer: `تم استقبال الطلب: ${prompt.trim() || "بدون نص"}. هذه نسخة هيكلية آمنة لا تستدعي مزود AI خارجي بعد.`,
    suggestedNextActions: [
      "ربط OpenAI API من Shared Provider Connections.",
      "تحديد مصادر البيانات المسموحة لهذا السياق.",
      "إضافة سجل مراجعة قبل أي إجراء تشغيلي.",
    ],
  };
}

export type AiAssistantField = {
  key: string;
  label: string;
  required?: boolean;
  secret?: boolean;
  placeholder?: string;
  help: string;
};

export type AiAssistantCapability = {
  key: string;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
};

export const AI_ASSISTANT_FIELDS: AiAssistantField[] = [
  {
    key: "provider",
    label: "AI Provider",
    required: true,
    placeholder: "OpenAI / Azure / Custom",
    help: "اختر مزود الذكاء الاصطناعي المستخدم داخل الموقع. هذا يحدد طريقة الاتصال والـ endpoint المستخدم لاحقًا.",
  },
  {
    key: "apiKey",
    label: "API Key",
    required: true,
    secret: true,
    placeholder: "sk-...",
    help: "يُستخرج من لوحة تحكم مزود الذكاء الاصطناعي. يتم حفظه كقيمة سرية ولا يظهر للمستخدمين. يستخدم لتوليد التحليلات والتوصيات.",
  },
  {
    key: "model",
    label: "Model",
    required: true,
    placeholder: "gpt-4.1 / gpt-4o / custom",
    help: "اسم النموذج الذي سيستخدمه النظام لتحليل بيانات التسويق وإخراج توصيات واضحة.",
  },
  {
    key: "baseUrl",
    label: "Base URL",
    placeholder: "https://api.openai.com/v1",
    help: "اختياري إذا كنت تستخدم Azure أو gateway مخصص أو مزود OpenAI-compatible.",
  },
  {
    key: "assistantId",
    label: "Assistant ID",
    placeholder: "asst_...",
    help: "اختياري إذا كان لديك Assistant جاهز بتعليمات ثابتة. يمكن استخدامه لاحقًا بدل بناء prompt كامل في كل مرة.",
  },
  {
    key: "systemInstruction",
    label: "System Instruction",
    help: "تعليمات ثابتة للمساعد: أسلوب التوصيات، اللغة، طريقة حساب الأولويات، وحدود ما يسمح له بقوله للفريق.",
  },
];

export const AI_ASSISTANT_CAPABILITIES: AiAssistantCapability[] = [
  {
    key: "performance_summary",
    title: "ملخص الأداء",
    description: "يلخص الصرف، التبرعات، ROAS، الحملات الأفضل والأسوأ بلغة تنفيذية واضحة.",
    inputs: ["spend", "site revenue", "platform conversions", "campaign snapshots", "donations"],
    outputs: ["ملخص يومي", "أهم فرص النمو", "أهم المخاطر"],
  },
  {
    key: "budget_recommendations",
    title: "توصيات الميزانية",
    description: "يقترح زيادة أو تقليل أو إيقاف الميزانية حسب ROAS الحقيقي وجودة التتبع.",
    inputs: ["site ROAS", "platform ROAS", "spend", "conversion quality", "tracking confidence"],
    outputs: ["زود", "قلل", "أوقف", "اختبر"],
  },
  {
    key: "google_ads_diagnosis",
    title: "تحليل Google Ads",
    description: "يحلل الكلمات وSearch Terms والعناوين والأوصاف والأصول عند توفر بيانات GAQL.",
    inputs: ["keywords", "search terms", "headlines", "descriptions", "assets", "final URLs"],
    outputs: ["negative keywords", "تحسين عناوين", "تحسين صفحات هبوط", "تقليل التشتيت"],
  },
  {
    key: "tracking_diagnosis",
    title: "تشخيص التتبع",
    description: "يفسر مشاكل ConversionEvent والفروقات بين الموقع والمنصات.",
    inputs: ["conversion events", "failed/skipped events", "click IDs", "UTM", "platform snapshots"],
    outputs: ["سبب المشكلة", "خطوة الإصلاح", "أولوية الإصلاح"],
  },
  {
    key: "campaign_action_queue",
    title: "قائمة إجراءات يومية",
    description: "يحوّل التحليل إلى قائمة مهام قابلة للتنفيذ للفريق.",
    inputs: ["recommendations", "health", "sync runs", "campaign performance"],
    outputs: ["إجراءات اليوم", "الأولوية", "الثقة", "الأثر المتوقع"],
  },
];

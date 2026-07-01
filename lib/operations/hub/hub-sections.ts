import type { OperationsHubSection } from "./hub-types";

export const operationsHubSections: OperationsHubSection[] = [
  { key: "overview", title: "نظرة عامة", description: "حالة اليوم، الشهر، التنبيهات، وأداء الفريق.", href: "/dashboard/operations", priority: "PRIMARY" },
  { key: "calendar", title: "التقويم", description: "المناسبات، الحملات، ومواعيد النشر القادمة.", href: "/dashboard/operations/calendar", priority: "PRIMARY" },
  { key: "monthly-plan", title: "الخطة الشهرية", description: "أهداف الشهر وتوزيع المحاور على الأسابيع.", href: "/dashboard/operations/content", priority: "PRIMARY" },
  { key: "content", title: "المحتوى", description: "عناصر المحتوى وروابط التصميم والفيديو والنتائج.", href: "/dashboard/operations/content", priority: "PRIMARY" },
  { key: "messages", title: "الرسائل وواتساب", description: "قوالب واتساب، حملات الرسائل، المراجعة، والجدولة الداخلية.", href: "/dashboard/operations/messaging", priority: "PRIMARY" },
  { key: "team-tasks", title: "مهام الفريق", description: "متابعة المسؤوليات والحالات والتأخير.", href: "/dashboard/operations/tasks", priority: "PRIMARY" },
  { key: "publishing", title: "النشر", description: "تسجيل ما خرج للنشر على المنصات.", href: "/dashboard/operations/publishing", priority: "SECONDARY" },
  { key: "workflow", title: "سير العمل", description: "من الفكرة إلى التعلم من النتائج.", href: "/dashboard/operations/workflow", priority: "PRIMARY" },
  { key: "donor-reactivation", title: "تنشيط المتبرعين", description: "شرائح التواصل وإعادة الاستهداف.", href: "/dashboard/operations/donor-reactivation", priority: "SECONDARY" },
  { key: "ai-assistant", title: "مساعد الذكاء الاصطناعي", description: "مساعد تشغيلي للتخطيط والتحليل.", href: "/dashboard/operations/ai-assistant", priority: "SECONDARY" },
  { key: "learnings", title: "الدروس المستفادة", description: "ما نجح وما يجب تجنبه في المحتوى والحملات.", href: "/dashboard/operations/content", priority: "SECONDARY" },
];

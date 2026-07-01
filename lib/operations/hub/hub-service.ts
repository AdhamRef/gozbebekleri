import { getOperationsOverview } from "../service";
import { getMessagingOverview } from "../messaging/messaging-repository";
import { getSeasonReadinessOverview } from "../seasons/season-service";
import { getTaskOverview } from "../tasks/task-service";
import { operationsHubSections } from "./hub-sections";
import type { OperationsHubAlert, OperationsHubOverview, OperationsTeamPerformance, OperationsWorkflowStage } from "./hub-types";

const workflowDefinitions = [
  ["IDEA", "الفكرة", "مواد تحتاج تحديد الزاوية والهدف."],
  ["WRITING", "النص", "السكريبتات والكابشن والرسائل."],
  ["DESIGN", "التصميم", "تصميم أو مونتاج قيد التنفيذ."],
  ["REVIEW", "المراجعة", "بانتظار اعتماد نهائي."],
  ["APPROVED", "معتمد", "جاهز للجدولة أو التسويق."],
  ["SCHEDULED", "مجدول", "له موعد نشر أو إرسال."],
  ["PUBLISHED", "منشور", "تم نشره أو تسجيل خروجه."],
  ["ADS", "الإعلانات", "جاهز للربط بالحملة الإعلانية."],
  ["RESULTS", "النتائج", "بانتظار قياس الأداء."],
  ["LEARNING", "التعلم", "يحتاج استخلاص درس قابل للتكرار."],
] as const;

function normalizeStatus(value: string) {
  return value.trim().toUpperCase();
}

function completionRate(required: number, completed: number) {
  if (!required) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / required) * 100)));
}

function buildWorkflow(items: { status: string }[]): OperationsWorkflowStage[] {
  return workflowDefinitions.map(([key, title, description]) => ({
    key,
    title,
    description,
    count: items.filter((item) => normalizeStatus(item.status) === key).length,
  }));
}

function buildTeam(tasks: { assignee: string; progress: number; status: string }[]): OperationsTeamPerformance[] {
  const names = [...new Set(tasks.map((task) => task.assignee).filter(Boolean))];
  return names.map((name) => {
    const ownerTasks = tasks.filter((task) => task.assignee === name);
    return {
      name,
      completionRate: ownerTasks.length ? Math.round(ownerTasks.reduce((sum, task) => sum + task.progress, 0) / ownerTasks.length) : 0,
      openTasks: ownerTasks.filter((task) => !["DONE", "CANCELLED"].includes(task.status)).length,
    };
  }).sort((a, b) => b.openTasks - a.openTasks).slice(0, 5);
}

function buildAlerts(args: { delayedItems: number; criticalSeasons: { seasonId: string; title: string; missingAssets: number; requiredAssets: number }[]; highPriorityTasks: number; messageReview: number }): OperationsHubAlert[] {
  const alerts: OperationsHubAlert[] = args.criticalSeasons.slice(0, 3).map((season) => ({
    id: `season-${season.seasonId}`,
    title: `${season.title} يحتاج متابعة`,
    description: `ناقص ${season.missingAssets} من أصل ${season.requiredAssets} عناصر مطلوبة.`,
    tone: season.missingAssets > 3 ? "danger" : "warning",
    href: "/dashboard/operations/calendar",
  }));

  if (args.messageReview > 0) {
    alerts.push({
      id: "messaging-review",
      title: "رسائل تحتاج مراجعة",
      description: `${args.messageReview} قوالب أو حملات رسائل تنتظر اعتمادًا قبل التنفيذ اليدوي.`,
      tone: "warning",
      href: "/dashboard/operations/messaging",
    });
  }

  if (args.highPriorityTasks > 0) {
    alerts.push({
      id: "high-priority-tasks",
      title: "مهام عالية الأولوية",
      description: `${args.highPriorityTasks} مهام تحتاج متابعة من المدير أو مسؤول الفريق.`,
      tone: "warning",
      href: "/dashboard/operations/tasks",
    });
  }

  if (args.delayedItems > 0) {
    alerts.push({
      id: "delayed-content",
      title: "محتوى متأخر",
      description: `${args.delayedItems} عناصر محتوى أو مهام متأخرة عن مسار التنفيذ.`,
      tone: "danger",
      href: "/dashboard/operations/content",
    });
  }

  return alerts.slice(0, 6);
}

export async function getOperationsHubOverview(): Promise<OperationsHubOverview> {
  const [operations, messaging, seasonOverview, taskOverview] = await Promise.all([
    getOperationsOverview(),
    getMessagingOverview(),
    Promise.resolve(getSeasonReadinessOverview()),
    getTaskOverview(),
  ]);

  const items = operations.items;
  const tasks = taskOverview.tasks;
  const completedContent = items.filter((item) => ["PUBLISHED", "APPROVED"].includes(normalizeStatus(item.status))).length;
  const inProgressContent = items.filter((item) => ["WRITING", "DESIGN", "REVIEW", "IN_PROGRESS"].includes(normalizeStatus(item.status))).length;
  const delayedItems = tasks.filter((task) => ["MISSED", "DELAYED", "BLOCKED"].includes(task.status)).length;
  const requiredContent = Math.max(operations.plans.reduce((sum, plan) => sum + plan.items, 0), items.length, operations.kpis.contentItems);
  const criticalSeasons = seasonOverview.seasons.filter((season) => season.status !== "ON_TRACK");
  const openMessages = messaging.summary.needsReview + messaging.summary.scheduled;

  return {
    generatedAt: new Date().toISOString(),
    today: {
      dateLabel: new Intl.DateTimeFormat("ar", { day: "numeric", month: "long" }).format(new Date()),
      tasks: taskOverview.summary.pending + taskOverview.summary.inProgress,
      scheduledPosts: items.filter((item) => normalizeStatus(item.status) === "SCHEDULED").length,
      messages: openMessages,
      adLaunches: items.filter((item) => normalizeStatus(item.status) === "APPROVED").length,
    },
    month: {
      requiredContent,
      completedContent,
      inProgressContent,
      delayedItems,
      completionRate: completionRate(requiredContent, completedContent),
    },
    alerts: buildAlerts({ delayedItems, criticalSeasons, highPriorityTasks: taskOverview.summary.highPriority, messageReview: messaging.summary.needsReview }),
    team: buildTeam(tasks),
    workflow: buildWorkflow(items),
    sections: operationsHubSections,
  };
}

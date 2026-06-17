import { scheduledContentItems } from "./scheduler-data";
import type { SchedulerOverview } from "./scheduler-types";

export function getSchedulerOverview(): SchedulerOverview {
  return {
    source: "content-scheduler-foundation",
    generatedAt: new Date().toISOString(),
    summary: {
      total: scheduledContentItems.length,
      scheduled: scheduledContentItems.filter((item) => item.status === "SCHEDULED").length,
      ready: scheduledContentItems.filter((item) => item.status === "READY").length,
      blocked: scheduledContentItems.filter((item) => item.status === "BLOCKED").length,
      messagingItems: scheduledContentItems.filter((item) => ["WHATSAPP", "EMAIL", "SMS"].includes(item.channel)).length,
    },
    items: scheduledContentItems,
  };
}

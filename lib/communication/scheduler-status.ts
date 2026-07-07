import { prisma } from "@/lib/prisma";

/**
 * Scheduler readiness — whether due scheduled campaigns execute automatically. Automatic execution
 * requires a Vercel Cron job (see vercel.json) hitting the secure cron route, which is only authorized
 * when `CRON_SECRET` is set. This is the single source of truth for the "is scheduling automatic?" UI.
 */

export const SCHEDULER_RUN_ACTION = "communication.scheduler.run";

export function isSchedulerConfigured(): boolean {
  return !!process.env.CRON_SECRET;
}

export type SchedulerStatus = {
  configured: boolean;
  scheduledCount: number;
  dueCount: number;
  lastRunAt: string | null;
};

export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  const configured = isSchedulerConfigured();
  if (!process.env.DATABASE_URL) return { configured, scheduledCount: 0, dueCount: 0, lastRunAt: null };
  const now = new Date();
  const [scheduledCount, dueCount, lastRun] = await Promise.all([
    prisma.communicationCampaign.count({ where: { status: "SCHEDULED" } }).catch(() => 0),
    prisma.communicationCampaign.count({ where: { status: "SCHEDULED", scheduledAt: { lte: now } } }).catch(() => 0),
    prisma.auditLog.findFirst({ where: { action: SCHEDULER_RUN_ACTION }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null),
  ]);
  return { configured, scheduledCount, dueCount, lastRunAt: lastRun?.createdAt ? lastRun.createdAt.toISOString() : null };
}

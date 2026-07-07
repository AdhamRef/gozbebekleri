import { prisma } from "@/lib/prisma";
import { listConversations } from "@/lib/communication/conversation-service";

/**
 * Daily work center data — real OperationTask rows + scheduled communication campaigns + WhatsApp
 * conversations needing a reply. Read-only, no writes, no fake tasks. When there is no data the
 * counts are simply zero and the page shows useful empty states.
 */

const CLOSED = new Set(["DONE", "COMPLETED", "APPROVED", "CANCELLED"]);
const REVIEW = new Set(["REVIEW", "NEEDS_REVIEW"]);
const channelAr: Record<string, string> = { WHATSAPP: "واتساب", EMAIL: "إيميل", SMS: "رسائل" };

export type WorkItem = { id: string; title: string; type: string; due: string | null; owner: string | null; href: string };
export type TeamRow = { name: string; open: number };
export type UpcomingItem = { title: string; type: string; at: string | null };

export type OperationsDaily = {
  cards: { todayTasks: number; overdue: number; needsReview: number; repliesNeedingAction: number };
  workList: WorkItem[];
  team: TeamRow[];
  upcoming: UpcomingItem[];
  hasTasks: boolean;
};

function dayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getOperationsDaily(): Promise<OperationsDaily> {
  const empty: OperationsDaily = { cards: { todayTasks: 0, overdue: 0, needsReview: 0, repliesNeedingAction: 0 }, workList: [], team: [], upcoming: [], hasTasks: false };
  if (!process.env.DATABASE_URL) return empty;

  const { start, end } = dayBounds();

  const [tasks, campaigns, conversations] = await Promise.all([
    prisma.operationTask
      .findMany({ orderBy: { dueAt: "asc" }, take: 500, select: { id: true, title: true, taskType: true, status: true, assignedTo: true, dueAt: true } })
      .catch(() => []),
    prisma.communicationCampaign
      .findMany({ where: { status: "SCHEDULED" }, orderBy: { scheduledAt: "asc" }, take: 20, select: { id: true, name: true, channel: true, scheduledAt: true } })
      .catch(() => []),
    listConversations().catch(() => []),
  ]);

  const open = tasks.filter((t) => !CLOSED.has(t.status));
  const dueToday = open.filter((t) => t.dueAt && t.dueAt >= start && t.dueAt <= end);
  const overdue = open.filter((t) => t.dueAt && t.dueAt < start);
  const review = open.filter((t) => REVIEW.has(t.status));
  const replies = conversations.filter((c) => c.needsReply);

  // Assignee names for owner labels + team workload.
  const assigneeIds = Array.from(new Set(open.map((t) => t.assignedTo).filter(Boolean) as string[]));
  const users = assigneeIds.length ? await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } }).catch(() => []) : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const ownerOf = (id: string | null) => (id ? nameById.get(id) ?? "عضو الفريق" : null);

  // Team workload (open tasks per assignee).
  const workload = new Map<string, number>();
  for (const t of open) {
    const key = t.assignedTo ? ownerOf(t.assignedTo) ?? "عضو الفريق" : "غير مُسند";
    workload.set(key, (workload.get(key) ?? 0) + 1);
  }
  const team: TeamRow[] = [...workload.entries()].map(([name, o]) => ({ name, open: o })).sort((a, b) => b.open - a.open).slice(0, 6);

  const fmt = (d: Date | null) => (d ? d.toISOString() : null);

  // Today's work list (max 8): overdue → due today → review → scheduled campaigns → replies.
  const workList: WorkItem[] = [];
  for (const t of overdue) workList.push({ id: t.id, title: t.title, type: "مهمة متأخرة", due: fmt(t.dueAt), owner: ownerOf(t.assignedTo), href: "/dashboard/operations/tasks" });
  for (const t of dueToday) workList.push({ id: t.id, title: t.title, type: "مهمة اليوم", due: fmt(t.dueAt), owner: ownerOf(t.assignedTo), href: "/dashboard/operations/tasks" });
  for (const t of review) if (!workList.some((w) => w.id === t.id)) workList.push({ id: t.id, title: t.title, type: "مراجعة محتوى", due: fmt(t.dueAt), owner: ownerOf(t.assignedTo), href: "/dashboard/operations/content" });
  for (const c of campaigns) workList.push({ id: c.id, title: c.name, type: "حملة مجدولة", due: fmt(c.scheduledAt), owner: null, href: `/dashboard/operations/communication/campaigns/${c.id}` });
  for (const c of replies) workList.push({ id: `reply-${c.phone}`, title: c.donor?.name || c.donor?.email || c.phone, type: "رد واتساب", due: c.lastMessageAt, owner: null, href: "/dashboard/operations/communication/inbox" });

  const upcoming: UpcomingItem[] = campaigns.map((c) => ({ title: c.name, type: channelAr[c.channel] ?? c.channel, at: fmt(c.scheduledAt) }));

  return {
    cards: { todayTasks: dueToday.length, overdue: overdue.length, needsReview: review.length, repliesNeedingAction: replies.length },
    workList: workList.slice(0, 8),
    team,
    upcoming,
    hasTasks: tasks.length > 0,
  };
}

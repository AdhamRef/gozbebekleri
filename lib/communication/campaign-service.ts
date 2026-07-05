import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import type { CommunicationCampaign, Prisma } from "@prisma/client";
import { isCommunicationChannel, type CommunicationChannelId, type CampaignStatusId } from "./communication-runtime-types";

/**
 * CampaignService — CRUD + status transitions for CommunicationCampaign. This package
 * covers the workflow up to (but not including) sending: DRAFT → REVIEW → APPROVED →
 * SCHEDULED, plus CANCELLED. Campaigns never send automatically and never move to
 * SENDING/SENT here — that is a later package behind explicit human approval + a provider.
 */

type Actor = { actorId?: string | null; actorName?: string | null; actorRole?: string | null } | null;

export type CampaignInput = {
  name: string;
  channel: CommunicationChannelId;
  purpose?: string;
  audienceSegmentKey?: string | null;
  templateGroupId?: string | null;
  senderRoutingMode?: string;
};

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function dbUnavailable() {
  return { ok: false as const, status: 503, error: "DATABASE_URL is not configured." };
}

export async function listCampaigns(): Promise<CommunicationCampaign[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await prisma.communicationCampaign.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });
  } catch (error) {
    console.error("listCampaigns failed", error);
    return [];
  }
}

export async function getCampaign(id: string): Promise<CommunicationCampaign | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    return await prisma.communicationCampaign.findUnique({ where: { id } });
  } catch (error) {
    console.error("getCampaign failed", error);
    return null;
  }
}

export async function createCampaign(input: CampaignInput, actor?: Actor): Promise<ServiceResult<CommunicationCampaign>> {
  if (!process.env.DATABASE_URL) return dbUnavailable();
  if (!isCommunicationChannel(input.channel)) return { ok: false, status: 400, error: "Invalid channel." };
  if (!input.name?.trim()) return { ok: false, status: 400, error: "Name is required." };
  try {
    const row = await prisma.communicationCampaign.create({
      data: {
        name: input.name.trim(),
        channel: input.channel,
        purpose: input.purpose ?? "MARKETING",
        audienceSegmentKey: input.audienceSegmentKey ?? null,
        templateGroupId: input.templateGroupId ?? null,
        senderRoutingMode: input.senderRoutingMode ?? "AUTO",
        status: "DRAFT",
      },
    });
    await writeAuditLog({
      actorId: actor?.actorId ?? undefined,
      actorName: actor?.actorName ?? undefined,
      actorRole: actor?.actorRole ?? "ADMIN",
      action: "communication.campaign.create",
      messageAr: `تم إنشاء حملة تواصل: ${row.name}`,
      messageEn: `Communication campaign created: ${row.name}`,
      entityType: "CommunicationCampaign",
      entityId: row.id,
      metadata: { channel: row.channel, status: row.status, externalCall: false, autoSend: false },
      stream: "TEAM",
    });
    return { ok: true, data: row };
  } catch (error) {
    console.error("createCampaign failed", error);
    return { ok: false, status: 500, error: "Failed to create campaign." };
  }
}

export type CampaignUpdate = {
  name?: string;
  purpose?: string;
  audienceSegmentKey?: string | null;
  templateGroupId?: string | null;
  senderRoutingMode?: string;
  metadata?: Record<string, unknown>;
};

/** Edit a campaign's configuration. Only allowed while it is still editable (DRAFT/REVIEW). */
export async function updateCampaign(id: string, patch: CampaignUpdate, actor?: Actor): Promise<ServiceResult<CommunicationCampaign>> {
  if (!process.env.DATABASE_URL) return dbUnavailable();
  try {
    const current = await prisma.communicationCampaign.findUnique({ where: { id }, select: { status: true, metadata: true } });
    if (!current) return { ok: false, status: 404, error: "Campaign not found." };
    if (current.status !== "DRAFT" && current.status !== "REVIEW") {
      return { ok: false, status: 409, error: "Campaign can only be edited while in draft or review." };
    }
    const mergedMetadata =
      patch.metadata !== undefined
        ? ({ ...(current.metadata as Record<string, unknown> | null), ...patch.metadata } as Prisma.InputJsonValue)
        : undefined;
    const row = await prisma.communicationCampaign.update({
      where: { id },
      data: {
        name: patch.name?.trim(),
        purpose: patch.purpose,
        audienceSegmentKey: patch.audienceSegmentKey === undefined ? undefined : patch.audienceSegmentKey ?? null,
        templateGroupId: patch.templateGroupId === undefined ? undefined : patch.templateGroupId ?? null,
        senderRoutingMode: patch.senderRoutingMode,
        metadata: mergedMetadata,
      },
    });
    await writeAuditLog({
      actorId: actor?.actorId ?? undefined,
      actorName: actor?.actorName ?? undefined,
      actorRole: actor?.actorRole ?? "ADMIN",
      action: "communication.campaign.update",
      messageAr: `تم تحديث إعداد حملة التواصل: ${row.name}`,
      messageEn: `Communication campaign updated: ${row.name}`,
      entityType: "CommunicationCampaign",
      entityId: row.id,
      metadata: { externalCall: false, autoSend: false },
      stream: "TEAM",
    });
    return { ok: true, data: row };
  } catch (error) {
    console.error("updateCampaign failed", error);
    return { ok: false, status: 500, error: "Failed to update campaign." };
  }
}

export type CampaignAction = "SUBMIT_REVIEW" | "APPROVE" | "SCHEDULE" | "CANCEL";

// Allowed status transitions for the non-sending workflow this package covers.
const TRANSITIONS: Record<CampaignAction, { from: CampaignStatusId[]; to: CampaignStatusId }> = {
  SUBMIT_REVIEW: { from: ["DRAFT"], to: "REVIEW" },
  APPROVE: { from: ["REVIEW"], to: "APPROVED" },
  SCHEDULE: { from: ["APPROVED"], to: "SCHEDULED" },
  CANCEL: { from: ["DRAFT", "REVIEW", "APPROVED", "SCHEDULED"], to: "CANCELLED" },
};

export async function transitionCampaign(
  id: string,
  action: CampaignAction,
  opts?: { scheduledAt?: Date | null; actor?: Actor }
): Promise<ServiceResult<CommunicationCampaign>> {
  if (!process.env.DATABASE_URL) return dbUnavailable();
  const rule = TRANSITIONS[action];
  if (!rule) return { ok: false, status: 400, error: "Unknown action." };
  try {
    const current = await prisma.communicationCampaign.findUnique({ where: { id }, select: { status: true, name: true } });
    if (!current) return { ok: false, status: 404, error: "Campaign not found." };
    if (!rule.from.includes(current.status as CampaignStatusId)) {
      return { ok: false, status: 409, error: `Cannot ${action} from ${current.status}.` };
    }
    const actor = opts?.actor;
    const row = await prisma.communicationCampaign.update({
      where: { id },
      data: {
        status: rule.to,
        scheduledAt: action === "SCHEDULE" ? opts?.scheduledAt ?? null : undefined,
        approvedBy: action === "APPROVE" ? actor?.actorId ?? undefined : undefined,
        approvedAt: action === "APPROVE" ? new Date() : undefined,
      },
    });
    await writeAuditLog({
      actorId: actor?.actorId ?? undefined,
      actorName: actor?.actorName ?? undefined,
      actorRole: actor?.actorRole ?? "ADMIN",
      action: `communication.campaign.${action.toLowerCase()}`,
      messageAr: `تم تحديث حالة حملة التواصل «${current.name}» إلى ${rule.to}`,
      messageEn: `Communication campaign "${current.name}" moved to ${rule.to}`,
      entityType: "CommunicationCampaign",
      entityId: row.id,
      metadata: { from: current.status, to: rule.to, externalCall: false, autoSend: false },
      stream: "TEAM",
    });
    return { ok: true, data: row };
  } catch (error) {
    console.error("transitionCampaign failed", error);
    return { ok: false, status: 500, error: "Failed to update campaign status." };
  }
}

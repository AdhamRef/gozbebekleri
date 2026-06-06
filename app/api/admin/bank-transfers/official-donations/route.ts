import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { convertAmountInCurrencyToUsd } from "@/lib/exchange/convert-amount-in-currency-to-usd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "BankTransferTransaction";
const APPROVED_STATUSES = new Set(["APPROVED", "IMPORTED"]);

type JsonMap = Record<string, unknown>;

function isRecord(value: unknown): value is JsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function cleanEmail(value: unknown): string | null {
  const email = cleanString(value)?.toLowerCase() ?? null;
  return email && email.includes("@") ? email : null;
}

function mongoId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.$oid === "string") return value.$oid;
  return null;
}

function mongoDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (isRecord(value) && typeof value.$date === "string") {
    const d = new Date(value.$date);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function oid(id: string) {
  return { $oid: id };
}

async function loadTransaction(id: string) {
  const result = await prisma.$runCommandRaw({ find: COLLECTION, filter: { _id: oid(id) }, limit: 1 }).catch(() => null) as JsonMap | null;
  const rows = isRecord(result?.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch.filter(isRecord) : [];
  return rows[0] ?? null;
}

async function listTransactions(limit: number) {
  const result = await prisma.$runCommandRaw({
    find: COLLECTION,
    filter: {
      direction: "CREDIT",
      status: { $in: ["APPROVED", "IMPORTED"] },
      $or: [{ donationId: { $exists: false } }, { donationId: null }, { officialDonationId: { $exists: false } }],
    },
    sort: { approvedAt: -1, createdAt: -1 },
    limit,
  }).catch(() => null) as JsonMap | null;
  return isRecord(result?.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch.filter(isRecord) : [];
}

function serializeTransaction(row: JsonMap) {
  return {
    id: mongoId(row._id),
    donorName: cleanString(row.donorName),
    donorEmail: cleanEmail(row.donorEmail),
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount || 0),
    currency: cleanString(row.currency) ?? "USD",
    transactionDate: cleanString(row.transactionDate) ?? mongoDate(row.transactionDate)?.toISOString() ?? null,
    description: cleanString(row.description) ?? "",
    reference: cleanString(row.reference),
    finalProject: cleanString(row.finalProject) ?? cleanString(row.suggestedProject) ?? "تبرع عام",
    status: cleanString(row.status) ?? "APPROVED",
    donationId: cleanString(row.donationId) ?? cleanString(row.officialDonationId),
  };
}

async function findCampaignId(projectName: string | null) {
  const name = (projectName || "").trim().toLowerCase();
  if (!name || name === "تبرع عام") return null;
  const campaigns = await prisma.campaign.findMany({ select: { id: true, title: true }, take: 500 });
  const exact = campaigns.find((c) => c.title.trim().toLowerCase() === name);
  if (exact) return exact.id;
  const contains = campaigns.find((c) => c.title.trim().toLowerCase().includes(name) || name.includes(c.title.trim().toLowerCase()));
  return contains?.id ?? null;
}

async function findOrCreateDonor(input: { transactionId: string; donorName: string; donorEmail: string | null; donorLocale: string | null }) {
  if (input.donorEmail) {
    const existing = await prisma.user.findUnique({ where: { email: input.donorEmail }, select: { id: true } });
    if (existing) return existing.id;
  }
  const syntheticEmail = `bank-transfer+${input.transactionId}@gozbebekleri.local`;
  const syntheticExisting = await prisma.user.findUnique({ where: { email: syntheticEmail }, select: { id: true } });
  if (syntheticExisting) return syntheticExisting.id;
  const user = await prisma.user.create({
    data: {
      name: input.donorName,
      email: input.donorEmail ?? syntheticEmail,
      preferredLang: input.donorLocale ?? undefined,
    },
    select: { id: true },
  });
  return user.id;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "bankTransfers");
  if (denied) return denied;
  const limit = Math.max(1, Math.min(200, Number(request.nextUrl.searchParams.get("limit") || 100)));
  const rows = await listTransactions(limit);
  return NextResponse.json({ ok: true, transactions: rows.map(serializeTransaction) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "bankTransfers");
    if (denied) return denied;

    const body = await request.json().catch(() => null) as JsonMap | null;
    const transactionId = cleanString(body?.transactionId);
    if (!transactionId) return NextResponse.json({ error: "transactionId is required" }, { status: 400 });

    const transaction = await loadTransaction(transactionId);
    if (!transaction) return NextResponse.json({ error: "Bank transfer transaction not found" }, { status: 404 });

    const status = cleanString(transaction.status) ?? "PENDING_REVIEW";
    if (!APPROVED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Only approved bank transfer transactions can create official donations" }, { status: 400 });
    }

    const linkedDonationId = cleanString(transaction.donationId) ?? cleanString(transaction.officialDonationId);
    if (linkedDonationId) {
      const existing = await prisma.donation.findUnique({ where: { id: linkedDonationId }, select: { id: true } }).catch(() => null);
      if (existing) return NextResponse.json({ ok: true, alreadyLinked: true, donationId: existing.id });
    }

    const providerOrderId = `bank-transfer:${transactionId}`;
    const providerExisting = await prisma.donation.findFirst({ where: { provider: "BANK_TRANSFER", providerOrderId }, select: { id: true } });
    if (providerExisting) {
      await prisma.$runCommandRaw({ update: COLLECTION, updates: [{ q: { _id: oid(transactionId) }, u: { $set: { donationId: providerExisting.id, officialDonationId: providerExisting.id, donationCreatedAt: new Date(), updatedAt: new Date() } }, upsert: false }] });
      return NextResponse.json({ ok: true, alreadyLinked: true, donationId: providerExisting.id });
    }

    const amount = typeof transaction.amount === "number" ? transaction.amount : Number(transaction.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Invalid bank transfer amount" }, { status: 400 });

    const currency = cleanString(transaction.currency) ?? "USD";
    const amountUSD = await convertAmountInCurrencyToUsd(amount, currency).catch(() => currency === "USD" ? amount : null);
    if (amountUSD == null) return NextResponse.json({ error: `No exchange rate for ${currency}` }, { status: 400 });

    const donorName = cleanString(transaction.donorName) ?? "متبرع تحويل بنكي";
    const donorEmail = cleanEmail(transaction.donorEmail);
    const donorLocale = cleanString(transaction.donorLocale) ?? "ar";
    const finalProject = cleanString(transaction.finalProject) ?? cleanString(transaction.suggestedProject) ?? "تبرع عام";
    const campaignId = await findCampaignId(finalProject);
    const donorId = await findOrCreateDonor({ transactionId, donorName, donorEmail, donorLocale });
    const paidAt = mongoDate(transaction.transactionDate) ?? mongoDate(transaction.approvedAt) ?? new Date();

    const actor = auditActorFromDashboardSession(session!);
    const donation = await prisma.$transaction(async (tx) => {
      const created = await tx.donation.create({
        data: {
          amount,
          amountUSD,
          currency,
          teamSupport: 0,
          coverFees: false,
          fees: 0,
          totalAmount: amount,
          status: "PAID",
          locale: donorLocale,
          provider: "BANK_TRANSFER",
          providerOrderId,
          providerRaw: {
            bankTransferTransactionId: transactionId,
            bankId: transaction.bankId,
            bankIban: transaction.bankIban,
            reference: transaction.reference,
            description: transaction.description,
            finalProject,
          },
          donorId,
          comment: `Bank transfer: ${finalProject}`,
          paymentMethod: "CARD",
          cardDetails: null,
          paidAt,
          items: campaignId ? { create: [{ campaignId, amount, amountUSD }] } : undefined,
        },
        select: { id: true },
      });

      if (campaignId) {
        await tx.campaign.update({ where: { id: campaignId }, data: { currentAmount: { increment: amountUSD } } }).catch(() => null);
      }
      return created;
    }, { timeout: 15000 });

    await prisma.$runCommandRaw({
      update: COLLECTION,
      updates: [{
        q: { _id: oid(transactionId) },
        u: { $set: { donationId: donation.id, officialDonationId: donation.id, donationCreatedAt: new Date(), donationCreatedBy: actor.actorId, donationCreatedByName: actor.actorName, updatedAt: new Date() } },
        upsert: false,
      }],
    });

    await writeAuditLog({
      ...actor,
      stream: "TEAM",
      action: "BANK_TRANSFER_DONATION_CREATED",
      messageAr: `${actor.actorName ?? "مسؤول"} أنشأ تبرعًا رسميًا من تحويل بنكي بقيمة ${amount} ${currency}`,
      entityType: "Donation",
      entityId: donation.id,
      metadata: { bankTransferTransactionId: transactionId, amount, amountUSD, currency, finalProject, campaignId },
    });

    return NextResponse.json({ ok: true, donationId: donation.id, campaignId, amountUSD });
  } catch (error) {
    console.error("[bank-transfers] failed to create official donation", error);
    return NextResponse.json({ error: "Failed to create official donation from bank transfer" }, { status: 500 });
  }
}

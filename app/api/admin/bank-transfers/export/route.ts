import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "BankTransferTransaction";
const ALLOWED_STATUSES = new Set(["PENDING_REVIEW", "APPROVED", "IMPORTED", "IGNORED", "all"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mongoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.$date === "string") return value.$date;
  return "";
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function csvCell(value: unknown): string {
  const v = text(value).replace(/\r?\n/g, " ").replace(/"/g, '""');
  return `"${v}"`;
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "bankTransfers");
    if (denied) return denied;

    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "all";
    const bankId = url.searchParams.get("bankId");
    const donorLocale = url.searchParams.get("donorLocale");

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const filter: Record<string, unknown> = {
      direction: "CREDIT",
      status: status === "all" ? { $nin: ["DUPLICATE", "DELETED"] } : status,
    };
    if (bankId) filter.bankId = bankId;
    if (donorLocale) filter.donorLocale = donorLocale;

    const result = await prisma.$runCommandRaw({
      find: COLLECTION,
      filter,
      sort: { transactionDate: -1, createdAt: -1 },
      limit: 5000,
    });

    const rows = isRecord(result) && isRecord(result.cursor) && Array.isArray(result.cursor.firstBatch)
      ? result.cursor.firstBatch as Record<string, unknown>[]
      : [];

    const header = [
      "transactionDate",
      "donorName",
      "amount",
      "currency",
      "donorLocale",
      "bankId",
      "bankIban",
      "status",
      "project",
      "reference",
      "description",
      "createdAt",
    ];

    const csv = [
      "\uFEFF" + csvRow(header),
      ...rows.map((row) => csvRow([
        text(row.transactionDate),
        text(row.donorName),
        text(row.amount),
        text(row.currency),
        text(row.donorLocale),
        text(row.bankId),
        text(row.bankIban),
        text(row.status),
        text(row.finalProject ?? row.suggestedProject ?? "تبرع عام"),
        text(row.reference),
        text(row.description),
        mongoDate(row.createdAt),
      ])),
    ].join("\n");

    const fileName = `bank-transfers-${status}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[bank-transfers] export failed", error);
    return NextResponse.json({ error: "Failed to export bank transfers" }, { status: 500 });
  }
}

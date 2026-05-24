import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "BankStatementUpload";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mongoId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.$oid === "string") return value.$oid;
  return null;
}

function mongoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.$date === "string") return value.$date;
  return null;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function serialize(row: Record<string, unknown>) {
  return {
    id: mongoId(row._id) ?? mongoId(row.id),
    bankId: str(row.bankId),
    fileName: str(row.fileName) ?? "statement",
    fileHash: str(row.fileHash),
    bankIban: str(row.bankIban),
    currency: str(row.currency) ?? "USD",
    donorLocale: str(row.donorLocale) ?? "ar",
    parser: str(row.parser) ?? "spreadsheet",
    uploadedByName: str(row.uploadedByName),
    rowCount: num(row.rowCount),
    creditRowCount: num(row.creditRowCount),
    importedCount: num(row.importedCount),
    duplicateCount: num(row.duplicateCount),
    excludedCount: num(row.excludedCount),
    createdAt: mongoDate(row.createdAt),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "bankTransfers");
    if (denied) return denied;

    const result = await prisma.$runCommandRaw({
      find: COLLECTION,
      sort: { createdAt: -1 },
      limit: 100,
    });

    const rows = isRecord(result) && isRecord(result.cursor) && Array.isArray(result.cursor.firstBatch)
      ? result.cursor.firstBatch as Record<string, unknown>[]
      : [];

    return NextResponse.json({ uploads: rows.map(serialize) });
  } catch (error) {
    console.error("[bank-transfers] failed to list uploads", error);
    return NextResponse.json({ error: "Failed to list bank statement uploads" }, { status: 500 });
  }
}

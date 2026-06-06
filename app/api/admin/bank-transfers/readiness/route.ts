import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANKS_COLLECTION = "BankAccount";
const TRANSACTIONS_COLLECTION = "BankTransferTransaction";
const UPLOADS_COLLECTION = "BankStatementUpload";

type JsonMap = Record<string, unknown>;
type CheckStatus = "PASS" | "WARN" | "FAIL";

type Check = {
  id: string;
  title: string;
  status: CheckStatus;
  description: string;
  action: string;
  href: string;
  value?: number | string;
};

function isRecord(value: unknown): value is JsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function count(collection: string, query: JsonMap = {}) {
  const result = await prisma.$runCommandRaw({ count: collection, query }).catch(() => null) as JsonMap | null;
  return num(result?.n);
}

async function aggregateRows(collection: string, pipeline: JsonMap[]) {
  const result = await prisma.$runCommandRaw({ aggregate: collection, pipeline, cursor: {} }).catch(() => null) as JsonMap | null;
  return isRecord(result?.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch.filter(isRecord) : [];
}

async function findRows(collection: string, filter: JsonMap, limit = 10) {
  const result = await prisma.$runCommandRaw({ find: collection, filter, sort: { createdAt: -1 }, limit }).catch(() => null) as JsonMap | null;
  return isRecord(result?.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch.filter(isRecord) : [];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "bankTransfers");
    if (denied) return denied;

    const [
      bankCount,
      activeBankCount,
      uploadCount,
      pendingCount,
      approvedCount,
      ignoredCount,
      deletedCount,
      totalTransactionCount,
      approvedWithoutDonationCount,
      pendingOldCount,
      duplicateOrDeletedCount,
      totalsByCurrency,
      uploadRiskRows,
      recentPending,
    ] = await Promise.all([
      count(BANKS_COLLECTION),
      count(BANKS_COLLECTION, { isActive: { $ne: false } }),
      count(UPLOADS_COLLECTION),
      count(TRANSACTIONS_COLLECTION, { direction: "CREDIT", status: "PENDING_REVIEW" }),
      count(TRANSACTIONS_COLLECTION, { direction: "CREDIT", status: { $in: ["APPROVED", "IMPORTED"] } }),
      count(TRANSACTIONS_COLLECTION, { direction: "CREDIT", status: "IGNORED" }),
      count(TRANSACTIONS_COLLECTION, { status: "DELETED" }),
      count(TRANSACTIONS_COLLECTION, { direction: "CREDIT", status: { $nin: ["DUPLICATE", "DELETED"] } }),
      count(TRANSACTIONS_COLLECTION, { direction: "CREDIT", status: { $in: ["APPROVED", "IMPORTED"] }, donationId: { $exists: false } }),
      count(TRANSACTIONS_COLLECTION, { direction: "CREDIT", status: "PENDING_REVIEW", createdAt: { $lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }),
      count(TRANSACTIONS_COLLECTION, { status: { $in: ["DUPLICATE", "DELETED"] } }),
      aggregateRows(TRANSACTIONS_COLLECTION, [
        { $match: { direction: "CREDIT", status: { $in: ["APPROVED", "IMPORTED"] } } },
        { $group: { _id: "$currency", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      aggregateRows(TRANSACTIONS_COLLECTION, [
        { $match: { direction: "CREDIT", status: { $in: ["APPROVED", "IMPORTED"] } } },
        { $group: { _id: "$uploadFileHash", approvedCount: { $sum: 1 }, total: { $sum: "$amount" }, currencies: { $addToSet: "$currency" } } },
        { $sort: { approvedCount: -1 } },
        { $limit: 10 },
      ]),
      findRows(TRANSACTIONS_COLLECTION, { direction: "CREDIT", status: "PENDING_REVIEW" }, 8),
    ]);

    const totals = totalsByCurrency.reduce<Record<string, { total: number; count: number }>>((acc, row) => {
      const currency = typeof row._id === "string" ? row._id : "USD";
      acc[currency] = { total: num(row.total), count: num(row.count) };
      return acc;
    }, {});

    const checks: Check[] = [
      {
        id: "banks",
        title: "البنوك والحسابات",
        status: activeBankCount > 0 ? "PASS" : "FAIL",
        description: activeBankCount > 0 ? `يوجد ${activeBankCount} بنك/حساب نشط من أصل ${bankCount}.` : "لا توجد بنوك نشطة، ولا يمكن رفع كشوف بشكل منظم.",
        action: "تأكد من إضافة كل الحسابات البنكية المستخدمة في استقبال التبرعات.",
        href: "/dashboard/bank-transfers",
        value: activeBankCount,
      },
      {
        id: "uploads",
        title: "الكشوفات المرفوعة",
        status: uploadCount > 0 ? "PASS" : "WARN",
        description: uploadCount > 0 ? `تم تسجيل ${uploadCount} كشف حساب مرفوع.` : "لا توجد كشوفات مرفوعة بعد.",
        action: "ارفع كشف حساب حقيقي ثم راجع المعاينة قبل الإدخال.",
        href: "/dashboard/bank-transfers",
        value: uploadCount,
      },
      {
        id: "pending-review",
        title: "عمليات قيد المراجعة",
        status: pendingCount === 0 ? "PASS" : pendingOldCount > 0 ? "FAIL" : "WARN",
        description: pendingCount === 0 ? "لا توجد عمليات تنتظر المراجعة." : pendingOldCount > 0 ? `يوجد ${pendingCount} عملية قيد المراجعة، منها ${pendingOldCount} أقدم من 3 أيام.` : `يوجد ${pendingCount} عملية تحتاج مراجعة.` ,
        action: "راجع العمليات واعتمد الصحيح أو استبعد غير التبرعات.",
        href: "/dashboard/bank-transfers?status=PENDING_REVIEW",
        value: pendingCount,
      },
      {
        id: "approved",
        title: "العمليات المعتمدة",
        status: approvedCount > 0 ? "PASS" : "WARN",
        description: approvedCount > 0 ? `يوجد ${approvedCount} عملية بنكية معتمدة/مستوردة.` : "لا توجد عمليات معتمدة بعد.",
        action: "بعد المراجعة، الاعتماد هو الذي يجعل العملية محسوبة في الإجماليات والتقارير.",
        href: "/dashboard/bank-transfers?status=APPROVED",
        value: approvedCount,
      },
      {
        id: "official-donation-link",
        title: "الربط بالتبرع الرسمي",
        status: approvedWithoutDonationCount > 0 ? "WARN" : "PASS",
        description: approvedWithoutDonationCount > 0 ? `يوجد ${approvedWithoutDonationCount} عملية معتمدة لا يظهر لها donationId رسمي بعد.` : "كل العمليات المعتمدة الظاهرة لديها ربط donationId أو لا توجد عمليات معتمدة غير مربوطة.",
        action: "الحزمة التالية يجب أن تربط التحويل المعتمد بتبرع رسمي أو تنشئ Donation عند الاعتماد.",
        href: "/dashboard/bank-transfers?status=APPROVED",
        value: approvedWithoutDonationCount,
      },
      {
        id: "safe-delete",
        title: "حماية حذف الكشوفات",
        status: uploadRiskRows.length > 0 ? "WARN" : "PASS",
        description: uploadRiskRows.length > 0 ? "هناك كشوف تحتوي عمليات معتمدة؛ حذفها يجب أن يكون بحذر شديد." : "لا توجد كشوف معتمدة عالية الخطورة حسب الفحص الحالي.",
        action: "قبل حذف أي كشف، راجع هل يحتوي عمليات معتمدة حتى لا تختفي من التقارير.",
        href: "/dashboard/bank-transfers",
        value: uploadRiskRows.length,
      },
    ];

    const passed = checks.filter((c) => c.status === "PASS").length;
    const warning = checks.filter((c) => c.status === "WARN").length;
    const failed = checks.filter((c) => c.status === "FAIL").length;
    const score = Math.round((passed / checks.length) * 100);

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      score,
      summary: {
        banks: bankCount,
        activeBanks: activeBankCount,
        uploads: uploadCount,
        transactions: totalTransactionCount,
        pending: pendingCount,
        pendingOld: pendingOldCount,
        approved: approvedCount,
        ignored: ignoredCount,
        deleted: deletedCount,
        duplicateOrDeleted: duplicateOrDeletedCount,
        approvedWithoutDonation: approvedWithoutDonationCount,
        totals,
      },
      checks,
      uploadRisks: uploadRiskRows,
      recentPending: recentPending.map((row) => ({
        id: typeof row._id === "object" && row._id && "$oid" in row._id ? (row._id as { $oid: string }).$oid : row._id,
        donorName: row.donorName,
        amount: row.amount,
        currency: row.currency,
        transactionDate: row.transactionDate,
        bankId: row.bankId,
        finalProject: row.finalProject ?? row.suggestedProject,
        createdAt: row.createdAt,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[bank-transfers] readiness failed", error);
    return NextResponse.json({ error: "Failed to load bank transfers readiness" }, { status: 500 });
  }
}

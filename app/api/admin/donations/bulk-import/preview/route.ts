import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { parseDonationImportBuffer, importOrderId, IMPORT_PROVIDER } from "@/lib/donations/bulk-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SAMPLE_LIMIT = 500;

/**
 * Bulk donation import — PREVIEW (dry run). Parses the uploaded Excel/CSV and returns a summary +
 * a capped sample of normalized rows. READS ONLY: it counts new vs existing donors (by email) and
 * rows already imported (by import order id). It never writes to the database and never sends.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "donors");
  if (denied) return denied;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "الرجاء رفع ملف Excel أو CSV." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "حجم الملف كبير جدًا (الحد 10MB)." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseDonationImportBuffer(buffer);
  if (parsed.totalRows === 0) {
    return NextResponse.json({ error: parsed.warnings[0] ?? "لا توجد صفوف قابلة للاستيراد في الملف.", warnings: parsed.warnings }, { status: 400 });
  }

  const valid = parsed.rows.filter((r) => r.valid);
  const emails = [...new Set(valid.map((r) => r.email).filter(Boolean) as string[])];
  const orderIds = valid.map((r) => importOrderId(r.dedupKey));

  const [existingUsers, existingDonations] = await Promise.all([
    process.env.DATABASE_URL
      ? prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }).catch(() => [])
      : Promise.resolve([]),
    process.env.DATABASE_URL
      ? prisma.donation.findMany({ where: { provider: IMPORT_PROVIDER, providerOrderId: { in: orderIds } }, select: { providerOrderId: true } }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const existingEmailSet = new Set(existingUsers.map((u) => (u.email ?? "").toLowerCase()).filter(Boolean));
  const alreadyImportedSet = new Set(existingDonations.map((d) => d.providerOrderId).filter(Boolean) as string[]);

  const byCurrency: Record<string, { count: number; amount: number }> = {};
  let totalUsdPaid = 0;
  let paid = 0;
  let failed = 0;
  let newlyImportable = 0;
  for (const r of valid) {
    const already = alreadyImportedSet.has(importOrderId(r.dedupKey));
    if (!already) newlyImportable += 1;
    if (r.status === "PAID") { paid += 1; if (!already) totalUsdPaid += r.amountUSD ?? 0; }
    else failed += 1;
    const c = byCurrency[r.currency] ?? { count: 0, amount: 0 };
    c.count += 1; c.amount += r.amount ?? 0;
    byCurrency[r.currency] = c;
  }

  const newDonorEmails = emails.filter((e) => !existingEmailSet.has(e));

  return NextResponse.json({
    fileHash: parsed.fileHash,
    warnings: parsed.warnings,
    summary: {
      totalRows: parsed.totalRows,
      validRows: valid.length,
      invalidRows: parsed.totalRows - valid.length,
      paid,
      failed,
      alreadyImported: valid.length - newlyImportable,
      newlyImportable,
      newDonors: newDonorEmails.length,
      existingDonors: emails.length - newDonorEmails.length,
      totalUsdPaidNew: Math.round(totalUsdPaid * 100) / 100,
      byCurrency,
    },
    sample: parsed.rows.slice(0, SAMPLE_LIMIT).map((r) => ({
      rowNumber: r.rowNumber,
      name: r.name,
      email: r.email,
      phone: r.phone,
      basket: r.basket,
      amount: r.amount,
      currency: r.currency,
      amountUSD: r.amountUSD,
      status: r.status,
      country: r.country,
      countryCode: r.countryCode,
      locale: r.locale,
      createdAtISO: r.createdAtISO,
      valid: r.valid,
      issues: r.issues,
      alreadyImported: r.valid && alreadyImportedSet.has(importOrderId(r.dedupKey)),
      isNewDonor: !!r.email && !existingEmailSet.has(r.email),
    })),
    sampleTruncated: parsed.rows.length > SAMPLE_LIMIT,
  });
}

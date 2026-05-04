import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";

function escapeCsv(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "revenue");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const userId = searchParams.get("userId");
    const categoryId = searchParams.get("categoryId");
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const sortBy = (searchParams.get("sortBy") || "date") as "date" | "amount";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const status = searchParams.get("status");
    const locale = searchParams.get("locale")?.trim() ?? null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "5000", 10) || 5000, 20000);

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startParam) dateFilter.gte = new Date(startParam + "T00:00:00.000Z");
    if (endParam) dateFilter.lte = new Date(endParam + "T23:59:59.999Z");

    const baseWhere: Record<string, unknown> = {
      ...(campaignId && campaignId !== "all" && { items: { some: { campaignId } } }),
      ...(userId && userId !== "all" && { donorId: userId }),
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      ...(status && ["PAID", "FAILED"].includes(status) && { status }),
    };
    if (categoryId && categoryId !== "all") {
      baseWhere.OR = [
        { items: { some: { campaign: { categoryId } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }

    const localeWhere =
      locale && locale !== "all"
        ? locale === "__unset"
          ? { OR: [{ locale: null }, { locale: "" }] }
          : { locale }
        : null;

    const where: Record<string, unknown> =
      localeWhere != null ? { AND: [baseWhere, localeWhere] } : baseWhere;

    const orderBy =
      sortBy === "amount" ? { amountUSD: sortOrder } : { createdAt: sortOrder };

    const rows = await prisma.donation.findMany({
      where,
      include: {
        donor: { select: { name: true, email: true, phone: true } },
        items: { include: { campaign: { select: { title: true } } } },
        categoryItems: { include: { category: { select: { name: true } } } },
        referral: { select: { code: true } },
      },
      orderBy,
      take: limit,
    });

    const headers = [
      "id",
      "locale",
      "status",
      "amountUSD",
      "currency",
      "totalAmount",
      "donorName",
      "donorEmail",
      "donorPhone",
      "campaigns",
      "categories",
      "referralCode",
      "provider",
      "type",
      "createdAt",
      "paidAt",
    ];

    const lines = [
      headers.join(","),
      ...rows.map((d) =>
        [
          escapeCsv(d.id),
          escapeCsv(d.locale),
          escapeCsv(d.status),
          escapeCsv(d.amountUSD ?? ""),
          escapeCsv(d.currency),
          escapeCsv(d.totalAmount),
          escapeCsv(d.donor?.name),
          escapeCsv(d.donor?.email),
          escapeCsv(d.donor?.phone),
          escapeCsv(d.items.map((i) => i.campaign.title).join("; ")),
          escapeCsv(d.categoryItems.map((c) => c.category.name).join("; ")),
          escapeCsv(d.referral?.code),
          escapeCsv(d.provider),
          escapeCsv(d.subscriptionId ? "MONTHLY" : "ONE_TIME"),
          escapeCsv(d.createdAt.toISOString()),
          escapeCsv(d.paidAt?.toISOString() ?? ""),
        ].join(",")
      ),
    ];

    const csv = "\uFEFF" + lines.join("\r\n");
    const filename = `donations-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("export donations:", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

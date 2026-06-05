import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import {
  convertAmountInCurrencyToUsd,
  normalizeDonationCurrencyCode,
} from "@/lib/exchange/convert-amount-in-currency-to-usd";
import { getDonorCountryCodeForSnapshot } from "@/lib/donations/donor-country-code";
import {
  writeAuditLog,
  auditActorFromDashboardSession,
} from "@/lib/audit-log";

interface CampaignLineInput {
  campaignId: string;
  amount: number;
}
interface CategoryLineInput {
  categoryId: string;
  amount: number;
}

/**
 * POST /api/admin/donations — admin manually adds a donation (cash, bank
 * transfer, reconciled offline payment, etc.).
 *
 * The row is created as fully settled (status=PAID + paidAt=now) and each
 * campaign / category line item's `currentAmount` is incremented atomically —
 * matching what the Stripe webhook does for a confirmed recurring charge. No
 * gateway flow involved; this is just bookkeeping for money that already moved.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed =
      session.user.role === "ADMIN" ||
      userHasDashboardPermission(session.user, "donationsEdit");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      donorId?: string;
      items?: CampaignLineInput[];
      categoryItems?: CategoryLineInput[];
      currency?: string;
      teamSupport?: number;
      coverFees?: boolean;
      paymentMethod?: "CARD" | "PAYPAL";
      provider?: string | null;
      notes?: string | null;
    };

    const donorId = body.donorId?.trim();
    const currency = body.currency?.trim().toUpperCase();
    const paymentMethod = body.paymentMethod ?? "CARD";
    const teamSupport = Math.max(0, Number(body.teamSupport ?? 0)) || 0;
    const coverFees = Boolean(body.coverFees);
    const items = Array.isArray(body.items) ? body.items : [];
    const categoryItems = Array.isArray(body.categoryItems) ? body.categoryItems : [];

    if (!donorId) {
      return NextResponse.json({ error: "donorId is required" }, { status: 400 });
    }
    if (!currency) {
      return NextResponse.json({ error: "currency is required" }, { status: 400 });
    }
    if (paymentMethod !== "CARD" && paymentMethod !== "PAYPAL") {
      return NextResponse.json(
        { error: "paymentMethod must be CARD or PAYPAL" },
        { status: 400 }
      );
    }
    if (items.length === 0 && categoryItems.length === 0) {
      return NextResponse.json(
        { error: "At least one campaign or category line is required" },
        { status: 400 }
      );
    }
    for (const it of items) {
      if (!it.campaignId || !Number.isFinite(Number(it.amount)) || Number(it.amount) <= 0) {
        return NextResponse.json({ error: "Invalid campaign line" }, { status: 400 });
      }
    }
    for (const it of categoryItems) {
      if (!it.categoryId || !Number.isFinite(Number(it.amount)) || Number(it.amount) <= 0) {
        return NextResponse.json({ error: "Invalid category line" }, { status: 400 });
      }
    }
    const dupCampaign = (() => {
      const seen = new Set<string>();
      for (const it of items) {
        if (seen.has(it.campaignId)) return it.campaignId;
        seen.add(it.campaignId);
      }
      return null;
    })();
    if (dupCampaign) {
      return NextResponse.json(
        { error: "Duplicate campaign line — merge into one row" },
        { status: 400 }
      );
    }
    const dupCategory = (() => {
      const seen = new Set<string>();
      for (const it of categoryItems) {
        if (seen.has(it.categoryId)) return it.categoryId;
        seen.add(it.categoryId);
      }
      return null;
    })();
    if (dupCategory) {
      return NextResponse.json(
        { error: "Duplicate category line — merge into one row" },
        { status: 400 }
      );
    }

    const donor = await prisma.user.findUnique({
      where: { id: donorId },
      select: { id: true, name: true },
    });
    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 });
    }

    if (items.length > 0) {
      const ids = [...new Set(items.map((it) => it.campaignId))];
      const found = await prisma.campaign.count({ where: { id: { in: ids } } });
      if (found !== ids.length) {
        return NextResponse.json(
          { error: "One or more campaigns not found" },
          { status: 404 }
        );
      }
    }
    if (categoryItems.length > 0) {
      const ids = [...new Set(categoryItems.map((it) => it.categoryId))];
      const found = await prisma.category.count({ where: { id: { in: ids } } });
      if (found !== ids.length) {
        return NextResponse.json(
          { error: "One or more categories not found" },
          { status: 404 }
        );
      }
    }

    const currencyNorm = normalizeDonationCurrencyCode(currency);
    const campaignTotal = items.reduce((sum, it) => sum + Number(it.amount), 0);
    const categoryTotal = categoryItems.reduce((sum, it) => sum + Number(it.amount), 0);
    const amount = campaignTotal + categoryTotal;
    const fees = coverFees ? (amount + teamSupport) * 0.03 : 0;
    const totalAmount = amount + teamSupport + fees;

    let amountUSD: number;
    try {
      amountUSD = await convertAmountInCurrencyToUsd(totalAmount, currencyNorm);
    } catch (e) {
      console.error("[admin manual donation] usd conversion failed:", e);
      return NextResponse.json(
        { error: "Exchange rate unavailable. Try again in a moment." },
        { status: 503 }
      );
    }

    const campaignLines = await Promise.all(
      items.map(async (it) => ({
        campaignId: it.campaignId,
        amount: Number(it.amount),
        amountUSD: await convertAmountInCurrencyToUsd(Number(it.amount), currencyNorm),
      }))
    );
    const categoryLines = await Promise.all(
      categoryItems.map(async (it) => ({
        categoryId: it.categoryId,
        amount: Number(it.amount),
        amountUSD: await convertAmountInCurrencyToUsd(Number(it.amount), currencyNorm),
      }))
    );

    const donorCountrySnapshot =
      (await getDonorCountryCodeForSnapshot(prisma, donorId)) ?? undefined;

    const paidAt = new Date();
    const created = await prisma.$transaction(async (tx) => {
      const data: Prisma.DonationCreateInput = {
        amount,
        amountUSD,
        currency,
        teamSupport,
        coverFees,
        fees,
        totalAmount,
        status: "PAID",
        paidAt,
        donorCountryCode: donorCountrySnapshot,
        paymentMethod,
        provider: body.provider?.trim() || "MANUAL",
        comment: body.notes?.trim() || undefined,
        donor: { connect: { id: donorId } },
        ...(campaignLines.length > 0 && {
          items: { create: campaignLines },
        }),
        ...(categoryLines.length > 0 && {
          categoryItems: { create: categoryLines },
        }),
      };
      const d = await tx.donation.create({ data, select: { id: true } });

      for (const line of campaignLines) {
        await tx.campaign.update({
          where: { id: line.campaignId },
          data: { currentAmount: { increment: line.amountUSD ?? line.amount } },
        });
      }
      for (const line of categoryLines) {
        await tx.category.update({
          where: { id: line.categoryId },
          data: { currentAmount: { increment: line.amountUSD ?? line.amount } },
        });
      }
      return d;
    });

    const actor = auditActorFromDashboardSession(session);
    await writeAuditLog({
      ...actor,
      action: "DONATION_MANUAL_CREATE",
      messageAr: `${actor.actorName ?? "مسؤول"} أضاف تبرعًا يدويًا (${amount} ${currency}) للمتبرع ${donor.name ?? donorId}`,
      entityType: "Donation",
      entityId: created.id,
      metadata: {
        donorId,
        amount,
        amountUSD,
        currency,
        teamSupport,
        provider: body.provider?.trim() || "MANUAL",
        paymentMethod,
        items: campaignLines.map((l) => ({ campaignId: l.campaignId, amount: l.amount })),
        categoryItems: categoryLines.map((l) => ({ categoryId: l.categoryId, amount: l.amount })),
      },
    });

    return NextResponse.json({ donationId: created.id }, { status: 201 });
  } catch (error) {
    console.error("[admin manual donation] failed:", error);
    return NextResponse.json(
      {
        error: "Failed to create donation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

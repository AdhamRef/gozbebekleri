import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { resolveReferralId } from "@/lib/referral-server";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { writeAuditLog, auditStreamForRole } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(userId && { donorId: userId }),
      ...(!userHasDashboardPermission(session.user, "revenue") && {
        donorId: session.user.id,
      }),
      ...(campaignId && { items: { some: { campaignId } } }),
    };

    // Get total count for pagination
    const total = await prisma.donation.count({ where });

    // Get donations with pagination
    const donations = await prisma.donation.findMany({
      where,
      include: {
        donor: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        items: {
          include: {
            campaign: {
              select: {
                title: true,
                images: true,
              },
            },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      donations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch donations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const {
      items,
      currency,
      teamSupport = 0,
      coverFees = false,
      type = "ONE_TIME",
      paymentMethod,
      cardDetails = null,
      referralCode,
      locale: donationLocale,
      guest,
    } = body;

    // Validate required fields
    if (!items?.length || !currency || !paymentMethod) {
      return NextResponse.json(
        { error: "Items, currency, and payment method are required" },
        { status: 400 }
      );
    }

    // Resolve donor
    let donorId: string;
    let donorName: string | null = null;

    if (session?.user?.id) {
      donorId = session.user.id;
      donorName = session.user.name ?? null;
    } else if (guest) {
      const email = guest.email?.trim() || null;
      if (email) {
        const existing = await prisma.user.findFirst({ where: { email } });
        if (existing) {
          donorId = existing.id;
          donorName = existing.name;
        } else {
          const name = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || null;
          const newUser = await prisma.user.create({
            data: {
              email,
              name,
              role: "DONOR",
              phone: guest.phone || undefined,
              countryCode: guest.countryCode || undefined,
              city: guest.city || undefined,
              region: guest.region || undefined,
            },
          });
          donorId = newUser.id;
          donorName = newUser.name;
        }
      } else {
        const name = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || null;
        const newUser = await prisma.user.create({
          data: {
            name,
            role: "DONOR",
            phone: guest.phone || undefined,
            countryCode: guest.countryCode || undefined,
            city: guest.city || undefined,
            region: guest.region || undefined,
          },
        });
        donorId = newUser.id;
        donorName = newUser.name;
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Card payments are handled via PayFor 3D Secure redirect flow (we do not store PAN/CVV).

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmountUSD = items.reduce(
      (sum, item) => sum + (item.amountUSD || 0),
      0
    );
    const fees = (totalAmount + teamSupport) * 0.03;
    const finalTotalAmount = totalAmount + teamSupport + (coverFees ? fees : 0);

    // Verify all campaigns exist and are active
    const campaignIds = items.map((item) => item.campaignId);
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
    });

    if (campaigns.length !== items.length) {
      return NextResponse.json(
        { error: "One or more campaigns not found" },
        { status: 404 }
      );
    }

    if (campaigns.some((campaign) => !campaign.isActive)) {
      return NextResponse.json(
        { error: "One or more campaigns are not active" },
        { status: 400 }
      );
    }

    const referralId = await resolveReferralId(referralCode);

    const validLocale =
      donationLocale && ["ar", "en", "fr", "tr", "id", "pt", "es"].includes(String(donationLocale).toLowerCase())
        ? String(donationLocale).toLowerCase()
        : null;

    if (type === "MONTHLY") {
      const nextBilling = new Date();
      nextBilling.setUTCMonth(nextBilling.getUTCMonth() + 1);
      nextBilling.setUTCHours(0, 0, 0, 0);

      const result = await prisma.$transaction(async (tx) => {
        const sub = await tx.subscription.create({
          data: {
            status: "ACTIVE",
            amount: totalAmount,
            amountUSD: totalAmountUSD,
            currency,
            teamSupport,
            coverFees,
            paymentMethod,
            cardDetails: paymentMethod === "CARD" ? cardDetails : null,
            donorId: donorId,
            referralId: referralId ?? undefined,
            nextBillingDate: nextBilling,
            lastBillingDate: new Date(),
            items: {
              create: items.map(
                (item: {
                  campaignId: string;
                  amount: number;
                  amountUSD?: number;
                  shareCount?: number;
                }) => ({
                  campaignId: item.campaignId,
                  amount: item.amount,
                  amountUSD: item.amountUSD,
                  ...(item.shareCount != null && item.shareCount > 0
                    ? { shareCount: Math.floor(item.shareCount) }
                    : {}),
                })
              ),
            },
          },
        });

        const donation = await tx.donation.create({
          data: {
            amount: totalAmount,
            amountUSD: totalAmountUSD,
            teamSupport,
            coverFees,
            currency,
            fees: coverFees ? fees : 0,
            totalAmount: finalTotalAmount,
            status: "PAID",
            locale: validLocale ?? undefined,
            donorId: donorId,
            referralId: referralId ?? undefined,
            subscriptionId: sub.id,
            paymentMethod,
            cardDetails: null,
            items: {
              create: items.map(
                (item: {
                  campaignId: string;
                  amount: number;
                  amountUSD?: number;
                  shareCount?: number;
                }) => ({
                  campaignId: item.campaignId,
                  amount: item.amount,
                  amountUSD: item.amountUSD,
                  ...(item.shareCount != null && item.shareCount > 0
                    ? { shareCount: Math.floor(item.shareCount) }
                    : {}),
                })
              ),
            },
          },
          include: {
            donor: { select: { name: true, email: true } },
            items: { include: { campaign: { select: { title: true } } } },
          },
        });

        if (validLocale) {
          const donor = await tx.user.findUnique({
            where: { id: donorId },
            select: { preferredLang: true },
          });
          if (donor && donor.preferredLang == null) {
            await tx.user.update({
              where: { id: donorId },
              data: { preferredLang: validLocale },
            });
          }
        }

        return { subscription: sub, donation };
      }, { timeout: 15000 });

      const d = result.donation;
      const actorRole = session?.user?.role ?? "DONOR";
      await writeAuditLog({
        actorId: donorId,
        actorName: donorName,
        actorRole,
        action: "DONATION_MONTHLY_CHECKOUT_START",
        messageAr: `${donorName ?? "متبرع"} بدأ عملية دفع اشتراكًا شهريًا عبر السلة (≈ ${totalAmountUSD.toFixed(0)} USD لكل دورة)`,
        entityType: "Donation",
        entityId: d.id,
        metadata: { amountUSD: totalAmountUSD, via: "cart_payment", status: "PENDING", provider: "PAYFOR" },
        stream: auditStreamForRole(actorRole),
      });

      return NextResponse.json({
        success: true,
        subscription: result.subscription,
        donation: result.donation,
      });
    }

    const donation = await prisma.$transaction(async (tx) => {
      const d = await tx.donation.create({
        data: {
          amount: totalAmount,
          amountUSD: totalAmountUSD,
          teamSupport,
          coverFees,
          currency,
          fees: coverFees ? fees : 0,
          totalAmount: finalTotalAmount,
          status: "PAID",
          locale: validLocale ?? undefined,
          donorId: donorId,
          referralId: referralId ?? undefined,
          paymentMethod,
          cardDetails: null,
          items: {
            create: items.map(
              (item: {
                campaignId: string;
                amount: number;
                amountUSD?: number;
                shareCount?: number;
              }) => ({
                campaignId: item.campaignId,
                amount: item.amount,
                amountUSD: item.amountUSD,
                ...(item.shareCount != null && item.shareCount > 0
                  ? { shareCount: Math.floor(item.shareCount) }
                  : {}),
              })
            ),
          },
        },
        include: {
          donor: { select: { name: true, email: true } },
          items: { include: { campaign: { select: { title: true } } } },
        },
      });

      if (validLocale) {
        const donor = await tx.user.findUnique({
          where: { id: donorId },
          select: { preferredLang: true },
        });
        if (donor && donor.preferredLang == null) {
          await tx.user.update({
            where: { id: donorId },
            data: { preferredLang: validLocale },
          });
        }
      }

      return d;
    }, { timeout: 15000 });

    const actorRole = session?.user?.role ?? "DONOR";
    await writeAuditLog({
      actorId: donorId,
      actorName: donorName,
      actorRole,
      action: "DONATION_ONE_TIME_CHECKOUT_START",
      messageAr: `${donorName ?? "متبرع"} بدأ عملية دفع تبرعًا لمرة واحدة عبر السلة (≈ ${totalAmountUSD.toFixed(0)} USD)`,
      entityType: "Donation",
      entityId: donation.id,
      metadata: { amountUSD: totalAmountUSD, via: "cart_payment", status: "PENDING", provider: "PAYFOR" },
      stream: auditStreamForRole(actorRole),
    });

    return NextResponse.json({
      success: true,
      donation,
    });
  } catch (error) {
    console.error("Error creating donation:", error);
    return NextResponse.json(
      { error: "Failed to create donation" },
      { status: 500 }
    );
  }
}
